import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

    // Buscar guilda do usuário logado
    const { data: membership } = await supabase
      .from("guild_members")
      .select("guild_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Apenas o owner pode visualizar convites enviados" }, { status: 403 });
    }

    // Buscar convites pendentes enviados pela guilda usando admin client (bypass RLS)
    const admin = createAdminClient();
    const { data: invites } = await admin
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

    const formattedInvites =
      invites?.map((invite: any) => ({
        id: invite.id,
        guild_id: invite.guild_id,
        invited_user_id: invite.invited_user_id,
        invited_by: invite.invited_by,
        status: invite.status,
        created_at: invite.created_at,
        invited_username: invite.users?.github_username,
      })) || [];

    return NextResponse.json({ invites: formattedInvites });
  } catch (error) {
    console.error("Erro ao buscar convites enviados:", error);
    return NextResponse.json({ error: "Erro ao buscar convites enviados" }, { status: 500 });
  }
}
