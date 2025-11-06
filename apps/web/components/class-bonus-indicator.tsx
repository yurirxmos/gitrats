"use client";

import { FaFire, FaStar, FaCode, FaCodePullRequest, FaBug } from "react-icons/fa6";
import { Card, CardContent } from "./ui/card";
import type { CharacterClass } from "@/lib/classes";
import { CLASS_XP_MULTIPLIERS } from "@/lib/classes";

interface ClassBonusIndicatorProps {
  characterClass: CharacterClass;
  compact?: boolean;
}

/**
 * Componente que exibe os bônus de XP da classe do personagem
 */
export function ClassBonusIndicator({ characterClass, compact = false }: ClassBonusIndicatorProps) {
  const multipliers = CLASS_XP_MULTIPLIERS[characterClass];

  // Identificar os 3 maiores bônus
  const bonuses = [
    { label: "Commits", value: multipliers.commits, icon: FaCode },
    { label: "Commits Grandes", value: multipliers.largeCommits, icon: FaCode },
    { label: "Pull Requests", value: multipliers.pullRequests, icon: FaCodePullRequest },
    { label: "Code Reviews", value: multipliers.codeReviews, icon: FaBug },
    { label: "Issues", value: multipliers.issuesResolved, icon: FaBug },
    { label: "Stars/Forks", value: multipliers.starsAndForks, icon: FaStar },
  ]
    .filter((bonus) => bonus.value > 1.0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {bonuses.map((bonus, index) => (
          <div
            key={index}
            className="flex items-center gap-1 bg-orange-500/10 text-orange-500 px-2 py-1 rounded text-xs"
          >
            <bonus.icon className="text-[10px]" />
            <span className="font-bold">+{Math.round((bonus.value - 1) * 100)}%</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="border-orange-500/20 bg-orange-500/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FaFire className="text-orange-500" />
          <h3 className="font-bold text-sm uppercase">Bônus Ativos</h3>
        </div>

        <div className="space-y-2">
          {bonuses.map((bonus, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <bonus.icon className="text-muted-foreground" />
                <span>{bonus.label}</span>
              </div>
              <span className="font-bold text-orange-500">+{Math.round((bonus.value - 1) * 100)}% XP</span>
            </div>
          ))}
        </div>

        {multipliers.externalRepos > 1.0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Repos Externos</span>
              <span className="font-bold text-blue-500">+{Math.round((multipliers.externalRepos - 1) * 100)}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Badge simples mostrando o maior bônus da classe
 */
export function ClassBonusBadge({ characterClass }: { characterClass: CharacterClass }) {
  const multipliers = CLASS_XP_MULTIPLIERS[characterClass];

  const topBonus = [
    { label: "Commits", value: multipliers.commits },
    { label: "Commits Grandes", value: multipliers.largeCommits },
    { label: "PRs", value: multipliers.pullRequests },
    { label: "Reviews", value: multipliers.codeReviews },
    { label: "Issues", value: multipliers.issuesResolved },
    { label: "Stars", value: multipliers.starsAndForks },
  ]
    .filter((bonus) => bonus.value > 1.0)
    .sort((a, b) => b.value - a.value)[0];

  if (!topBonus) return null;

  return (
    <div className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full text-xs font-bold">
      <FaFire className="text-[8px]" />
      <span>
        {topBonus.label} +{Math.round((topBonus.value - 1) * 100)}%
      </span>
    </div>
  );
}

/**
 * Grid de todos os multiplicadores (para página de detalhes)
 */
export function ClassMultipliersGrid({ characterClass }: { characterClass: CharacterClass }) {
  const multipliers = CLASS_XP_MULTIPLIERS[characterClass];

  const getColor = (value: number) => {
    if (value >= 1.5) return "text-green-500";
    if (value > 1.0) return "text-blue-500";
    if (value === 1.0) return "text-muted-foreground";
    return "text-red-500";
  };

  const getLabel = (value: number) => {
    if (value > 1.0) return `+${Math.round((value - 1) * 100)}%`;
    if (value < 1.0) return `${Math.round((value - 1) * 100)}%`;
    return "Normal";
  };

  const items = [
    { label: "Commits", value: multipliers.commits },
    { label: "Commits Grandes", value: multipliers.largeCommits },
    { label: "Pull Requests", value: multipliers.pullRequests },
    { label: "Code Reviews", value: multipliers.codeReviews },
    { label: "Issues Resolvidas", value: multipliers.issuesResolved },
    { label: "Achievements", value: multipliers.achievements },
    { label: "Stars/Forks", value: multipliers.starsAndForks },
    { label: "Releases", value: multipliers.releases },
    { label: "Repos Externos", value: multipliers.externalRepos },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-muted/50 rounded-lg p-3"
        >
          <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
          <p className={`font-bold text-sm ${getColor(item.value)}`}>{getLabel(item.value)}</p>
        </div>
      ))}
    </div>
  );
}
