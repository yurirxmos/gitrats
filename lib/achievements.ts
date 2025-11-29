// lib/achievements.ts
// Sistema de Achievements - Funções utilitárias

import { createClient } from "@/lib/supabase/server";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon?: string;
  xp_reward: number;
  type: "one_time" | "progress" | "streak";
  category?: string;
  requirements: any;
  is_active: boolean;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  xp_granted: number;
  progress_data?: any;
  achievement?: Achievement;
}

/**
 * Verifica se um usuário já conquistou um achievement
 */
export async function hasAchievement(userId: string, achievementId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_id", achievementId)
    .single();

  return !!data;
}

/**
 * Lista todos os achievements conquistados por um usuário
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("user_achievements")
    .select(
      `
      id,
      user_id,
      achievement_id,
      unlocked_at,
      xp_granted,
      progress_data,
      achievements (
        id,
        name,
        description,
        icon,
        category,
        xp_reward,
        type
      )
    `
    )
    .eq("user_id", userId)
    .order("unlocked_at", { ascending: false });

  return data || [];
}

/**
 * Lista todos os achievements disponíveis
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("achievements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return data || [];
}

/**
 * Concede um achievement para um usuário
 */
export async function unlockAchievement(userId: string, achievementId: string, progressData?: any): Promise<boolean> {
  const supabase = await createClient();

  // Verificar se já conquistou
  const alreadyHas = await hasAchievement(userId, achievementId);
  if (alreadyHas) {
    return false; // Já conquistou
  }

  // Buscar dados do achievement
  const { data: achievement } = await supabase.from("achievements").select("*").eq("id", achievementId).single();

  if (!achievement) {
    console.error(`Achievement ${achievementId} não encontrado`);
    return false;
  }

  // Conceder achievement
  const { error } = await supabase.from("user_achievements").insert({
    user_id: userId,
    achievement_id: achievementId,
    xp_granted: achievement.xp_reward,
    progress_data: progressData || { unlocked_via: "system" },
  });

  if (error) {
    console.error("Erro ao conceder achievement:", error);
    return false;
  }

  // Conceder XP extra se houver
  if (achievement.xp_reward > 0) {
    await grantExtraXP(userId, achievement.xp_reward);
  }

  return true;
}

/**
 * Concede XP extra para um usuário (achievement bonus)
 */
export async function grantExtraXP(userId: string, xpAmount: number): Promise<void> {
  const supabase = await createClient();

  // Buscar personagem atual
  const { data: character } = await supabase
    .from("characters")
    .select("id, total_xp, level, current_xp")
    .eq("user_id", userId)
    .single();

  if (!character) {
    console.error(`Personagem não encontrado para usuário ${userId}`);
    return;
  }

  // Calcular novo XP total
  const newTotalXp = character.total_xp + xpAmount;

  // Importar funções de XP
  const { getLevelFromXp, getCurrentXp } = await import("@/lib/xp-system");

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

  // Atualizar XP das guildas do usuário após ganho de achievement
  try {
    const { recalculateGuildTotalsForUser } = await import("@/lib/guild");
    await recalculateGuildTotalsForUser(supabase as any, userId);
  } catch (e) {
    console.error("[Achievements] Falha ao atualizar XP da(s) guilda(s):", e);
  }
}

/**
 * Atualiza progresso de um achievement
 */
export async function updateProgress(userId: string, achievementId: string, increment: number = 1): Promise<void> {
  const supabase = await createClient();

  // Buscar progresso atual
  const { data: progress } = await supabase
    .from("achievement_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("achievement_id", achievementId)
    .single();

  const currentProgress = progress?.current_progress || 0;
  const newProgress = currentProgress + increment;

  // Atualizar progresso
  await supabase.from("achievement_progress").upsert({
    user_id: userId,
    achievement_id: achievementId,
    current_progress: newProgress,
    target_progress: progress?.target_progress || 1,
  });

  // Verificar se atingiu a meta
  const achievement = await supabase.from("achievements").select("*").eq("id", achievementId).single();

  if (achievement.data && newProgress >= achievement.data.requirements.target) {
    await unlockAchievement(userId, achievementId, {
      progress_achieved: newProgress,
      target: achievement.data.requirements.target,
    });
  }
}

/**
 * Busca progresso de um achievement específico
 */
export async function getAchievementProgress(userId: string, achievementId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("achievement_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("achievement_id", achievementId)
    .single();

  return data;
}
