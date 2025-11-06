import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getLevelFromXp, getCurrentXp } from "@/lib/xp-system";
import { getClassXpMultiplier } from "@/lib/classes";

/**
 * Rota de DEBUG - Corrige XP inicial para TODOS os usuários
 * Detecta usuários com baseline = total e aplica XP dos últimos 7 dias
 * ATENÇÃO: Só funciona em localhost
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

    const supabase = await createClient();

    // Buscar TODOS os usuários que precisam de correção
    // (baseline_commits = total_commits = não receberam XP inicial)
    const { data: allStats, error: queryError } = await supabase.from("github_stats").select(
      `
        user_id,
        total_commits,
        total_prs,
        total_issues,
        baseline_commits,
        baseline_prs,
        baseline_issues
      `
    );

    if (queryError) {
      console.error("[Fix All] Erro ao buscar stats:", queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    // Filtrar usuários que precisam de correção
    const usersNeedingFixIds = allStats
      ?.filter(
        (stats) =>
          stats.baseline_commits === stats.total_commits &&
          stats.baseline_prs === stats.total_prs &&
          stats.total_commits > 0
      )
      .map((stats) => stats.user_id);

    if (!usersNeedingFixIds || usersNeedingFixIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum usuário precisa de correção",
        data: {
          users_processed: 0,
          users_corrected: 0,
        },
      });
    }

    // Buscar dados completos dos usuários
    const { data: usersNeedingFix, error: userQueryError } = await supabase
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
          name,
          class,
          level,
          current_xp,
          total_xp
        )
      `
      )
      .in("id", usersNeedingFixIds);

    if (userQueryError) {
      console.error("[Fix All] Erro ao buscar usuários:", userQueryError);
      return NextResponse.json({ error: userQueryError.message }, { status: 500 });
    }

    if (!usersNeedingFix || usersNeedingFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhum usuário precisa de correção",
        data: {
          users_processed: 0,
          users_corrected: 0,
        },
      });
    }

    console.log(`[Fix All] Encontrados ${usersNeedingFix.length} usuários que precisam de correção`);

    const results = [];

    // Processar cada usuário
    for (const userData of usersNeedingFix) {
      const user = {
        id: userData.id,
        github_username: userData.github_username,
        github_access_token: userData.github_access_token,
      };
      const statsArray = Array.isArray(userData.github_stats) ? userData.github_stats : [userData.github_stats];
      const charArray = Array.isArray(userData.characters) ? userData.characters : [userData.characters];

      const userStats = statsArray[0];
      const character = charArray[0];

      if (!userStats || !character) {
        console.error(`[Fix All] Dados inválidos para user: ${user.github_username}`);
        continue;
      }

      try {
        console.log(`[Fix All] Processando ${user.github_username}...`);

        const githubService = new GitHubService(user.github_access_token || undefined);

        // Buscar stats do GitHub
        const githubStats = await githubService.getUserStats(user.github_username);

        // Buscar atividades dos últimos 7 dias
        let weeklyStats = { commits: 0, prs: 0, issues: 0, reviews: 0 };

        try {
          weeklyStats = await githubService.getWeeklyXp(user.github_username);
          console.log(`[Fix All] ${user.github_username} - Últimos 7 dias:`, weeklyStats);
        } catch (error) {
          console.error(`[Fix All] ${user.github_username} - Erro ao buscar XP semanal:`, error);
        }

        // Calcular novo baseline (total - últimos 7 dias)
        const newBaselineCommits = Math.max(0, githubStats.totalCommits - weeklyStats.commits);
        const newBaselinePRs = Math.max(0, githubStats.totalPRs - weeklyStats.prs);
        const newBaselineIssues = Math.max(0, githubStats.totalIssues - weeklyStats.issues);

        // Aplicar multiplicadores de classe
        const commitMultiplier = getClassXpMultiplier(character.class as any, "commits");
        const prMultiplier = getClassXpMultiplier(character.class as any, "pullRequests");
        const issueMultiplier = getClassXpMultiplier(character.class as any, "issuesResolved");

        // Calcular XP retroativo
        const xpFromCommits = Math.floor(weeklyStats.commits * 10 * commitMultiplier);
        const xpFromPRs = Math.floor(weeklyStats.prs * 50 * prMultiplier);
        const xpFromIssues = Math.floor(weeklyStats.issues * 25 * issueMultiplier);
        const retroactiveXp = xpFromCommits + xpFromPRs + xpFromIssues;

        console.log(`[Fix All] ${user.github_username} - XP calculado:`, {
          commits: `${weeklyStats.commits} × 10 × ${commitMultiplier} = ${xpFromCommits}`,
          prs: `${weeklyStats.prs} × 50 × ${prMultiplier} = ${xpFromPRs}`,
          issues: `${weeklyStats.issues} × 25 × ${issueMultiplier} = ${xpFromIssues}`,
          total: retroactiveXp,
        });

        // Atualizar baseline no github_stats
        const { error: updateStatsError } = await supabase
          .from("github_stats")
          .update({
            total_commits: githubStats.totalCommits,
            total_prs: githubStats.totalPRs,
            total_issues: githubStats.totalIssues,
            baseline_commits: newBaselineCommits,
            baseline_prs: newBaselinePRs,
            baseline_issues: newBaselineIssues,
          })
          .eq("user_id", user.id);

        if (updateStatsError) {
          console.error(`[Fix All] ${user.github_username} - Erro ao atualizar stats:`, updateStatsError);
          results.push({
            username: user.github_username,
            success: false,
            error: updateStatsError.message,
          });
          continue;
        }

        // Atualizar personagem com XP retroativo
        if (retroactiveXp > 0) {
          const newTotalXp = character.total_xp + retroactiveXp;
          const newLevel = getLevelFromXp(newTotalXp);
          const newCurrentXp = getCurrentXp(newTotalXp, newLevel);

          const { error: updateCharError } = await supabase
            .from("characters")
            .update({
              total_xp: newTotalXp,
              level: newLevel,
              current_xp: newCurrentXp,
            })
            .eq("id", character.id);

          if (updateCharError) {
            console.error(`[Fix All] ${user.github_username} - Erro ao atualizar personagem:`, updateCharError);
            results.push({
              username: user.github_username,
              success: false,
              error: updateCharError.message,
            });
            continue;
          }

          console.log(
            `[Fix All] ✅ ${user.github_username} - ${retroactiveXp} XP | Level ${character.level} → ${newLevel}`
          );

          results.push({
            username: user.github_username,
            success: true,
            xp_gained: retroactiveXp,
            old_level: character.level,
            new_level: newLevel,
            weekly_stats: weeklyStats,
          });
        } else {
          console.log(`[Fix All] ✅ ${user.github_username} - Sem XP (sem atividades últimos 7 dias)`);

          results.push({
            username: user.github_username,
            success: true,
            xp_gained: 0,
            message: "Sem atividades nos últimos 7 dias",
          });
        }

        // Pequeno delay para não sobrecarregar API do GitHub
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`[Fix All] ${user.github_username} - Erro:`, error);
        results.push({
          username: user.github_username,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalXpGiven = results.reduce((sum, r) => sum + (r.xp_gained || 0), 0);

    console.log(`[Fix All] Concluído: ${successCount}/${results.length} usuários corrigidos`);

    return NextResponse.json({
      success: true,
      message: `Correção concluída: ${successCount}/${results.length} usuários processados`,
      data: {
        users_processed: results.length,
        users_corrected: successCount,
        total_xp_given: totalXpGiven,
        results,
      },
    });
  } catch (error) {
    console.error("[Fix All] Erro geral:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao corrigir usuários" },
      { status: 500 }
    );
  }
}
