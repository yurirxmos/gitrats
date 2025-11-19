"use client";

import { useEffect, useRef } from "react";
import { useUser } from "./use-user";

/**
 * Hook para sincronização automática do GitHub a cada 10 minutos
 * Similar ao GitMon - sincroniza em background sem interromper o usuário
 * Só executa se o usuário tiver personagem criado
 */
export function useAutoSync(hasCharacter: boolean) {
  const { user } = useUser();
  const lastSyncRef = useRef<number>(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    // Função para fazer sync
    const performSync = async () => {
      const now = Date.now();
      const TEN_MINUTES = 10 * 60 * 1000;

      if (now - lastSyncRef.current < TEN_MINUTES) return;

      try {
        const response = await fetch("/api/github/sync", {
          method: "POST",
        });

        if (response.ok) {
          lastSyncRef.current = now;
        } else if (response.status === 401) {
          // Token expirado - usuário foi desconectado
          window.location.href = "/";
        }
      } catch (error) {
        // Silencioso em produção
      }
    };

    // Fazer sync inicial após 5 segundos
    const initialSyncTimeout = setTimeout(() => {
      performSync();
    }, 5000);

    // Configurar interval para sync a cada 10 minutos
    syncIntervalRef.current = setInterval(
      () => {
        performSync();
      },
      10 * 60 * 1000
    );

    // Cleanup
    return () => {
      clearTimeout(initialSyncTimeout);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [user, hasCharacter]);
}
