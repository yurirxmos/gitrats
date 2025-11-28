import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

/**
 * POST - Criar novo achievement (apenas admin)
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, description, xp_reward } = body;

    if (!code || !name) {
      return NextResponse.json({ error: "Código e nome são obrigatórios" }, { status: 400 });
    }

    // Usar admin client para criar achievement
    const adminSupabase = createAdminClient();

    // Verificar se já existe
    const { data: existing } = await adminSupabase.from("achievements").select("id").eq("code", code).maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Achievement com este código já existe" }, { status: 400 });
    }

    // Criar achievement
    const { data, error } = await adminSupabase
      .from("achievements")
      .insert({
        code,
        name,
        description: description || "",
        xp_reward: xp_reward || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar achievement:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Erro ao criar achievement:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
