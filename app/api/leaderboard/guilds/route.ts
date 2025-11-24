import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GuildLeaderboardEntry } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createClient();

    // Buscar guildas ordenadas por XP total
    const { data: guilds, error } = await supabase
      .from("guilds")
      .select(
        `
        id,
        name,
        tag,
        total_members,
        total_xp,
        owner_id,
        users!guilds_owner_id_fkey (
          github_username
        )
      `
      )
      .order("total_xp", { ascending: false })
      .limit(50);

    if (error) throw error;

    // Buscar top 4 membros de cada guilda para o avatar composto
    const guildIds = guilds?.map((g) => g.id) || [];
    const { data: members } = await supabase
      .from("guild_members")
      .select(
        `
        guild_id,
        user_id,
        role,
        users (
          github_username,
          github_avatar_url,
          total_xp,
          characters (
            character_name,
            character_class,
            level
          )
        )
      `
      )
      .in("guild_id", guildIds)
      .order("users(total_xp)", { ascending: false });

    // Agrupar membros por guilda
    const membersByGuild: { [key: string]: any[] } = {};
    members?.forEach((member: any) => {
      if (!membersByGuild[member.guild_id]) {
        membersByGuild[member.guild_id] = [];
      }
      if (membersByGuild[member.guild_id].length < 4) {
        membersByGuild[member.guild_id].push({
          user_id: member.user_id,
          role: member.role,
          github_username: member.users?.github_username,
          github_avatar_url: member.users?.github_avatar_url,
          total_xp: member.users?.total_xp,
          character_name: member.users?.characters?.[0]?.character_name,
          character_class: member.users?.characters?.[0]?.character_class,
          level: member.users?.characters?.[0]?.level,
        });
      }
    });

    // Formatar leaderboard
    const leaderboard: GuildLeaderboardEntry[] =
      guilds?.map((guild: any, index: number) => ({
        rank: index + 1,
        id: guild.id,
        name: guild.name,
        tag: guild.tag,
        total_members: guild.total_members,
        total_xp: guild.total_xp,
        owner_username: guild.users?.github_username || "Unknown",
        top_members: membersByGuild[guild.id] || [],
      })) || [];

    return NextResponse.json({
      data: leaderboard,
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao buscar leaderboard de guildas:", error);
    return NextResponse.json({ error: "Erro ao buscar leaderboard" }, { status: 500 });
  }
}
