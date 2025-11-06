/**
 * Sistema de XP inspirado no design econômico de GitMon
 * Fórmula: XP = Level³ × 4 - 15 × Level² + 100 × Level - 140
 * Progressão similar ao sistema Fast/Medium Fast de Pokémon
 */

import type { CharacterClass } from "./classes";
import { getClassXpMultiplier } from "./classes";

// Constantes do sistema
export const XP_CONSTANTS = {
  // Caps diários para prevenir grinding excessivo
  MAX_XP_PER_DAY: 500,
  MAX_COMMIT_XP_PER_DAY: 200,
  MAX_PR_XP_PER_DAY: 150,
  MAX_STARS_XP_PER_DAY: 50,
  MAX_REVIEWS_XP_PER_DAY: 100,
  MAX_ISSUES_XP_PER_DAY: 100,

  // Valores base de XP por atividade
  COMMIT: {
    SMALL: 2, // <10 linhas
    MEDIUM: 5, // 10-100 linhas
    LARGE: 8, // 100-500 linhas
    MEGA: 10, // 500+ linhas (capped)
    EMPTY: 0, // commits vazios
  },

  PULL_REQUEST: {
    OPENED: 15,
    MERGED: 25, // Total 40 XP quando merged
    CLOSED: 5, // Sem merge
    OWN_REPO_PENALTY: 0.5, // 50% XP em repos próprios
  },

  STARS: {
    FIRST: 50,
    ADDITIONAL: 10,
  },

  FORKS: {
    FIRST: 30,
    ADDITIONAL: 5,
  },

  ISSUES: {
    CREATED: 10,
    RESOLVED_BY_AUTHOR: 20,
    RESOLVED_BY_COMMUNITY: 30,
    BUG_FIX: 40,
  },

  CODE_REVIEW: {
    SUBMITTED: 15,
    WITH_CHANGES: 25,
  },

  RELEASE: {
    FIRST: 100,
    MAJOR: 75, // v1.0, v2.0
    MINOR: 50, // v1.1
    PATCH: 25, // v1.1.1
  },

  // Bônus especiais (one-time)
  ACHIEVEMENTS: {
    FIRST_OPEN_SOURCE: 200,
    TRENDING_REPO: 300,
    PACKAGE_PUBLISHED: 500,
    FEATURED: 1000,
  },

  // Multiplicadores
  MULTIPLIERS: {
    POPULAR_REPO: 2, // 100+ stars
    TRENDING_REPO: 3, // repos em trending
    EXTERNAL_REPO: 1.5, // repos que não são seus
    OWN_PUBLIC: 1, // seus repos públicos
    OWN_PRIVATE: 0.5, // seus repos privados
  },
};

/**
 * Calcula XP total necessário para alcançar um nível
 * Fórmula balanceada: XP = Level² × 100 + Level × 50
 * Progressão mais suave e linear
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;

  const xp = Math.pow(level, 2) * 100 + level * 50;

  return Math.max(0, Math.floor(xp));
}

/**
 * Calcula o nível com base no XP total acumulado
 */
export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  while (getXpForLevel(level + 1) <= totalXp) {
    level++;
  }
  return level;
}

/**
 * Retorna o XP atual dentro do nível (progresso até o próximo nível)
 */
export function getCurrentXp(totalXp: number, level: number): number {
  const currentLevelXp = getXpForLevel(level);
  return totalXp - currentLevelXp;
}

/**
 * Calcula XP ganho por commit baseado no número de linhas alteradas
 * Aplica apenas o MAIOR multiplicador (não stacking)
 */
export function calculateCommitXp(
  linesChanged: number,
  isOwnRepo: boolean = true,
  characterClass?: CharacterClass
): number {
  let baseXp = 0;

  if (linesChanged === 0) {
    return XP_CONSTANTS.COMMIT.EMPTY;
  } else if (linesChanged < 10) {
    baseXp = XP_CONSTANTS.COMMIT.SMALL;
  } else if (linesChanged < 100) {
    baseXp = XP_CONSTANTS.COMMIT.MEDIUM;
  } else if (linesChanged < 500) {
    baseXp = XP_CONSTANTS.COMMIT.LARGE;
  } else {
    baseXp = XP_CONSTANTS.COMMIT.MEGA;
  }

  // Coletar todos os multiplicadores aplicáveis e usar APENAS o maior
  const multipliers: number[] = [1.0]; // Base multiplier

  // Multiplicador de repo externo
  if (!isOwnRepo) {
    multipliers.push(XP_CONSTANTS.MULTIPLIERS.EXTERNAL_REPO); // 1.5
  }

  // Multiplicadores de classe
  if (characterClass) {
    const isLargeCommit = linesChanged >= 100;

    // Multiplicador de commits
    const commitMultiplier = getClassXpMultiplier(characterClass, isLargeCommit ? "largeCommits" : "commits");
    multipliers.push(commitMultiplier);

    // Multiplicador de repos externos (apenas se aplicável)
    if (!isOwnRepo) {
      const externalMultiplier = getClassXpMultiplier(characterClass, "externalRepos");
      multipliers.push(externalMultiplier);
    }
  }

  // Aplicar APENAS o maior multiplicador (previne stacking)
  const maxMultiplier = Math.max(...multipliers);
  baseXp *= maxMultiplier;

  return Math.floor(baseXp);
}

