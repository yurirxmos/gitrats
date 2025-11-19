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

    // Buscar token do banco
    const { data: userData } = await supabase
      .from("users")
      .select("github_access_token, github_username")
      .eq("id", user.id)
      .single();

    // Buscar token da sessão
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const sessionToken = session?.provider_token;

    return NextResponse.json({
      user_id: user.id,
      github_username: userData?.github_username,
      token_in_db: userData?.github_access_token
        ? `${userData.github_access_token.substring(0, 10)}...`
        : null,
      token_in_session: sessionToken ? `${sessionToken.substring(0, 10)}...` : null,
      tokens_match: userData?.github_access_token === sessionToken,
      session_exists: !!session,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
