import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint para configurar manualmente o token do GitHub
 * Necessário porque o Supabase OAuth precisa de configuração adicional
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

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const providerToken = session?.provider_token;

    if (!providerToken) {
      return NextResponse.json(
        {
          error: "Token do GitHub não encontrado",
          message: "Faça logout e login novamente para obter o token",
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        github_access_token: providerToken,
        github_username: user.user_metadata?.user_name || user.user_metadata?.preferred_username,
        avatar_url: user.user_metadata?.avatar_url,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[Configure Token] Erro ao atualizar:", updateError);
      return NextResponse.json({ error: "Erro ao salvar token" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Token configurado com sucesso",
      data: {
        username: user.user_metadata?.user_name,
        has_token: true,
      },
    });
  } catch (error) {
    console.error("[Configure Token] Erro:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao configurar token" },
      { status: 500 }
    );
  }
}
