"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/user-store";

export function UserStoreProvider({ children }: { children: React.ReactNode }) {
  const { setUser, loadUserProfile, clearUserData } = useUserStore();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const initAuth = async () => {
      console.log("[UserStoreProvider] Initializing auth...");
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      console.log("[UserStoreProvider] Current user:", currentUser?.id);
      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser);
      } else {
        useUserStore.setState({ loading: false });
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log("[UserStoreProvider] Auth state changed:", event);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser);
      } else {
        clearUserData();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, loadUserProfile, clearUserData]);

  return <>{children}</>;
}
