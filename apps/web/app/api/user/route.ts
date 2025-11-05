import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Obter usuário autenticado
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { githubId, githubUsername, githubAvatarUrl, name, email } = body;

    if (!githubId || !githubUsername) {
      return NextResponse.json({ error: "GitHub ID e username são obrigatórios" }, { status: 400 });
    }

    // Verificar se usuário já existe
    const { data: existingUser } = await supabase.from("users").select("id").eq("id", user.id).single();

    if (existingUser) {
      // Atualizar usuário existente
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          github_username: githubUsername,
          github_avatar_url: githubAvatarUrl,
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

    // Criar novo usuário
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        id: user.id,
        github_id: githubId,
        github_username: githubUsername,
        github_avatar_url: githubAvatarUrl,
        name,
        email,
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
