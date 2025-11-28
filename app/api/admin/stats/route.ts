import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminUser } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

/**
 * GET - Estatísticas administrativas da plataforma
 */
export async function GET() {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }

    const supabase = await createClient();

    // Contar total de usuários
    const { count: totalUsers } = await supabase.from("users").select("*", { count: "exact", head: true });

    // Contar total de guildas
    const { count: totalGuilds } = await supabase.from("guilds").select("*", { count: "exact", head: true });

    // Somar XP total de todos os usuários
    const { data: xpData } = await supabase.from("users").select("total_xp");

    const totalXp = xpData?.reduce((sum, char) => sum + (char.total_xp || 0), 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        totalGuilds: totalGuilds || 0,
        totalXp: totalXp,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar estatísticas admin:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
