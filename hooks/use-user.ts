"use client";

import { useUserStore } from "@/store/user-store";

export function useUser() {
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  return { user, loading };
}
