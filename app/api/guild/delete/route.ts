import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
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
    const { data: guild } = await supabase.from("guilds").select("id").eq("owner_id", user.id).single();

    if (!guild) {
      return NextResponse.json({ error: "Você não é dono de nenhuma guilda" }, { status: 400 });
    }

    // Deletar guilda (cascade vai deletar membros e convites)
    const { error } = await supabase.from("guilds").delete().eq("id", guild.id).eq("owner_id", user.id);

    if (error) throw error;

    return NextResponse.json({
      message: "Guilda deletada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar guilda:", error);
    return NextResponse.json({ error: "Erro ao deletar guilda" }, { status: 500 });
  }
}
