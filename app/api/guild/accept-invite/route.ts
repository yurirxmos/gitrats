import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_GUILD_MEMBERS = 20;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { invite_id } = await req.json();

    if (!invite_id) {
      return NextResponse.json({ error: "ID do convite é obrigatório" }, { status: 400 });
    }

    // Buscar convite
    const { data: invite } = await supabase
      .from("guild_invites")
      .select("*, guilds(total_members)")
      .eq("id", invite_id)
      .eq("invited_user_id", user.id)
      .eq("status", "pending")
      .single();

    if (!invite) {
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
    }

    // Verificar se guilda ainda tem espaço
    if (invite.guilds && invite.guilds.total_members >= MAX_GUILD_MEMBERS) {
      return NextResponse.json({ error: "Guilda atingiu o limite de membros" }, { status: 400 });
    }

    // Verificar se usuário já está em uma guilda
    const { data: existingMembership } = await supabase
      .from("guild_members")
      .select("guild_id")
      .eq("user_id", user.id)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: "Você já está em uma guilda" }, { status: 400 });
    }

    // Adicionar membro à guilda
    const { error: memberError } = await supabase.from("guild_members").insert({
      guild_id: invite.guild_id,
      user_id: user.id,
      role: "member",
    });

    if (memberError) throw memberError;

    // Atualizar status do convite
    await supabase.from("guild_invites").update({ status: "accepted" }).eq("id", invite_id);

    return NextResponse.json({
      message: "Convite aceito com sucesso",
    });
  } catch (error) {
    console.error("Erro ao aceitar convite:", error);
    return NextResponse.json({ error: "Erro ao aceitar convite" }, { status: 500 });
  }
}
