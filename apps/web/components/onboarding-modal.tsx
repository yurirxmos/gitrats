"use client";

import { useState, useEffect } from "react";
import { GitHubConnectStep } from "./onboarding/github-connect-step";
import { CharacterCreationStep } from "./onboarding/character-creation-step";
import { ReadyStep } from "./onboarding/ready-step";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Se o usuário já estiver logado quando abrir o modal, pular para o passo 2
  useEffect(() => {
    if (isOpen && user) {
      setStep(2);
    } else if (isOpen && !user) {
      setStep(1);
    }
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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

      // 1. Criar/atualizar usuário no banco
      const userResponse = await fetch(`${apiUrl}/api/user`, {
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
      const characterResponse = await fetch(`${apiUrl}/api/character`, {
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
      console.error("Erro ao criar personagem:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsCreating(false);
    }
  };

  const handleFinish = () => {
    onClose();
    setStep(1);
    setError(null);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="max-w-2xl font-sans">
        <div className="w-full flex flex-row items-center justify-center">
          <div className="flex gap-2 mb-5 w-100">
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
              onBack={() => setStep(1)}
              isLoading={isCreating}
            />
          </>
        )}

        {step === 3 && (
          <ReadyStep
            onFinish={handleFinish}
            onBack={() => setStep(2)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
