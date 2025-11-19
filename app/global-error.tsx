"use client";

// Componente de erro global para evitar tela branca em falhas inesperadas
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <p className="text-sm text-neutral-500 wrap-break-word">
            {error?.message || "Unexpected error"}
          </p>
          {error?.digest && (
            <p className="text-xs text-neutral-500">digest: {error.digest}</p>
          )}
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded bg-black text-white text-sm"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
