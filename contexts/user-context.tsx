"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/types";
import { fetchUserProfile, updateUserNotifications } from "@/lib/queries/user-queries";

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

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Query para buscar perfil do usuário
  const {
    data: profileData,
    isLoading: profileLoading,
    refetch,
  } = useQuery({
    queryKey: ["userProfile", user?.id],
    queryFn: () => (user ? fetchUserProfile(user.id, user.user_metadata) : Promise.resolve(null)),
    enabled: !!user && !authLoading,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("No token")) return false;
      return failureCount < 2;
    },
  });

  // Mutation para atualizar notificações
  const notificationsMutation = useMutation({
    mutationFn: updateUserNotifications,
    onMutate: async (enabled) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["userProfile", user?.id] });
      const previous = queryClient.getQueryData(["userProfile", user?.id]);

      queryClient.setQueryData(["userProfile", user?.id], (old: any) => {
        if (!old) return old;
        return { ...old, notificationsEnabled: enabled };
      });

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback em caso de erro
      if (context?.previous) {
        queryClient.setQueryData(["userProfile", user?.id], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile", user?.id] });
    },
  });

  // Inicializar auth
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!mounted) return;
        setUser(currentUser);
      } catch (error) {
        console.error("[UserContext] Erro ao inicializar auth:", error);
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        queryClient.clear();
      }

      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, queryClient]);

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    queryClient.setQueryData(["userProfile", user?.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        profile: { ...old.profile, ...updates },
      };
    });
  };

  const refreshUserProfile = async () => {
    await refetch();
  };

  const updateNotifications = async (enabled: boolean) => {
    await notificationsMutation.mutateAsync(enabled);
  };

  const loading = authLoading || profileLoading;
  const hasCharacter = !!profileData?.profile;
  const userProfile = profileData?.profile ?? null;
  const notificationsEnabled = profileData?.notificationsEnabled ?? true;

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
