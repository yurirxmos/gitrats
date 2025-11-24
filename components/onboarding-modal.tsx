"use client";

import { useState, useEffect } from "react";
import { GitHubConnectStep } from "./onboarding/github-connect-step";
import { CharacterCreationStep } from "./onboarding/character-creation-step";
import { ReadyStep } from "./onboarding/ready-step";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: number;
}

export function OnboardingModal({ isOpen, onClose, initialStep = 1 }: OnboardingModalProps) {
  const { user } = useUser();
  const [step, setStep] = useState(initialStep);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetar step quando modal abre/fecha ou quando initialStep muda
  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
    }
  }, [isOpen, initialStep]);

  // Verificar se usuário já tem personagem ao abrir modal
  useEffect(() => {
    const checkExistingCharacter = async () => {
      if (!isOpen) return;

      // Se não tem usuário, vai para step 1 (GitHub Connect)
      if (!user) {
        setStep(1);
        return;
      }

      // Se tem usuário, verificar se já tem personagem
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          setStep(1);
          return;
        }

        const response = await fetch("/api/character", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Já tem personagem, redirecionar
          window.location.href = "/leaderboard";
        } else {
          // Não tem personagem, ir para criação
          setStep(2);
        }
      } catch (err) {
        // Em caso de erro, permitir criar personagem
        setStep(2);
      }
    };

    checkExistingCharacter();
  }, [isOpen, user]);

  const handleCharacterCreation = async (data: { name: string; class: string }) => {
    if (!user) {
      setError("Você precisa estar logado para criar um personagem");
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

      // 1. Criar/atualizar usuário no banco
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

      // 2. Criar personagem
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

      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFinish = () => {
    onClose();
    setError(null);
    // Redirecionar para leaderboard
    window.location.href = "/leaderboard";
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="w-full max-w-md md:max-w-2xl p-4 md:p-6 font-sans">
        <DialogTitle className="sr-only">Onboarding</DialogTitle>
        <DialogDescription className="sr-only">Configure sua conta e crie seu personagem</DialogDescription>
        <div className="w-full flex flex-row items-center justify-center">
          <div className="flex gap-2 w-full md:w-96">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${i <= step ? "bg-foreground" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>

        {step === 1 && <GitHubConnectStep onNext={() => setStep(2)} />}

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
      </DialogContent>
    </Dialog>
  );
}
