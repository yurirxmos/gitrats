import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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

    // Buscar membership do usuário
    const { data: membership, error: membershipError } = await supabase
      .from("guild_members")
      .select("guild_id, role, joined_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("Erro ao buscar membership:", membershipError);
      return NextResponse.json({ error: "Erro ao buscar guilda" }, { status: 500 });
    }

    let guild = null;
    let members: any[] = [];

    if (membership?.guild_id) {
      const { data: guildData, error: guildError } = await supabase
        .from("guilds")
        .select("*")
        .eq("id", membership.guild_id)
        .maybeSingle();

      if (guildError) {
        console.error("Erro ao buscar guild:", guildError);
        return NextResponse.json({ error: "Erro ao buscar guilda" }, { status: 500 });
      }

      guild = guildData;

      // Buscar membros com client admin para evitar RLS
      const admin = createAdminClient();
      const { data: memberRows, error: membersError } = await admin
        .from("guild_members")
        .select("user_id, role, joined_at")
        .eq("guild_id", membership.guild_id)
        .order("joined_at", { ascending: true });

      if (membersError) {
        console.error("Erro ao buscar membros:", membersError);
        return NextResponse.json({ error: "Erro ao buscar membros" }, { status: 500 });
      }

      members =
        (await Promise.all(
          (memberRows || []).map(async (member: any) => {
            const { data: userData } = await admin
              .from("users")
              .select("github_username, github_avatar_url")
              .eq("id", member.user_id)
              .single();

            const { data: characterData } = await admin
              .from("characters")
              .select("name, class, level, total_xp")
              .eq("user_id", member.user_id)
              .maybeSingle();

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
        )) || [];
    }

    // Convites: owner vê enviados; demais vêem recebidos pendentes
    let invites: any[] = [];
    if (membership?.role === "owner" && membership.guild_id) {
      const admin = createAdminClient();
      const { data: sentInvites } = await admin
        .from("guild_invites")
        .select(
          `
          id,
          guild_id,
          invited_user_id,
          invited_by,
          status,
          created_at,
          users!guild_invites_invited_user_id_fkey (
            github_username
          )
        `
        )
        .eq("guild_id", membership.guild_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      invites =
        sentInvites?.map((invite: any) => ({
          id: invite.id,
          guild_id: invite.guild_id,
          invited_user_id: invite.invited_user_id,
          invited_by: invite.invited_by,
          status: invite.status,
          created_at: invite.created_at,
          invited_username: invite.users?.github_username,
        })) ?? [];
    } else {
      const { data: receivedInvites } = await supabase
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

      invites =
        receivedInvites?.map((invite: any) => ({
          id: invite.id,
          guild_id: invite.guild_id,
          invited_by: invite.invited_by,
          status: invite.status,
          created_at: invite.created_at,
          guild_name: invite.guilds?.name,
          guild_tag: invite.guilds?.tag,
          invited_by_username: invite.users?.github_username,
        })) ?? [];
    }

    return NextResponse.json({
      guild,
      membership: membership ?? null,
      members,
      invites,
    });
  } catch (error) {
    console.error("Erro ao buscar resumo da guilda:", error);
    return NextResponse.json({ error: "Erro ao buscar resumo da guilda" }, { status: 500 });
  }
}
