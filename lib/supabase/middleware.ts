import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("[SUPABASE_MIDDLEWARE] Variáveis públicas do Supabase ausentes (URL/ANON_KEY)");
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refresh session if expired
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("[SUPABASE_MIDDLEWARE] Erro ao obter usuário no middleware:", error.message);
    }
  } catch (e) {
    console.error("[SUPABASE_MIDDLEWARE] Exceção ao obter usuário:", e);
  }

  return supabaseResponse;
}
