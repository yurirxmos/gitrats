import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Buscar guilda do usuário
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

    // Buscar guilda do usuário
    const { data: membership, error: membershipError } = await supabase
      .from("guild_members")
      .select("guild_id, role, joined_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("Erro ao buscar membership:", membershipError);
      return NextResponse.json({ error: "Erro ao buscar guilda" }, { status: 500 });
    }

    if (!membership) {
      return NextResponse.json({ guild: null, membership: null });
    }

    // Buscar dados da guilda
    const { data: guild, error: guildError } = await supabase
      .from("guilds")
      .select("*")
      .eq("id", membership.guild_id)
      .maybeSingle();

    if (guildError) {
      console.error("Erro ao buscar guild:", guildError);
      return NextResponse.json({ error: "Erro ao buscar guilda" }, { status: 500 });
    }

    return NextResponse.json({
      guild,
      membership,
    });
  } catch (error) {
    console.error("Erro ao buscar guilda:", error);
    return NextResponse.json({ error: "Erro ao buscar guilda" }, { status: 500 });
  }
}
