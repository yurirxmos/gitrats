import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentXp, getLevelFromXp } from "@/lib/xp-system";
import { getAdminUser } from "@/lib/auth-utils";
import { getAchievementXpTotal } from "@/lib/github-activity-ledger";

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
        { error: "username é obrigatório" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: userData, error } = await supabase
      .from("users")
      .select(
        "id, github_username, characters(id, class, total_xp, level, current_xp)",
      )
      .eq("github_username", username)
      .single();

    if (error || !userData) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 },
      );
    }

    const character = Array.isArray(userData.characters)
      ? userData.characters[0]
      : userData.characters;

    if (!character) {
      return NextResponse.json(
        { error: "Usuário sem personagem" },
        { status: 400 },
      );
    }

    const { data: activityEvents, error: eventsError } = await supabase
      .from("github_activity_events")
      .select(
        "id, activity_type, external_id, repo_name, title, occurred_at, url",
      )
      .eq("user_id", userData.id)
      .order("occurred_at", { ascending: false });

    if (eventsError) {
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("xp_ledger")
      .select("activity_event_id, xp_amount, source_type, rule_version")
      .eq("user_id", userData.id)
      .eq("source_type", "github_activity");

    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }

    const achievementsXp = await getAchievementXpTotal(supabase, userData.id);
    const events = activityEvents || [];
    const xpFromActivities = (ledgerRows || []).reduce(
      (sum, row) => sum + (row.xp_amount || 0),
      0,
    );
    const totalXp = xpFromActivities + achievementsXp;
    const level = getLevelFromXp(totalXp);
    const currentXp = getCurrentXp(totalXp, level);

    return NextResponse.json({
      username,
      stats: {
        commits: events.filter((event) => event.activity_type === "commit")
          .length,
        prs: events.filter((event) => event.activity_type === "pull_request")
          .length,
        issues: events.filter((event) => event.activity_type === "issue")
          .length,
        total_events: events.length,
      },
      xp_breakdown: {
        activity_total: xpFromActivities,
        achievements: achievementsXp,
        total: totalXp,
      },
      derived: { level, current_xp: currentXp },
      current_character: {
        total_xp: character.total_xp,
        level: character.level,
        current_xp: character.current_xp,
      },
      recent_events: events.slice(0, 20),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