/**
 * Calcula XP de Pull Request baseado em status e popularidade do repo
 * Aplica apenas o MAIOR multiplicador (não stacking)
 */
export function calculatePullRequestXp(
  status: "opened" | "merged" | "closed",
  isOwnRepo: boolean = true,
  repoStars: number = 0,
  characterClass?: CharacterClass
): number {
  let baseXp = 0;

  switch (status) {
    case "opened":
      baseXp = XP_CONSTANTS.PULL_REQUEST.OPENED;
      break;
    case "merged":
      baseXp = XP_CONSTANTS.PULL_REQUEST.OPENED + XP_CONSTANTS.PULL_REQUEST.MERGED;
      break;
    case "closed":
      baseXp = XP_CONSTANTS.PULL_REQUEST.CLOSED;
      break;
  }

  // Coletar todos os multiplicadores aplicáveis e usar APENAS o maior
  const multipliers: number[] = [1.0]; // Base multiplier

  // Penalidade para repos próprios OU bônus para externos
  if (isOwnRepo) {
    multipliers.push(XP_CONSTANTS.PULL_REQUEST.OWN_REPO_PENALTY); // 0.5
  } else if (characterClass) {
    const externalMultiplier = getClassXpMultiplier(characterClass, "externalRepos");
    multipliers.push(externalMultiplier);
  }

  // Bônus por popularidade do repo
  if (repoStars >= 10000) {
    multipliers.push(1.5); // Reduzido de 2.0 para 1.5
  } else if (repoStars >= 1000) {
    multipliers.push(1.3); // Reduzido de 1.5 para 1.3
  }

  // Multiplicador de classe para PRs
  if (characterClass) {
    const prMultiplier = getClassXpMultiplier(characterClass, "pullRequests");
    multipliers.push(prMultiplier);
  }

  // Aplicar APENAS o maior multiplicador
  const maxMultiplier = Math.max(...multipliers);
  baseXp *= maxMultiplier;

  return Math.floor(baseXp);
}

/**
 * Calcula XP de Code Review com multiplicador de classe
 */
export function calculateCodeReviewXp(hasChanges: boolean = false, characterClass?: CharacterClass): number {
  let baseXp = hasChanges ? XP_CONSTANTS.CODE_REVIEW.WITH_CHANGES : XP_CONSTANTS.CODE_REVIEW.SUBMITTED;

  if (characterClass) {
    baseXp *= getClassXpMultiplier(characterClass, "codeReviews");
  }

  return Math.floor(baseXp);
}

/**
 * Calcula XP de Issues com multiplicador de classe
 */
export function calculateIssueXp(
  type: "created" | "resolved_by_author" | "resolved_by_community" | "bug_fix",
  characterClass?: CharacterClass
): number {
  let baseXp = 0;

  switch (type) {
    case "created":
      baseXp = XP_CONSTANTS.ISSUES.CREATED;
      break;
    case "resolved_by_author":
      baseXp = XP_CONSTANTS.ISSUES.RESOLVED_BY_AUTHOR;
      break;
    case "resolved_by_community":
      baseXp = XP_CONSTANTS.ISSUES.RESOLVED_BY_COMMUNITY;
      break;
    case "bug_fix":
      baseXp = XP_CONSTANTS.ISSUES.BUG_FIX;
      break;
  }

  if (characterClass) {
    baseXp *= getClassXpMultiplier(characterClass, "issuesResolved");
  }

  return Math.floor(baseXp);
}

/**
 * Calcula XP de Stars/Forks com multiplicador de classe
 */
