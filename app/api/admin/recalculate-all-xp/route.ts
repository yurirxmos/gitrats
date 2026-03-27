import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getCurrentXp, getLevelFromXp } from "@/lib/xp-system";
import { getAdminUser } from "@/lib/auth-utils";
import { recalculateGuildTotalsForUser } from "@/lib/guild";
import {
  fetchGitHubActivityEvents,
  getAchievementXpTotal,
  rebuildGithubActivityLedger,
  replaceGitHubActivityEventsForUser,
} from "@/lib/github-activity-ledger";
import type { CharacterClass } from "@/lib/classes";

function getRecalculationStartDate(createdAt: string | null): Date {
  const base = createdAt ? new Date(createdAt) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
  const startDate = new Date(safeBase);
  startDate.setDate(startDate.getDate() - 7);
  return startDate;
}

export async function POST(_request: NextRequest) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json(
        { error: "Acesso negado: apenas admin" },
        { status: 403 },
      );
    }

    const supabase = createAdminClient();
    const { data: allUsers, error: userError } = await supabase
      .from("users")
      .select(
        "id, github_username, github_access_token, created_at, characters(id, class, level, total_xp, current_xp)",
      );

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!allUsers?.length) {
      return NextResponse.json({
        success: true,
        message: "Nenhum usuário encontrado",
        data: { users_processed: 0 },
      });
    }

    const results: Array<Record<string, unknown>> = [];

    for (const userRow of allUsers) {
      const character = Array.isArray(userRow.characters)
        ? userRow.characters[0]
        : userRow.characters;

      if (!character || !userRow.github_username) {
        continue;
      }

      try {
        const githubService = new GitHubService(
          userRow.github_access_token || undefined,
        );
        const startDate = getRecalculationStartDate(userRow.created_at);
        const endDate = new Date();

        const events = await fetchGitHubActivityEvents(
          githubService,
          userRow.id,
          userRow.github_username,
          startDate,
          endDate,
        );

        await replaceGitHubActivityEventsForUser(supabase, userRow.id, events);

        const activitySummary = await rebuildGithubActivityLedger(
          supabase,
          userRow.id,
          character.class as CharacterClass,
        );

        const achievementsXp = await getAchievementXpTotal(
          supabase,
          userRow.id,
        );
        const totalXp = activitySummary.activityXp + achievementsXp;
        const newLevel = getLevelFromXp(totalXp);
        const newCurrentXp = getCurrentXp(totalXp, newLevel);
        const syncedAt = new Date().toISOString();

        await supabase.from("github_stats").upsert(
          {
            user_id: userRow.id,
            total_commits: activitySummary.commits,
            total_prs: activitySummary.prs,
            total_issues: activitySummary.issues,
            total_reviews: 0,
            baseline_commits: 0,
            baseline_prs: 0,
            baseline_issues: 0,
            baseline_reviews: 0,
            last_sync_at: syncedAt,
          },
          { onConflict: "user_id" },
        );

        await supabase
          .from("characters")
          .update({
            total_xp: totalXp,
            level: newLevel,
            current_xp: newCurrentXp,
          })
          .eq("id", character.id);

        await recalculateGuildTotalsForUser(supabase, userRow.id);

        results.push({
          username: userRow.github_username,
          success: true,
          events_rebuilt: activitySummary.events,
          total_xp: totalXp,
          level: newLevel,
        });
      } catch (error) {
        results.push({
          username: userRow.github_username,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successCount = results.filter(
      (result) => result.success === true,
    ).length;
    const totalXpRecalculated = results.reduce((sum, result) => {
      const totalXp = typeof result.total_xp === "number" ? result.total_xp : 0;
      return sum + totalXp;
    }, 0);

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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao recalcular XP",
      },
      { status: 500 },
    );
  }
}
