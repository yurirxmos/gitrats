import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getLevelFromXp, getCurrentXp } from "@/lib/xp-system";
import { getClassXpMultiplier } from "@/lib/classes";

/**
 * Sincronização de atividades do GitHub usando GraphQL API
 * Similar ao GitMon - busca stats totais via GitHub GraphQL
 * Atualiza apenas a tabela github_stats (sem activity_log)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("id, github_username, github_access_token")
      .eq("id", user.id)
      .single();

    if (!userData || !userData.github_username) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const { data: character } = await supabase
      .from("characters")
      .select("id, name, class, level, current_xp, total_xp")
      .eq("user_id", userData.id)
      .single();

    if (!character) {
      return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }

    const githubService = new GitHubService(userData.github_access_token || undefined);

    console.log(`[Sync] Iniciando sincronização para ${userData.github_username}`);

    const githubStats = await githubService.getUserStats(userData.github_username);

    console.log(`[Sync] Stats do GitHub:`, {
      totalCommits: githubStats.totalCommits,
      totalPRs: githubStats.totalPRs,
      totalIssues: githubStats.totalIssues,
      totalStars: githubStats.totalStars,
      totalRepos: githubStats.totalRepos,
    });

    const { data: currentStats, error: statsError } = await supabase
      .from("github_stats")
      .select(
        "total_commits, total_prs, total_issues, total_reviews, baseline_commits, baseline_prs, baseline_issues, baseline_reviews, last_sync_at"
      )
      .eq("user_id", userData.id)
      .maybeSingle();

    // Se não existe registro de stats, criar um vazio primeiro
    if (!currentStats) {
      console.log(`[Sync] Nenhum registro de github_stats encontrado. Criando...`);
      await supabase.from("github_stats").insert({
        user_id: userData.id,
        total_commits: 0,
        total_prs: 0,
        total_issues: 0,
        total_reviews: 0,
        baseline_commits: 0,
        baseline_prs: 0,
        baseline_issues: 0,
        baseline_reviews: 0,
        last_sync_at: null,
      });
    }

    console.log(`[Sync] Stats atuais no banco:`, {
      currentStats,
      total_commits_db: currentStats?.total_commits || 0,
      total_prs_db: currentStats?.total_prs || 0,
      last_sync_at: currentStats?.last_sync_at,
    });

    // Se é a primeira sync (nunca sincronizou antes), apenas inicializar sem dar XP
    // IMPORTANTE: Salva o baseline dos commits/PRs atuais, mas NÃO conta como atividade
    const isFirstSync = !currentStats || !currentStats?.last_sync_at;

    if (isFirstSync) {
      console.log(`[Sync] PRIMEIRA SINCRONIZAÇÃO - Salvando baseline (histórico ignorado)`);

      const { data: updatedStats, error: upsertError } = await supabase
        .from("github_stats")
        .update({
          total_commits: githubStats.totalCommits,
          total_prs: githubStats.totalPRs,
          total_issues: githubStats.totalIssues,
          baseline_commits: githubStats.totalCommits,
          baseline_prs: githubStats.totalPRs,
          baseline_issues: githubStats.totalIssues,
          baseline_reviews: 0, // GitHub não retorna reviews no getUserStats
          last_sync_at: new Date().toISOString(),
        })
        .eq("user_id", userData.id)
        .select()
        .single();

      if (upsertError) {
        console.error(`[Sync] ERRO ao atualizar github_stats:`, upsertError);
        return NextResponse.json({ error: `Erro ao salvar stats: ${upsertError.message}` }, { status: 500 });
      }

      console.log(`[Sync] Baseline salvo (histórico GitHub ignorado):`, {
        baseline_commits: updatedStats?.baseline_commits,
        baseline_prs: updatedStats?.baseline_prs,
        mensagem: "A partir de agora, apenas NOVOS commits/PRs gerarão XP",
      });

      return NextResponse.json({
        success: true,
        message:
          "✅ Conta sincronizada! Seu histórico foi ignorado. A partir de agora você ganhará XP apenas por novas atividades.",
        data: {
          xp_gained: 0,
          activities_synced: 0,
          stats: {
            commits: 0, // Zerado porque é baseline
            prs: 0, // Zerado porque é baseline
            total_commits: 0, // Mostra 0 pro usuário (histórico ignorado)
            total_prs: 0, // Mostra 0 pro usuário (histórico ignorado)
          },
        },
      });
    }

    // Calcular apenas as NOVAS atividades desde a última sync
    const newCommits = githubStats.totalCommits - (currentStats?.total_commits || 0);
    const newPRs = githubStats.totalPRs - (currentStats?.total_prs || 0);
    const newIssues = githubStats.totalIssues - (currentStats?.total_issues || 0);
    // Reviews não disponível no getUserStats, só via getWeeklyXp

    console.log(`[Sync] Novas atividades desde último sync:`, {
      newCommits,
      newPRs,
      newIssues,
      github_total_commits: githubStats.totalCommits,
      baseline_commits: currentStats?.total_commits || 0,
    });

    // Aplicar multiplicadores de classe
    const commitMultiplier = getClassXpMultiplier(character.class as any, "commits");
    const prMultiplier = getClassXpMultiplier(character.class as any, "pullRequests");
    const issueMultiplier = getClassXpMultiplier(character.class as any, "issuesResolved");

    // XP base AUMENTADO: 10 por commit, 50 por PR, 25 por issue
    const xpFromCommits = Math.floor(newCommits * 10 * commitMultiplier);
    const xpFromPRs = Math.floor(newPRs * 50 * prMultiplier);
    const xpFromIssues = Math.floor(newIssues * 25 * issueMultiplier);
    const totalXpGained = xpFromCommits + xpFromPRs + xpFromIssues;

    console.log(`[Sync] XP calculado (com bônus de classe ${character.class.toUpperCase()}):`, {
      newCommits,
      newPRs,
      newIssues,
      commitMultiplier: `${commitMultiplier}x`,
      prMultiplier: `${prMultiplier}x`,
      issueMultiplier: `${issueMultiplier}x`,
      xpFromCommits,
      xpFromPRs,
      xpFromIssues,
      totalXpGained,
    });

    const { error: updateStatsError } = await supabase
      .from("github_stats")
      .update({
        total_commits: githubStats.totalCommits,
        total_prs: githubStats.totalPRs,
        total_issues: githubStats.totalIssues,
        last_sync_at: new Date().toISOString(),
      })
      .eq("user_id", userData.id);

    if (updateStatsError) {
      console.error(`[Sync] ERRO ao atualizar github_stats:`, updateStatsError);
    }

    console.log(`[Sync] github_stats atualizado com:`, {
      total_commits: githubStats.totalCommits,
      total_prs: githubStats.totalPRs,
      total_issues: githubStats.totalIssues,
      user_id: userData.id,
    });

    if (totalXpGained > 0) {
      const newTotalXp = character.total_xp + totalXpGained;
      const newLevel = getLevelFromXp(newTotalXp);
      const newCurrentXp = getCurrentXp(newTotalXp, newLevel);

      await supabase
        .from("characters")
        .update({
          total_xp: newTotalXp,
          level: newLevel,
          current_xp: newCurrentXp,
        })
        .eq("id", character.id);

      const leveledUp = newLevel > character.level;

      console.log(
        `[Sync] ${userData.github_username} ganhou ${totalXpGained} XP! Total: ${newTotalXp} | Level: ${newLevel}${leveledUp ? " 🆙" : ""}`
      );

      return NextResponse.json({
        success: true,
        message: `+${totalXpGained} XP | ${newCommits + newPRs + newIssues} atividades sincronizadas`,
        data: {
          xp_gained: totalXpGained,
          new_total_xp: newTotalXp,
          new_level: newLevel,
          leveled_up: leveledUp,
          stats: {
            commits: newCommits,
            prs: newPRs,
            total_commits: githubStats.totalCommits,
            total_prs: githubStats.totalPRs,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Nenhuma atividade nova",
      data: {
        xp_gained: 0,
        activities_synced: 0,
        stats: {
          commits: 0,
          prs: 0,
          total_commits: githubStats.totalCommits,
          total_prs: githubStats.totalPRs,
        },
      },
    });
  } catch (error) {
    console.error("[Sync] Erro:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar" },
      { status: 500 }
    );
  }
}
