import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getLevelFromXp, getCurrentXp } from "@/lib/xp-system";
import { getClassXpMultiplier } from "@/lib/classes";
import { getAdminUser } from "@/lib/auth-utils";
import { recalculateGuildTotalsForUser } from "@/lib/guild";
import { EmailService } from "@/lib/email-service";

/**
 * Recalcula XP de um único usuário
 * Comentários explicam o porquê das escolhas (não o que trivial)
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Acesso negado: apenas admin" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const username = body?.username?.trim();
    if (!username) {
      return NextResponse.json({ error: "Username obrigatório" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar usuário + personagem + stats existentes (une tudo para evitar múltiplas idas ao banco)
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select(
        `id, github_username, github_access_token, created_at,
         characters(id, class, name, created_at, level, total_xp, current_xp),
         github_stats(total_commits, total_prs, total_issues, baseline_commits, baseline_prs, baseline_issues)`
      )
      .eq("github_username", username)
      .single();

    if (userError || !userRow) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const characterArray = Array.isArray(userRow.characters) ? userRow.characters : [userRow.characters];
    const character = characterArray?.[0];
    if (!character) {
      return NextResponse.json({ error: "Usuário sem personagem" }, { status: 400 });
    }

    // Usar token do usuário para buscar estatísticas atuais (garante precisão / possíveis privados quando escopos existirem)
    const githubService = new GitHubService(userRow.github_access_token || undefined);
    const githubStats = await githubService.getUserStats(userRow.github_username);

    // Definir janela: atividades consideradas desde 7 dias ANTES da criação (baseline precisa descontar histórico anterior)
    // Se a data estiver no futuro/ inválida, usa "hoje" para manter a janela correta de 7 dias.
    const rawCreatedAt = userRow.created_at ? new Date(userRow.created_at) : new Date(character.created_at);
    const now = new Date();
    const safeCreatedAt = isNaN(rawCreatedAt.getTime()) ? now : rawCreatedAt;
    const userCreatedAt = safeCreatedAt > now ? now : safeCreatedAt;

    const startWindow = new Date(userCreatedAt.getTime());
    startWindow.setDate(startWindow.getDate() - 7);

    // Buscar atividades desde esta janela (commits/PRs/issues recentes que gerarão XP)
    const activitiesSinceJoin = await githubService.getActivitiesSince(userRow.github_username, startWindow);

    // Calcular baseline subtraindo atividades da janela (evita XP inflado por histórico passado)
    const baselineCommits = Math.max(0, githubStats.totalCommits - activitiesSinceJoin.commits);
    const baselinePRs = Math.max(0, githubStats.totalPRs - activitiesSinceJoin.prs);
    const baselineIssues = Math.max(0, githubStats.totalIssues - activitiesSinceJoin.issues);

    // Multiplicadores por classe (mantém lógica centralizada em getClassXpMultiplier)
    const commitMultiplier = getClassXpMultiplier(character.class as any, "commits");
    const prMultiplier = getClassXpMultiplier(character.class as any, "pullRequests");
    const issueMultiplier = getClassXpMultiplier(character.class as any, "issuesResolved");

    // Cálculo simplificado para baseline: valores médios (commit=10, PR=25, issue=35) + multiplicadores de classe
    // Nota: O sistema real considera linhas de código, tipo de repositório, etc. Este é apenas um baseline aproximado.
    const xpFromCommits = Math.floor(activitiesSinceJoin.commits * 10 * commitMultiplier);
    const xpFromPRs = Math.floor(activitiesSinceJoin.prs * 25 * prMultiplier);
    const xpFromIssues = Math.floor(activitiesSinceJoin.issues * 35 * issueMultiplier);
    const activityXp = xpFromCommits + xpFromPRs + xpFromIssues;

    // Somar achievements existentes (XP agregado adicional)
    const { data: achievementsData } = await supabase
      .from("user_achievements")
      .select("achievement:achievements(code, xp_reward)")
      .eq("user_id", userRow.id);

    let achievementsXp = 0;
    if (achievementsData && achievementsData.length > 0) {
      for (const item of achievementsData as any[]) {
        achievementsXp += item.achievement?.xp_reward || 0;
      }
    }

    const totalXp = activityXp + achievementsXp;
    const previousLevel = character.level;
    const newLevel = getLevelFromXp(totalXp);
    const newCurrentXp = getCurrentXp(totalXp, newLevel);

    // Persistir github_stats com baseline recalculado
    const { error: updateStatsError } = await supabase
      .from("github_stats")
      .upsert(
        {
          user_id: userRow.id,
          total_commits: githubStats.totalCommits,
          total_prs: githubStats.totalPRs,
          total_issues: githubStats.totalIssues,
          baseline_commits: baselineCommits,
          baseline_prs: baselinePRs,
          baseline_issues: baselineIssues,
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select();

    if (updateStatsError) {
      return NextResponse.json({ error: updateStatsError.message }, { status: 500 });
    }

    // Atualizar personagem com novo XP/Level
    const { error: updateCharError } = await supabase
      .from("characters")
      .update({ total_xp: totalXp, level: newLevel, current_xp: newCurrentXp })
      .eq("id", character.id)
      .select();

    if (updateCharError) {
      return NextResponse.json({ error: updateCharError.message }, { status: 500 });
    }

    // Atualizar XP total das guildas onde o usuário é membro (utilidade compartilhada)
    try {
      await recalculateGuildTotalsForUser(supabase, userRow.id);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Falha ao atualizar XP da guilda" },
        { status: 500 }
      );
    }

    // Enviar e-mail especial quando usuário atingir nível 10 pela primeira vez
    // Removido: e-mail de nível 10

    return NextResponse.json({
      success: true,
      username: userRow.github_username,
      class: character.class,
      new_total_xp: totalXp,
      new_level: newLevel,
      baseline: { commits: baselineCommits, prs: baselinePRs, issues: baselineIssues },
      activities_since_join: {
        commits: activitiesSinceJoin.commits,
        prs: activitiesSinceJoin.prs,
        issues: activitiesSinceJoin.issues,
      },
      xp_breakdown: {
        commits: xpFromCommits,
        prs: xpFromPRs,
        issues: xpFromIssues,
        achievements: achievementsXp,
        activity_total: activityXp,
        total: totalXp,
      },
      multipliers: {
        commits: commitMultiplier,
        prs: prMultiplier,
        issues: issueMultiplier,
      },
      window_start: startWindow.toISOString(),
      user_created_at: userCreatedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 500 });
  }
}
