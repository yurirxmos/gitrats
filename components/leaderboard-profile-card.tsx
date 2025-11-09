"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GiBoltShield } from "react-icons/gi";
import { ClassBonusIndicator } from "@/components/class-bonus-indicator";
import { AchievementBadge } from "@/components/achievement-badge";
import { getCharacterAvatar } from "@/lib/character-assets";
import { getXpForLevel } from "@/lib/xp-system";
import { getCurrentRank, getNextRank } from "@/lib/class-evolution";
import React from "react";

import type { UserProfile } from "@/lib/types";

interface Props {
  userProfile: UserProfile | null;
  hasCharacter: boolean | null;
  onCreateCharacter: () => void;
  orientation?: "vertical" | "horizontal";
}

export default function LeaderboardProfileCard({
  userProfile,
  hasCharacter,
  onCreateCharacter,
  orientation = "vertical",
}: Props) {
  const isHorizontal = orientation === "horizontal";
  const containerClass = isHorizontal ? "w-full" : "w-80 shrink-0";
  const contentClass = isHorizontal ? "flex flex-row items-start gap-6" : "space-y-6";

  return (
    <aside className={containerClass}>
      <Card className="border-none shadow-none">
        <CardContent className={contentClass}>
          {hasCharacter === false ? (
            <div className="text-center py-10 space-y-4">
              <p className="text-sm text-muted-foreground">Você ainda não criou seu personagem</p>
              <Button
                onClick={onCreateCharacter}
                className="w-full bg-foreground hover:opacity-90 text-background font-bold"
              >
                Criar Personagem
              </Button>
            </div>
          ) : userProfile ? (
            <>
              {isHorizontal ? (
                <div className="flex flex-row items-start gap-6 w-full">
                  <div className="flex flex-col items-start text-left space-y-3 shrink-0">
                    <div className="relative w-36 h-36 bg-muted rounded-lg overflow-hidden">
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
                    <ClassBonusIndicator characterClass={userProfile.character_class as "orc" | "warrior" | "mage"} />
                  </div>
                  <div className="flex-1">
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
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex flex-row items-center gap-1.5 mb-2 mt-4">
                      <GiBoltShield />
                      <span className="text-xs font-bold text-muted-foreground uppercase">/STATS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="flex justify-between">
                          <span className=" text-muted-foreground">Ranking</span>
                          <span className="font-bold">#{userProfile.rank || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total XP</span>
                          <span className="font-bold">{userProfile.total_xp.toLocaleString()}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Commits</span>
                          <span className="font-bold">{userProfile.total_commits}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">PRs</span>
                          <span className="font-bold">{userProfile.total_prs}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Issues</span>
                          <span className="font-bold">{userProfile.total_issues}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-row justify-start text-muted-foreground mt-3">
                      <small className="text-[8px]">Sincronização automática a cada 10 minutos</small>
                    </div>
                  </div>
                </div>
              ) : (
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
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex flex-row items-center gap-1.5 mb-2">
                    <GiBoltShield />
                    <span className="text-xs font-bold text-muted-foreground uppercase">/STATS</span>
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Issues</span>
                      <span className="font-bold">{userProfile.total_issues}</span>
                    </div>
                  </div>
                  <div className="flex flex-row justify-center text-muted-foreground">
                    <small className="text-[8px] text-center">Sincronização automática a cada 10 minutos</small>
                  </div>
                  <ClassBonusIndicator characterClass={userProfile.character_class as "orc" | "warrior" | "mage"} />
                </>
              )}
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">Nenhum personagem criado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
