// lib/achievement-metadata.ts
// Metadados dos achievements: ícones, títulos e descrições

import { IconType } from "react-icons";
import { FaTrophy, FaBug } from "react-icons/fa6";

export interface AchievementMetadata {
  code: string;
  title: string;
  description: string;
  icon: IconType;
  color?: string;
}

export const achievementMetadata: Record<string, AchievementMetadata> = {
  contribuidor_da_tavola: {
    code: "contribuidor_da_tavola",
    title: "Contribuidor da Távola",
    description: "Esse usuário contribuiu reportando bugs/exploits",
    icon: FaBug,
    color: "text-yellow-500",
  },
};

export const getAchievementMetadata = (code: string): AchievementMetadata => {
  return (
    achievementMetadata[code] || {
      code,
      title: code,
      description: "Achievement desbloqueado",
      icon: FaTrophy,
      color: "text-gray-500",
    }
  );
};
