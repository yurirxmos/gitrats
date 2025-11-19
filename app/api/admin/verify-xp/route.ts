import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getClassXpMultiplier } from "@/lib/classes";
import { getLevelFromXp, getCurrentXp } from "@/lib/xp-system";

// Admin util: verifica cálculo para um username seguindo a regra dos 7 dias antes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username: string = body.username;
    if (!username) return NextResponse.json({ error: "username é obrigatório" }, { status: 400 });

    const supabase = createAdminClient();
    const { data: userData, error } = await supabase
      .from("users")
      .select(
        `id, github_username, github_access_token, created_at, characters(id,class,total_xp,level,created_at), github_stats(total_commits,total_prs,total_issues,baseline_commits,baseline_prs,baseline_issues)`
      )
      .eq("github_username", username)
      .maybeSingle();

    if (error || !userData) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const character = Array.isArray(userData.characters) ? userData.characters[0] : userData.characters;
    if (!character) return NextResponse.json({ error: "Usuário sem personagem" }, { status: 400 });

    const token = userData.github_access_token || undefined;
    const github = new GitHubService(token);
    const stats = await github.getUserStats(username);

    const start = new Date(userData.created_at || character.created_at);
    start.setDate(start.getDate() - 7);

    const acts = await github.getActivitiesSince(username, start);

    const baseline = {
      commits: Math.max(0, stats.totalCommits - acts.commits),
      prs: Math.max(0, stats.totalPRs - acts.prs),
      issues: Math.max(0, stats.totalIssues - acts.issues),
    };

    const commitsMult = getClassXpMultiplier(character.class, "commits");
    const prsMult = getClassXpMultiplier(character.class, "pullRequests");
    const issuesMult = getClassXpMultiplier(character.class, "issuesResolved");

    const xpBreakdown = {
      commits: Math.floor(acts.commits * 10 * commitsMult),
      prs: Math.floor(acts.prs * 50 * prsMult),
      issues: Math.floor(acts.issues * 25 * issuesMult),
    };

    // achievements
    const { data: achievements } = await supabase
      .from("user_achievements")
      .select("achievement:achievements(code, xp_reward)")
      .eq("user_id", userData.id);
    const achievementsXp = (achievements || []).reduce((s: number, r: any) => s + (r.achievement?.xp_reward || 0), 0);

    const totalXp = xpBreakdown.commits + xpBreakdown.prs + xpBreakdown.issues + achievementsXp;
    const level = getLevelFromXp(totalXp);
    const currentXp = getCurrentXp(totalXp, level);

    return NextResponse.json({
      username,
      period: { from: start.toISOString(), to: new Date().toISOString() },
      github_totals: { commits: stats.totalCommits, prs: stats.totalPRs, issues: stats.totalIssues },
      baseline,
      activities: acts,
      xp_breakdown: { ...xpBreakdown, achievements: achievementsXp, total: totalXp },
      derived: { level, current_xp: currentXp },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
