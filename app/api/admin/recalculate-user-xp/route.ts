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

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json(
        { error: "Acesso negado: apenas admin" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const username = body?.username?.trim();

    if (!username) {
      return NextResponse.json(
        { error: "Username obrigatório" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select(
        "id, github_username, github_access_token, created_at, characters(id, class, level, total_xp, current_xp)",
      )
      .eq("github_username", username)
      .single();

    if (userError || !userRow) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    const character = Array.isArray(userRow.characters)
      ? userRow.characters[0]
      : userRow.characters;

    if (!character) {
      return NextResponse.json(
        { error: "Usuário sem personagem" },
        { status: 400 },
      );
    }

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

    const achievementsXp = await getAchievementXpTotal(supabase, userRow.id);
    const totalXp = activitySummary.activityXp + achievementsXp;
    const newLevel = getLevelFromXp(totalXp);
    const newCurrentXp = getCurrentXp(totalXp, newLevel);
    const syncedAt = new Date().toISOString();

    const { error: statsError } = await supabase.from("github_stats").upsert(
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

    if (statsError) {
      return NextResponse.json({ error: statsError.message }, { status: 500 });
    }

    const { error: characterError } = await supabase
      .from("characters")
      .update({ total_xp: totalXp, level: newLevel, current_xp: newCurrentXp })
      .eq("id", character.id);

    if (characterError) {
      return NextResponse.json(
        { error: characterError.message },
        { status: 500 },
      );
    }

    await recalculateGuildTotalsForUser(supabase, userRow.id);

    return NextResponse.json({
      success: true,
      username: userRow.github_username,
      new_total_xp: totalXp,
      new_level: newLevel,
      events_rebuilt: activitySummary.events,
      stats: {
        commits: activitySummary.commits,
        prs: activitySummary.prs,
        issues: activitySummary.issues,
      },
      xp_breakdown: {
        activity_total: activitySummary.activityXp,
        achievements: achievementsXp,
        total: totalXp,
      },
      synced_window: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
