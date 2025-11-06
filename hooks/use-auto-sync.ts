"use client";

import { useEffect, useRef } from "react";
import { useUser } from "./use-user";

/**
 * Hook para sincronização automática do GitHub a cada 10 minutos
 * Similar ao GitMon - sincroniza em background sem interromper o usuário
 */
export function useAutoSync() {
  const { user } = useUser();
  const lastSyncRef = useRef<number>(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      // Limpar interval se usuário fizer logout
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      return;
    }

    // Função para fazer sync
    const performSync = async () => {
      const now = Date.now();
      const TEN_MINUTES = 10 * 60 * 1000; // 10 minutos em ms

      // Verificar se já passou 10 minutos desde o último sync
      if (now - lastSyncRef.current < TEN_MINUTES) {
        console.log("[Auto Sync] Sync recente, pulando...");
        return;
      }

      try {
        console.log("[Auto Sync] Iniciando sincronização automática...");

        const response = await fetch("/api/github/sync", {
          method: "POST",
        });

        if (response.ok) {
          const data = await response.json();
          lastSyncRef.current = now;

          if (data.data?.xp_gained > 0) {
            console.log(
              `[Auto Sync] ✅ +${data.data.xp_gained} XP | ${data.data.stats?.commits || 0} commits, ${data.data.stats?.prs || 0} PRs`
            );
          } else {
            console.log("[Auto Sync] ✅ Sincronizado - nenhuma atividade nova");
          }
        } else {
          console.error("[Auto Sync] Erro ao sincronizar:", await response.text());
        }
      } catch (error) {
        console.error("[Auto Sync] Erro:", error);
      }
    };

    // Fazer sync inicial após 5 segundos (dar tempo do usuário carregar)
    const initialSyncTimeout = setTimeout(() => {
      performSync();
    }, 5000);

    // Configurar interval para sync a cada 10 minutos
    syncIntervalRef.current = setInterval(
      () => {
        performSync();
      },
      10 * 60 * 1000
    ); // 10 minutos

    // Cleanup
    return () => {
      clearTimeout(initialSyncTimeout);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [user]);
}
