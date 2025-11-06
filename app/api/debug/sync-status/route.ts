import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";

/**
 * Endpoint de DEBUG para verificar status da sincronização
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    if (!userData) {
      return NextResponse.json({ error: "Usuário não encontrado no banco" }, { status: 404 });
    }

    // Buscar personagem
    const { data: character } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", userData.id)
      .single();

    // Buscar stats do GitHub no banco
    const { data: githubStats } = await supabase
      .from("github_stats")
      .select("*")
      .eq("user_id", userData.id)
      .single();

    // Buscar stats reais do GitHub via API
    let realGithubStats = null;
    try {
      if (userData.github_access_token && userData.github_username) {
        const githubService = new GitHubService(userData.github_access_token);
        realGithubStats = await githubService.getUserStats(userData.github_username);
      }
    } catch (error) {
      console.error("Erro ao buscar stats do GitHub:", error);
    }

    return NextResponse.json({
      user: {
        id: userData.id,
        github_username: userData.github_username,
        has_token: !!userData.github_access_token,
      },
      character: character || "Nenhum personagem criado",
      github_stats_db: githubStats || "Nenhum registro de stats",
      github_stats_real: realGithubStats
        ? {
            totalCommits: realGithubStats.totalCommits,
            totalPRs: realGithubStats.totalPRs,
            totalStars: realGithubStats.totalStars,
            totalRepos: realGithubStats.totalRepos,
          }
        : "Não foi possível buscar stats do GitHub",
      diff: githubStats && realGithubStats
        ? {
            commits_diff: realGithubStats.totalCommits - (githubStats.total_commits || 0),
            prs_diff: realGithubStats.totalPRs - (githubStats.total_prs || 0),
          }
        : null,
    });
  } catch (error) {
    console.error("Erro no debug:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao verificar status",
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 }
    );
  }
}
