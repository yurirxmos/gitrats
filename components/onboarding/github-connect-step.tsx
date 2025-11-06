"use client";

import { FaGithub } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";

interface GitHubConnectStepProps {
  onNext: () => void;
}

export function GitHubConnectStep({ onNext }: GitHubConnectStepProps) {
  const supabase = createClient();
  const { user, loading } = useUser();

  const handleNext = async () => {
    if (!user) return;

    // Salvar/atualizar token do GitHub antes de prosseguir
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (token) {
        await fetch("/api/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            githubId: user.user_metadata?.provider_id || user.id,
            githubUsername: user.user_metadata?.user_name || user.email?.split("@")[0],
            githubAvatarUrl: user.user_metadata?.avatar_url,
            name: user.user_metadata?.full_name || user.user_metadata?.name,
            email: user.email,
          }),
        });
      }
    } catch (error) {
      console.error("Erro ao salvar token:", error);
    }

    onNext();
  };

  const handleGitHubLogin = async () => {
    // Salvar que estava no onboarding antes de redirecionar
    localStorage.setItem("onboarding_in_progress", "true");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (error) {
      console.error("Erro ao conectar com GitHub:", error);
      localStorage.removeItem("onboarding_in_progress");
    }
  };

  const isLoggedIn = !!user;

  return (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 bg-foreground/10 rounded-full flex items-center justify-center mx-auto">
        <FaGithub className="text-5xl text-foreground" />
      </div>

      {isLoggedIn ? (
        <>
          <h2 className="text-3xl font-black">Você já está logado!</h2>
          <p className="text-muted-foreground">
            Conectado como <strong>@{user.user_metadata?.user_name || user.email}</strong>
          </p>
          <Button
            onClick={handleNext}
            className="w-full bg-foreground hover:opacity-90 text-background font-bold"
          >
            Prosseguir
          </Button>
        </>
      ) : (
        <>
          <h2 className="text-3xl font-black">Conecte seu GitHub</h2>
          <p className="text-muted-foreground">
            Precisamos acessar seu GitHub para rastrear seus commits e pull requests. Não se preocupe, não fazemos
            nenhuma alteração no seu código!
          </p>
          <Button
            onClick={handleGitHubLogin}
            className="w-full bg-foreground hover:opacity-90 text-background font-bold"
            disabled={loading}
          >
            <FaGithub className="text-xl" />
            {loading ? "Carregando..." : "Conectar com GitHub"}
          </Button>
        </>
      )}
    </div>
  );
}
