import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Log de segurança para diagnosticar envs ausentes em produção
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Comentário: logar claramente quando as variáveis públicas não estão definidas
    console.error("[SUPABASE_CLIENT] Variáveis NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes no ambiente");
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
  );
}
