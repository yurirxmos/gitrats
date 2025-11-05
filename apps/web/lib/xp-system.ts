// Sistema de XP baseado na fórmula: XP = 200 * level^2 (progressão mais lenta)
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(200 * Math.pow(level, 2));
}

export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  while (getXpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

export function getCurrentXp(totalXp: number, level: number): number {
  const currentLevelXp = getXpForLevel(level);
  return totalXp - currentLevelXp;
}
