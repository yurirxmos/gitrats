// app/api/admin/grant-achievement/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { grantSimpleAchievement } from "@/lib/simple-achievements";
import { getAdminUser } from "@/lib/auth-utils";

/**
 * Endpoint para conceder achievements manualmente via admin panel
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getAdminUser();

    if (!adminUser) {
      return NextResponse.json({ error: "Acesso negado: apenas admin" }, { status: 403 });
    }

    const body = await request.json();
    const { username, achievementType: requestedAchievementType } = body;

    if (!username || !requestedAchievementType) {
      return NextResponse.json({ error: "Username e achievementType são obrigatórios" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar usuário pelo username do GitHub
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, github_username")
      .eq("github_username", username)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: `Usuário ${username} não encontrado` }, { status: 404 });
    }

    // Definir configurações baseadas no tipo do achievement
    const achievementTypes: Record<string, string> = {
      "Contribuidor da Távola": "contribuidor_da_tavola",
    };

    const achievementType =
      achievementTypes[requestedAchievementType] || requestedAchievementType.toLowerCase().replace(/\s+/g, "_");

    // Conceder achievement
    const success = await grantSimpleAchievement(
      userData.id,
      achievementType,
      0, // XP será pego da tabela achievements
      "" // Descrição será pega da tabela achievements
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Achievement "${requestedAchievementType}" concedido para ${username}`,
        data: {
          username,
          achievement: requestedAchievementType,
          achievement_type: achievementType,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Falha ao conceder achievement (possivelmente já concedido hoje)" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[Grant Achievement] Erro:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro interno" }, { status: 500 });
  }
}
