import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Buscar dados do usuário
    const { data: userData, error: userQueryError } = await supabase
      .from("users")
      .select("id, github_username, github_access_token, created_at")
      .eq("id", user.id)
      .single();

    if (userQueryError || !userData) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Verificar sessão atual
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const sessionInfo = {
      has_session: !!session,
      has_provider_token: !!session?.provider_token,
      provider_token_preview: session?.provider_token ? session.provider_token.substring(0, 10) + "..." : null,
      session_expires_at: session?.expires_at,
      user_metadata: session?.user?.user_metadata,
    };

    const userInfo = {
      id: userData.id,
      github_username: userData.github_username,
      has_token_in_db: !!userData.github_access_token,
      token_in_db_preview: userData.github_access_token ? userData.github_access_token.substring(0, 10) + "..." : null,
      created_at: userData.created_at,
    };

    return NextResponse.json({
      user: userInfo,
      session: sessionInfo,
      needs_token_refresh: !userData.github_access_token && !session?.provider_token,
      recommendation: !userData.github_access_token
        ? session?.provider_token
          ? "Token disponível na sessão - chame /api/github/configure-token"
          : "Faça logout e login novamente para obter novo token"
        : "Token já está salvo no banco",
    });
  } catch (error) {
    console.error("Erro no debug token:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro interno" }, { status: 500 });
  }
}
