import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Listar membros da guilda
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const guildId = searchParams.get("guild_id");

    if (!guildId) {
      return NextResponse.json({ error: "ID da guilda é obrigatório" }, { status: 400 });
    }

    const { data: members } = await supabase
      .from("guild_members")
      .select(
        `
        user_id,
        role,
        joined_at,
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
      .eq("guild_id", guildId)
      .order("joined_at", { ascending: true });

    const formattedMembers =
      members?.map((member: any) => ({
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        github_username: member.users?.github_username,
        github_avatar_url: member.users?.github_avatar_url,
        total_xp: member.users?.total_xp,
        character_name: member.users?.characters?.[0]?.character_name,
        character_class: member.users?.characters?.[0]?.character_class,
        level: member.users?.characters?.[0]?.level,
      })) || [];

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error("Erro ao buscar membros:", error);
    return NextResponse.json({ error: "Erro ao buscar membros" }, { status: 500 });
  }
}
