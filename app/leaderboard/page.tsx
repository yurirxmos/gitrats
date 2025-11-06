"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { OnboardingModal } from "@/components/onboarding-modal";
import { FaTrophy, FaMedal, FaGithub, FaShareFromSquare, FaSpinner } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUser } from "@/hooks/use-user";
import { useAutoSync } from "@/hooks/use-auto-sync";
import { createClient } from "@/lib/supabase/client";
import { getCharacterAvatar } from "@/lib/character-assets";
import { getXpForLevel } from "@/lib/xp-system";
import { getCurrentRank, getNextRank, getLevelsUntilNextRank } from "@/lib/class-evolution";
import { Select, SelectItem, SelectTrigger } from "@/components/ui/select";
import { SelectContent } from "@radix-ui/react-select";
import { ClassBonusIndicator } from "@/components/class-bonus-indicator";
import { GiBoltShield } from "react-icons/gi";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  character_name: string;
  character_class: "warrior" | "mage" | "orc";
  level: number;
  total_xp: number;
  github_username: string;
  github_avatar_url: string | null;
  total_commits: number;
  total_prs: number;
}

interface UserProfile {
  character_name: string;
  character_class: "warrior" | "mage" | "orc";
  level: number;
  current_xp: number;
  total_xp: number;
  rank: number;
  total_commits: number;
  total_prs: number;
  github_username: string;
  created_at?: string;
}

