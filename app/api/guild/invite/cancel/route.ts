import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

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

    // Verificar se o usuário é owner da guilda relacionada ao convite
    const { data: membership } = await supabase
      .from("guild_members")
      .select("guild_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || membership.role !== "owner") {
      return NextResponse.json({ error: "Apenas o owner pode cancelar convites" }, { status: 403 });
    }

    // Buscar convite para garantir que pertence à guilda
    const { data: invite } = await supabase
      .from("guild_invites")
      .select("id, guild_id, status")
      .eq("id", invite_id)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
    }

    if (invite.guild_id !== membership.guild_id) {
      return NextResponse.json({ error: "Convite não pertence à sua guilda" }, { status: 403 });
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Apenas convites pendentes podem ser cancelados" }, { status: 400 });
    }

    // Cancelar convite usando admin client
    const admin = createAdminClient();
    const { error } = await admin
      .from("guild_invites")
      .update({ status: "cancelled" })
      .eq("id", invite_id);

    if (error) throw error;

    return NextResponse.json({ message: "Convite cancelado" });
  } catch (error) {
    console.error("Erro ao cancelar convite:", error);
    return NextResponse.json({ error: "Erro ao cancelar convite" }, { status: 500 });
  }
}
