import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { EmailService } from "@/lib/email-service";

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
      return NextResponse.json({ error: "Username ou nick é obrigatório" }, { status: 400 });
    }

    // Buscar guilda do usuário que está convidando
    const { data: membership } = await supabase
      .from("guild_members")
      .select("guild_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Você não está em uma guilda" }, { status: 400 });
    }

    // Buscar dados da guilda
    const { data: guild } = await supabase
      .from("guilds")
      .select("id, name, tag, total_members")
      .eq("id", membership.guild_id)
      .maybeSingle();

    if (guild && guild.total_members >= MAX_GUILD_MEMBERS) {
      return NextResponse.json({ error: "Guilda atingiu o limite de membros" }, { status: 400 });
    }

    // Buscar usuário a ser convidado por github_username OU character_name
    const { data: userByGithub } = await supabase
      .from("users")
      .select("id, github_username")
      .eq("github_username", github_username)
      .maybeSingle();

    let invitedUser = userByGithub;

    // Se não encontrou por github_username, buscar por character_name
    if (!invitedUser) {
      const { data: character } = await supabase
        .from("characters")
        .select("user_id, users!inner(id, github_username)")
        .eq("character_name", github_username)
        .maybeSingle();

      if (character) {
        const users = character.users as any;
        invitedUser = {
          id: users.id,
          github_username: users.github_username,
        };
      }
    }

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
      .maybeSingle();

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
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json({ error: "Convite já enviado para este usuário" }, { status: 400 });
    }

    // Criar convite usando admin client para bypassar RLS
    const adminClient = createAdminClient();
    const { data: invite, error: inviteError } = await adminClient
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

    // Buscar e-mail do usuário convidado e dados do convidador
    const { data: invitedUserData } = await adminClient
      .from("users")
      .select("email, github_username")
      .eq("id", invitedUser.id)
      .single();

    const { data: inviterData } = await adminClient.from("users").select("github_username").eq("id", user.id).single();

    // Enviar e-mail de convite
    if (invitedUserData?.email && guild) {
      try {
        await EmailService.sendGuildInviteEmail(
          invitedUserData.email,
          invitedUserData.github_username,
          guild.name,
          guild.tag || "",
          inviterData?.github_username || "um membro",
          invite.id
        );
        console.log(`E-mail de convite enviado para ${invitedUserData.github_username}`);
      } catch (emailError) {
        console.error("Erro ao enviar e-mail de convite:", emailError);
      }
    }

    return NextResponse.json({
      message: "Convite enviado com sucesso",
      invite,
    });
  } catch (error) {
    console.error("Erro ao enviar convite:", error);
    return NextResponse.json({ error: "Erro ao enviar convite" }, { status: 500 });
  }
}
