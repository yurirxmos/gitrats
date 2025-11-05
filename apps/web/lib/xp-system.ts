/**
 * Sistema de XP inspirado no design econômico de GitMon
 * Fórmula: XP = Level³ × 4 - 15 × Level² + 100 × Level - 140
 * Progressão similar ao sistema Fast/Medium Fast de Pokémon
 */

// Constantes do sistema
export const XP_CONSTANTS = {
  // Caps diários para prevenir grinding excessivo
  MAX_XP_PER_DAY: 1000,
  MAX_COMMIT_XP_PER_DAY: 50,

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
 * Fórmula inspirada em GitMon: XP = Level³ × 4 - 15 × Level² + 100 × Level - 140
 */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;

  const l = level;
  const xp = Math.pow(l, 3) * 4 - 15 * Math.pow(l, 2) + 100 * l - 140;

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
 */
export function calculateCommitXp(linesChanged: number, isOwnRepo: boolean = true): number {
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

  // Penalidade menor para repos próprios (incentiva contribuições externas)
  if (!isOwnRepo) {
    baseXp *= XP_CONSTANTS.MULTIPLIERS.EXTERNAL_REPO;
  }

  return Math.floor(baseXp);
}

/**
 * Calcula XP de Pull Request baseado em status e popularidade do repo
 */
export function calculatePullRequestXp(
  status: "opened" | "merged" | "closed",
  isOwnRepo: boolean = true,
  repoStars: number = 0
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

  // Aplicar penalidade para repos próprios
  if (isOwnRepo) {
    baseXp *= XP_CONSTANTS.PULL_REQUEST.OWN_REPO_PENALTY;
  }

  // Bônus por popularidade do repo
  if (repoStars >= 10000) {
    baseXp *= 2; // +100% bonus
  } else if (repoStars >= 1000) {
    baseXp *= 1.5; // +50% bonus
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
