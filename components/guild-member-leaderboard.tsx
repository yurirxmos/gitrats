"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { FaTrophy, FaMedal } from "react-icons/fa6"; // Comentário: ícones usados apenas inline na lista para top 3
import { getCharacterAvatar } from "@/lib/character-assets";
import { getCurrentRank } from "@/lib/class-evolution";
import type { GuildMember } from "@/lib/types";

interface RankedMember extends GuildMember {
  rank: number;
}

interface GuildMemberLeaderboardProps {
  members: GuildMember[];
}

// Componente responsável por mostrar ranking interno da guilda (ordenado por XP)
// Comentário: lógica de ordenação feita aqui para evitar novo endpoint e reduzir latência.
export function GuildMemberLeaderboard({ members }: GuildMemberLeaderboardProps) {
  const ranked: RankedMember[] = [...members]
    .filter((m) => typeof m.total_xp === "number" && (m.total_xp || 0) >= 0)
    .sort((a, b) => (b.total_xp || 0) - (a.total_xp || 0))
    .map((m, i) => ({ ...m, rank: i + 1 })); // Comentário: gera ranking simples por XP

  if (ranked.length === 0) {
    return (
      <Card className="border-none shadow-none">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Sem membros ranqueados ainda</p>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    // Comentário: mantém ícones especiais, sem layout separado de pódio
    if (rank === 1) return <FaTrophy className="text-yellow-500 text-lg" />;
    if (rank === 2) return <FaMedal className="text-gray-400 text-lg" />;
    if (rank === 3) return <FaMedal className="text-amber-700 text-lg" />;
    return <span className="text-muted-foreground font-bold text-xs">#{rank}</span>;
  };

  const getRankColorClass = (level: number | undefined): string => {
    if (!level) return "text-muted-foreground";
    if (level >= 10) return "text-red-500 animate-pulse";
    if (level >= 5) return "text-amber-500";
    return "text-muted-foreground";
  };

  return (
    <Card className="border shadow-none">
      <CardContent>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FaTrophy className="text-foreground" /> Ranking da Guilda
        </h2>
        {/* Lista completa sem pódio */}
        <div className="space-y-2">
          {ranked.map((m) => (
            <div
              key={m.user_id}
              className="flex items-center gap-4 p-3 bg-muted rounded-lg"
            >
              <div className="w-10 flex items-center justify-center shrink-0">{getRankIcon(m.rank)}</div>
              <div className="relative w-14 h-14 bg-background rounded-lg overflow-hidden shrink-0">
                {m.character_class && m.level && (
                  <Image
                    src={getCharacterAvatar(m.character_class, m.level)}
                    alt={m.character_name || ""}
                    fill
                    className="object-contain"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm truncate">{m.character_name || "-"}</h3>
                  <span className={`text-[10px] ${getRankColorClass(m.level)}`}>
                    {m.character_class && m.level ? getCurrentRank(m.character_class, m.level) : ""}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">@{m.github_username}</p>
              </div>
              <div className="flex flex-col items-end text-right shrink-0">
                <p className="font-bold text-xs">Level {m.level || 1}</p>
                <p className="text-[10px] text-muted-foreground">{(m.total_xp || 0).toLocaleString()} XP</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default GuildMemberLeaderboard;
