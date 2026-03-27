"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useUserContext } from "@/contexts/user-context";
import {
  GITHUB_SYNC_EVENT_NAME,
  GITHUB_SYNC_INITIAL_DELAY_MS,
  GITHUB_SYNC_INTERVAL_MS,
  GITHUB_SYNC_LOCK_MS,
  GITHUB_SYNC_STORAGE_KEYS,
} from "@/lib/github-sync";
import { useUser } from "./use-user";

function readStoredNumber(key: string): number {
  if (typeof window === "undefined") return 0;

  const value = window.localStorage.getItem(key);
  const parsed = value ? Number(value) : 0;

  return Number.isFinite(parsed) ? parsed : 0;
}

function writeStoredNumber(key: string, value: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
}

/**
 * Hook para sincronização automática do GitHub a cada 10 minutos
 * Similar ao GitMon - sincroniza em background sem interromper o usuário
 * Só executa se o usuário tiver personagem criado
 */
export function useAutoSync(hasCharacter: boolean) {
  const { user } = useUser();
  const { refreshUserProfile } = useUserContext();
  const queryClient = useQueryClient();
  const lastSyncRef = useRef<number>(0);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== GITHUB_SYNC_STORAGE_KEYS.lastSyncAt) return;
      lastSyncRef.current = readStoredNumber(
        GITHUB_SYNC_STORAGE_KEYS.lastSyncAt,
      );
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    // Só executar se tiver usuário E personagem
    if (!user || !hasCharacter) {
      // Limpar interval se não tiver condições
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    lastSyncRef.current = Math.max(
      lastSyncRef.current,
      readStoredNumber(GITHUB_SYNC_STORAGE_KEYS.lastSyncAt),
    );

    // Função para fazer sync
    const performSync = async () => {
      const now = Date.now();

      if (now - lastSyncRef.current < GITHUB_SYNC_INTERVAL_MS) return;

      const storedLastSyncAt = readStoredNumber(
        GITHUB_SYNC_STORAGE_KEYS.lastSyncAt,
      );
      if (now - storedLastSyncAt < GITHUB_SYNC_INTERVAL_MS) {
        lastSyncRef.current = storedLastSyncAt;
        return;
      }

      const lockUntil = readStoredNumber(GITHUB_SYNC_STORAGE_KEYS.lockUntil);
      if (lockUntil > now) return;

      writeStoredNumber(
        GITHUB_SYNC_STORAGE_KEYS.lockUntil,
        now + GITHUB_SYNC_LOCK_MS,
      );

      try {
        const response = await fetch("/api/github/sync", {
          method: "POST",
        });

        const payload = await response
          .json()
          .catch((): { skipped?: boolean } | null => null);

        if (response.ok) {
          const syncTimestamp = Date.now();
          lastSyncRef.current = syncTimestamp;
          writeStoredNumber(GITHUB_SYNC_STORAGE_KEYS.lastSyncAt, syncTimestamp);

          if (!payload?.skipped) {
            await queryClient.invalidateQueries({
              queryKey: ["userProfile", user.id],
            });
            await refreshUserProfile();
            window.dispatchEvent(
              new CustomEvent(GITHUB_SYNC_EVENT_NAME, {
                detail: payload,
              }),
            );
          }
        } else if (response.status === 401) {
          return;
        }
      } catch {
        // Silencioso em produção
      } finally {
        window.localStorage.removeItem(GITHUB_SYNC_STORAGE_KEYS.lockUntil);
      }
    };

    // Fazer sync inicial após 5 segundos
    const initialSyncTimeout = setTimeout(() => {
      void performSync();
    }, GITHUB_SYNC_INITIAL_DELAY_MS);

    // Configurar interval para sync a cada 10 minutos
    syncIntervalRef.current = setInterval(() => {
      void performSync();
    }, GITHUB_SYNC_INTERVAL_MS);

    // Cleanup
    return () => {
      clearTimeout(initialSyncTimeout);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [user, hasCharacter, queryClient, refreshUserProfile]);
}
