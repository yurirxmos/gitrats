"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { OnboardingModal } from "@/components/onboarding-modal";
import { EvolutionModal } from "@/components/evolution-modal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FaTrophy, FaMedal, FaGithub, FaStarHalfStroke } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserContext } from "@/contexts/user-context";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { useEvolutionDetector } from "@/hooks/use-evolution-detector";
import { createClient } from "@/lib/supabase/client";
import { getCharacterAvatar } from "@/lib/character-assets";
import { getXpForLevel } from "@/lib/xp-system";
import { getCurrentRank, getNextRank } from "@/lib/class-evolution";
import { ClassBonusIndicator } from "@/components/class-bonus-indicator";
import { AchievementBadge } from "@/components/achievement-badge";
import { GiBoltShield } from "react-icons/gi";
import LeaderboardProfileCard from "@/components/leaderboard-profile-card";
import type { LeaderboardEntry, UserProfile } from "@/lib/types";

export default function Leaderboard() {
  const { user, userProfile, loading: userLoading, hasCharacter, refreshUserProfile } = useUserContext();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [totalCharacters, setTotalCharacters] = useState<number>(0);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const hasLoadedRef = useRef(false);

  useAutoSync(hasCharacter === true);
  const { evolutionEvent, clearEvolutionEvent } = useEvolutionDetector(
    userProfile
      ? { level: userProfile.level, class: userProfile.character_class, name: userProfile.character_name }
      : null
  );

  // Exibe modal de evolução quando houver evento
  useEffect(() => {
    if (evolutionEvent) setShowEvolutionModal(true);
  }, [evolutionEvent]);

  // Carrega leaderboard, stats e perfil
  useEffect(() => {
    const loadAllData = async () => {
      if (hasLoadedRef.current) return;
      setIsLoading(true);
      await Promise.all([loadLeaderboard(), loadStats()]);
      setIsLoading(false);
      hasLoadedRef.current = true;
    };
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exibir modal de boas-vindas após dados carregarem e perfil existir
  useEffect(() => {
    if (!hasLoadedRef.current || userLoading) return;
    if (user && hasCharacter && userProfile) {
      const hasSeenWelcome = localStorage.getItem("has_seen_welcome");
      if (!hasSeenWelcome) {
        setShowWelcomeDialog(true);
        localStorage.setItem("has_seen_welcome", "true");
      }
    }
  }, [user, hasCharacter, userProfile, userLoading]);

  const syncGitHubData = async () => {
    if (!user) return;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/github/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      await refreshUserProfile();
      await loadLeaderboard();
    } catch {}
  };

  const loadLeaderboard = async () => {
    try {
      const CACHE_KEY = "gitrats_leaderboard_50";
      const TTL = 60 * 1000; // 60s
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, lastUpdate, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < TTL) {
          setLeaderboard(data || []);
          setLastUpdate(lastUpdate || null);
          return;
        }
      }

      const response = await fetch("/api/leaderboard?limit=50");
      if (!response.ok) throw new Error("Erro ao carregar leaderboard");
      const { data, lastUpdate: updateTime } = await response.json();
      setLeaderboard(data || []);
      setLastUpdate(updateTime || null);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, lastUpdate: updateTime, timestamp: Date.now() }));
    } catch {
      setLeaderboard([]);
    }
  };

  const loadStats = async () => {
    try {
      const CACHE_KEY = "gitrats_stats";
      const TTL = 60 * 1000; // 60s
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < TTL) {
          setTotalCharacters(data.total_characters || 0);
          return;
        }
      }

      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Erro ao carregar estatísticas");
      const { data } = await response.json();
      setTotalCharacters(data.total_characters || 0);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      setTotalCharacters(0);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <FaTrophy className="text-yellow-500 text-2xl" />;
    if (rank === 2) return <FaMedal className="text-gray-400 text-2xl" />;
    if (rank === 3) return <FaMedal className="text-amber-700 text-2xl" />;
    return <span className="text-muted-foreground font-bold text-lg">#{rank}</span>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background relative bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] animate-[grid-move_2s_linear_infinite]">
      <Navbar />
      {isLoading ? (
        <div className="flex flex-col lg:flex-row lg:items-start items-center justify-center gap-10">
          {user && (
            <aside className="w-80 shrink-0">
              <Card className="border-none shadow-none">
                <CardContent className="space-y-4">
                  <Skeleton className="w-32 h-32 mx-auto rounded-lg" />
                  <Skeleton className="h-5 w-40 mx-auto" />
                  <Skeleton className="h-3 w-28 mx-auto" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-8" />
                    <Skeleton className="h-8" />
                    <Skeleton className="h-8 col-span-2" />
                  </div>
                </CardContent>
              </Card>
            </aside>
          )}
          <main className={user ? "flex-1 max-w-4xl" : "flex-1 max-w-6xl"}>
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="hidden md:flex items-end justify-center gap-4 px-4">
                <Skeleton className="w-24 h-36 rounded-lg" />
                <Skeleton className="w-32 h-44 rounded-lg" />
                <Skeleton className="w-24 h-36 rounded-lg" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card
                    key={i}
                    className="border-none shadow-none"
                  >
                    <CardContent className="px-4">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-12 h-6" />
                        <Skeleton className="w-16 h-16 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-64" />
                        </div>
                        <div className="flex gap-6">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-12" />
                          <Skeleton className="h-5 w-12" />
                          <Skeleton className="h-5 w-12" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row lg:items-start items-center justify-center gap-10">
          {user && (
            <LeaderboardProfileCard
              userProfile={userProfile}
              hasCharacter={hasCharacter}
              onCreateCharacter={() => setIsOnboardingOpen(true)}
            />
          )}
          <main className={user ? "flex-1 max-w-4xl" : "flex-1 max-w-6xl"}>
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaTrophy className="text-2xl text-foreground" />
                  <h1 className="text-2xl font-black">LEADERBOARD</h1>
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalCharacters} {totalCharacters === 1 ? "gitwarrior" : "gitwarriors"}.
                </p>
              </div>
              {leaderboard.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">Nenhum jogador encontrado</p>
                </div>
              ) : (
                <>
                  {leaderboard.length >= 3 && (
                    <div className="hidden md:flex items-end justify-center gap-4 px-4">
                      {leaderboard[1] && (
                        <div className="flex flex-col items-center gap-3 flex-1">
                          <FaMedal className="text-gray-400 text-3xl" />
                          <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden">
                            <Image
                              src={getCharacterAvatar(
                                leaderboard[1]?.character_class || "orc",
                                leaderboard[1]?.level || 1
                              )}
                              alt={leaderboard[1]?.character_name || ""}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base">{leaderboard[1]?.character_name}</h3>
                              {/* Mostrar até 3 badges ao lado do nome */}
                              <div className="flex items-center gap-1">
                                {(leaderboard[1]?.achievement_codes || []).slice(0, 3).map((code) => (
                                  <AchievementBadge
                                    key={code}
                                    code={code}
                                    size="sm"
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-blue-400">
                              {getCurrentRank(leaderboard[1]?.character_class || "orc", leaderboard[1]?.level || 1)}
                            </p>
                            <button
                              onClick={() =>
                                window.open(`https://github.com/${leaderboard[1]?.github_username}`, "_blank")
                              }
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                            >
                              <FaGithub className="text-xs" />@{leaderboard[1]?.github_username}
                            </button>
                          </div>
                          <div className="bg-gray-400/20 w-full rounded-t-lg p-4 text-center border-2 border-gray-400/50">
                            <p className="font-black text-xl">#{leaderboard[1]?.rank}</p>
                            <p className="text-sm font-bold">Level {leaderboard[1]?.level}</p>
                            <p className="text-xs text-muted-foreground">
                              {leaderboard[1]?.total_xp?.toLocaleString() || 0} XP
                            </p>
                            <div className="flex justify-around mt-2 text-xs">
                              <div>
                                <p className="font-bold">{leaderboard[1]?.total_commits || 0}</p>
                                <p className="text-muted-foreground">Commits</p>
                              </div>
                              <div>
                                <p className="font-bold">{leaderboard[1]?.total_prs || 0}</p>
                                <p className="text-muted-foreground">PRs</p>
                              </div>
                              <div>
                                <p className="font-bold">{leaderboard[1]?.total_issues || 0}</p>
                                <p className="text-muted-foreground">Issues</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {leaderboard[0] && (
                        <div className="flex flex-col items-center gap-3 flex-1">
                          <FaTrophy className="text-yellow-500 text-4xl animate-bounce" />
                          <div className="relative w-32 h-32 bg-muted rounded-lg overflow-hidden">
                            <Image
                              src={getCharacterAvatar(
                                leaderboard[0]?.character_class || "orc",
                                leaderboard[0]?.level || 1
                              )}
                              alt={leaderboard[0]?.character_name || ""}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg">{leaderboard[0]?.character_name}</h3>
                              <div className="flex items-center gap-1">
                                {(leaderboard[0]?.achievement_codes || []).slice(0, 3).map((code) => (
                                  <AchievementBadge
                                    key={code}
                                    code={code}
                                    size="sm"
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-sm text-blue-400">
                              {getCurrentRank(leaderboard[0]?.character_class || "orc", leaderboard[0]?.level || 1)}
                            </p>
                            <button
                              onClick={() =>
                                window.open(`https://github.com/${leaderboard[0]?.github_username}`, "_blank")
                              }
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 mx-auto"
                            >
                              <FaGithub className="text-xs" />@{leaderboard[0]?.github_username}
                            </button>
                          </div>
                          <div className="bg-yellow-500/20 w-full rounded-t-lg p-6 text-center border-2 border-yellow-500/50">
                            <p className="font-black text-2xl">#{leaderboard[0]?.rank}</p>
                            <p className="text-base font-bold">Level {leaderboard[0]?.level}</p>
                            <p className="text-sm text-muted-foreground">
                              {leaderboard[0]?.total_xp?.toLocaleString() || 0} XP
                            </p>
                            <div className="flex justify-around mt-3 text-sm">
                              <div>
                                <p className="font-bold">{leaderboard[0]?.total_commits || 0}</p>
                                <p className="text-muted-foreground">Commits</p>
                              </div>
                              <div>
                                <p className="font-bold">{leaderboard[0]?.total_prs || 0}</p>
                                <p className="text-muted-foreground">PRs</p>
                              </div>
                              <div>
                                <p className="font-bold">{leaderboard[0]?.total_issues || 0}</p>
                                <p className="text-muted-foreground">Issues</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {leaderboard[2] && (
                        <div className="flex flex-col items-center gap-3 flex-1">
                          <FaMedal className="text-amber-700 text-3xl" />
                          <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden">
                            <Image
                              src={getCharacterAvatar(
                                leaderboard[2]?.character_class || "orc",
                                leaderboard[2]?.level || 1
                              )}
                              alt={leaderboard[2]?.character_name || ""}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base">{leaderboard[2]?.character_name}</h3>
                              <div className="flex items-center gap-1">
                                {(leaderboard[2]?.achievement_codes || []).slice(0, 3).map((code) => (
                                  <AchievementBadge
                                    key={code}
                                    code={code}
                                    size="sm"
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-blue-400">
                              {getCurrentRank(leaderboard[2]?.character_class || "orc", leaderboard[2]?.level || 1)}
                            </p>
                            <button
                              onClick={() =>
                                window.open(`https://github.com/${leaderboard[2]?.github_username}`, "_blank")
                              }
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                            >
                              <FaGithub className="text-xs" />@{leaderboard[2]?.github_username}
                            </button>
                          </div>
                          <div className="bg-amber-700/20 w-full rounded-t-lg p-4 text-center border-2 border-amber-700/50">
                            <p className="font-black text-xl">#{leaderboard[2]?.rank}</p>
                            <p className="text-sm font-bold">Level {leaderboard[2]?.level}</p>
                            <p className="text-xs text-muted-foreground">
                              {leaderboard[2]?.total_xp?.toLocaleString() || 0} XP
                            </p>
                            <div className="flex justify-around mt-2 text-xs">
                              <div>
                                <p className="font-bold">{leaderboard[2]?.total_commits || 0}</p>
                                <p className="text-muted-foreground">Commits</p>
                              </div>
                              <div>
                                <p className="font-bold">{leaderboard[2]?.total_prs || 0}</p>
                                <p className="text-muted-foreground">PRs</p>
                              </div>
                              <div>
                                <p className="font-bold">{leaderboard[2]?.total_issues || 0}</p>
                                <p className="text-muted-foreground">Issues</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Mobile: lista completa */}
                  <div className="mb-10 md:hidden">
                    <ScrollArea className="h-100 pr-4">
                      <div className="space-y-2">
                        {leaderboard.map((player) => (
                          <Card
                            key={player.user_id}
                            className="transition-all hover:opacity-60 border-none shadow-none"
                          >
                            <CardContent className="px-4 border-none shadow-none">
                              <div className="flex items-center md:flex-row flex-col gap-4">
                                <div className="w-12 flex items-center justify-center shrink-0">
                                  {getRankIcon(player.rank)}
                                </div>
                                <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
                                  <Image
                                    src={getCharacterAvatar(player.character_class, player.level)}
                                    alt={player.character_name}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-bold text-base">{player.character_name}</h3>
                                      <div className="flex items-center gap-1">
                                        {(player.achievement_codes || []).slice(0, 3).map((code) => (
                                          <AchievementBadge
                                            key={code}
                                            code={code}
                                            size="sm"
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="text-blue-400">
                                      {getCurrentRank(player.character_class, player.level)}
                                    </span>
                                    <span>•</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`https://github.com/${player.github_username}`, "_blank");
                                      }}
                                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                                    >
                                      <FaGithub className="text-xs" />
                                      <span>@{player.github_username}</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="flex gap-6 shrink-0">
                                  <div className="text-center">
                                    <p className="font-bold text-base">Level {player.level}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {player.total_xp.toLocaleString()} XP
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-bold text-base">{player.total_commits}</p>
                                    <p className="text-xs text-muted-foreground">Commits</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-bold text-base">{player.total_prs}</p>
                                    <p className="text-xs text-muted-foreground">PRs</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-bold text-base">{player.total_issues}</p>
                                    <p className="text-xs text-muted-foreground">Issues</p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                  {/* Desktop: lista a partir do 4º */}
                  <div className="mb-10 hidden md:block">
                    <ScrollArea className="h-100 pr-4">
                      <div className="space-y-2">
                        {leaderboard.slice(3).map((player) => (
                          <Card
                            key={player.user_id}
                            className="transition-all hover:opacity-60 border-none shadow-none"
                          >
                            <CardContent className="px-4 border-none shadow-none">
                              <div className="flex items-center md:flex-row flex-col gap-4">
                                <div className="w-12 flex items-center justify-center shrink-0">
                                  {getRankIcon(player.rank)}
                                </div>
                                <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden shrink-0">
                                  <Image
                                    src={getCharacterAvatar(player.character_class, player.level)}
                                    alt={player.character_name}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-base">{player.character_name}</h3>
                                    <div className="flex items-center gap-1">
                                      {(player.achievement_codes || []).slice(0, 3).map((code) => (
                                        <AchievementBadge
                                          key={code}
                                          code={code}
                                          size="sm"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span className="text-blue-400">
                                      {getCurrentRank(player.character_class, player.level)}
                                    </span>
                                    <span>•</span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`https://github.com/${player.github_username}`, "_blank");
                                      }}
                                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                                    >
                                      <FaGithub className="text-xs" />
                                      <span>@{player.github_username}</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="flex gap-6 shrink-0">
                                  <div className="text-center">
                                    <p className="font-bold text-base">Level {player.level}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {player.total_xp.toLocaleString()} XP
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-bold text-base">{player.total_commits}</p>
                                    <p className="text-xs text-muted-foreground">Commits</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-bold text-base">{player.total_prs}</p>
                                    <p className="text-xs text-muted-foreground">PRs</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="font-bold text-base">{player.total_issues}</p>
                                    <p className="text-xs text-muted-foreground">Issues</p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      )}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          refreshUserProfile();
          loadLeaderboard();
        }}
        initialStep={2}
      />
      {evolutionEvent && (
        <EvolutionModal
          isOpen={showEvolutionModal}
          onClose={() => {
            setShowEvolutionModal(false);
            clearEvolutionEvent();
          }}
          character={evolutionEvent.character}
        />
      )}
      <Dialog
        open={showWelcomeDialog}
        onOpenChange={setShowWelcomeDialog}
      >
        <DialogContent className="max-w-md">
          <div className="space-y-4 py-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Bem-vindo ao Gitrats!</h2>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground text-center">
                Ganhe <strong>XP</strong> automaticamente com suas atividades no GitHub:
              </p>
              <ul className="space-y-2 pl-4">
                <li>
                  - <strong>10 XP</strong> por commit
                </li>
                <li>
                  - <strong>50 XP</strong> por pull request
                </li>
                <li>
                  - <strong>25 XP</strong> por issue resolvida
                </li>
              </ul>
              <p className="text-muted-foreground text-xs">
                Sua classe {userProfile?.character_class} tem <strong>bônus especiais</strong> em certas atividades.
                Suba de nível, evolua e domine o leaderboard!
              </p>
              <p className="text-xs text-muted-foreground text-center pt-2">
                Quer saber mais? Acesse <strong>/docs</strong> para detalhes completos.
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <Button onClick={() => setShowWelcomeDialog(false)}>Entendi, vamos lá!</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
