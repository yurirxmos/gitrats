import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCommitXp,
  calculatePullRequestXp,
  getLevelFromXp,
  getCurrentXp,
} from "@/lib/xp-system";
import type { CharacterClass } from "@/lib/classes";

/**
 * Endpoint de sincronização manual do GitHub
 * Busca commits e PRs recentes do usuário e atualiza XP
 * 
 * Cooldown: 5 minutos entre syncs
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Obter usuário autenticado
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

    if (!userData || !userData.github_username) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Buscar personagem
    const { data: character } = await supabase
      .from("characters")
      .select("id, name, class, level, current_xp, total_xp")
      .eq("user_id", userData.id)
      .single();

    if (!character) {
      return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }

    // Verificar cooldown (5 minutos)
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
            nextSyncAt: new Date(lastSync.getTime() + 5 * 60 * 1000).toISOString(),
          },
          { status: 429 }
        );
      }
    }

    const characterClass = character.class as CharacterClass;
    const githubToken = userData.github_access_token || process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json(
        { error: "Token do GitHub não encontrado" },
        { status: 400 }
      );
    }

    let totalXpGained = 0;
    const activities: any[] = [];

    // Buscar commits recentes (últimos 7 dias)
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const commitsResponse = await fetch(
      `https://api.github.com/search/commits?q=author:${userData.github_username}+committer-date:>${since.toISOString().split("T")[0]}&sort=committer-date&order=desc&per_page=100`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.cloak-preview+json",
        },
      }
    );

    if (commitsResponse.ok) {
      const commitsData = await commitsResponse.json();
      const commits = commitsData.items || [];

      for (const commit of commits) {
        // Verificar se commit já foi processado
        const { data: existingActivity } = await supabase
          .from("activity_log")
          .select("id")
          .eq("user_id", userData.id)
          .eq("description", `Commit em ${commit.repository?.name || "unknown"}`)
          .eq("created_at", new Date(commit.commit.committer.date).toISOString())
          .single();

        if (existingActivity) continue;

        const stats = commit.stats || { additions: 0, deletions: 0 };
        const linesChanged = stats.additions + stats.deletions;
        const isOwnRepo = commit.repository?.owner?.login === userData.github_username;

        const xp = calculateCommitXp(linesChanged, isOwnRepo, characterClass);
        totalXpGained += xp;

        activities.push({
          type: "commit",
          description: `Commit em ${commit.repository?.name || "unknown"}`,
          xp,
          date: commit.commit.committer.date,
        });
      }
    }

    // Buscar PRs recentes
    const prsResponse = await fetch(
      `https://api.github.com/search/issues?q=type:pr+author:${userData.github_username}+created:>${since.toISOString().split("T")[0]}&sort=created&order=desc&per_page=50`,
      {
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (prsResponse.ok) {
      const prsData = await prsResponse.json();
      const prs = prsData.items || [];

      for (const pr of prs) {
        // Verificar se PR já foi processado
        const { data: existingActivity } = await supabase
          .from("activity_log")
          .select("id")
          .eq("user_id", userData.id)
          .eq("description", `PR em ${pr.repository_url?.split("/").pop() || "unknown"}`)
          .eq("created_at", new Date(pr.created_at).toISOString())
          .single();

        if (existingActivity) continue;

        const repoName = pr.repository_url?.split("/").pop() || "unknown";
        const isOwnRepo = pr.user?.login === userData.github_username;

        // Buscar detalhes do repo para stars
        const repoResponse = await fetch(pr.repository_url, {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        });

        let repoStars = 0;
        if (repoResponse.ok) {
          const repoData = await repoResponse.json();
          repoStars = repoData.stargazers_count || 0;
        }

        const status = pr.state === "closed" ? (pr.pull_request?.merged_at ? "merged" : "closed") : "opened";
        const xp = calculatePullRequestXp(status as any, isOwnRepo, repoStars, characterClass);
        totalXpGained += xp;

        activities.push({
          type: "pull_request",
          description: `PR ${status} em ${repoName}`,
          xp,
          date: pr.created_at,
        });
      }
    }

    // Atualizar XP do personagem
    if (totalXpGained > 0) {
      const newTotalXp = character.total_xp + totalXpGained;
      const newLevel = getLevelFromXp(newTotalXp);
      const newCurrentXp = getCurrentXp(newTotalXp, newLevel);

      await supabase
        .from("characters")
        .update({
          total_xp: newTotalXp,
          level: newLevel,
          current_xp: newCurrentXp,
        })
        .eq("id", character.id);

      // Registrar atividades
      for (const activity of activities) {
        await supabase.from("activity_log").insert({
          user_id: userData.id,
          character_id: character.id,
          activity_type: activity.type,
          description: activity.description,
          xp_gained: activity.xp,
          total_xp_after: character.total_xp + activity.xp,
          level_after: getLevelFromXp(character.total_xp + activity.xp),
        });
      }
    }

    // Atualizar timestamp de última sincronização
    await supabase
      .from("github_stats")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userData.id);

    return NextResponse.json({
      success: true,
      message: "Sincronização concluída!",
      data: {
        xp_gained: totalXpGained,
        activities_synced: activities.length,
        new_total_xp: character.total_xp + totalXpGained,
        new_level: getLevelFromXp(character.total_xp + totalXpGained),
        next_sync_available: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Erro na sincronização:", error);
    return NextResponse.json(
      {
        error: "Erro ao sincronizar",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
