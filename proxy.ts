// Explica o PORQUÊ: Next.js 16 descontinuou middleware.ts em favor de proxy.ts para reescrever e manipular requisições.
import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
