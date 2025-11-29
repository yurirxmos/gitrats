import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Lista pública de definições de achievements (code, name, description, xp_reward)
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("achievements")
      .select("code,name,description,xp_reward,is_active")
      .eq("is_active", true);

    if (error) {
      console.error("[ACHIEVEMENTS_API] Erro ao buscar achievements:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: any) {
    console.error("[ACHIEVEMENTS_API] Exceção:", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
