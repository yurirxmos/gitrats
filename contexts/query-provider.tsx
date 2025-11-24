"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 segundos
            gcTime: 5 * 60 * 1000, // 5 minutos
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: (failureCount, error: any) => {
              // Não retentar em 404 (personagem não existe)
              if (error?.message?.includes("404")) return false;
              return failureCount < 2;
            },
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
