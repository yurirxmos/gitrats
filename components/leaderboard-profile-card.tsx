"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GiBoltShield, GiBullseye } from "react-icons/gi";
import { FaMedal } from "react-icons/fa6";
import { ClassBonusIndicator } from "@/components/class-bonus-indicator";
import { AchievementBadge } from "@/components/achievement-badge";
import { getCharacterAvatar } from "@/lib/character-assets";
import { getXpForLevel } from "@/lib/xp-system";
import { getCurrentRank, getNextRank } from "@/lib/class-evolution";
import React, { useState } from "react";
import { useUserContext } from "@/contexts/user-context";
import { FaPen } from "react-icons/fa6";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

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
  const { refreshUserProfile } = useUserContext();

  const getRankColorClass = (level: number): string => {
    if (level >= 10) return "text-red-500 animate-pulse";
    if (level >= 5) return "text-amber-500";
    return "text-muted-foreground";
  };

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState<string>(userProfile?.character_name || "");
  const [savingName, setSavingName] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openEditDialog = () => {
    setEditName(userProfile?.character_name || "");
    setErrorMessage(null);
    setIsEditOpen(true);
  };

  const saveName = async () => {
    const trimmed = (editName || "").trim();
    if (trimmed.length === 0) {
      setErrorMessage("Nome inválido");
      return;
    }
    if (trimmed.length > 32) {
      setErrorMessage("Nome deve ter no máximo 32 caracteres");
      return;
    }

    try {
      setSavingName(true);
      const res = await fetch("/api/user/update-character-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Erro ao atualizar nome:", err);
        setErrorMessage(err?.error || "Falha ao atualizar nome do personagem");
        return;
      }

      await refreshUserProfile?.();
      setIsEditOpen(false);
    } catch (error) {
      console.error("Erro ao chamar API:", error);
      setErrorMessage("Erro ao atualizar nome do personagem");
    } finally {
      setSavingName(false);
    }
  };

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
                  <div className="flex flex-col items-center text-center space-y-3 shrink-0">
                    <div className="relative w-36 h-36 bg-muted rounded-lg overflow-hidden">
                      <Image
                        src={getCharacterAvatar(userProfile.character_class, userProfile.level)}
                        alt={userProfile.character_name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex flex-row items-center gap-2">
                        <h3 className="font-black text-xl">{userProfile.character_name}</h3>
                        <Button
                          variant="outline"
                          className="p-1! h-6! w-6! min-w-0!"
                          onClick={openEditDialog}
                          aria-label="Editar nome do personagem"
                        >
                          <FaPen className="w-2! h-2!" />
                        </Button>
                      </div>

                      <p className={`text-sm ${getRankColorClass(userProfile.level)}`}>
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
                        const isMaxRankEvolution = nextRank && nextRank.levelRequired === 10;
                        return (
                          <div className="pt-2 space-y-1">
                            {nextRank && (
                              <div className="flex justify-between">
                                <p className="text-xs text-muted-foreground">Evolução:</p>
                                <p
                                  className={`font-bold text-xs ${isMaxRankEvolution ? "text-red-500 animate-pulse" : ""}`}
                                >
                                  {nextRank.name.toUpperCase()}
                                </p>
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
                    {Array.isArray(userProfile.achievement_codes) && userProfile.achievement_codes.length > 0 ? (
                      <>
                        <div className="flex flex-row items-center gap-1.5 mb-2 mt-4">
                          <FaMedal className="shrink-0 !w-2! h-2!" />
                          <span className="text-xs font-bold text-muted-foreground uppercase">/ACHIEVEMENTS</span>
                        </div>
                        <div className="flex flex-wrap items-start gap-2">
                          {userProfile.achievement_codes.map((code) => (
                            <AchievementBadge
                              key={code}
                              code={code}
                              size="sm"
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-row items-center gap-1.5 mb-2 mt-4">
                          <FaMedal className="shrink-0 w-2! h-2!" />
                          <span className="text-xs font-bold text-muted-foreground uppercase">/ACHIEVEMENTS</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Sem conquistas ainda</p>
                      </>
                    )}
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
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="flex flex-row items-center gap-2">
                        <h3 className="font-black text-xl">{userProfile.character_name}</h3>
                        <Button
                          variant="outline"
                          className="p-1! h-6! w-6! min-w-0!"
                          onClick={openEditDialog}
                          aria-label="Editar nome do personagem"
                        >
                          <FaPen className="w-2! h-2!" />
                        </Button>
                      </div>
                      <p className={`text-sm ${getRankColorClass(userProfile.level)}`}>
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
                      const isMaxRankEvolution = nextRank && nextRank.levelRequired === 10;
                      return (
                        <div className="pt-2 space-y-1">
                          {nextRank && (
                            <div className="flex justify-between">
                              <p className="text-xs text-muted-foreground">Evolução:</p>
                              <p
                                className={`font-bold text-xs ${isMaxRankEvolution ? "text-red-500 animate-pulse" : ""}`}
                              >
                                {nextRank.name.toUpperCase()}
                              </p>
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
                  {Array.isArray(userProfile.achievement_codes) && userProfile.achievement_codes.length > 0 ? (
                    <>
                      <div className="flex flex-row items-center gap-1.5 mb-2 mt-3">
                        <GiBullseye />
                        <span className="text-xs font-bold text-muted-foreground uppercase">/ACHIEVEMENTS</span>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-start">
                        {userProfile.achievement_codes.map((code) => (
                          <AchievementBadge
                            key={code}
                            code={code}
                            size="sm"
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-row items-center gap-1.5 mb-2 mt-3 justify-center">
                        <GiBullseye />
                        <span className="text-xs font-bold text-muted-foreground uppercase">/ACHIEVEMENTS</span>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">Sem conquistas ainda</p>
                    </>
                  )}
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
      <Dialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nome do {userProfile?.character_class}</DialogTitle>
          </DialogHeader>

          <div className="mt-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nome do personagem"
            />
          </div>
          {errorMessage && <p className="text-sm text-red-500 mt-2">{errorMessage}</p>}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditOpen(false);
                setErrorMessage(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveName}
              disabled={savingName}
              className="ml-2 text-xs"
            >
              {savingName ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
