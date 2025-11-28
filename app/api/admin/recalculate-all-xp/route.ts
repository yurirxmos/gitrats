import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getLevelFromXp, getCurrentXp } from "@/lib/xp-system";
import { getClassXpMultiplier } from "@/lib/classes";
import { getAdminUser } from "@/lib/auth-utils";

/**
 * ADMIN - Recalcula XP de TODOS os usuários do zero
 * Usa multiplicadores atualizados das classes
 * CUIDADO: Isso vai resetar e recalcular XP de todo mundo
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Acesso negado: apenas admin" }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Buscar TODOS os usuários com seus stats
    const { data: allUsers, error: userQueryError } = await supabase.from("users").select(
      `
        id,
        github_username,
        github_access_token,
        created_at,
        characters(
          id,
          class,
          name,
          created_at
        ),
        github_stats(
          total_commits,
          total_prs,
          total_issues,
          baseline_commits,
          baseline_prs,
          baseline_issues
        )
      `
    );

    if (userQueryError) {
      console.error("[Recalc XP] Erro ao buscar usuários:", userQueryError);
      return NextResponse.json({ error: userQueryError.message }, { status: 500 });
    }

    if (!allUsers || allUsers.length === 0) {
      return NextResponse.json({ success: true, message: "Nenhum usuário encontrado" });
    }

    const results = [];

    // Processar cada usuário
    for (const userData of allUsers) {
      const charArray = Array.isArray(userData.characters) ? userData.characters : [userData.characters];
      const character = charArray?.[0];

      const statsArray = Array.isArray(userData.github_stats) ? userData.github_stats : [userData.github_stats];
      const currentStats = statsArray?.[0];

      if (!character) {
        console.log(`[Recalc XP] ${userData.github_username} - Sem personagem, pulando`);
        continue;
      }

      try {
        console.log(`[Recalc XP] Processando ${userData.github_username}...`);

        const githubService = new GitHubService(userData.github_access_token || undefined);

        // Buscar stats atuais do GitHub
        const githubStats = await githubService.getUserStats(userData.github_username);

        // Data de referência: preferir criação do usuário (alinha com regra dos 7 dias anteriores)
        const userCreatedAt = userData.created_at ? new Date(userData.created_at) : new Date(character.created_at);
        const userCreatedAtStr = userCreatedAt.toISOString();
        const startWindow = new Date(userCreatedAt);
        startWindow.setDate(startWindow.getDate() - 7);

        console.log(
          `[Recalc XP] ${userData.github_username} - Criado em ${userCreatedAtStr.split("T")[0]}, recalculando DESDE ${startWindow.toISOString().split("T")[0]}`
        );

        // Buscar atividades DESDE 7 dias antes da criação até agora
        const activitiesSinceJoin = await githubService.getActivitiesSince(userData.github_username, startWindow);

        // Baseline correto = total atual - atividades desde a criação
        const baselineCommits = Math.max(0, githubStats.totalCommits - activitiesSinceJoin.commits);
        const baselinePRs = Math.max(0, githubStats.totalPRs - activitiesSinceJoin.prs);
        const baselineIssues = Math.max(0, githubStats.totalIssues - activitiesSinceJoin.issues);

        console.log(
          `[Recalc XP] ${userData.github_username} - Baseline: ${baselineCommits} commits, ${baselinePRs} PRs, ${baselineIssues} issues`
        );
        console.log(
          `[Recalc XP] ${userData.github_username} - Atividades desde join: ${activitiesSinceJoin.commits} commits, ${activitiesSinceJoin.prs} PRs, ${activitiesSinceJoin.issues} issues`
        );

        // Aplicar multiplicadores de classe ATUALIZADOS às atividades desde a criação
        const commitMultiplier = getClassXpMultiplier(character.class as any, "commits");
        const prMultiplier = getClassXpMultiplier(character.class as any, "pullRequests");
        const issueMultiplier = getClassXpMultiplier(character.class as any, "issuesResolved");

        // Cálculo simplificado para baseline: valores médios (commit=10, PR=25, issue=35) + multiplicadores de classe
        // Nota: O sistema real considera linhas de código, tipo de repositório, etc. Este é apenas um baseline aproximado.
        const xpFromCommits = Math.floor(activitiesSinceJoin.commits * 10 * commitMultiplier);
        const xpFromPRs = Math.floor(activitiesSinceJoin.prs * 25 * prMultiplier);
        const xpFromIssues = Math.floor(activitiesSinceJoin.issues * 35 * issueMultiplier);
        const activityXp = xpFromCommits + xpFromPRs + xpFromIssues;

        // Somar achievements existentes do usuário
        const { data: achievementsData } = await supabase
          .from("user_achievements")
          .select("achievement:achievements(code, xp_reward)")
          .eq("user_id", userData.id);

        let achievementsXp = 0;
        if (achievementsData && achievementsData.length > 0) {
          for (const item of achievementsData as any[]) {
            achievementsXp += item.achievement?.xp_reward || 0;
          }
        }

        const totalXp = activityXp + achievementsXp;

        const newLevel = getLevelFromXp(totalXp);
        const newCurrentXp = getCurrentXp(totalXp, newLevel);

        console.log(
          `[Recalc XP] ${userData.github_username} - XP: ${totalXp} (atividades ${activityXp} + achievements ${achievementsXp}) -> Level ${newLevel}`
        );

        // Atualizar github_stats mantendo o baseline correto
        const { error: updateStatsError } = await supabase
          .from("github_stats")
          .upsert(
            {
              user_id: userData.id,
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
          console.error(`[Recalc XP] ${userData.github_username} - Erro ao atualizar stats:`, updateStatsError);
          results.push({
            username: userData.github_username,
            success: false,
            error: updateStatsError.message,
          });
          continue;
        }

        // Atualizar personagem com XP recalculado
        const { error: updateCharError } = await supabase
          .from("characters")
          .update({
            total_xp: totalXp,
            level: newLevel,
            current_xp: newCurrentXp,
          })
          .eq("id", character.id)
          .select();

        if (updateCharError) {
          console.error(`[Recalc XP] ${userData.github_username} - Erro ao atualizar personagem:`, updateCharError);
          results.push({
            username: userData.github_username,
            success: false,
            error: updateCharError.message,
          });
          continue;
        }

        results.push({
          username: userData.github_username,
          class: character.class,
          success: true,
          new_total_xp: totalXp,
          new_level: newLevel,
          baseline: {
            commits: baselineCommits,
            prs: baselinePRs,
            issues: baselineIssues,
          },
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
        });

        // Delay para não sobrecarregar API do GitHub
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`[Recalc XP] ${userData.github_username} - Erro:`, error);
        results.push({
          username: userData.github_username,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalXpRecalculated = results.reduce((sum, r) => sum + (r.new_total_xp || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Recálculo concluído: ${successCount}/${results.length} usuários processados`,
      data: {
        users_processed: results.length,
        users_updated: successCount,
        total_xp_recalculated: totalXpRecalculated,
        results,
      },
    });
  } catch (error) {
    console.error("[Recalc XP] Erro geral:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao recalcular XP" },
      { status: 500 }
    );
  }
}
