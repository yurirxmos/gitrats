import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { GuildLeaderboardEntry } from "@/lib/types";

export async function GET() {
  try {
    const baseClient = await createClient();
    let usingAdmin = false;
    let { data: guilds, error } = await baseClient
      .from("public_guild_leaderboard")
      .select("rank, id, name, tag, total_members, total_xp, owner_username")
      .order("rank", { ascending: true })
      .limit(50);

    if (error) {
      try {
        const adminClient = createAdminClient();
        const fallback = await adminClient
          .from("public_guild_leaderboard")
          .select(
            "rank, id, name, tag, total_members, total_xp, owner_username",
          )
          .order("rank", { ascending: true })
          .limit(50);

        guilds = fallback.data;
        error = fallback.error;
        usingAdmin = !fallback.error;
      } catch {
        // noop
      }
    }

    if (error) throw error;

    const membersClient = usingAdmin ? createAdminClient() : baseClient;
    const guildIds = guilds?.map((g) => g.id) || [];
    const membersQueryResult = guildIds.length
      ? await membersClient
          .from("public_guild_members")
          .select(
            "guild_id, role, github_username, github_avatar_url, total_xp, character_name, character_class, level, joined_at",
          )
          .in("guild_id", guildIds)
          .order("total_xp", { ascending: false, nullsFirst: false })
      : { data: [] };
    const members = membersQueryResult.data;

    // Agrupar membros por guilda
    const membersByGuild: { [key: string]: any[] } = {};
    members?.forEach((member: any) => {
      if (!membersByGuild[member.guild_id]) {
        membersByGuild[member.guild_id] = [];
      }
      if (membersByGuild[member.guild_id].length < 4) {
        membersByGuild[member.guild_id].push({
          guild_id: member.guild_id,
          role: member.role,
          joined_at: member.joined_at,
          github_username: member.github_username,
          github_avatar_url: member.github_avatar_url,
          total_xp: member.total_xp,
          character_name: member.character_name,
          character_class: member.character_class,
          level: member.level,
        });
      }
    });

    // Formatar leaderboard
    const leaderboard: GuildLeaderboardEntry[] =
      guilds?.map((guild: any) => ({
        rank: guild.rank,
        id: guild.id,
        name: guild.name,
        tag: guild.tag,
        total_members: guild.total_members,
        total_xp: guild.total_xp,
        owner_username: guild.owner_username || "Unknown",
        top_members: membersByGuild[guild.id] || [],
      })) || [];

    return NextResponse.json({
      data: leaderboard,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao buscar leaderboard de guildas:", error);
    return NextResponse.json(
      { error: "Erro ao buscar leaderboard" },
      { status: 500 },
    );
  }
}
