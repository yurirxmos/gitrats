import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import GitHubService from "@/lib/github-service";
import { getLevelFromXp, getCurrentXp } from "@/lib/xp-system";

/**
 * Sincronização de atividades do GitHub usando GraphQL API
 * Similar ao GitMon - busca stats totais via GitHub GraphQL
 * Atualiza apenas a tabela github_stats (sem activity_log)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("id, github_username, github_access_token")
      .eq("id", user.id)
      .single();

    if (!userData || !userData.github_username) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const { data: character } = await supabase
      .from("characters")
      .select("id, name, class, level, current_xp, total_xp")
      .eq("user_id", userData.id)
      .single();

    if (!character) {
      return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }

    const githubService = new GitHubService(userData.github_access_token || undefined);

    console.log(`[Sync] Iniciando sincronização para ${userData.github_username}`);

    const githubStats = await githubService.getUserStats(userData.github_username);

    console.log(`[Sync] Stats do GitHub:`, {
      totalCommits: githubStats.totalCommits,
      totalPRs: githubStats.totalPRs,
      totalStars: githubStats.totalStars,
      totalRepos: githubStats.totalRepos,
    });

    const { data: currentStats } = await supabase
      .from("github_stats")
      .select("total_commits, total_prs, total_stars, total_repos, last_sync_at")
      .eq("user_id", userData.id)
      .single();

    console.log(`[Sync] Stats atuais no banco:`, {
      currentStats,
      total_commits_db: currentStats?.total_commits || 0,
      total_prs_db: currentStats?.total_prs || 0,
      last_sync_at: currentStats?.last_sync_at,
    });

    // Se é a primeira sync (nunca sincronizou antes), apenas inicializar sem dar XP
    const isFirstSync = !currentStats?.last_sync_at;

    if (isFirstSync) {
      console.log(`[Sync] PRIMEIRA SINCRONIZAÇÃO - Inicializando stats sem dar XP`);

      await supabase.from("github_stats").upsert({
        user_id: userData.id,
        total_commits: githubStats.totalCommits,
        total_prs: githubStats.totalPRs,
        total_stars: githubStats.totalStars,
        total_repos: githubStats.totalRepos,
        last_sync_at: new Date().toISOString(),
      });

      console.log(`[Sync] Stats inicializados:`, {
        total_commits: githubStats.totalCommits,
        total_prs: githubStats.totalPRs,
      });

      return NextResponse.json({
        success: true,
        message: "Conta sincronizada! A partir de agora você ganhará XP por novas atividades.",
        data: {
          xp_gained: 0,
          activities_synced: 0,
          stats: {
            commits: 0,
            prs: 0,
            total_commits: githubStats.totalCommits,
            total_prs: githubStats.totalPRs,
          },
        },
      });
    }

    // Calcular apenas as NOVAS atividades desde a última sync
    const newCommits = githubStats.totalCommits - (currentStats?.total_commits || 0);
    const newPRs = githubStats.totalPRs - (currentStats?.total_prs || 0);

    console.log(`[Sync] Novas atividades desde último sync:`, {
      newCommits,
      newPRs,
    });

    const xpFromCommits = newCommits * 5;
    const xpFromPRs = newPRs * 40;
    const totalXpGained = xpFromCommits + xpFromPRs;

    console.log(`[Sync] XP calculado:`, {
      xpFromCommits,
      xpFromPRs,
      totalXpGained,
    });

    await supabase.from("github_stats").upsert({
      user_id: userData.id,
      total_commits: githubStats.totalCommits,
      total_prs: githubStats.totalPRs,
      total_stars: githubStats.totalStars,
      total_repos: githubStats.totalRepos,
      last_sync_at: new Date().toISOString(),
    });

    console.log(`[Sync] github_stats atualizado com:`, {
      total_commits: githubStats.totalCommits,
      total_prs: githubStats.totalPRs,
      user_id: userData.id,
    });

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

      const leveledUp = newLevel > character.level;

      console.log(
        `[Sync] ${userData.github_username} ganhou ${totalXpGained} XP! Total: ${newTotalXp} | Level: ${newLevel}${leveledUp ? " 🆙" : ""}`
      );

      return NextResponse.json({
        success: true,
        message: `+${totalXpGained} XP | ${newCommits + newPRs} atividades sincronizadas`,
        data: {
          xp_gained: totalXpGained,
          new_total_xp: newTotalXp,
          new_level: newLevel,
          leveled_up: leveledUp,
          stats: {
            commits: newCommits,
            prs: newPRs,
            total_commits: githubStats.totalCommits,
            total_prs: githubStats.totalPRs,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Nenhuma atividade nova",
      data: {
        xp_gained: 0,
        activities_synced: 0,
        stats: {
          commits: 0,
          prs: 0,
          total_commits: githubStats.totalCommits,
          total_prs: githubStats.totalPRs,
        },
      },
    });
  } catch (error) {
    console.error("[Sync] Erro:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao sincronizar" },
      { status: 500 }
    );
  }
}
