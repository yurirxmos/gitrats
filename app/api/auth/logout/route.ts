import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Erro ao fazer logout:", error);
      return NextResponse.json({ error: "Falha ao fazer logout" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro interno ao fazer logout:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
