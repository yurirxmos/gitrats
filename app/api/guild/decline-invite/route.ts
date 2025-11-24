import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Atualizar status do convite
    const { error } = await supabase
      .from("guild_invites")
      .update({ status: "declined" })
      .eq("id", invite_id)
      .eq("invited_user_id", user.id)
      .eq("status", "pending");

    if (error) throw error;

    return NextResponse.json({
      message: "Convite recusado",
    });
  } catch (error) {
    console.error("Erro ao recusar convite:", error);
    return NextResponse.json({ error: "Erro ao recusar convite" }, { status: 500 });
  }
}
