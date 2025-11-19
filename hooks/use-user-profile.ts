"use client";

import { useUserContext } from "@/contexts/user-context";

export function useUserProfile() {
  const { userProfile, hasCharacter, refreshUserProfile, updateUserProfile, loading } = useUserContext();

  return {
    userProfile,
    hasCharacter,
    loading,
    refreshUserProfile,
    updateUserProfile,
  };
}
