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
      console.error("[CANCEL_INVITE] Erro de autenticação:", authError);
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { invite_id } = await req.json();
    console.log("[CANCEL_INVITE] Tentando cancelar convite:", invite_id, "por usuário:", user.id);

    if (!invite_id) {
      return NextResponse.json({ error: "ID do convite é obrigatório" }, { status: 400 });
    }

    // Verificar se o usuário é owner da guilda relacionada ao convite
    const { data: membership, error: membershipError } = await supabase
      .from("guild_members")
      .select("guild_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("[CANCEL_INVITE] Erro ao buscar membership:", membershipError);
      return NextResponse.json({ error: "Erro ao verificar permissões" }, { status: 500 });
    }

    console.log("[CANCEL_INVITE] Membership encontrada:", membership);

    if (!membership || membership.role !== "owner") {
      console.error("[CANCEL_INVITE] Usuário não é owner. Membership:", membership);
      return NextResponse.json({ error: "Apenas o owner pode cancelar convites" }, { status: 403 });
    }

    // Buscar convite usando admin client para bypass RLS
    console.log("[CANCEL_INVITE] Criando admin client...");
    const admin = createAdminClient();
    console.log("[CANCEL_INVITE] Admin client criado, buscando convite...");

    const { data: invite, error: inviteError } = await admin
      .from("guild_invites")
      .select("id, guild_id, status")
      .eq("id", invite_id)
      .maybeSingle();

    if (inviteError) {
      console.error("[CANCEL_INVITE] Erro ao buscar convite:", inviteError);
      return NextResponse.json({ error: "Erro ao buscar convite" }, { status: 500 });
    }

    console.log("[CANCEL_INVITE] Convite encontrado:", invite);

    if (!invite) {
      console.error("[CANCEL_INVITE] Convite não encontrado no banco:", invite_id);
      return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
    }

    if (invite.guild_id !== membership.guild_id) {
      console.error("[CANCEL_INVITE] Guild ID mismatch. Convite:", invite.guild_id, "Membership:", membership.guild_id);
      return NextResponse.json({ error: "Convite não pertence à sua guilda" }, { status: 403 });
    }

    if (invite.status !== "pending") {
      console.error("[CANCEL_INVITE] Status inválido:", invite.status);
      return NextResponse.json({ error: "Apenas convites pendentes podem ser cancelados" }, { status: 400 });
    }

    // Cancelar convite (usando status 'declined')
    console.log("[CANCEL_INVITE] Cancelando convite...");
    const { error } = await admin.from("guild_invites").update({ status: "declined" }).eq("id", invite_id);

    if (error) {
      console.error("[CANCEL_INVITE] Erro ao atualizar status:", error);
      throw error;
    }

    console.log("[CANCEL_INVITE] Convite cancelado com sucesso");
    return NextResponse.json({ message: "Convite cancelado" });
  } catch (error) {
    console.error("[CANCEL_INVITE] Erro geral:", error);
    return NextResponse.json({ error: "Erro ao cancelar convite" }, { status: 500 });
  }
}
