"use client";

import { useEffect } from "react";
import { FaTriangleExclamation } from "react-icons/fa6";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Loga o erro globalmente no console do navegador/Edge logs
  useEffect(() => {
    // Comentário: manter log explícito para debug em produção
    // eslint-disable-next-line no-console
    console.error("[GlobalError]", { message: error?.message, stack: error?.stack, digest: (error as any)?.digest });
  }, [error]);

  return (
    <html>
      <body className="min-h-screen grid place-items-center p-6 bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 text-center space-y-3">
          <div className="flex justify-center">
            <FaTriangleExclamation className="text-red-500 text-3xl" />
          </div>
          <h2 className="font-bold text-xl">Algo deu errado</h2>
          <p className="text-sm text-muted-foreground">Tente novamente ou recarregue a página.</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => reset()}
              className="px-3 py-2 text-sm rounded bg-foreground text-background hover:opacity-90"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => location.reload()}
              className="px-3 py-2 text-sm rounded border border-border hover:bg-muted"
            >
              Recarregar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
