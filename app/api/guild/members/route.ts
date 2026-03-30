import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// GET - Listar membros da guilda
export async function GET(req: NextRequest) {
  try {
    const baseClient = await createClient();

    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get("guild_id");

    if (!guildId) {
      return NextResponse.json(
        { error: "ID da guilda é obrigatório" },
        { status: 400 },
      );
    }

    let { data: members, error: membersError } = await baseClient
      .from("public_guild_members")
      .select(
        "guild_id, joined_at, role, github_username, github_avatar_url, character_name, character_class, level, total_xp",
      )
      .eq("guild_id", guildId)
      .order("joined_at", { ascending: true });

    if (membersError) {
      try {
        const adminClient = createAdminClient();
        const fallback = await adminClient
          .from("public_guild_members")
          .select(
            "guild_id, joined_at, role, github_username, github_avatar_url, character_name, character_class, level, total_xp",
          )
          .eq("guild_id", guildId)
          .order("joined_at", { ascending: true });

        members = fallback.data;
        membersError = fallback.error;
      } catch {
        // noop
      }
    }

    if (membersError) {
      console.error("Erro ao buscar membros:", membersError);
      throw membersError;
    }

    const formattedMembers = (members || []).map((member) => ({
      guild_id: member.guild_id,
      role: member.role,
      joined_at: member.joined_at,
      github_username: member.github_username,
      github_avatar_url: member.github_avatar_url,
      character_name: member.character_name,
      character_class: member.character_class,
      level: member.level,
      total_xp: member.total_xp,
    }));

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error("Erro ao buscar membros:", error);
    return NextResponse.json(
      { error: "Erro ao buscar membros" },
      { status: 500 },
    );
  }
}
