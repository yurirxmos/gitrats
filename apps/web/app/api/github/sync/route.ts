import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCommitXp,
  calculatePullRequestXp,
  getLevelFromXp,
  getCurrentXp,
  validateDailyXpCap,
  XP_CONSTANTS,
} from "@/lib/xp-system";
import type { CharacterClass } from "@/lib/classes";

/**
 * Calcula XP diário total do usuário
 */
async function getDailyXp(supabase: any, userId: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("activity_log")
    .select("xp_gained")
    .eq("user_id", userId)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lt("created_at", `${today}T23:59:59.999Z`);

  return data?.reduce((sum: number, row: any) => sum + (row.xp_gained || 0), 0) || 0;
}

/**
 * Calcula XP diário por tipo de atividade
 */
async function getDailyXpByType(supabase: any, userId: string, activityType: string): Promise<number> {
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("activity_log")
    .select("xp_gained")
    .eq("user_id", userId)
    .eq("activity_type", activityType)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lt("created_at", `${today}T23:59:59.999Z`);

  return data?.reduce((sum: number, row: any) => sum + (row.xp_gained || 0), 0) || 0;
}

/**
 * Endpoint de sincronização manual do GitHub
 * Busca commits e PRs recentes do usuário e atualiza XP
 *
 * Cooldown: 5 minutos entre syncs
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Obter usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar dados do usuário
    const { data: userData } = await supabase
      .from("users")
      .select("id, github_username, github_access_token")
      .eq("id", user.id)
      .single();

    if (!userData || !userData.github_username) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Buscar personagem
    const { data: character } = await supabase
      .from("characters")
      .select("id, name, class, level, current_xp, total_xp")
      .eq("user_id", userData.id)
      .single();

    if (!character) {
      return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }

    // Verificar cooldown (5 minutos)
    const { data: stats } = await supabase
      .from("github_stats")
      .select("last_sync_at")
      .eq("user_id", userData.id)
      .single();

    if (stats?.last_sync_at) {
      const lastSync = new Date(stats.last_sync_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSync.getTime()) / 1000 / 60;

      if (diffMinutes < 5) {
        const waitTime = Math.ceil(5 - diffMinutes);
        return NextResponse.json(
          {
            error: "Cooldown ativo",
            message: `Aguarde ${waitTime} minuto(s) para sincronizar novamente`,
            nextSyncAt: new Date(lastSync.getTime() + 5 * 60 * 1000).toISOString(),
          },
          { status: 429 }
        );
      }
    }

    const characterClass = character.class as CharacterClass;

    // Usar token OAuth do usuário (melhor para rate limits)
    // Cada usuário tem sua própria quota de 5.000 req/hora
    const githubToken = userData.github_access_token;

    if (!githubToken) {
      return NextResponse.json(
        {
          error: "Token do GitHub não encontrado",
          message: "Faça login novamente para sincronizar",
        },
        { status: 400 }
      );
    }

    let totalXpGained = 0;
    const activities: any[] = [];
    let skippedDuplicates = 0;
    let cappedActivities = 0;

    // Obter XP diário atual
    const currentDailyXp = await getDailyXp(supabase, userData.id);

    // Buscar commits recentes (últimos 7 dias)
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const commitsResponse = await fetch(
      `https://api.github.com/search/commits?q=author:${userData.github_username}+committer-date:>${since.toISOString().split("T")[0]}&sort=committer-date&order=desc&per_page=100`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.cloak-preview+json",
        },
      }
    );

    if (commitsResponse.ok) {
      const commitsData = await commitsResponse.json();
      const commits = commitsData.items || [];

      for (const commit of commits) {
        // Verificar se commit já foi processado (usando SHA como chave única)
        const commitSha = commit.sha;

        const { data: existingActivity } = await supabase
          .from("activity_log")
          .select("id")
          .eq("user_id", userData.id)
          .eq("commit_sha", commitSha)
          .single();

        if (existingActivity) {
          skippedDuplicates++;
          continue;
        }

        const stats = commit.stats || { additions: 0, deletions: 0 };
        const linesChanged = stats.additions + stats.deletions;
        const isOwnRepo = commit.repository?.owner?.login === userData.github_username;

        let xp = calculateCommitXp(linesChanged, isOwnRepo, characterClass);

        // Validar caps diários
        const dailyCommitXp = await getDailyXpByType(supabase, userData.id, "commit");
        const totalAfterThis = currentDailyXp + totalXpGained + xp;

        // Cap geral de XP diário
        if (totalAfterThis > XP_CONSTANTS.MAX_XP_PER_DAY) {
          const allowedXp = Math.max(0, XP_CONSTANTS.MAX_XP_PER_DAY - (currentDailyXp + totalXpGained));
          if (allowedXp <= 0) break; // Stop processing if daily cap reached
          xp = allowedXp;
          cappedActivities++;
        }

        // Cap de commits diário
        if (dailyCommitXp + xp > XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY) {
          xp = Math.max(0, XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY - dailyCommitXp);
          if (xp <= 0) continue;
          cappedActivities++;
        }

        totalXpGained += xp;

        activities.push({
          type: "commit",
          description: `Commit em ${commit.repository?.name || "unknown"}`,
          xp,
          date: commit.commit.committer.date,
          commit_sha: commitSha,
        });
      }
    }

    // Buscar PRs recentes
    const prsResponse = await fetch(
      `https://api.github.com/search/issues?q=type:pr+author:${userData.github_username}+created:>${since.toISOString().split("T")[0]}&sort=created&order=desc&per_page=50`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (prsResponse.ok) {
      const prsData = await prsResponse.json();
      const prs = prsData.items || [];

      for (const pr of prs) {
        // Verificar se PR já foi processado (usando número da PR como chave única)
        const prNumber = pr.number;

        const { data: existingActivity } = await supabase
          .from("activity_log")
          .select("id")
          .eq("user_id", userData.id)
          .eq("pr_number", prNumber)
          .single();

        if (existingActivity) {
          skippedDuplicates++;
          continue;
        }

        const repoName = pr.repository_url?.split("/").pop() || "unknown";
        const isOwnRepo = pr.user?.login === userData.github_username;

        // Buscar detalhes do repo para stars
        const repoResponse = await fetch(pr.repository_url, {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        });

        let repoStars = 0;
        if (repoResponse.ok) {
          const repoData = await repoResponse.json();
          repoStars = repoData.stargazers_count || 0;
        }

        const status = pr.state === "closed" ? (pr.pull_request?.merged_at ? "merged" : "closed") : "opened";
        let xp = calculatePullRequestXp(status as any, isOwnRepo, repoStars, characterClass);

        // Validar caps diários
        const dailyPrXp = await getDailyXpByType(supabase, userData.id, "pull_request");
        const totalAfterThis = currentDailyXp + totalXpGained + xp;

        // Cap geral de XP diário
        if (totalAfterThis > XP_CONSTANTS.MAX_XP_PER_DAY) {
          const allowedXp = Math.max(0, XP_CONSTANTS.MAX_XP_PER_DAY - (currentDailyXp + totalXpGained));
          if (allowedXp <= 0) break; // Stop processing if daily cap reached
          xp = allowedXp;
          cappedActivities++;
        }

        // Cap de PRs diário
        if (dailyPrXp + xp > XP_CONSTANTS.MAX_PR_XP_PER_DAY) {
          xp = Math.max(0, XP_CONSTANTS.MAX_PR_XP_PER_DAY - dailyPrXp);
          if (xp <= 0) continue;
          cappedActivities++;
        }

        totalXpGained += xp;

        activities.push({
          type: "pull_request",
          description: `PR ${status} em ${repoName}`,
          xp,
          date: pr.created_at,
          pr_number: prNumber,
        });
      }
    }

    // Atualizar XP do personagem
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

      // Registrar atividades
      for (const activity of activities) {
        await supabase.from("activity_log").insert({
          user_id: userData.id,
          character_id: character.id,
          activity_type: activity.type,
          description: activity.description,
          xp_gained: activity.xp,
          total_xp_after: character.total_xp + activity.xp,
          level_after: getLevelFromXp(character.total_xp + activity.xp),
          commit_sha: activity.commit_sha || null,
          pr_number: activity.pr_number || null,
        });
      }
    }

    // Atualizar timestamp de última sincronização
    await supabase.from("github_stats").update({ last_sync_at: new Date().toISOString() }).eq("user_id", userData.id);

    return NextResponse.json({
      success: true,
      message: "Sincronização concluída!",
      data: {
        xp_gained: totalXpGained,
        activities_synced: activities.length,
        duplicates_skipped: skippedDuplicates,
        activities_capped: cappedActivities,
        new_total_xp: character.total_xp + totalXpGained,
        new_level: getLevelFromXp(character.total_xp + totalXpGained),
        next_sync_available: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        daily_xp_used: currentDailyXp + totalXpGained,
        daily_xp_remaining: Math.max(0, XP_CONSTANTS.MAX_XP_PER_DAY - (currentDailyXp + totalXpGained)),
      },
    });
  } catch (error) {
    console.error("❌ Erro na sincronização:", error);
    return NextResponse.json(
      {
        error: "Erro ao sincronizar",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
