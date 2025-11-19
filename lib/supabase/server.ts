import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  // Log de diagnóstico em produção para variáveis de ambiente
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("[SUPABASE_SERVER] Variáveis NEXT_PUBLIC_SUPABASE_URL/ANON_KEY ausentes no ambiente do servidor");
  }

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * Cliente Admin do Supabase - BYPASSA RLS
 * Use APENAS em rotas de debug/admin protegidas
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error("[SUPABASE_ADMIN] SUPABASE_SERVICE_ROLE_KEY não está definida no ambiente");
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não está definida");
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Obter usuário autenticado a partir de cookies OU header Authorization: Bearer <token>.
 * Retorna o mesmo client `supabase` para reutilização nas queries seguintes.
 */
export async function getAuthUserFromRequest(request: NextRequest) {
  const supabase = await createClient();
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  const bearer = authHeader && authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : null;
  try {
    // Primeiro tenta cookies normais
    const { data: cookieUser, error: cookieError } = await supabase.auth.getUser();
    if (cookieUser.user) {
      return { supabase, user: cookieUser.user, error: cookieError } as const;
    }
    // Se não deu certo e há bearer, tenta trocar sessão (fallback diagnóstico)
    if (bearer) {
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: bearer,
        refresh_token: bearer,
      });
      if (!sessionError) {
        const { data: userAfterSet } = await supabase.auth.getUser();
        if (userAfterSet.user) {
          return { supabase, user: userAfterSet.user, error: null } as const;
        }
      }
    }
    if (cookieError && !/auth session missing/i.test(cookieError.message)) {
      console.error("[SUPABASE_SERVER] getAuthUserFromRequest erro:", cookieError.message);
    }
    return { supabase, user: null, error: cookieError } as const;
  } catch (e) {
    console.error("[SUPABASE_SERVER] getAuthUserFromRequest exceção:", e);
    return { supabase, user: null, error: e as Error } as const;
  }
}
