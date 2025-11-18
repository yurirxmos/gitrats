import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint de DEBUG para resetar personagem e stats
 * Útil para testes e desenvolvimento
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Deletar personagem
    const { error: charError } = await supabase.from("characters").delete().eq("user_id", user.id);

    if (charError) {
      console.error("Erro ao deletar personagem:", charError);
      return NextResponse.json({ error: charError.message }, { status: 500 });
    }

    // Resetar github_stats (manter o registro mas zerar os dados)
    const { error: statsError } = await supabase
      .from("github_stats")
      .update({
        total_commits: 0,
        total_prs: 0,
        total_stars: 0,
        total_repos: 0,
        last_sync_at: null, // Importante: marcar como nunca sincronizado
      })
      .eq("user_id", user.id);

    if (statsError) {
      console.error("Erro ao resetar stats:", statsError);
    }

    return NextResponse.json({
      success: true,
      message: "Personagem e stats resetados com sucesso!",
    });
  } catch (error) {
    console.error("Erro no reset:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
