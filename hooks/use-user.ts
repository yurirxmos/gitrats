"use client";

import { useUserContext } from "@/contexts/user-context";

export function useUser() {
  const { user, loading } = useUserContext();
  return { user, loading };
}
