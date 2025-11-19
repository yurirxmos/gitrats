import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * GET - Buscar dados do usuário logado
 */
export async function GET(request: NextRequest) {
  try {
    // Preferir client com token quando presente (prod costuma falhar cookies SameSite/Secure)
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const supabase = token
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();

    return NextResponse.json({ data: userData });
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

/**
 * POST - Criar/atualizar usuário com token do GitHub
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const supabase = token
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : await createClient();

    // Obter usuário autenticado e sessão
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const githubAccessToken = sessionData.session?.provider_token || null;

    const body = await request.json();
    const { githubId, githubUsername, githubAvatarUrl, name, email } = body;

    if (!githubId || !githubUsername) {
      return NextResponse.json({ error: "GitHub ID e username são obrigatórios" }, { status: 400 });
    }

    const { data: existingUser } = await supabase.from("users").select("id").eq("id", user.id).single();

    if (existingUser) {
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
        console.error("Erro ao atualizar usuário:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        data: updatedUser,
      });
    }

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
      console.error("Erro ao criar usuário:", createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: newUser,
    });
  } catch (error) {
    console.error("Erro no endpoint user:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

/**
 * PUT - Atualizar configurações simples do usuário (ex: notificações)
 */
export async function PUT(request: NextRequest) {
  try {
    // Preferir client com token quando presente
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    const supabase = token
      ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : await createClient();

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
