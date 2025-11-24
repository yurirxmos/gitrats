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
    if (typeof window === "undefined") return null; // SSR safety
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
    } catch {
      return null;
    }
  }, []);

  // Salvar no cache
  const saveToCache = useCallback((profile: UserProfile, notificationsEnabled: boolean) => {
    if (typeof window === "undefined") return; // SSR safety
    try {
      const cacheData: CachedProfile = {
        data: profile,
        notificationsEnabled,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch {}
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
          // Sem token ainda: não afirmar ausência definitiva; aguardar próxima iteração
          return;
        }
        // Buscar personagem: determinar existência apenas a partir deste endpoint
        const characterResponse = await fetch("/api/character", { headers: { Authorization: `Bearer ${token}` } });

        if (characterResponse.status === 404) {
          // Ausência confirmada
          setHasCharacter(false);
          setUserProfile(null);
          if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
          return;
        }

        if (!characterResponse.ok) {
          // Erros 401/500 ou transitórios: não mudar estado para falso
          return;
        }

        const { data: characterData } = await characterResponse.json();
        setHasCharacter(true);

        // Carregar dados do usuário (incluindo notificações)
        let userData: any = null;
        try {
          const userResponse = await fetch("/api/user", { headers: { Authorization: `Bearer ${token}` } });
          userData = userResponse.ok ? (await userResponse.json()).data : null;
        } catch {}

        // Rank é best-effort e não deve impactar hasCharacter
        let rankData: any = null;
        try {
          const rankResponse = await fetch(`/api/leaderboard/${currentUser.id}`);
          rankData = rankResponse.ok ? (await rankResponse.json()).data : null;
        } catch {}

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
        // Falhas genéricas: não alterar hasCharacter para falso aqui
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
        const res = await fetch("/api/user", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationsEnabled: enabled }),
        });
        if (!res.ok) throw new Error("Falha update");
      } catch (e) {
        // Reverter em caso de erro
        setNotificationsEnabled(!enabled);
        if (userProfile) {
          saveToCache(userProfile, !enabled);
        }
      }
    },
    [userProfile, saveToCache]
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
    let timeoutId: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        setUser(currentUser);

        if (currentUser) {
          await loadUserProfile(currentUser);
        }
      } catch (error) {
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Timeout de segurança: forçar loading=false após 5 segundos
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 5000);

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadUserProfile(currentUser);
      } else {
        setUserProfile(null);
        setHasCharacter(false);
        if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
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
