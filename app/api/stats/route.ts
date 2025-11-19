import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 60; // Revalida a cada 60 segundos

/**
 * GET - Estatísticas gerais da plataforma
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Contar total de personagens criados
    const { count: totalCharacters, error } = await supabase
      .from("characters")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Erro ao buscar estatísticas:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        total_characters: totalCharacters || 0,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
