"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { OnboardingModal } from "@/components/onboarding-modal";
import LeaderboardProfileCard from "@/components/leaderboard-profile-card";
import { useUserContext } from "@/contexts/user-context";
import { FaSkull } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export default function Profile() {
  const { user, userProfile, hasCharacter, refreshUserProfile, notificationsEnabled, updateNotifications } =
    useUserContext();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState<boolean>(false);

  // Alternar notificações (otimista)
  const toggleNotifications = async () => {
    if (!user || savingNotifications) return;
    const nextValue = !notificationsEnabled;
    setSavingNotifications(true);
    await updateNotifications(nextValue);
    setSavingNotifications(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-8 py-12 w-full">
        <h1 className="text-3xl font-bold mb-6">/configurações</h1>

        <div className="space-y-3">
          <LeaderboardProfileCard
            userProfile={userProfile}
            hasCharacter={hasCharacter}
            onCreateCharacter={() => setIsOnboardingOpen(true)}
            orientation="horizontal"
          />

          <Card className="border-none rounded-md">
            <CardContent>
              <div className="flex flex-row items-center gap-1.5">
                <div className="flex flex-col items-start gap-0.5">
                  <h1 className="text-lg font-bold">/notificações</h1>
                  <span className="opacity-50 text-xs">enviadas por e-mail quando eventos importantes acontecem.</span>
                </div>

                <div className="flex flex-row items-center gap-2 ml-auto">
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={toggleNotifications}
                    disabled={savingNotifications}
                    className="cursor-pointer"
                  />
                  <span className="text-[10px] uppercase font-bold opacity-70">
                    {notificationsEnabled
                      ? savingNotifications
                        ? "salvando"
                        : "ativado"
                      : savingNotifications
                        ? "salvando"
                        : "desativado"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none rounded-md">
            <CardContent>
              <div className="flex flex-row items-center gap-1.5">
                <div className="flex flex-col items-start gap-1">
                  <h1 className="text-lg font-bold">/conta</h1>
                  <div className="flex flex-row items-center gap-1.5 opacity-50 text-xs">
                    <span>@{userProfile?.github_username}</span>
                    <p>com o gitwarrior</p>
                    <p>"{userProfile?.character_name}"</p>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="destructive"
                    className="text-[10px] uppercase"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <FaSkull className="w-3! h-3! shrink-0" />
                    deletar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          refreshUserProfile();
        }}
        initialStep={2}
      />

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <DialogContent>
          <DialogTitle className="text-red-500 flex flex-row items-center gap-2">
            <FaSkull />
            Deletar conta
          </DialogTitle>

          <p className="text-sm">Tem certeza que deseja abandonar sua jornada no GitRats?</p>
          <div className="flex flex-row items-center w-full justify-between">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant={"destructive"}>Confirmar</Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">Isso irá apagar todos os seus dados do jogo.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
