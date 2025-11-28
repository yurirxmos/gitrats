import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

/**
 * GET - Listar todos os achievements (apenas admin)
 */
export async function GET(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    const { data: achievements, error } = await adminSupabase
      .from("achievements")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao buscar achievements:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: achievements || [],
    });
  } catch (error) {
    console.error("Erro ao buscar achievements:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
