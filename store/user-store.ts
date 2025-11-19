import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/types";

interface UserState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  hasCharacter: boolean;
  notificationsEnabled: boolean;
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setHasCharacter: (has: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  loadUserProfile: (currentUser: User, forceRefresh?: boolean) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  updateNotifications: (enabled: boolean) => Promise<void>;
  clearUserData: () => void;
}

const CACHE_KEY = "gitrats_user_profile";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

interface CachedProfile {
  data: UserProfile;
  notificationsEnabled: boolean;
  timestamp: number;
}

// Helpers de cache
const loadFromCache = (): { profile: UserProfile; notificationsEnabled: boolean } | null => {
  if (typeof window === "undefined") return null;
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
    console.error("[UserStore] Failed to parse cached user profile", e);
    return null;
  }
};

const saveToCache = (profile: UserProfile, notificationsEnabled: boolean) => {
  if (typeof window === "undefined") return;
  try {
    const cacheData: CachedProfile = { data: profile, notificationsEnabled, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    console.error("[UserStore] Failed to save profile to cache", e);
  }
};

let isLoadingProfile = false;

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  userProfile: null,
  loading: true,
  hasCharacter: false,
  notificationsEnabled: true,

  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  setHasCharacter: (hasCharacter) => set({ hasCharacter }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),

  loadUserProfile: async (currentUser: User, forceRefresh = false) => {
    if (isLoadingProfile && !forceRefresh) {
      console.log("[UserStore] Load already in progress, skipping");
      return;
    }

    // Tentar carregar do cache primeiro
    if (!forceRefresh) {
      const cached = loadFromCache();
      if (cached) {
        console.log("[UserStore] Loading from cache");
        set({
          userProfile: cached.profile,
          notificationsEnabled: cached.notificationsEnabled,
          hasCharacter: true,
          loading: false,
        });
        return;
      }
    }

    isLoadingProfile = true;
    set({ loading: true });

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        console.error("[UserStore] Missing access token; user likely not authenticated");
        set({ hasCharacter: false, userProfile: null, loading: false });
        isLoadingProfile = false;
        return;
      }

      console.log("[UserStore] Fetching character data...");
      const characterResponse = await fetch("/api/character", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!characterResponse.ok) {
        const bodyText = await characterResponse.text().catch(() => "<no-body>");
        console.error("[UserStore] /api/character failed", {
          status: characterResponse.status,
          statusText: characterResponse.statusText,
          body: bodyText,
        });
        set({ hasCharacter: false, userProfile: null, loading: false });
        if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
        isLoadingProfile = false;
        return;
      }

      const { data: characterData } = await characterResponse.json();
      console.log("[UserStore] Character data loaded:", characterData);
      set({ hasCharacter: true });

      // Carregar dados do usuário (incluindo notificações)
      console.log("[UserStore] Fetching user data...");
      const userResponse = await fetch("/api/user", {
        headers: { Authorization: `Bearer ${token}` },
      });

      let userData: any = null;
      if (userResponse.ok) {
        userData = (await userResponse.json()).data;
        console.log("[UserStore] User data loaded:", userData);
      } else {
        const bodyText = await userResponse.text().catch(() => "<no-body>");
        console.error("[UserStore] /api/user failed", {
          status: userResponse.status,
          statusText: userResponse.statusText,
          body: bodyText,
        });
      }

      // Carregar rank
      console.log("[UserStore] Fetching rank...");
      const rankResponse = await fetch(`/api/leaderboard/${currentUser.id}`);
      let rankData: any = null;
      if (rankResponse.ok) {
        ({ data: rankData } = await rankResponse.json());
        console.log("[UserStore] Rank loaded:", rankData);
      } else {
        const bodyText = await rankResponse.text().catch(() => "<no-body>");
        console.error("[UserStore] /api/leaderboard/[userId] failed", {
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

      console.log("[UserStore] Profile built successfully:", profile);
      set({
        userProfile: profile,
        notificationsEnabled: Boolean(userData?.notifications_enabled ?? true),
        loading: false,
      });
      saveToCache(profile, Boolean(userData?.notifications_enabled ?? true));
    } catch (e) {
      console.error("[UserStore] Unexpected error while loading user profile", e);
      set({ hasCharacter: false, userProfile: null, loading: false });
      if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
    } finally {
      isLoadingProfile = false;
    }
  },

  refreshUserProfile: async () => {
    const { user, loadUserProfile } = get();
    if (user) {
      console.log("[UserStore] Refreshing user profile...");
      await loadUserProfile(user, true);
    }
  },

  updateNotifications: async (enabled: boolean) => {
    const { userProfile } = get();
    set({ notificationsEnabled: enabled });
    if (userProfile) {
      saveToCache(userProfile, enabled);
    }

    try {
      const supabase = createClient();
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

      if (!res.ok) throw new Error("Falha ao atualizar");
    } catch (e) {
      console.error("[UserStore] Failed to update notifications", e);
      // Reverter em caso de erro
      set({ notificationsEnabled: !enabled });
      if (userProfile) {
        saveToCache(userProfile, !enabled);
      }
    }
  },

  clearUserData: () => {
    console.log("[UserStore] Clearing user data");
    set({
      user: null,
      userProfile: null,
      hasCharacter: false,
      loading: false,
      notificationsEnabled: true,
    });
    if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
  },
}));
