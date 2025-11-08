import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getLevelFromXp, getCurrentXp } from "@/lib/xp-system";
import { getClassXpMultiplier } from "@/lib/classes";

/**
 * Rota de ADMIN - RESETA completamente os dados de um usuário
 * Busca dados reais do GitHub e recalcula tudo do zero baseado na data de registro
 * Usado para corrigir usuários que abusaram de exploits
 * ATENÇÃO: Usa SERVICE_ROLE para bypassar RLS
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, token: providedToken } = body;

    if (!username) {
      return NextResponse.json({ error: "Forneça um username" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar dados completos do usuário
    const { data: userData, error: userQueryError } = await supabase
      .from("users")
      .select(
        `
        id,
        github_username,
        github_access_token,
        created_at,
        github_stats!inner(
          total_commits,
          total_prs,
          total_issues,
          baseline_commits,
          baseline_prs,
          baseline_issues
        ),
        characters!inner(
          id,
          class,
          total_xp,
          level
        )
      `
      )
      .eq("github_username", username)
      .single();

    if (userQueryError || !userData) {
      console.error("[Reset] Erro ao buscar usuário:", userQueryError);
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Garantir que temos a data de criação do usuário
    const userCreatedAt = userData.created_at ? new Date(userData.created_at) : new Date();
    console.log(`[Reset] ${username} - Data de criação: ${userCreatedAt.toISOString()}`);

    console.log(`[Reset] Processando ${username}...`);

    const stats = Array.isArray(userData.github_stats) ? userData.github_stats[0] : userData.github_stats;
    const character = Array.isArray(userData.characters) ? userData.characters[0] : userData.characters;

    if (!stats || !character) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    console.log(`[Reset] ${username} - Token no banco:`, userData.github_access_token ? "SIM" : "NÃO");
    console.log(`[Reset] ${username} - Token fornecido:`, providedToken ? "SIM" : "NÃO");

    // Usar token fornecido ou do banco
    let token = providedToken || userData.github_access_token;

    // Se não tem token, tentar usar token de um admin disponível (para dados públicos)
    if (!token) {
      console.log(`[Reset] ${username} - Sem token, tentando buscar token de admin...`);

      // Buscar um usuário com token (preferencialmente yurirxmos)
      const { data: adminUser } = await supabase
        .from("users")
        .select("github_access_token")
        .eq("github_username", "yurirxmos")
        .single();

      if (adminUser?.github_access_token) {
        token = adminUser.github_access_token;
        console.log(`[Reset] ${username} - Usando token do admin para consulta pública`);
      }
    }

    if (!token) {
      console.error(`[Reset] ${username} - Nenhum token disponível (nem do usuário, nem de admin)`);
      return NextResponse.json(
        {
          error: "Token GitHub não encontrado. O usuário precisa fazer logout/login, ou configure um token de admin.",
          username,
        },
        { status: 400 }
      );
    }

    // Inicializar GitHubService
    const githubService = new GitHubService(token);

    // Buscar stats REAIS do GitHub
    const githubStats = await githubService.getUserStats(username);
    const { totalCommits, totalPRs, totalIssues } = githubStats;

    console.log(`[Reset] ${username} - GitHub REAL:`, {
      totalCommits,
      totalPRs,
      totalIssues,
    });

    console.log(`[Reset] ${username} - Dados ANTIGOS (corrompidos):`, {
      total_commits: stats.total_commits,
      baseline_commits: stats.baseline_commits,
      total_prs: stats.total_prs,
      baseline_prs: stats.baseline_prs,
      total_xp: character.total_xp,
      level: character.level,
    });

    // Buscar atividades desde a data de criação do usuário
    const activitiesSinceJoin = await githubService.getActivitiesSince(username, userCreatedAt);
    console.log(`[Reset] ${username} - Atividades desde ${userCreatedAt.toISOString()}:`, activitiesSinceJoin);

    // Calcular baseline correto (total - atividades desde o registro)
    const correctBaselineCommits = Math.max(0, totalCommits - activitiesSinceJoin.commits);
    const correctBaselinePRs = Math.max(0, totalPRs - activitiesSinceJoin.prs);
    const correctBaselineIssues = Math.max(0, totalIssues - activitiesSinceJoin.issues);

    console.log(`[Reset] ${username} - Baseline CORRETO:`, {
      commits: `${totalCommits} - ${activitiesSinceJoin.commits} = ${correctBaselineCommits}`,
      prs: `${totalPRs} - ${activitiesSinceJoin.prs} = ${correctBaselinePRs}`,
      issues: `${totalIssues} - ${activitiesSinceJoin.issues} = ${correctBaselineIssues}`,
    });

    // Calcular XP de TODAS as atividades desde o login até agora
    // Isso preserva o histórico e progresso do usuário
    const commitsMultiplier = getClassXpMultiplier(character.class, "commits");
    const prsMultiplier = getClassXpMultiplier(character.class, "pullRequests");
    const issuesMultiplier = getClassXpMultiplier(character.class, "issuesResolved");

    const commitsXp = activitiesSinceJoin.commits * 10 * commitsMultiplier;
    const prsXp = activitiesSinceJoin.prs * 50 * prsMultiplier;
    const issuesXp = activitiesSinceJoin.issues * 25 * issuesMultiplier;
    const activityXp = Math.round(commitsXp + prsXp + issuesXp);

    console.log(`[Reset] ${username} - XP de atividades (desde a criação até agora):`, {
      commits: `${activitiesSinceJoin.commits} × 10 × ${commitsMultiplier} = ${commitsXp}`,
      prs: `${activitiesSinceJoin.prs} × 50 × ${prsMultiplier} = ${prsXp}`,
      issues: `${activitiesSinceJoin.issues} × 25 × ${issuesMultiplier} = ${issuesXp}`,
      total: activityXp,
      period: `${userCreatedAt.toISOString()} até agora`,
    });

    // Buscar achievements do usuário e somar XP
    const { data: achievementsData } = await supabase
      .from("user_achievements")
      .select("achievement:achievements(code, xp_reward)")
      .eq("user_id", userData.id);

    let achievementsXp = 0;
    const achievementsList: Array<{ code: string; xp: number }> = [];

    if (achievementsData && achievementsData.length > 0) {
      achievementsData.forEach((item: any) => {
        if (item.achievement?.xp_reward) {
          achievementsXp += item.achievement.xp_reward;
          achievementsList.push({
            code: item.achievement.code,
            xp: item.achievement.xp_reward,
          });
        }
      });
    }

    console.log(`[Reset] ${username} - XP de achievements:`, {
      total: achievementsXp,
      achievements: achievementsList,
    });

    const totalXp = activityXp + achievementsXp;

    console.log(`[Reset] ${username} - XP TOTAL:`, {
      activity_xp: activityXp,
      achievements_xp: achievementsXp,
      total_xp: totalXp,
    });

    const correctLevel = getLevelFromXp(totalXp);
    const correctCurrentXp = getCurrentXp(totalXp, correctLevel);

    console.log(`[Reset] ${username} - Level CORRETO: ${correctLevel} (XP: ${totalXp})`);

    // RESETAR github_stats com dados corretos
    const { error: updateStatsError } = await supabase
      .from("github_stats")
      .update({
        total_commits: totalCommits,
        total_prs: totalPRs,
        total_issues: totalIssues,
        baseline_commits: correctBaselineCommits,
        baseline_prs: correctBaselinePRs,
        baseline_issues: correctBaselineIssues,
      })
      .eq("user_id", userData.id);

    if (updateStatsError) {
      console.error(`[Reset] Erro ao atualizar stats:`, updateStatsError);
      return NextResponse.json({ error: updateStatsError.message }, { status: 500 });
    }

    // RESETAR character com XP correto
    const { error: updateCharError } = await supabase
      .from("characters")
      .update({
        total_xp: totalXp,
        level: correctLevel,
        current_xp: correctCurrentXp,
      })
      .eq("id", character.id);

    if (updateCharError) {
      console.error(`[Reset] Erro ao atualizar character:`, updateCharError);
      return NextResponse.json({ error: updateCharError.message }, { status: 500 });
    }

    console.log(`[Reset] ✅ ${username} - RESETADO com sucesso!`);

    return NextResponse.json({
      success: true,
      message: `Usuário ${username} resetado com sucesso. XP recalculado desde a criação + achievements.`,
      data: {
        username,
        user_created_at: userCreatedAt.toISOString(),
        xp_calculation_period: {
          from: userCreatedAt.toISOString(),
          to: new Date().toISOString(),
          description: "Desde a data de criação até agora (histórico completo preservado)",
        },
        old_data: {
          total_commits: stats.total_commits,
          baseline_commits: stats.baseline_commits,
          total_xp: character.total_xp,
          level: character.level,
        },
        new_data: {
          total_commits: totalCommits,
          baseline_commits: correctBaselineCommits,
          activity_xp: activityXp,
          achievements_xp: achievementsXp,
          total_xp: totalXp,
          level: correctLevel,
          activities_since_join: activitiesSinceJoin.commits + activitiesSinceJoin.prs + activitiesSinceJoin.issues,
          achievements: achievementsList,
        },
        activity_breakdown: activitiesSinceJoin,
        note: "Baseline ajustado para ignorar histórico anterior ao registro. XP = TODAS atividades desde criação + bônus de achievements.",
      },
    });
  } catch (error) {
    console.error("[Reset] Erro geral:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