export default function Leaderboard() {
  const { user, loading: userLoading } = useUser();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [hasCharacter, setHasCharacter] = useState<boolean | null>(null);

  // Sync automático a cada 10 minutos (só se tiver personagem)
  useAutoSync(hasCharacter === true);

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const loadAllData = async () => {
      // Evitar recarregar se já carregou
      if (hasLoadedRef.current) {
        return;
      }

      setIsLoading(true);

      // Carregar leaderboard e perfil em paralelo
      const promises: Promise<any>[] = [loadLeaderboard()];

      if (user && !userLoading) {
        promises.push(loadUserProfile());
      }

      await Promise.all(promises);

      setIsLoading(false);
      hasLoadedRef.current = true;
    };

    if (!userLoading) {
      loadAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  const syncGitHubData = async (silent = false) => {
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

      const data = await response.json();

      if (!response.ok) return;

      await loadUserProfile();
      await loadLeaderboard();
    } catch (error) {
      // Silencioso em produção
    }
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch("/api/leaderboard?limit=50");

      if (!response.ok) {
        throw new Error("Erro ao carregar leaderboard");
      }

      const { data, lastUpdate: updateTime } = await response.json();
      setLeaderboard(data || []);
      setLastUpdate(updateTime || null);
    } catch (error) {
      setLeaderboard([]);
    }
  };

  const loadUserProfile = async () => {
    if (!user) {
      return false;
    }

    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setHasCharacter(false);
        setUserProfile(null);
        return false;
      }

      // Buscar personagem do usuário
      const characterResponse = await fetch("/api/character", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!characterResponse.ok) {
        setHasCharacter(false);
        setUserProfile(null);
        return false;
      }

      const { data: characterData } = await characterResponse.json();

      setHasCharacter(true);

      // Buscar posição no ranking
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
        github_username: user.user_metadata?.user_name || user.email?.split("@")[0] || "User",
        created_at: characterData.created_at,
      });

      return true;
    } catch (error) {
      setHasCharacter(false);
      setUserProfile(null);
      return false;
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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <FaSpinner className="m-auto text-4xl text-foreground animate-spin" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row lg:items-start items-center justify-center gap-10">
          {/* Sidebar - Profile */}
          {user && (
            <aside className="w-80 shrink-0">
              <Card className="border-none shadow-none">
                <CardContent className="space-y-6">
                  {hasCharacter === false ? (
                    <div className="text-center py-10 space-y-4">
                      <p className="text-sm text-muted-foreground">Você ainda não criou seu personagem</p>
                      <Button
                        onClick={() => setIsOnboardingOpen(true)}
                        className="w-full bg-foreground hover:opacity-90 text-background font-bold"
                      >
                        Criar Personagem
                      </Button>
                    </div>
                  ) : userProfile ? (
                    <>
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="relative w-32 h-32 bg-muted rounded-lg overflow-hidden">
                          <Image
                            src={getCharacterAvatar(userProfile.character_class, userProfile.level)}
                            alt={userProfile.character_name}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <h3 className="font-black text-xl">{userProfile.character_name}</h3>
                          <p className="text-sm text-blue-400">
                            {getCurrentRank(userProfile.character_class, userProfile.level)}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold">Level {userProfile.level}</span>
                          <span className="text-sm text-muted-foreground">
                            {userProfile.current_xp} / {getXpForLevel(userProfile.level + 1)} XP
                          </span>
                        </div>
                        <div className="bg-muted rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-foreground h-full transition-all"
                            style={{
                              width: `${(userProfile.current_xp / getXpForLevel(userProfile.level + 1)) * 100}%`,
                            }}
                          />
                        </div>
                        {(() => {
                          const nextRank = getNextRank(userProfile.character_class, userProfile.level);

                          return (
                            <div className="pt-2 space-y-1">
                              {nextRank && (
                                <div className="flex justify-between">
                                  <p className="text-xs text-muted-foreground">Evolução:</p>
                                  <p className="font-bold text-xs">{nextRank.name.toUpperCase()}</p>
                                </div>
                              )}
                              {userProfile.created_at && (
                                <div className="flex justify-between">
                                  <p className="text-xs text-muted-foreground">Nascimento:</p>
                                  <p className="font-bold text-xs">
                                    {new Date(userProfile.created_at).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <p className="text-xs text-muted-foreground">Guilda:</p>
                                <p className="font-bold text-xs">{userProfile.guild_name || "-"}</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex flex-row items-center gap-1.5 mb-2">
                        <GiBoltShield />
                        <span className="text-xs font-bold text-muted-foreground uppercase">/GIT-STATS</span>
                      </div>

                      <div className="space-y-0.5 text-xs">
                        <div className="flex justify-between">
                          <span className=" text-muted-foreground">Ranking</span>
                          <span className="font-bold">#{userProfile.rank || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total XP</span>
                          <span className="font-bold">{userProfile.total_xp.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Commits</span>
                          <span className="font-bold">{userProfile.total_commits}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pull Requests</span>
                          <span className="font-bold">{userProfile.total_prs}</span>
                        </div>
                      </div>

                      <div className="flex flex-row justify-center text-muted-foreground">
                        <small className="text-[8px] text-center">Sincronização automática a cada 10 minutos</small>
                      </div>

                      {/* Bônus de Classe */}
                      <ClassBonusIndicator characterClass={userProfile.character_class as "orc" | "warrior" | "mage"} />
                    </>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-sm text-muted-foreground">Nenhum personagem criado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </aside>
          )}

          {/* Main - Leaderboard */}
          <main className={user ? "flex-1 max-w-4xl" : "flex-1 max-w-6xl"}>
            <div className="space-y-8">
              <div className="flex items-center justify-center lg:justify-start">
                <div className="flex items-center gap-2">
                  <FaTrophy className="text-2xl text-foreground" />
                  <h1 className="text-2xl font-black">LEADERBOARD</h1>
                </div>
              </div>

              {leaderboard.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">Nenhum jogador encontrado</p>
                </div>
              ) : (
                <>
                  {/* Pódio Top 3 - Só exibe se houver pelo menos 3 jogadores */}
                  {leaderboard.length >= 3 && (
                    <div className="flex items-end justify-center gap-4 px-4">
                      {/* 2º Lugar */}
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
                          <div className="text-center">
                            <h3 className="font-bold text-base">{leaderboard[1]?.character_name}</h3>
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
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 1º Lugar */}
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
                          <div className="text-center">
                            <h3 className="font-bold text-lg">{leaderboard[0]?.character_name}</h3>
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
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3º Lugar */}
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
                          <div className="text-center">
                            <h3 className="font-bold text-base">{leaderboard[2]?.character_name}</h3>
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
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resto do Leaderboard */}
                  {leaderboard.length >= 3 ? (
                    leaderboard.length > 3 && (
                      <div className="mb-10">
                        <h2 className="text-lg font-black mb-4">RANKING GERAL</h2>
                        <ScrollArea className="h-100 pr-4">
                          <div className="space-y-2">
                            {leaderboard.slice(3).map((player) => (
                              <Card
                                key={player.user_id}
                                className="transition-all hover:opacity-60 border-none shadow-none"
                              >
                                <CardContent className="px-4 border-none shadow-none">
                                  <div className="flex items-center gap-4">
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
                                      <h3 className="font-bold text-base">{player.character_name}</h3>
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
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )
                  ) : (
                    <div className="mb-10">
                      <ScrollArea className="h-100 pr-4">
                        <div className="space-y-2">
                          {leaderboard.map((player) => (
                            <Card
                              key={player.user_id}
                              className="transition-all hover:opacity-60 border-none shadow-none"
                            >
                              <CardContent className="px-4">
                                <div className="flex md:flex-row flex-col items-center gap-4">
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
                                    <h3 className="font-bold text-base">{player.character_name}</h3>
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
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      )}

      {/* Onboarding Modal para criação de personagem */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          // Recarregar dados após criar personagem
          loadUserProfile();
          loadLeaderboard();
        }}
        initialStep={2}
      />
    </div>
  );
}
