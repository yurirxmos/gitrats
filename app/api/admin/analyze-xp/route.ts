import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getClassXpMultiplier } from "@/lib/classes";

/**
 * ADMIN: Analisa a origem do XP de um usuário
 * Recebe: { username }
 * Retorna: breakdown por commits/prs/issues/achievements e totais
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = body.username;

    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar o usuário com seus dados relevantes
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(
        `id, github_username, github_avatar_url, created_at, github_stats(total_commits,total_prs,total_issues,baseline_commits,baseline_prs,baseline_issues), characters(id,class,total_xp,level)`
      )
      .eq("github_username", username)
      .maybeSingle();

    if (userError) {
      console.error("Error fetching user for analyze-xp:", userError);
      return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stats = Array.isArray(userData.github_stats) ? userData.github_stats[0] : userData.github_stats;
    const character = Array.isArray(userData.characters) ? userData.characters[0] : userData.characters;

    // Safeguard
    if (!stats || !character) {
      return NextResponse.json({ error: "User has no character or github_stats" }, { status: 400 });
    }

    // Calcular atividades pós-baseline (o que gera XP)
    const commitsAfterJoin = Math.max(0, (stats.total_commits || 0) - (stats.baseline_commits || 0));
    const prsAfterJoin = Math.max(0, (stats.total_prs || 0) - (stats.baseline_prs || 0));
    const issuesAfterJoin = Math.max(0, (stats.total_issues || 0) - (stats.baseline_issues || 0));

    // Multiplicadores de classe
    const commitsMultiplier = getClassXpMultiplier(character.class, "commits");
    const prsMultiplier = getClassXpMultiplier(character.class, "pullRequests");
    const issuesMultiplier = getClassXpMultiplier(character.class, "issuesResolved");

    const commitsXp = Math.round(commitsAfterJoin * 10 * commitsMultiplier);
    const prsXp = Math.round(prsAfterJoin * 50 * prsMultiplier);
    const issuesXp = Math.round(issuesAfterJoin * 25 * issuesMultiplier);

    // Buscar achievements concedidos e somar xp
    const { data: achRaw, error: achError } = await supabase
      .from("user_achievements")
      .select("achievement:achievements(code, name, xp_reward)")
      .eq("user_id", userData.id);

    if (achError) console.error("Error fetching user achievements:", achError);

    const achievements = (achRaw || []).map((r: any) => ({
      code: r.achievement?.code,
      name: r.achievement?.name,
      xp: r.achievement?.xp_reward || 0,
    }));

    const achievementsXp = achievements.reduce((s: number, a: any) => s + (a.xp || 0), 0);

    const totalFromActivities = commitsXp + prsXp + issuesXp;
    const totalXp = totalFromActivities + achievementsXp;

    // Info final
    const breakdown = {
      username,
      user_id: userData.id,
      character: {
        id: character.id,
        class: character.class,
        level: character.level,
        total_xp: character.total_xp,
      },
      github_stats: {
        total_commits: stats.total_commits,
        baseline_commits: stats.baseline_commits,
        commits_after_join: commitsAfterJoin,
        total_prs: stats.total_prs,
        baseline_prs: stats.baseline_prs,
        prs_after_join: prsAfterJoin,
        total_issues: stats.total_issues,
        baseline_issues: stats.baseline_issues,
        issues_after_join: issuesAfterJoin,
      },
      xp: {
        commits: { count: commitsAfterJoin, multiplier: commitsMultiplier, xp: commitsXp },
        prs: { count: prsAfterJoin, multiplier: prsMultiplier, xp: prsXp },
        issues: { count: issuesAfterJoin, multiplier: issuesMultiplier, xp: issuesXp },
        achievements: { list: achievements, total_xp: achievementsXp },
        total_from_activities: totalFromActivities,
        total_xp: totalXp,
      },
    };

    return NextResponse.json({ data: breakdown });
  } catch (error) {
    console.error("[analyze-xp] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
