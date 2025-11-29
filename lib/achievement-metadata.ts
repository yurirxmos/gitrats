// lib/achievement-metadata.ts
// Metadados visuais dos achievements: apenas ícones e cores

import { IconType } from "react-icons";
import { FaTrophy, FaBug, FaCrown, FaPersonRays } from "react-icons/fa6";

export interface AchievementMetadata {
  icon: IconType;
  color: string;
}

export const achievementMetadata: Record<string, AchievementMetadata> = {
  contribuidor_da_tavola: {
    icon: FaBug,
    color: "text-yellow-500",
  },
  game_master: {
    icon: FaCrown,
    color: "text-purple-500",
  },
  rei_ogro_de_origem: {
    icon: FaPersonRays,
    color: "text-green-500",
  },
  mago_arcanista_de_origem: {
    icon: FaPersonRays,
    color: "text-blue-500",
  },
    paladino_de_origem: {
    icon: FaPersonRays,
    color: "text-amber-500",
  },
};

export const getAchievementMetadata = (code: string): AchievementMetadata => {
  return (
    achievementMetadata[code] || {
      icon: FaTrophy,
      color: "text-gray-500",
    }
  );
};
