import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Endpoint de debug para verificar dados do usuário
 */
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
    const { data: userData } = await supabase
      .from("users")
      .select("id, github_username, github_access_token, created_at")
      .eq("id", user.id)
      .single();

    // Buscar personagem
    const { data: character } = await supabase
      .from("characters")
      .select("id, name, class, level, total_xp")
      .eq("user_id", user.id)
      .single();

    // Buscar stats do GitHub
    const { data: githubStats } = await supabase
      .from("github_stats")
      .select("total_commits, total_prs, last_sync_at")
      .eq("user_id", user.id)
      .single();

    // Buscar atividades recentes
    const { data: activities } = await supabase
      .from("activity_log")
      .select("activity_type, xp_gained, created_at, commit_sha, pr_number")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Obter token da sessão
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionToken = sessionData.session?.provider_token;

    return NextResponse.json({
      auth: {
        user_id: user.id,
        email: user.email,
        github_username: user.user_metadata?.user_name,
        session_has_provider_token: !!sessionToken,
      },
      database: {
        user: {
          ...userData,
          github_access_token: userData?.github_access_token
            ? `${userData.github_access_token.substring(0, 10)}...`
            : null,
          has_token: !!userData?.github_access_token,
        },
        character,
        github_stats: githubStats,
        recent_activities: activities,
      },
    });
  } catch (error) {
    console.error("Erro no debug:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