export function calculateStarForkXp(
  type: "star" | "fork",
  isFirst: boolean = false,
  characterClass?: CharacterClass
): number {
  let baseXp = 0;

  if (type === "star") {
    baseXp = isFirst ? XP_CONSTANTS.STARS.FIRST : XP_CONSTANTS.STARS.ADDITIONAL;
  } else {
    baseXp = isFirst ? XP_CONSTANTS.FORKS.FIRST : XP_CONSTANTS.FORKS.ADDITIONAL;
  }

  if (characterClass) {
    baseXp *= getClassXpMultiplier(characterClass, "starsAndForks");
  }

  return Math.floor(baseXp);
}

/**
 * Calcula XP de Release com multiplicador de classe
 */
export function calculateReleaseXp(
  type: "first" | "major" | "minor" | "patch",
  characterClass?: CharacterClass
): number {
  let baseXp = 0;

  switch (type) {
    case "first":
      baseXp = XP_CONSTANTS.RELEASE.FIRST;
      break;
    case "major":
      baseXp = XP_CONSTANTS.RELEASE.MAJOR;
      break;
    case "minor":
      baseXp = XP_CONSTANTS.RELEASE.MINOR;
      break;
    case "patch":
      baseXp = XP_CONSTANTS.RELEASE.PATCH;
      break;
  }

  if (characterClass) {
    baseXp *= getClassXpMultiplier(characterClass, "releases");
  }

  return Math.floor(baseXp);
}

/**
 * Calcula XP de Achievement com multiplicador de classe
 */
export function calculateAchievementXp(
  type: "first_open_source" | "trending_repo" | "package_published" | "featured",
  characterClass?: CharacterClass
): number {
  let baseXp = 0;

  switch (type) {
    case "first_open_source":
      baseXp = XP_CONSTANTS.ACHIEVEMENTS.FIRST_OPEN_SOURCE;
      break;
    case "trending_repo":
      baseXp = XP_CONSTANTS.ACHIEVEMENTS.TRENDING_REPO;
      break;
    case "package_published":
      baseXp = XP_CONSTANTS.ACHIEVEMENTS.PACKAGE_PUBLISHED;
      break;
    case "featured":
      baseXp = XP_CONSTANTS.ACHIEVEMENTS.FEATURED;
      break;
  }

  if (characterClass) {
    baseXp *= getClassXpMultiplier(characterClass, "achievements");
  }

  return Math.floor(baseXp);
}

/**
 * Sistema de streaks - bônus de multiplicador por dias consecutivos
 */
export function getStreakMultiplier(consecutiveDays: number): number {
  if (consecutiveDays >= 365) return 2.0; // +100% (1 ano)
  if (consecutiveDays >= 100) return 1.5; // +50%
  if (consecutiveDays >= 30) return 1.25; // +25%
  if (consecutiveDays >= 7) return 1.1; // +10%
  return 1.0;
}

/**
 * Tabela de níveis e XP necessário (para referência)
 */
export function getLevelTable(maxLevel: number = 50): Array<{ level: number; totalXp: number; xpForNext: number }> {
  const table = [];

  for (let level = 1; level <= maxLevel; level++) {
    const totalXp = getXpForLevel(level);
    const nextLevelXp = getXpForLevel(level + 1);
    const xpForNext = nextLevelXp - totalXp;

    table.push({
      level,
      totalXp,
      xpForNext,
    });
  }

  return table;
}

/**
 * Valida se o XP ganho está dentro dos limites diários
 */
export function validateDailyXpCap(
  currentDailyXp: number,
  newXp: number,
  xpType: "commit" | "other"
): {
  allowed: boolean;
  cappedXp: number;
  reason?: string;
} {
  const totalDailyXp = currentDailyXp + newXp;

  // Cap geral de XP por dia
  if (totalDailyXp > XP_CONSTANTS.MAX_XP_PER_DAY) {
    const allowedXp = Math.max(0, XP_CONSTANTS.MAX_XP_PER_DAY - currentDailyXp);
    return {
      allowed: allowedXp > 0,
      cappedXp: allowedXp,
      reason: "Daily XP limit reached (1000 XP/day)",
    };
  }

  // Cap específico para commits
  if (xpType === "commit" && newXp > XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY) {
    return {
      allowed: true,
      cappedXp: XP_CONSTANTS.MAX_COMMIT_XP_PER_DAY,
      reason: "Daily commit XP limit (50 XP/day from commits)",
    };
  }

  return {
    allowed: true,
    cappedXp: newXp,
  };
}
