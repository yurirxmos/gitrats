import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    const { data: sessionResult } = await supabase.auth.getSession();

    const cookieHeader = request.headers.get("cookie") || "";
    const rawCookies = cookieHeader.split(/;\s*/).filter(Boolean);
    const cookiesParsed = rawCookies.map((c) => {
      const [name, ...rest] = c.split("=");
      const value = rest.join("=");
      return {
        name,
        valuePreview: value ? value.slice(0, 12) + (value.length > 12 ? "..." : "") : "",
        length: value.length,
      };
    });

    return NextResponse.json({
      cookies: cookiesParsed,
      user: userResult.user ? { id: userResult.user.id } : null,
      userError: userError?.message || null,
      session: sessionResult.session
        ? {
            expires_at: sessionResult.session.expires_at,
            has_access_token: !!sessionResult.session.access_token,
            access_token_preview: sessionResult.session.access_token.slice(0, 12) + "...",
            has_provider_token: !!sessionResult.session.provider_token,
            provider_token_preview: sessionResult.session.provider_token
              ? sessionResult.session.provider_token.slice(0, 12) + "..."
              : null,
          }
        : null,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
