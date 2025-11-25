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

    // Buscar membership do usuário
    const { data: membership } = await supabase
      .from("guild_members")
      .select("guild_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Você não está em uma guilda" }, { status: 400 });
    }

    // Owner não pode sair da guilda (precisa transferir ownership ou deletar a guilda)
    if (membership.role === "owner") {
      return NextResponse.json(
        {
          error: "Dono da guilda não pode sair. Transfira a liderança ou delete a guilda.",
        },
        { status: 400 }
      );
    }

    // Remover membro
    const { error } = await supabase
      .from("guild_members")
      .delete()
      .eq("guild_id", membership.guild_id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({
      message: "Você saiu da guilda",
    });
  } catch (error) {
    console.error("Erro ao sair da guilda:", error);
    return NextResponse.json({ error: "Erro ao sair da guilda" }, { status: 500 });
  }
}
