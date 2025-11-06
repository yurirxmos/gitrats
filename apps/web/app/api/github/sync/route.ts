import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCommitXp,
  calculatePullRequestXp,
  getLevelFromXp,
  getCurrentXp,
  XP_CONSTANTS,
} from "@/lib/xp-system";
import type { CharacterClass } from "@/lib/classes";

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

    // Cooldown check
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
          },
          { status: 429 }
        );
      }
    }

    const characterClass = character.class as CharacterClass;
    const githubToken = userData.github_access_token;

    if (!githubToken) {
      return NextResponse.json({ error: "Token do GitHub não encontrado" }, { status: 400 });
    }

    let totalXpGained = 0;
    const activities: any[] = [];
    let skippedDuplicates = 0;
    let cappedActivities = 0;

    const currentDailyXp = await getDailyXp(supabase, userData.id);
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const eventsResponse = await fetch(
      `https://api.github.com/users/${userData.github_username}/events?per_page=100`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!eventsResponse.ok) {
      return NextResponse.json({ error: "Erro ao buscar eventos do GitHub" }, { status: eventsResponse.status });
    }

    const events = await eventsResponse.json();

    const pushEvents = events.filter((e: any) => e.type === "PushEvent" && new Date(e.created_at) >= since);

    for (const event of pushEvents) {
      const commits = event.payload?.commits || [];
      for (const commit of commits) {
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

        const repoName = event.repo.name;
        const commitDetailsResponse = await fetch(`https://api.github.com/repos/${repoName}/commits/${commitSha}`, {
          headers: { Authorization: `token ${githubToken}`, Accept: "application/vnd.github+json" },
        });

        let linesChanged = 100;
        if (commitDetailsResponse.ok) {
          const commitDetails = await commitDetailsResponse.json();
          linesChanged = (commitDetails.stats?.additions || 0) + (commitDetails.stats?.deletions || 0);
        }

        const isOwnRepo = event.repo.name.startsWith(`${userData.github_username}/`);
        let xp = calculateCommitXp(linesChanged, isOwnRepo, characterClass);

        const dailyCommitXp = await getDailyXpByType(supabase, userData.id, "commit");
        if (currentDailyXp + totalXpGained + xp > XP_CONSTANTS.MAX_XP_PER_DAY) {
          xp = Math.max(0, XP_CONSTANTS.MAX_XP_PER_DAY - (currentDailyXp + totalXpGained));
          if (xp <= 0) break;
          cappedActivities++;
        }

        if (dailyCommitXp + xp > XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY) {
          xp = Math.max(0, XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY - dailyCommitXp);
          if (xp <= 0) continue;
          cappedActivities++;
        }

        totalXpGained += xp;
        activities.push({
          type: "commit",
          description: `Commit em ${repoName.split("/")[1] || repoName}`,
          xp,
          date: event.created_at,
          commit_sha: commitSha,
        });
      }
    }

    const prEvents = events.filter((e: any) => e.type === "PullRequestEvent" && new Date(e.created_at) >= since);

    for (const event of prEvents) {
      const pr = event.payload?.pull_request;
      if (!pr) continue;

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

      const repoName = event.repo.name;
      const isOwnRepo = repoName.startsWith(`${userData.github_username}/`);

      const repoResponse = await fetch(`https://api.github.com/repos/${repoName}`, {
        headers: { Authorization: `token ${githubToken}`, Accept: "application/vnd.github+json" },
      });

      let repoStars = 0;
      if (repoResponse.ok) {
        const repoData = await repoResponse.json();
        repoStars = repoData.stargazers_count || 0;
      }

      let status: "opened" | "merged" | "closed" = "opened";
      if (event.payload?.action === "closed") {
        status = pr.merged ? "merged" : "closed";
      }

      let xp = calculatePullRequestXp(status, isOwnRepo, repoStars, characterClass);

      const dailyPrXp = await getDailyXpByType(supabase, userData.id, "pull_request");
      if (currentDailyXp + totalXpGained + xp > XP_CONSTANTS.MAX_XP_PER_DAY) {
        xp = Math.max(0, XP_CONSTANTS.MAX_XP_PER_DAY - (currentDailyXp + totalXpGained));
        if (xp <= 0) break;
        cappedActivities++;
      }

      if (dailyPrXp + xp > XP_CONSTANTS.MAX_PR_XP_PER_DAY) {
        xp = Math.max(0, XP_CONSTANTS.MAX_PR_XP_PER_DAY - dailyPrXp);
        if (xp <= 0) continue;
        cappedActivities++;
      }

      totalXpGained += xp;
      activities.push({
        type: "pull_request",
        description: `PR ${status} em ${repoName.split("/")[1] || repoName}`,
        xp,
        date: event.created_at,
        pr_number: prNumber,
      });
    }

    if (totalXpGained > 0) {
      const newTotalXp = character.total_xp + totalXpGained;
      const newLevel = getLevelFromXp(newTotalXp);
      const newCurrentXp = getCurrentXp(newTotalXp, newLevel);

      await supabase
        .from("characters")
        .update({ total_xp: newTotalXp, level: newLevel, current_xp: newCurrentXp })
        .eq("id", character.id);

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
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao sincronizar" }, { status: 500 });
  }
}
