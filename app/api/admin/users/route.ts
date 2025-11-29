import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

/**
 * GET - Lista todos os usuários com username e data de criação
 */
export async function GET() {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const supabase = await createClient();

    // Buscar todos os usuários com username e data de criação
    const { data: users, error } = await supabase
      .from("users")
      .select("github_username, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar usuários:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: users || [],
    });
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
