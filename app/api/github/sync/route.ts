import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getCurrentXp, getLevelFromXp } from "@/lib/xp-system";
import { recalculateGuildTotalsForUser } from "@/lib/guild";
import {
  fetchGitHubActivityEvents,
  getAchievementXpTotal,
  rebuildGithubActivityLedger,
  upsertGitHubActivityEvents,
} from "@/lib/github-activity-ledger";
import type { CharacterClass } from "@/lib/classes";

const MIN_SYNC_INTERVAL_MS = 90 * 1000;
const SYNC_OVERLAP_MS = 60 * 60 * 1000;

function getSyncStartDate(
  createdAt: string | null,
  lastSyncAt: string | null,
): Date {
  const now = new Date();
  const createdDate = createdAt ? new Date(createdAt) : now;
  const safeCreatedAt = Number.isNaN(createdDate.getTime()) ? now : createdDate;
  const firstEligibleActivity = new Date(safeCreatedAt);
  firstEligibleActivity.setDate(firstEligibleActivity.getDate() - 7);

  if (!lastSyncAt) {
    return firstEligibleActivity;
  }

  const lastSyncDate = new Date(lastSyncAt);
  if (Number.isNaN(lastSyncDate.getTime())) {
    return firstEligibleActivity;
  }

  const overlapStart = new Date(lastSyncDate.getTime() - SYNC_OVERLAP_MS);
  return overlapStart > firstEligibleActivity
    ? overlapStart
    : firstEligibleActivity;
}

function buildMessage(xpDelta: number, eventCount: number): string {
  if (xpDelta > 0) {
    return `+${xpDelta} XP | ${eventCount} atividades sincronizadas`;
  }

  if (xpDelta < 0) {
    return `XP recalculado em ${Math.abs(xpDelta)} ponto(s)`;
  }

  return eventCount > 0
    ? "Atividades sincronizadas sem alteração de XP"
    : "Nenhuma atividade nova";
}

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: userData, error: userError } = await admin
      .from("users")
      .select("id, github_username, github_access_token, created_at")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.github_username) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const sessionToken = session?.provider_token;
    const githubToken = sessionToken || userData.github_access_token;

    if (sessionToken && sessionToken !== userData.github_access_token) {
      await admin
        .from("users")
        .update({ github_access_token: sessionToken })
        .eq("id", user.id);
    }

    if (!githubToken) {
      return NextResponse.json(
        {
          error:
            "Token GitHub expirado. Reconecte sua conta GitHub para continuar ganhando XP.",
          action: "reconnect_required",
          reconnect_to: "/",
        },
        { status: 401 },
      );
    }

    const { data: character, error: characterError } = await admin
      .from("characters")
      .select("id, class, level, total_xp, current_xp")
      .eq("user_id", user.id)
      .single();

    if (characterError || !character) {
      return NextResponse.json(
        { error: "Personagem não encontrado" },
        { status: 404 },
      );
    }

    const { data: currentStats } = await admin
      .from("github_stats")
      .select("last_sync_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (currentStats?.last_sync_at) {
      const elapsedMs =
        Date.now() - new Date(currentStats.last_sync_at).getTime();
      if (elapsedMs < MIN_SYNC_INTERVAL_MS) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: "cooldown",
          retry_after_seconds: Math.ceil(
            (MIN_SYNC_INTERVAL_MS - elapsedMs) / 1000,
          ),
          message:
            "Sincronização recente. Aguarde antes de sincronizar novamente.",
        });
      }
    }

    const githubService = new GitHubService(githubToken);
    const syncStartDate = getSyncStartDate(
      userData.created_at,
      currentStats?.last_sync_at || null,
    );
    const syncEndDate = new Date();

    const events = await fetchGitHubActivityEvents(
      githubService,
      user.id,
      userData.github_username,
      syncStartDate,
      syncEndDate,
    );

    await upsertGitHubActivityEvents(admin, events);

    const activitySummary = await rebuildGithubActivityLedger(
      admin,
      user.id,
      character.class as CharacterClass,
    );

    const achievementsXp = await getAchievementXpTotal(admin, user.id);
    const totalXp = activitySummary.activityXp + achievementsXp;
    const newLevel = getLevelFromXp(totalXp);
    const newCurrentXp = getCurrentXp(totalXp, newLevel);
    const syncedAt = new Date().toISOString();

    const { error: updateCharacterError } = await admin
      .from("characters")
      .update({
        total_xp: totalXp,
        level: newLevel,
        current_xp: newCurrentXp,
      })
      .eq("id", character.id);

    if (updateCharacterError) {
      return NextResponse.json(
        { error: updateCharacterError.message },
        { status: 500 },
      );
    }

    const { error: updateStatsError } = await admin.from("github_stats").upsert(
      {
        user_id: user.id,
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

    if (updateStatsError) {
      return NextResponse.json(
        { error: updateStatsError.message },
        { status: 500 },
      );
    }

    try {
      await recalculateGuildTotalsForUser(admin, user.id);
    } catch (error) {
      console.error("[Sync] Falha ao atualizar XP da guilda:", error);
    }

    const xpDelta = totalXp - (character.total_xp || 0);
    const eventCount = events.length;

    return NextResponse.json({
      success: true,
      message: buildMessage(xpDelta, eventCount),
      data: {
        xp_gained: xpDelta,
        new_total_xp: totalXp,
        new_level: newLevel,
        leveled_up: newLevel > (character.level || 0),
        activities_synced: eventCount,
        synced_window: {
          from: syncStartDate.toISOString(),
          to: syncEndDate.toISOString(),
        },
        stats: {
          commits: activitySummary.commits,
          prs: activitySummary.prs,
          issues: activitySummary.issues,
        },
      },
    });
  } catch (error) {
    console.error("[Sync] Erro:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar" },
      { status: 500 },
    );
  }
}
