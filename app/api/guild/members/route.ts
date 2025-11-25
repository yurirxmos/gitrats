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

    const { data: members, error: membersError } = await supabase
      .from("guild_members")
      .select("user_id, role, joined_at")
      .eq("guild_id", guildId)
      .order("joined_at", { ascending: true });

    console.log("🔍 Guild ID:", guildId);
    console.log("🔍 Members raw:", members);
    console.log("🔍 Members error:", membersError);

    if (membersError) {
      console.error("Erro ao buscar membros:", membersError);
      throw membersError;
    }

    // Buscar dados do usuário e personagem para cada membro
    const formattedMembers = await Promise.all(
      (members || []).map(async (member: any) => {
        const { data: userData } = await supabase
          .from("users")
          .select("github_username, github_avatar_url")
          .eq("id", member.user_id)
          .single();

        const { data: characterData, error: charError } = await supabase
          .from("characters")
          .select("name, class, level, total_xp")
          .eq("user_id", member.user_id)
          .maybeSingle();

        console.log(`🔍 Character for user ${member.user_id}:`, characterData, "Error:", charError);

        return {
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          github_username: userData?.github_username,
          github_avatar_url: userData?.github_avatar_url,
          character_name: characterData?.name,
          character_class: characterData?.class,
          level: characterData?.level,
          total_xp: characterData?.total_xp,
        };
      })
    );

    console.log("✅ Formatted members:", formattedMembers);

    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error("Erro ao buscar membros:", error);
    return NextResponse.json({ error: "Erro ao buscar membros" }, { status: 500 });
  }
}
