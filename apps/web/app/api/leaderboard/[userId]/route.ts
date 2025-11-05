import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { userId } = params;

    const supabase = await createClient();

    // Buscar o personagem do usuário
    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("total_xp")
      .eq("user_id", userId)
      .single();

    if (characterError || !character) {
      return NextResponse.json({ error: "Personagem não encontrado" }, { status: 404 });
    }

    // Contar quantos personagens têm XP maior (para calcular o rank)
    const { count, error: countError } = await supabase
      .from("characters")
      .select("*", { count: "exact", head: true })
      .gt("total_xp", character.total_xp);

    if (countError) {
      console.error("Erro ao calcular rank:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const rank = (count || 0) + 1;

    return NextResponse.json({
      data: { rank },
    });
  } catch (error) {
    console.error("Erro no endpoint de rank:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
