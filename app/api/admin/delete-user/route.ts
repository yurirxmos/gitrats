import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth-utils";

/**
 * DELETE - Deletar conta de um usuário (apenas admin)
 */
export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Acesso negado: apenas admin" }, { status: 403 });
    }

    const supabase = await createClient();

    // Obter o githubUsername do body
    const body = await request.json();
    const { githubUsername } = body;

    if (!githubUsername) {
      return NextResponse.json({ error: "githubUsername é obrigatório" }, { status: 400 });
    }

    // Verificar se o usuário existe
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("id, github_username")
      .eq("github_username", githubUsername)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Use o admin client (service role) para bypassar RLS e permitir deleção
    const adminSupabase = createAdminClient();

    // Deletar o usuário usando o admin client
    const { error: deleteError } = await adminSupabase.from("users").delete().eq("id", existingUser.id);

    if (deleteError) {
      console.error("Erro ao deletar usuário:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Usuário ${existingUser.github_username} deletado com sucesso`,
    });
  } catch (error) {
    console.error("Erro no endpoint delete-user:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
