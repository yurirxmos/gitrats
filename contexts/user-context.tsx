"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/types";

interface UserContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  hasCharacter: boolean;
  notificationsEnabled: boolean;
  refreshUserProfile: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  updateNotifications: (enabled: boolean) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const CACHE_KEY = "gitrats_user_profile";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

interface CachedProfile {
  data: UserProfile;
  notificationsEnabled: boolean;
  timestamp: number;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCharacter, setHasCharacter] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const supabase = createClient();
  const isLoadingRef = useRef(false);

  // Carregar do cache
  const loadFromCache = useCallback((): { profile: UserProfile; notificationsEnabled: boolean } | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, notificationsEnabled, timestamp }: CachedProfile = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > CACHE_EXPIRY;

      if (isExpired) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return { profile: data, notificationsEnabled };
    } catch (e) {
      // Log somente quando falhar parsing do cache (ajuda a identificar storage corrompido em prod)
      console.error("[UserProvider] Failed to parse cached user profile", e);
      return null;
    }
  }, []);

  // Salvar no cache
  const saveToCache = useCallback((profile: UserProfile, notificationsEnabled: boolean) => {
    try {
      const cacheData: CachedProfile = { data: profile, notificationsEnabled, timestamp: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error("[UserProvider] Failed to save profile to cache", e);
    }
  }, []);

  // Carregar perfil do usuário
  const loadUserProfile = useCallback(
    async (currentUser: User, forceRefresh = false): Promise<void> => {
      if (isLoadingRef.current && !forceRefresh) return;

      // Tentar carregar do cache primeiro
      if (!forceRefresh) {
        const cached = loadFromCache();
        if (cached) {
          setUserProfile(cached.profile);
          setNotificationsEnabled(cached.notificationsEnabled);
          setHasCharacter(true);
          setLoading(false);
          return;
        }
      }

      isLoadingRef.current = true;

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          console.error("[UserProvider] Missing access token; user likely not authenticated");
          setHasCharacter(false);
          setUserProfile(null);
          return;
        }

        const characterResponse = await fetch("/api/character", { headers: { Authorization: `Bearer ${token}` } });

        if (!characterResponse.ok) {
          const bodyText = await characterResponse.text().catch(() => "<no-body>");
          console.error("[UserProvider] /api/character failed", {
            status: characterResponse.status,
            statusText: characterResponse.statusText,
            body: bodyText,
          });
          setHasCharacter(false);
          setUserProfile(null);
          localStorage.removeItem(CACHE_KEY);
          return;
        }

        const { data: characterData } = await characterResponse.json();
        setHasCharacter(true);

        // Carregar dados do usuário (incluindo notificações)
        const userResponse = await fetch("/api/user", { headers: { Authorization: `Bearer ${token}` } });
        let userData: any = null;
        if (userResponse.ok) {
          userData = (await userResponse.json()).data;
        } else {
          const bodyText = await userResponse.text().catch(() => "<no-body>");
          console.error("[UserProvider] /api/user failed", {
            status: userResponse.status,
            statusText: userResponse.statusText,
            body: bodyText,
          });
        }

        const rankResponse = await fetch(`/api/leaderboard/${currentUser.id}`);
        let rankData: any = null;
        if (rankResponse.ok) {
          ({ data: rankData } = await rankResponse.json());
        } else {
          const bodyText = await rankResponse.text().catch(() => "<no-body>");
          console.error("[UserProvider] /api/leaderboard/[userId] failed", {
            status: rankResponse.status,
            statusText: rankResponse.statusText,
            body: bodyText,
          });
        }

        const profile: UserProfile = {
          character_name: characterData.name,
          character_class: characterData.class,
          level: characterData.level,
          current_xp: characterData.current_xp,
          total_xp: characterData.total_xp,
          rank: rankData?.rank || 0,
          total_commits: characterData.github_stats?.total_commits || 0,
          total_prs: characterData.github_stats?.total_prs || 0,
          total_issues: characterData.github_stats?.total_issues || 0,
          github_username: currentUser.user_metadata?.user_name || currentUser.email?.split("@")[0] || "User",
          created_at: characterData.created_at,
          achievement_codes: characterData.achievement_codes || [],
        };

        setUserProfile(profile);
        setNotificationsEnabled(Boolean(userData?.notifications_enabled ?? true));
        saveToCache(profile, Boolean(userData?.notifications_enabled ?? true));
      } catch (e) {
        console.error("[UserProvider] Unexpected error while loading user profile", e);
        setHasCharacter(false);
        setUserProfile(null);
        localStorage.removeItem(CACHE_KEY);
      } finally {
        isLoadingRef.current = false;
      }
    },
    [supabase, loadFromCache, saveToCache]
  );

  // Atualizar perfil localmente (otimistic update)
  const updateUserProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      if (!userProfile) return;

      const updated = { ...userProfile, ...updates };
      setUserProfile(updated);
      saveToCache(updated, notificationsEnabled);
    },
    [userProfile, notificationsEnabled, saveToCache]
  );

  // Atualizar notificações
  const updateNotifications = useCallback(
    async (enabled: boolean) => {
      setNotificationsEnabled(enabled);
      if (userProfile) {
        saveToCache(userProfile, enabled);
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch("/api/user", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ notificationsEnabled: enabled }),
        });
        if (!res.ok) throw new Error("Falha update");
      } catch (e) {
        // Reverter em caso de erro
        console.error("[UserProvider] Failed to update notifications", e);
        setNotificationsEnabled(!enabled);
        if (userProfile) {
          saveToCache(userProfile, !enabled);
        }
      }
    },
    [userProfile, saveToCache, supabase]
  );

  // Refresh manual
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      await loadUserProfile(user, true);
    }
  }, [user, loadUserProfile]);

  // Inicializar auth
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser);
      }

      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser);
      } else {
        setUserProfile(null);
        setHasCharacter(false);
        localStorage.removeItem(CACHE_KEY);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadUserProfile]);

  return (
    <UserContext.Provider
      value={{
        user,
        userProfile,
        loading,
        hasCharacter,
        notificationsEnabled,
        refreshUserProfile,
        updateUserProfile,
        updateNotifications,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext deve ser usado dentro de UserProvider");
  }
  return context;
}
