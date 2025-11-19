import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET - Buscar dados do usuário logado
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[API_USER_GET] Auth:", { hasUser: !!user, error: authError?.message });

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();

    console.log("[API_USER_GET] User data:", { hasData: !!userData, userId: user.id });

    return NextResponse.json({ data: userData });
  } catch (error) {
    console.error("[API_USER_GET] Erro ao buscar usuário:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

/**
 * POST - Criar/atualizar usuário com token do GitHub
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[API_USER_POST] Iniciado");
    const supabase = await createClient();

    // Obter usuário autenticado e sessão
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[API_USER_POST] Auth:", { hasUser: !!user, error: authError?.message });

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const githubAccessToken = sessionData.session?.provider_token || null;

    console.log("[API_USER_POST] Session:", { hasToken: !!githubAccessToken });

    const body = await request.json();
    const { githubId, githubUsername, githubAvatarUrl, name, email } = body;

    console.log("[API_USER_POST] Body:", { githubId, githubUsername, name, email });

    if (!githubId || !githubUsername) {
      return NextResponse.json({ error: "GitHub ID e username são obrigatórios" }, { status: 400 });
    }

    const { data: existingUser } = await supabase.from("users").select("id").eq("id", user.id).single();

    console.log("[API_USER_POST] Existing user:", !!existingUser);

    if (existingUser) {
      console.log("[API_USER_POST] Atualizando usuário existente...");
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          github_username: githubUsername,
          github_avatar_url: githubAvatarUrl,
          github_access_token: githubAccessToken,
          name,
          email,
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) {
        console.error("[API_USER_POST] Erro ao atualizar usuário:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      console.log("[API_USER_POST] Usuário atualizado com sucesso");
      return NextResponse.json({
        data: updatedUser,
      });
    }

    console.log("[API_USER_POST] Criando novo usuário...");
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        id: user.id,
        github_id: githubId,
        github_username: githubUsername,
        github_avatar_url: githubAvatarUrl,
        github_access_token: githubAccessToken,
        name,
        email,
        // notifications_enabled usa o DEFAULT do banco (true)
      })
      .select()
      .single();

    if (createError) {
      console.error("[API_USER_POST] Erro ao criar usuário:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    console.log("[API_USER_POST] Usuário criado com sucesso");
    return NextResponse.json({
      data: newUser,
    });
  } catch (error) {
    console.error("[API_USER_POST] Erro no endpoint user:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

/**
 * PUT - Atualizar configurações simples do usuário (ex: notificações)
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationsEnabled } = body;

    if (typeof notificationsEnabled !== "boolean") {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({ notifications_enabled: notificationsEnabled })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("Erro no PUT /api/user:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
