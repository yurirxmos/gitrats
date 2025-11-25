import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  console.log("[AUTH_CALLBACK] Iniciado");
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  console.log("[AUTH_CALLBACK] Params:", { hasCode: !!code, next });

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
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
      }
    );

    console.log("[AUTH_CALLBACK] Trocando code por session...");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[AUTH_CALLBACK] Exchange result:", {
      hasSession: !!data?.session,
      error: error?.message,
      hasUser: !!data?.session?.user,
      userId: data?.session?.user?.id,
    });

    if (!error && data.session) {
      const user = data.session.user;
      const providerToken = data.session.provider_token;

      console.log("[AUTH_CALLBACK] User data:", {
        userId: user.id,
        username: user.user_metadata.user_name,
        hasToken: !!providerToken,
      });

      const { data: existingUser } = await supabase.from("users").select("id").eq("id", user.id).single();

      console.log("[AUTH_CALLBACK] Existing user check:", {
        exists: !!existingUser,
        userId: user.id,
        searchedId: user.id,
      });

      if (existingUser) {
        console.log("[AUTH_CALLBACK] Atualizando token do usuário existente...");
        const { error: updateError } = await supabase
          .from("users")
          .update({
            github_access_token: providerToken,
            github_username: user.user_metadata.user_name || user.user_metadata.preferred_username,
            github_avatar_url: user.user_metadata.avatar_url,
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("[AUTH_CALLBACK] Erro ao atualizar:", updateError);
        } else {
          console.log("[AUTH_CALLBACK] Token atualizado com sucesso");
        }
      } else {
        console.log("[AUTH_CALLBACK] Criando novo usuário...", {
          userId: user.id,
          githubId: user.user_metadata.provider_id,
          username: user.user_metadata.user_name || user.user_metadata.preferred_username,
        });
        const { error: insertError } = await supabase.from("users").insert({
          id: user.id,
          github_id: user.user_metadata.provider_id,
          github_username: user.user_metadata.user_name || user.user_metadata.preferred_username,
          github_avatar_url: user.user_metadata.avatar_url,
          github_access_token: providerToken,
          name: user.user_metadata.full_name || user.user_metadata.name,
          email: user.email,
        });

        if (insertError) {
          console.error("[AUTH_CALLBACK] Erro ao criar usuário:", {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          });
        } else {
          console.log("[AUTH_CALLBACK] Usuário criado com sucesso");
        }
      }

      console.log("[AUTH_CALLBACK] Redirecionando para:", next);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  console.log("[AUTH_CALLBACK] Erro - redirecionando para error page");
  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
