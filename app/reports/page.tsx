"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Navbar } from "@/components/navbar";
import { FaSkull, FaBug, FaMedal } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AchievementBadge } from "@/components/achievement-badge";
import { getCharacterAvatar } from "@/lib/character-assets";
import { LeaderboardEntry } from "@/lib/types";

export default function Reports() {
  const [contributors, setContributors] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/leaderboard?limit=1000");
        if (!response.ok) throw new Error("Erro ao buscar dados");

        const data = await response.json();
        const usersWithAchievement = data.data.filter((user: LeaderboardEntry) =>
          user.achievement_codes?.includes("contribuidor_da_tavola")
        );

        setContributors(usersWithAchievement);
      } catch (error) {
        console.error("Erro ao buscar contribuidores:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContributors();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto px-8 py-12 w-full">
        <div className="flex flex-row items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">/reports</h1>
          <Button
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <FaSkull />
            Reportar erro
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaBug className="text-yellow-500" />
                Contribuidores da Távola
              </CardTitle>
              <CardDescription>Usuários que ajudaram a melhorar o jogo reportando bugs e exploits.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Carregando contribuidores...</p>
              ) : contributors.length === 0 ? (
                <p className="text-muted-foreground">Nenhum contribuidor com este achievement ainda.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contributors.map((user) => (
                    <Card
                      key={user.user_id}
                      className="overflow-hidden"
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center gap-3">
                          <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden">
                            <Image
                              src={getCharacterAvatar(user.character_class, user.level)}
                              alt={user.character_name}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div className="text-center space-y-1">
                            <h3 className="font-bold text-lg">{user.character_name}</h3>
                            <p className="text-sm text-muted-foreground">@{user.github_username}</p>
                            <div className="flex items-center justify-center gap-2 text-sm">
                              <span className="font-bold">Level {user.level}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">Rank #{user.rank}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 justify-center mt-2">
                            {user.achievement_codes?.map((code) => (
                              <AchievementBadge
                                key={code}
                                code={code}
                                size="sm"
                              />
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
