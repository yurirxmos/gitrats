import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint de DEBUG para resetar last_sync_at e permitir re-sincronização
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

    // Resetar last_sync_at para null
    const { error: updateError } = await supabase
      .from("github_stats")
      .update({
        last_sync_at: null,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Erro ao resetar last_sync_at:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "last_sync_at resetado! Agora você pode fazer a primeira sincronização novamente.",
    });
  } catch (error) {
    console.error("Erro no fix-sync:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
