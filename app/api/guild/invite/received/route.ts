import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Buscar convites recebidos (onde invited_user_id = user.id)
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
    console.error("Erro ao buscar convites recebidos:", error);
    return NextResponse.json({ error: "Erro ao buscar convites recebidos" }, { status: 500 });
  }
}
