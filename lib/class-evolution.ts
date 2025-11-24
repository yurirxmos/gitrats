export interface ClassRank {
  name: string;
  minLevel: number;
  maxLevel: number;
}

export const CLASS_RANKINGS: Record<string, ClassRank[]> = {
  orc: [
    { name: "Ogro Iniciante", minLevel: 1, maxLevel: 4 },
    { name: "Ogro Bruto", minLevel: 5, maxLevel: 9 },
    { name: "Rei Ogro", minLevel: 10, maxLevel: 999 },
  ],
  warrior: [
    { name: "Guerreiro Iniciante", minLevel: 1, maxLevel: 4 },
    { name: "Cavaleiro ", minLevel: 5, maxLevel: 9 },
    { name: "Paladino", minLevel: 10, maxLevel: 999 },
  ],
  mage: [
    { name: "Mago Iniciante", minLevel: 1, maxLevel: 4 },
    { name: "Mago Arcano", minLevel: 5, maxLevel: 9 },
    { name: "Mago Arcanista", minLevel: 10, maxLevel: 999 },
  ],
};

export function getCurrentRank(characterClass: string, level: number): string {
  const normalizedClass = characterClass.toLowerCase();
  const ranks = CLASS_RANKINGS[normalizedClass];

  if (!ranks) return characterClass;

  const currentRank = ranks.find((rank) => level >= rank.minLevel && level <= rank.maxLevel);

  return currentRank?.name || characterClass;
}

export function getNextRank(characterClass: string, level: number): { name: string; levelRequired: number } | null {
  const normalizedClass = characterClass.toLowerCase();
  const ranks = CLASS_RANKINGS[normalizedClass];

  if (!ranks) return null;

  const nextRank = ranks.find((rank) => level < rank.minLevel);

  if (!nextRank) return null;

  return {
    name: nextRank.name,
    levelRequired: nextRank.minLevel,
  };
}

export function getLevelsUntilNextRank(characterClass: string, level: number): number {
  const nextRank = getNextRank(characterClass, level);

  if (!nextRank) return 0;

  return nextRank.levelRequired - level;
}
