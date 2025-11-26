"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { GitHubConnectStep } from "@/components/onboarding/github-connect-step";
import { CharacterCreationStep } from "@/components/onboarding/character-creation-step";
import { ReadyStep } from "@/components/onboarding/ready-step";
import { useUser } from "@/hooks/use-user";
import { useUserContext } from "@/contexts/user-context";
import { createClient } from "@/lib/supabase/client";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const { hasCharacter } = useUserContext();

  const stepParam = searchParams.get("step");
  const [step, setStep] = useState(stepParam ? parseInt(stepParam) : 1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stepFromUrl = stepParam ? parseInt(stepParam) : 1;
    if (stepFromUrl >= 1 && stepFromUrl <= 3) {
      setStep(stepFromUrl);
    }
  }, [stepParam]);

  const updateStep = (newStep: number) => {
    setStep(newStep);
    router.push(`/onboarding?step=${newStep}`, { scroll: false });
  };

  const handleCharacterCreation = async (data: { name: string; class: string }) => {
    if (!user) {
      setError("Você precisa estar logado para criar um personagem");
      return;
    }

    if (hasCharacter) {
      updateStep(3);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Sessão não encontrada");
      }

      const userResponse = await fetch("/api/user", {
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

      if (!userResponse.ok) {
        throw new Error("Erro ao criar usuário");
      }

      const characterResponse = await fetch("/api/character", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          characterClass: data.class,
        }),
      });

      if (!characterResponse.ok) {
        const errorData = await characterResponse.json();
        throw new Error(errorData.error || "Erro ao criar personagem");
      }

      updateStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFinish = () => {
    setError(null);
    router.push("/leaderboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md md:max-w-2xl bg-card border border-border rounded-lg p-6 md:p-8 shadow-lg">
        <div className="w-full flex items-center justify-center mb-6">
          <div className="flex gap-2 w-full md:w-96">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-all ${i <= step ? "bg-foreground" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && <GitHubConnectStep onNext={() => updateStep(2)} />}

        {step === 2 && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-md text-red-500 text-sm">
                {error}
              </div>
            )}
            <CharacterCreationStep
              onNext={handleCharacterCreation}
              isLoading={isCreating}
            />
          </>
        )}

        {step === 3 && <ReadyStep onFinish={handleFinish} />}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-full max-w-md md:max-w-2xl bg-card border border-border rounded-lg p-6 md:p-8 shadow-lg">
            <div className="w-full flex items-center justify-center mb-6">
              <div className="flex gap-2 w-full md:w-96">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-2 flex-1 rounded-full bg-muted"
                  />
                ))}
              </div>
            </div>
            <div className="text-center">Carregando...</div>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
