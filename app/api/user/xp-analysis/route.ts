import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getClassXpMultiplier } from "@/lib/classes";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar dados do usuário e personagem
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, github_username")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const { data: character, error: charError } = await supabase
      .from("characters")
      .select("class, total_xp")
      .eq("user_id", userId)
      .single();

    if (charError || !character) {
      return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }

    // Buscar estatísticas do GitHub
    const { data: stats, error: statsError } = await supabase
      .from("github_stats")
      .select("total_commits, total_prs, total_issues, baseline_commits, baseline_prs, baseline_issues")
      .eq("user_id", userId)
      .single();

    if (statsError || !stats) {
      return NextResponse.json({ error: "Estatísticas não encontradas" }, { status: 404 });
    }

    // Calcular atividades após entrar na plataforma
    const commitsAfterJoin = Math.max(0, stats.total_commits - (stats.baseline_commits || 0));
    const prsAfterJoin = Math.max(0, stats.total_prs - (stats.baseline_prs || 0));
    const issuesAfterJoin = Math.max(0, stats.total_issues - (stats.baseline_issues || 0));

    // Obter multiplicadores da classe
    const commitMultiplier = getClassXpMultiplier(character.class as any, "commits");
    const prMultiplier = getClassXpMultiplier(character.class as any, "pullRequests");
    const issueMultiplier = getClassXpMultiplier(character.class as any, "issuesResolved");

    // Calcular XP por categoria
    const xpFromCommits = Math.floor(commitsAfterJoin * 10 * commitMultiplier);
    const xpFromPRs = Math.floor(prsAfterJoin * 50 * prMultiplier);
    const xpFromIssues = Math.floor(issuesAfterJoin * 25 * issueMultiplier);

    // Buscar achievements do usuário
    const { data: achievementsData } = await supabase
      .from("user_achievements")
      .select("achievement:achievements(code, name, xp_reward)")
      .eq("user_id", userId);

    let xpFromAchievements = 0;
    const achievements = [];
    if (achievementsData && achievementsData.length > 0) {
      for (const item of achievementsData as any[]) {
        if (item.achievement) {
          xpFromAchievements += item.achievement.xp_reward || 0;
          achievements.push({
            code: item.achievement.code,
            name: item.achievement.name,
            xp_reward: item.achievement.xp_reward || 0,
          });
        }
      }
    }

    const totalXpCalculated = xpFromCommits + xpFromPRs + xpFromIssues + xpFromAchievements;

    return NextResponse.json({
      total_commits: stats.total_commits,
      total_prs: stats.total_prs,
      total_issues: stats.total_issues,
      baseline_commits: stats.baseline_commits || 0,
      baseline_prs: stats.baseline_prs || 0,
      baseline_issues: stats.baseline_issues || 0,
      commits_after_join: commitsAfterJoin,
      prs_after_join: prsAfterJoin,
      issues_after_join: issuesAfterJoin,
      commit_multiplier: commitMultiplier,
      pr_multiplier: prMultiplier,
      issue_multiplier: issueMultiplier,
      xp_from_commits: xpFromCommits,
      xp_from_prs: xpFromPRs,
      xp_from_issues: xpFromIssues,
      xp_from_achievements: xpFromAchievements,
      achievements,
      total_xp_calculated: totalXpCalculated,
    });
  } catch (error: any) {
    console.error("[XP Analysis] Erro:", error);
    return NextResponse.json({ error: error.message || "Erro ao calcular análise de XP" }, { status: 500 });
  }
}
