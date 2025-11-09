"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import { OnboardingModal } from "@/components/onboarding-modal";
import LeaderboardProfileCard from "@/components/leaderboard-profile-card";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";
import { FaGithub, FaSkull } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Profile() {
  const { user, loading: userLoading } = useUser();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasCharacter, setHasCharacter] = useState<boolean | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!userLoading) loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  const loadUserProfile = async () => {
    if (!user) return false;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setHasCharacter(false);
        setUserProfile(null);
        return false;
      }
      const characterResponse = await fetch("/api/character", { headers: { Authorization: `Bearer ${token}` } });
      if (!characterResponse.ok) {
        setHasCharacter(false);
        setUserProfile(null);
        return false;
      }
      const { data: characterData } = await characterResponse.json();
      setHasCharacter(true);
      const rankResponse = await fetch(`/api/leaderboard/${user.id}`);
      const { data: rankData } = rankResponse.ok ? await rankResponse.json() : { data: null };
      setUserProfile({
        character_name: characterData.name,
        character_class: characterData.class,
        level: characterData.level,
        current_xp: characterData.current_xp,
        total_xp: characterData.total_xp,
        rank: rankData?.rank || 0,
        total_commits: characterData.github_stats?.total_commits || 0,
        total_prs: characterData.github_stats?.total_prs || 0,
        total_issues: characterData.github_stats?.total_issues || 0,
        github_username: user.user_metadata?.user_name || user.email?.split("@")[0] || "User",
        created_at: characterData.created_at,
        achievement_codes: characterData.achievement_codes || [],
      });
      return true;
    } catch {
      setHasCharacter(false);
      setUserProfile(null);
      return false;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-8 py-12 w-full">
        <h1 className="text-3xl font-bold mb-6">/configurações</h1>

        <div className="space-y-6">
          <LeaderboardProfileCard
            userProfile={userProfile}
            hasCharacter={hasCharacter}
            onCreateCharacter={() => setIsOnboardingOpen(true)}
            orientation="horizontal"
          />

          <Card>
            <CardContent>
              <div className="flex flex-row items-center gap-1.5">
                <h1 className="text-lg font-bold">/conta</h1>
                <div className="flex flex-row items-center gap-1.5 ml-3 opacity-50">
                  <FaGithub className="w-3 h-3" />
                  <span className="text-xs">@{userProfile?.github_username}</span>
                </div>

                <Button
                  variant="destructive"
                  className="ml-auto"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <FaSkull />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          loadUserProfile();
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
