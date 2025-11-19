"use client";

import { useUserStore } from "@/store/user-store";

/**
 * Hook de compatibilidade para substituir useUserContext
 * Retorna todas as propriedades e métodos do user store
 */
export function useUserContext() {
  const user = useUserStore((state) => state.user);
  const userProfile = useUserStore((state) => state.userProfile);
  const loading = useUserStore((state) => state.loading);
  const hasCharacter = useUserStore((state) => state.hasCharacter);
  const notificationsEnabled = useUserStore((state) => state.notificationsEnabled);
  const refreshUserProfile = useUserStore((state) => state.refreshUserProfile);
  const updateNotifications = useUserStore((state) => state.updateNotifications);
  const setUserProfile = useUserStore((state) => state.setUserProfile);

  // Manter compatibilidade com API antiga
  const updateUserProfile = (updates: any) => {
    if (!userProfile) return;
    setUserProfile({ ...userProfile, ...updates });
  };

  return {
    user,
    userProfile,
    loading,
    hasCharacter,
    notificationsEnabled,
    refreshUserProfile,
    updateUserProfile,
    updateNotifications,
  };
}
