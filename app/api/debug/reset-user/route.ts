import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getLevelFromXp, getCurrentXp } from "@/lib/xp-system";
import { getClassXpMultiplier } from "@/lib/classes";

/**
 * Rota de DEBUG - RESETA completamente os dados de um usuário
 * Busca dados reais do GitHub e recalcula tudo do zero
 * ATENÇÃO: Só funciona em localhost, usa SERVICE_ROLE para bypassar RLS
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se está em localhost
    const hostname = request.headers.get("host") || "";
    const isLocalhost =
      hostname.includes("localhost") || hostname.includes("127.0.0.1") || hostname.startsWith("192.168.");

    if (!isLocalhost) {
      return NextResponse.json({ error: "Esta rota só funciona em desenvolvimento local" }, { status: 403 });
    }

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

    console.log(`[Reset] Processando ${username}...`);

    const stats = Array.isArray(userData.github_stats) ? userData.github_stats[0] : userData.github_stats;
    const character = Array.isArray(userData.characters) ? userData.characters[0] : userData.characters;

    if (!stats || !character) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    console.log(`[Reset] ${username} - Token no banco:`, userData.github_access_token ? "SIM" : "NÃO");
    console.log(`[Reset] ${username} - Token fornecido:`, providedToken ? "SIM" : "NÃO");

    // Usar token fornecido ou do banco
    const token = providedToken || userData.github_access_token;

    if (!token) {
      console.error(`[Reset] ${username} - Nenhum token disponível`);
      return NextResponse.json(
        {
          error:
            "Token GitHub não encontrado. Faça logout/login ou forneça um token manualmente via parâmetro 'token'.",
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

    // Buscar últimos 7 dias
    const weeklyStats = await githubService.getWeeklyXp(username);
    console.log(`[Reset] ${username} - Últimos 7 dias:`, weeklyStats);

    // Calcular baseline correto (total - últimos 7 dias)
    const correctBaselineCommits = totalCommits - weeklyStats.commits;
    const correctBaselinePRs = totalPRs - weeklyStats.prs;
    const correctBaselineIssues = totalIssues - weeklyStats.issues;

    console.log(`[Reset] ${username} - Baseline CORRETO:`, {
      commits: correctBaselineCommits,
      prs: correctBaselinePRs,
      issues: correctBaselineIssues,
    });

    // Calcular XP dos últimos 7 dias com multiplicadores de classe
    const commitsMultiplier = getClassXpMultiplier(character.class, "commits");
    const prsMultiplier = getClassXpMultiplier(character.class, "pullRequests");
    const issuesMultiplier = getClassXpMultiplier(character.class, "issuesResolved");

    const commitsXp = weeklyStats.commits * 10 * commitsMultiplier;
    const prsXp = weeklyStats.prs * 50 * prsMultiplier;
    const issuesXp = weeklyStats.issues * 25 * issuesMultiplier;
    const totalXp = Math.round(commitsXp + prsXp + issuesXp);

    console.log(`[Reset] ${username} - XP CORRETO (últimos 7 dias):`, {
      commits: `${weeklyStats.commits} × 10 × ${commitsMultiplier} = ${commitsXp}`,
      prs: `${weeklyStats.prs} × 50 × ${prsMultiplier} = ${prsXp}`,
      issues: `${weeklyStats.issues} × 25 × ${issuesMultiplier} = ${issuesXp}`,
      total: totalXp,
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
      message: `Usuário ${username} resetado com sucesso`,
      data: {
        username,
        old_data: {
          total_commits: stats.total_commits,
          baseline_commits: stats.baseline_commits,
          total_xp: character.total_xp,
          level: character.level,
        },
        new_data: {
          total_commits: totalCommits,
          baseline_commits: correctBaselineCommits,
          total_xp: totalXp,
          level: correctLevel,
        },
        weekly_stats: weeklyStats,
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
