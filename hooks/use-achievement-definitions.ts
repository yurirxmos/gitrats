"use client";

import { useQuery } from "@tanstack/react-query";

interface AchievementDefinition {
  code: string;
  name: string;
  description: string;
  xp_reward: number;
  is_active: boolean;
}

// Hook para carregar definições de achievements (nome, descrição, xp)
export function useAchievementDefinitions() {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: AchievementDefinition[] }>({
    queryKey: ["achievement-definitions"],
    queryFn: async () => {
      const res = await fetch("/api/achievements");
      if (!res.ok) throw new Error("Falha ao carregar achievements");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const map: Record<string, AchievementDefinition> = {};
  if (data?.data) {
    for (const a of data.data) map[a.code] = a;
  }

  return { definitions: map, isLoading, error };
}
