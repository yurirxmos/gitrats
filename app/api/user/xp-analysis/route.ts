import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getAchievementXpTotal } from "@/lib/github-activity-ledger";
import { getClassXpMultiplier, type CharacterClass } from "@/lib/classes";

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");
    const userId = requestedUserId || user.id;

    if (userId !== user.id) {
      const { data: currentUserData, error: roleError } = await authClient
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (roleError || currentUserData?.role !== "admin") {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
    }

    const supabase = createAdminClient();
    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("class, total_xp")
      .eq("user_id", userId)
      .single();

    if (characterError || !character) {
      return NextResponse.json(
        { error: "Personagem não encontrado" },
        { status: 404 },
      );
    }

    const { data: events, error: eventsError } = await supabase
      .from("github_activity_events")
      .select("id, activity_type")
      .eq("user_id", userId);

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("xp_ledger")
      .select("xp_amount, source_ref, activity_event_id")
      .eq("user_id", userId)
      .eq("source_type", "github_activity");

    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }

    const achievementsXp = await getAchievementXpTotal(supabase, userId);
    const allEvents = events || [];
    const allLedgerRows = ledgerRows || [];

    const commitsAfterJoin = allEvents.filter(
      (event) => event.activity_type === "commit",
    ).length;
    const prsAfterJoin = allEvents.filter(
      (event) => event.activity_type === "pull_request",
    ).length;
    const issuesAfterJoin = allEvents.filter(
      (event) => event.activity_type === "issue",
    ).length;

    const xpFromCommits = allLedgerRows
      .filter((row) => row.source_ref?.startsWith("commit:"))
      .reduce((sum, row) => sum + (row.xp_amount || 0), 0);
    const xpFromPRs = allLedgerRows
      .filter((row) => row.source_ref?.startsWith("pull_request:"))
      .reduce((sum, row) => sum + (row.xp_amount || 0), 0);
    const xpFromIssues = allLedgerRows
      .filter((row) => row.source_ref?.startsWith("issue:"))
      .reduce((sum, row) => sum + (row.xp_amount || 0), 0);

    const { data: achievementsData } = await supabase
      .from("user_achievements")
      .select("achievement:achievements(code, name, xp_reward)")
      .eq("user_id", userId);

    const achievements = (achievementsData || []).flatMap((item) => {
      const achievement = Array.isArray(item.achievement)
        ? item.achievement[0]
        : item.achievement;
      if (!achievement) return [];

      return [
        {
          code: achievement.code,
          name: achievement.name,
          xp_reward: achievement.xp_reward || 0,
        },
      ];
    });

    const characterClass = character.class as CharacterClass;
    const commitMultiplier = getClassXpMultiplier(characterClass, "commits");
    const prMultiplier = getClassXpMultiplier(characterClass, "pullRequests");
    const issueMultiplier = getClassXpMultiplier(
      characterClass,
      "issuesResolved",
    );

    return NextResponse.json({
      total_commits: commitsAfterJoin,
      total_prs: prsAfterJoin,
      total_issues: issuesAfterJoin,
      baseline_commits: 0,
      baseline_prs: 0,
      baseline_issues: 0,
      commits_after_join: commitsAfterJoin,
      prs_after_join: prsAfterJoin,
      issues_after_join: issuesAfterJoin,
      commit_multiplier: commitMultiplier,
      pr_multiplier: prMultiplier,
      issue_multiplier: issueMultiplier,
      xp_from_commits: xpFromCommits,
      xp_from_prs: xpFromPRs,
      xp_from_issues: xpFromIssues,
      xp_from_achievements: achievementsXp,
      achievements,
      total_xp_calculated:
        xpFromCommits + xpFromPRs + xpFromIssues + achievementsXp,
    });
  } catch (error) {
    console.error("[XP Analysis] Erro:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao calcular análise de XP",
      },
      { status: 500 },
    );
  }
}
