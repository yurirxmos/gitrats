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

    // Tentar obter token do header Authorization como fallback
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: "",
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("id, github_username, github_access_token, created_at")
      .eq("id", user.id)
      .single();

    if (!userData || !userData.github_username) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Se não há token no banco, tentar obter da sessão atual e salvar
    if (!userData.github_access_token) {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const providerToken = session?.provider_token;

      if (providerToken) {
        const { error: updateTokenError } = await supabase
          .from("users")
          .update({
            github_access_token: providerToken,
          })
          .eq("id", user.id);

        if (updateTokenError) {
          console.error("[Sync] Erro ao salvar token:", updateTokenError);
        } else {
          // Atualizar userData com o token
          userData.github_access_token = providerToken;
        }
      } else {
        try {
          await supabase.auth.signOut();
        } catch (logoutError) {
          console.error(`[Sync] ${userData.github_username} - Erro ao fazer logout:`, logoutError);
        }

        return NextResponse.json(
          {
            error: "Token GitHub expirado. Você foi desconectado para renovar o acesso.",
            username: userData.github_username,
            action: "logout_required",
            redirect_to: "/auth/login",
          },
          { status: 401 }
        );
      }
    }

    const userCreatedAt = userData.created_at ? new Date(userData.created_at) : new Date();

    const { data: character } = await supabase
      .from("characters")
      .select("id, name, class, level, current_xp, total_xp")
      .eq("user_id", userData.id)
      .single();

    if (!character) {
      return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }

    const githubService = new GitHubService(userData.github_access_token || undefined);
    const githubStats = await githubService.getUserStats(userData.github_username);

    // Buscar ou criar registro de stats
    let { data: currentStats } = await supabase
      .from("github_stats")
      .select(
        "total_commits, total_prs, total_issues, total_reviews, baseline_commits, baseline_prs, baseline_issues, baseline_reviews, last_sync_at"
      )
      .eq("user_id", userData.id)
      .maybeSingle();

    // Se não existir registro, criar e buscar novamente
    if (!currentStats) {
      const { error: insertError } = await supabase.from("github_stats").insert({
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

      if (insertError) {
        console.error("[Sync] Erro ao criar github_stats:", insertError);
        return NextResponse.json({ error: "Erro ao criar estatísticas" }, { status: 500 });
      }

      // Buscar o registro recém-criado
      const { data: newStats, error: fetchError } = await supabase
        .from("github_stats")
        .select(
          "total_commits, total_prs, total_issues, total_reviews, baseline_commits, baseline_prs, baseline_issues, baseline_reviews, last_sync_at"
        )
        .eq("user_id", userData.id)
        .single();

      if (fetchError || !newStats) {
        console.error("[Sync] Erro ao buscar stats recém-criados:", fetchError);
        return NextResponse.json({ error: "Erro ao buscar estatísticas" }, { status: 500 });
      }

      currentStats = newStats;
    }

    const isFirstSync = !currentStats.last_sync_at;

    // VERIFICAR SE PRECISA CORRIGIR XP INICIAL (usuários antigos)
    // Se baseline = total, significa que não recebeu XP inicial dos últimos 7 dias
    const needsInitialXpFix =
      !isFirstSync &&
      currentStats.baseline_commits === currentStats.total_commits &&
      currentStats.baseline_prs === currentStats.total_prs &&
      currentStats.total_commits > 0; // Só corrige se tiver commits

    if (needsInitialXpFix) {
      // Buscar atividades dos últimos 7 dias
      let weeklyStats = { commits: 0, prs: 0, issues: 0, reviews: 0 };

      try {
        weeklyStats = await githubService.getWeeklyXp(userData.github_username);
      } catch (error) {
        console.error("[Sync - Fix] Erro ao buscar XP semanal, usando 0:", error);
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

      // Atualizar baseline
      await supabase
        .from("github_stats")
        .update({
          total_commits: githubStats.totalCommits,
          total_prs: githubStats.totalPRs,
          total_issues: githubStats.totalIssues,
          baseline_commits: newBaselineCommits,
          baseline_prs: newBaselinePRs,
          baseline_issues: newBaselineIssues,
          last_sync_at: new Date().toISOString(),
        })
        .eq("user_id", userData.id);

      // Adicionar XP retroativo se houver
      if (retroactiveXp > 0) {
        const newTotalXp = character.total_xp + retroactiveXp;
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

        return NextResponse.json({
          success: true,
          message: `Correção aplicada! Você ganhou ${retroactiveXp} XP pelas suas atividades da última semana`,
          data: {
            xp_gained: retroactiveXp,
            new_total_xp: newTotalXp,
            new_level: newLevel,
            leveled_up: newLevel > character.level,
            corrected: true,
            stats: {
              commits: weeklyStats.commits,
              prs: weeklyStats.prs,
              issues: weeklyStats.issues,
              total_commits: githubStats.totalCommits,
              total_prs: githubStats.totalPRs,
            },
          },
        });
      } else {
        return NextResponse.json({
          success: true,
          message: "Baseline corrigido, sem atividades nos últimos 7 dias",
          data: {
            xp_gained: 0,
            corrected: true,
            stats: {
              commits: 0,
              prs: 0,
              total_commits: githubStats.totalCommits,
              total_prs: githubStats.totalPRs,
            },
          },
        });
      }
    }

    if (isFirstSync) {
      // PRIMEIRA SYNC: Pegar atividades desde a data de criação do usuário
      // Isso garante que apenas atividades após o registro sejam contabilizadas
      let activitiesSinceJoin = { commits: 0, prs: 0, issues: 0, reviews: 0 };

      try {
        // Buscar atividades desde a data de criação do usuário
        activitiesSinceJoin = await githubService.getActivitiesSince(userData.github_username, userCreatedAt);
      } catch (error) {
        console.error("[Sync - First] Erro ao buscar atividades desde o registro:", error);
        // Continua com 0, não falha a primeira sync
      }

      // Calcular baseline: total atual MENOS as atividades desde o registro
      // Assim apenas atividades após o registro vão gerar XP
      const baselineCommits = Math.max(0, githubStats.totalCommits - activitiesSinceJoin.commits);
      const baselinePRs = Math.max(0, githubStats.totalPRs - activitiesSinceJoin.prs);
      const baselineIssues = Math.max(0, githubStats.totalIssues - activitiesSinceJoin.issues);

      // Para o XP inicial, usar apenas os últimos 7 dias (não todas as atividades desde o registro)
      let weeklyStats = { commits: 0, prs: 0, issues: 0, reviews: 0 };
      try {
        weeklyStats = await githubService.getWeeklyXp(userData.github_username);
      } catch (error) {
        console.error("[Sync - First] Erro ao buscar XP semanal:", error);
      }

      // Aplicar multiplicadores de classe
      const commitMultiplier = getClassXpMultiplier(character.class as any, "commits");
      const prMultiplier = getClassXpMultiplier(character.class as any, "pullRequests");
      const issueMultiplier = getClassXpMultiplier(character.class as any, "issuesResolved");

      // Calcular XP inicial (apenas últimos 7 dias)
      const xpFromCommits = Math.floor(weeklyStats.commits * 10 * commitMultiplier);
      const xpFromPRs = Math.floor(weeklyStats.prs * 50 * prMultiplier);
      const xpFromIssues = Math.floor(weeklyStats.issues * 25 * issueMultiplier);
      const initialXp = xpFromCommits + xpFromPRs + xpFromIssues;

      // Atualizar stats com baseline ajustado
      const { error: upsertError } = await supabase
        .from("github_stats")
        .update({
          total_commits: githubStats.totalCommits,
          total_prs: githubStats.totalPRs,
          total_issues: githubStats.totalIssues,
          baseline_commits: baselineCommits,
          baseline_prs: baselinePRs,
          baseline_issues: baselineIssues,
          baseline_reviews: 0,
          last_sync_at: new Date().toISOString(),
        })
        .eq("user_id", userData.id);

      if (upsertError) {
        console.error(`[Sync] Erro ao atualizar github_stats:`, upsertError);
        return NextResponse.json({ error: `Erro ao salvar stats: ${upsertError.message}` }, { status: 500 });
      }

      // Atualizar personagem com XP inicial
      if (initialXp > 0) {
        const newTotalXp = character.total_xp + initialXp;
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

        return NextResponse.json({
          success: true,
          message: `Bem-vindo! Você ganhou ${initialXp} XP pelas suas atividades da última semana`,
          data: {
            xp_gained: initialXp,
            new_total_xp: newTotalXp,
            new_level: newLevel,
            activities_synced: weeklyStats.commits + weeklyStats.prs + weeklyStats.issues,
            stats: {
              commits: weeklyStats.commits,
              prs: weeklyStats.prs,
              issues: weeklyStats.issues,
              total_commits: githubStats.totalCommits,
              total_prs: githubStats.totalPRs,
              total_since_join: activitiesSinceJoin.commits + activitiesSinceJoin.prs + activitiesSinceJoin.issues,
            },
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Conta sincronizada! Seu histórico anterior foi ignorado.",
        data: {
          xp_gained: 0,
          activities_synced: 0,
          stats: {
            commits: 0,
            prs: 0,
            total_commits: githubStats.totalCommits,
            total_prs: githubStats.totalPRs,
            total_since_join: activitiesSinceJoin.commits + activitiesSinceJoin.prs,
          },
        },
      });
    }

    const newCommits = githubStats.totalCommits - (currentStats.total_commits || 0);
    const newPRs = githubStats.totalPRs - (currentStats.total_prs || 0);
    const newIssues = githubStats.totalIssues - (currentStats.total_issues || 0);

    const commitMultiplier = getClassXpMultiplier(character.class as any, "commits");
    const prMultiplier = getClassXpMultiplier(character.class as any, "pullRequests");
    const issueMultiplier = getClassXpMultiplier(character.class as any, "issuesResolved");

    const xpFromCommits = Math.floor(newCommits * 10 * commitMultiplier);
    const xpFromPRs = Math.floor(newPRs * 50 * prMultiplier);
    const xpFromIssues = Math.floor(newIssues * 25 * issueMultiplier);
    const totalXpGained = xpFromCommits + xpFromPRs + xpFromIssues;

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
      console.error(`[Sync] Erro ao atualizar github_stats:`, updateStatsError);
    }
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
