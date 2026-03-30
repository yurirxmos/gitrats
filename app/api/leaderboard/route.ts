import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 30; // Revalida a cada 30 segundos

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const baseClient = await createClient();
    let { data: leaderboardData, error: leaderboardError } = await baseClient
      .from("public_leaderboard")
      .select(
        "rank, character_name, character_class, level, total_xp, github_username, github_avatar_url, total_commits, total_prs, total_issues, guild_tag, achievement_codes",
      )
      .order("rank", { ascending: true })
      .limit(limit);

    if (leaderboardError) {
      try {
        const adminClient = createAdminClient();
        const fallback = await adminClient
          .from("public_leaderboard")
          .select(
            "rank, character_name, character_class, level, total_xp, github_username, github_avatar_url, total_commits, total_prs, total_issues, guild_tag, achievement_codes",
          )
          .order("rank", { ascending: true })
          .limit(limit);

        leaderboardData = fallback.data;
        leaderboardError = fallback.error;
      } catch {
        // noop
      }
    }

    if (leaderboardError) {
      console.error("Erro ao buscar leaderboard:", leaderboardError);
      return NextResponse.json(
        { error: leaderboardError.message },
        { status: 500 },
      );
    }

    const formattedPlayers: LeaderboardEntry[] = (leaderboardData || []).map(
      (entry) => ({
        rank: entry.rank,
        character_name: entry.character_name,
        character_class: entry.character_class,
        level: entry.level,
        total_xp: entry.total_xp,
        github_username: entry.github_username,
        github_avatar_url: entry.github_avatar_url,
        total_commits: entry.total_commits,
        total_prs: entry.total_prs,
        total_issues: entry.total_issues,
        guild_tag: entry.guild_tag,
        achievement_codes: Array.isArray(entry.achievement_codes)
          ? entry.achievement_codes.filter(
              (code): code is string => typeof code === "string",
            )
          : [],
      }),
    );

    if (formattedPlayers.length === 0) {
      return NextResponse.json({
        data: [],
        lastUpdate: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        data: formattedPlayers,
        lastUpdate: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    console.error("Erro no endpoint leaderboard:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
