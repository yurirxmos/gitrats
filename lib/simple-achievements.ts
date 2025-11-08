// lib/simple-achievements.ts
// Sistema simplificado de achievements

import { createAdminClient } from "@/lib/supabase/server";
import { getLevelFromXp, getCurrentXp } from "@/lib/xp-system";

/**
 * Concede um achievement simples para um usuário
 */
export async function grantSimpleAchievement(
  userId: string,
  achievementType: string,
  xpBonus: number,
  description: string,
  grantedBy: string = "admin"
): Promise<boolean> {
  // Usamos client admin para bypass RLS ao conceder achievements em rotas administrativas
  const supabase = createAdminClient();

  try {
    // Buscar o achievement na tabela achievements
    const { data: achievement, error: achievementError } = await supabase
      .from("achievements")
      .select("id, name, xp_reward")
      .eq("code", achievementType)
      .eq("is_active", true)
      .single();

    if (achievementError || !achievement) {
      console.error(`Achievement "${achievementType}" não encontrado ou inativo`);
      return false;
    }

    // Verificar se o usuário já tem este achievement (tabela relacional)
    const { data: alreadyHas } = await supabase
      .from("user_achievements")
      .select("user_id")
      .eq("user_id", userId)
      .eq("achievement_id", achievement.id)
      .maybeSingle();

    if (alreadyHas) return false; // Já concedido

    // Buscar personagem atual
    const { data: character } = await supabase
      .from("characters")
      .select("id, total_xp, level, current_xp")
      .eq("user_id", userId)
      .single();

    if (!character) {
      console.error(`Personagem não encontrado para usuário ${userId}`);
      return false;
    }

    // Calcular novo XP
    const newTotalXp = character.total_xp + achievement.xp_reward;
    const newLevel = getLevelFromXp(newTotalXp);
    const newCurrentXp = getCurrentXp(newTotalXp, newLevel);

    // Atualizar personagem
    await supabase
      .from("characters")
      .update({
        total_xp: newTotalXp,
        level: newLevel,
        current_xp: newCurrentXp,
      })
      .eq("id", character.id);

    // Registrar o achievement concedido na tabela relacional
    await supabase.from("user_achievements").insert({
      user_id: userId,
      achievement_id: achievement.id,
      granted_by: grantedBy,
    });

    return true;
  } catch (error) {
    console.error("Erro ao conceder achievement:", error);
    return false;
  }
}
