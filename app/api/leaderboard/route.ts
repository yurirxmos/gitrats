import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 30; // Revalida a cada 30 segundos

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    // Preferir admin client para bypassar RLS em leaderboard público; fallback para anon
    let supabase;
    let usingAdmin = false;
    try {
      supabase = createAdminClient();
      usingAdmin = true;
    } catch (e) {
      console.warn("[Leaderboard] SUPABASE_SERVICE_ROLE_KEY ausente. Usando anon client.");
      supabase = await createClient();
    }

    // Query otimizada: buscar tudo com JOINs em uma única query
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from("characters")
      .select(
        `
        id,
        user_id,
        name,
        class,
        level,
        total_xp,
        users!inner (
          github_username,
          github_avatar_url,
          github_stats (
            total_commits,
            total_prs,
            total_issues,
            baseline_commits,
            baseline_prs,
            baseline_issues
          )
        )
      `
      )
      .order("total_xp", { ascending: false })
      .limit(limit);

    if (leaderboardError) {
      console.error("Erro ao buscar leaderboard:", leaderboardError);
      return NextResponse.json({ error: leaderboardError.message }, { status: 500 });
    }

    if (!leaderboardData || leaderboardData.length === 0) {
      return NextResponse.json({
        data: [],
        lastUpdate: new Date().toISOString(),
      });
    } // Buscar achievements (usa admin se disponível; caso contrário, tenta com o mesmo client)
    const userIds = leaderboardData.map((c) => c.user_id);
    let achievementsRaw: any[] = [];

    try {
      const achClient = usingAdmin ? supabase : createAdminClient();
      const { data, error } = await achClient
        .from("user_achievements")
        .select("user_id, achievement:achievements(code)")
        .in("user_id", userIds);

      if (!error && data) {
        achievementsRaw = data;
      }
    } catch (err) {
      console.error("Erro ao buscar achievements:", err);
    }

    // Mapear achievements por user_id
    const achievementsMap = new Map<string, string[]>();
    achievementsRaw.forEach((row: any) => {
      const arr = achievementsMap.get(row.user_id) || [];
      if (row.achievement?.code) arr.push(row.achievement.code);
      achievementsMap.set(row.user_id, arr);
    });

    // Formatar dados
    const formattedPlayers = leaderboardData.map((character: any, index) => {
      const user = character.users;
      // github_stats pode vir como objeto ou array dependendo da relação
      const statsRaw = user?.github_stats;
      const stats = Array.isArray(statsRaw) ? statsRaw[0] : statsRaw;

      const commitsAfterJoin = stats ? (stats.total_commits || 0) - (stats.baseline_commits || 0) : 0;
      const prsAfterJoin = stats ? (stats.total_prs || 0) - (stats.baseline_prs || 0) : 0;
      const issuesAfterJoin = stats ? (stats.total_issues || 0) - (stats.baseline_issues || 0) : 0;

      return {
        rank: index + 1,
        user_id: character.user_id,
        character_name: character.name,
        character_class: character.class,
        level: character.level,
        total_xp: character.total_xp,
        github_username: user?.github_username || "unknown",
        github_avatar_url: user?.github_avatar_url || null,
        total_commits: commitsAfterJoin,
        total_prs: prsAfterJoin,
        total_issues: issuesAfterJoin,
        achievement_codes: achievementsMap.get(character.user_id) || [],
      };
    });

    return NextResponse.json(
      {
        data: formattedPlayers,
        lastUpdate: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Erro no endpoint leaderboard:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
