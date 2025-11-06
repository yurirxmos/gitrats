import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getLevelFromXp, getCurrentXp } from "@/lib/xp-system";
import { getClassXpMultiplier } from "@/lib/classes";

/**
 * Rota de DEBUG - Corrige XP inicial para usuários ESPECÍFICOS
 * Recalcula baseline considerando os últimos 7 dias de atividade
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
    const { usernames } = body;

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: "Forneça um array de usernames" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar dados completos dos usuários especificados
    const { data: usersToFix, error: userQueryError } = await supabase
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
      .in("github_username", usernames);

    if (userQueryError) {
      console.error("[Fix Specific] Erro ao buscar usuários:", userQueryError);
      return NextResponse.json({ error: userQueryError.message }, { status: 500 });
    }

    if (!usersToFix || usersToFix.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Nenhum usuário encontrado com esses usernames",
      });
    }

    console.log(`[Fix Specific] Encontrados ${usersToFix.length} usuários para corrigir`);

    const results = [];
    let totalXpGiven = 0;
    let usersProcessed = 0;
    let usersCorrected = 0;

    for (const userData of usersToFix) {
      const username = userData.github_username;
      usersProcessed++;

      try {
        console.log(`[Fix Specific] Processando ${username}...`);

        // Acessar dados do usuário (relações retornam arrays)
        const stats = Array.isArray(userData.github_stats) ? userData.github_stats[0] : userData.github_stats;
        const character = Array.isArray(userData.characters) ? userData.characters[0] : userData.characters;

        if (!stats || !character) {
          console.error(`[Fix Specific] ❌ ${username} - Dados incompletos`);
          results.push({
            username,
            success: false,
            error: "Dados incompletos",
          });
          continue;
        }

        const token = userData.github_access_token;
        if (!token) {
          console.error(`[Fix Specific] ❌ ${username} - Sem token GitHub`);
          results.push({
            username,
            success: false,
            error: "Sem token GitHub",
          });
          continue;
        }

        // Inicializar GitHubService com token do usuário
        const githubService = new GitHubService(token);

        // Buscar stats atuais do GitHub
        const githubStats = await githubService.getUserStats(username);
        const { totalCommits, totalPRs, totalIssues } = githubStats;

        console.log(`[Fix Specific] ${username} - GitHub atual:`, {
          totalCommits,
          totalPRs,
          totalIssues,
        });

        console.log(`[Fix Specific] ${username} - Baseline atual:`, {
          baseline_commits: stats.baseline_commits,
          baseline_prs: stats.baseline_prs,
          baseline_issues: stats.baseline_issues,
        });

        // Buscar atividades dos últimos 7 dias
        const weeklyStats = await githubService.getWeeklyXp(username);
        console.log(`[Fix Specific] ${username} - Últimos 7 dias:`, weeklyStats);

        // Calcular novo baseline (total atual do GitHub - últimos 7 dias)
        const newBaselineCommits = totalCommits - weeklyStats.commits;
        const newBaselinePRs = totalPRs - weeklyStats.prs;
        const newBaselineIssues = totalIssues - weeklyStats.issues;

        console.log(`[Fix Specific] ${username} - Novo baseline calculado:`, {
          commits: newBaselineCommits,
          prs: newBaselinePRs,
          issues: newBaselineIssues,
        });

        // PROTEÇÃO: Verificar se o baseline já foi corrigido
        // Se o baseline atual já é igual ao novo baseline, significa que já foi corrigido
        const alreadyFixed =
          stats.baseline_commits === newBaselineCommits &&
          stats.baseline_prs === newBaselinePRs &&
          stats.baseline_issues === newBaselineIssues;

        if (alreadyFixed) {
          console.log(`[Fix Specific] ⚠️ ${username} - Baseline já estava correto, nada a fazer`);
          results.push({
            username,
            success: true,
            xp_gained: 0,
            message: "Baseline já estava correto (já foi corrigido antes)",
            baseline: {
              commits: stats.baseline_commits,
              prs: stats.baseline_prs,
              issues: stats.baseline_issues,
            },
          });
          usersCorrected++;
          continue;
        }

        // Calcular quanto XP deve ser dado pelos últimos 7 dias
        // Usamos weeklyStats (que já foi buscado) para saber exatamente quantos commits/prs/issues temos nos últimos 7 dias
        const xpToGiveFromWeekly = {
          commits: weeklyStats.commits,
          prs: weeklyStats.prs,
          issues: weeklyStats.issues,
        };

        console.log(`[Fix Specific] ${username} - XP a dar (últimos 7 dias):`, xpToGiveFromWeekly);

        // Aplicar multiplicadores de classe
        const commitsMultiplier = getClassXpMultiplier(character.class, "commits");
        const prsMultiplier = getClassXpMultiplier(character.class, "pullRequests");
        const issuesMultiplier = getClassXpMultiplier(character.class, "issuesResolved");

        // Calcular XP dos últimos 7 dias
        const commitsXp = xpToGiveFromWeekly.commits * 10 * commitsMultiplier;
        const prsXp = xpToGiveFromWeekly.prs * 50 * prsMultiplier;
        const issuesXp = xpToGiveFromWeekly.issues * 25 * issuesMultiplier;
        const totalXpToAdd = Math.round(commitsXp + prsXp + issuesXp);

        console.log(`[Fix Specific] ${username} - XP calculado (últimos 7 dias):`, {
          commits: `${xpToGiveFromWeekly.commits} × 10 × ${commitsMultiplier} = ${commitsXp}`,
          prs: `${xpToGiveFromWeekly.prs} × 50 × ${prsMultiplier} = ${prsXp}`,
          issues: `${xpToGiveFromWeekly.issues} × 25 × ${issuesMultiplier} = ${issuesXp}`,
          total: totalXpToAdd,
        });

        // Atualizar baseline no github_stats
        const { error: updateStatsError } = await supabase
          .from("github_stats")
          .update({
            baseline_commits: newBaselineCommits,
            baseline_prs: newBaselinePRs,
            baseline_issues: newBaselineIssues,
            total_commits: totalCommits,
            total_prs: totalPRs,
            total_issues: totalIssues,
          })
          .eq("user_id", userData.id);

        if (updateStatsError) {
          console.error(`[Fix Specific] ❌ ${username} - Erro ao atualizar stats:`, updateStatsError);
          results.push({
            username,
            success: false,
            error: updateStatsError.message,
          });
          continue;
        }

        // Se houver XP para adicionar, atualizar personagem
        if (totalXpToAdd > 0) {
          const newTotalXp = character.total_xp + totalXpToAdd;
          const newLevel = getLevelFromXp(newTotalXp);

          const { error: updateCharError } = await supabase
            .from("characters")
            .update({
              total_xp: newTotalXp,
              level: newLevel,
              current_xp: getCurrentXp(newTotalXp, newLevel),
            })
            .eq("id", character.id);

          if (updateCharError) {
            console.error(`[Fix Specific] ❌ ${username} - Erro ao atualizar personagem:`, updateCharError);
            results.push({
              username,
              success: false,
              error: updateCharError.message,
            });
            continue;
          }

          console.log(`[Fix Specific] ✅ ${username} - ${totalXpToAdd} XP | Level ${character.level} → ${newLevel}`);

          results.push({
            username,
            success: true,
            xp_gained: totalXpToAdd,
            old_level: character.level,
            new_level: newLevel,
            old_baseline: {
              commits: stats.baseline_commits,
              prs: stats.baseline_prs,
              issues: stats.baseline_issues,
            },
            new_baseline: {
              commits: newBaselineCommits,
              prs: newBaselinePRs,
              issues: newBaselineIssues,
            },
          });

          totalXpGiven += totalXpToAdd;
          usersCorrected++;
        } else {
          console.log(`[Fix Specific] ✅ ${username} - Baseline corrigido (sem XP adicional)`);

          results.push({
            username,
            success: true,
            xp_gained: 0,
            message: "Baseline corrigido, sem XP adicional nos últimos 7 dias",
            old_baseline: {
              commits: stats.baseline_commits,
              prs: stats.baseline_prs,
              issues: stats.baseline_issues,
            },
            new_baseline: {
              commits: newBaselineCommits,
              prs: newBaselinePRs,
              issues: newBaselineIssues,
            },
          });

          usersCorrected++;
        }

        // Delay de 1 segundo entre usuários para não sobrecarregar a API do GitHub
        if (usersProcessed < usersToFix.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`[Fix Specific] ❌ ${username} - Erro:`, error);
        results.push({
          username,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(`[Fix Specific] Concluído: ${usersCorrected}/${usersProcessed} usuários corrigidos`);

    return NextResponse.json({
      success: true,
      message: `Correção concluída: ${usersCorrected}/${usersProcessed} usuários processados`,
      data: {
        users_processed: usersProcessed,
        users_corrected: usersCorrected,
        total_xp_given: totalXpGiven,
        results,
      },
    });
  } catch (error) {
    console.error("[Fix Specific] Erro geral:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
