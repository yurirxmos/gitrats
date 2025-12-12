// Explica o PORQUÊ: Next.js 16 descontinuou middleware.ts em favor de proxy.ts para reescrever e manipular requisições.
import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
}

export async function proxy(request: NextRequest, _event: NextFetchEvent) {
  const { response, supabase } = await updateSession(request);
  const isAdminPath = request.nextUrl.pathname.startsWith("/admin");

  if (!isAdminPath) return response;

  const redirectUrl = new URL("/", request.url);
  const redirectResponse = NextResponse.redirect(redirectUrl);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      copyCookies(response, redirectResponse);
      return redirectResponse;
    }

    const { data: userData, error: roleError } = await supabase.from("users").select("role").eq("id", user.id).single();

    if (roleError || userData?.role !== "admin") {
      copyCookies(response, redirectResponse);
      return redirectResponse;
    }
    return response;
  } catch (error) {
    console.error("[ADMIN_PROXY] Falha ao validar admin:", error);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
