import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_GUILD_MEMBERS = 20;

// POST - Enviar convite
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

    const { github_username } = await req.json();

    if (!github_username) {
      return NextResponse.json({ error: "Username do GitHub é obrigatório" }, { status: 400 });
    }

    // Buscar guilda do usuário que está convidando
    const { data: membership } = await supabase
      .from("guild_members")
      .select("guild_id, role")
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Você não está em uma guilda" }, { status: 400 });
    }

    // Buscar dados da guilda
    const { data: guild } = await supabase
      .from("guilds")
      .select("total_members")
      .eq("id", membership.guild_id)
      .single();

    if (guild && guild.total_members >= MAX_GUILD_MEMBERS) {
      return NextResponse.json({ error: "Guilda atingiu o limite de membros" }, { status: 400 });
    }

    // Buscar usuário a ser convidado
    const { data: invitedUser } = await supabase
      .from("users")
      .select("id, github_username")
      .eq("github_username", github_username)
      .single();

    if (!invitedUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (invitedUser.id === user.id) {
      return NextResponse.json({ error: "Você não pode convidar a si mesmo" }, { status: 400 });
    }

    // Verificar se usuário já está em uma guilda
    const { data: targetMembership } = await supabase
      .from("guild_members")
      .select("guild_id")
      .eq("user_id", invitedUser.id)
      .single();

    if (targetMembership) {
      return NextResponse.json({ error: "Usuário já está em uma guilda" }, { status: 400 });
    }

    // Verificar se já existe convite pendente
    const { data: existingInvite } = await supabase
      .from("guild_invites")
      .select("id")
      .eq("guild_id", membership.guild_id)
      .eq("invited_user_id", invitedUser.id)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: "Convite já enviado para este usuário" }, { status: 400 });
    }

    // Criar convite
    const { data: invite, error: inviteError } = await supabase
      .from("guild_invites")
      .insert({
        guild_id: membership.guild_id,
        invited_user_id: invitedUser.id,
        invited_by: user.id,
        status: "pending",
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    return NextResponse.json({
      message: "Convite enviado com sucesso",
      invite,
    });
  } catch (error) {
    console.error("Erro ao enviar convite:", error);
    return NextResponse.json({ error: "Erro ao enviar convite" }, { status: 500 });
  }
}

// GET - Listar convites pendentes do usuário
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

    const { data: invites } = await supabase
      .from("guild_invites")
      .select(
        `
        id,
        guild_id,
        invited_by,
        status,
        created_at,
        guilds (
          name,
          tag
        ),
        users!guild_invites_invited_by_fkey (
          github_username
        )
      `
      )
      .eq("invited_user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const formattedInvites =
      invites?.map((invite: any) => ({
        id: invite.id,
        guild_id: invite.guild_id,
        invited_by: invite.invited_by,
        status: invite.status,
        created_at: invite.created_at,
        guild_name: invite.guilds?.name,
        guild_tag: invite.guilds?.tag,
        invited_by_username: invite.users?.github_username,
      })) || [];

    return NextResponse.json({ invites: formattedInvites });
  } catch (error) {
    console.error("Erro ao buscar convites:", error);
    return NextResponse.json({ error: "Erro ao buscar convites" }, { status: 500 });
  }
}
