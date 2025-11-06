/**
 * Sistema de classes com multiplicadores de XP específicos
 * Cada classe tem bônus em atividades que combinam com seu estilo
 */

export type CharacterClass = "orc" | "warrior" | "mage";

export interface ClassMultipliers {
  commits: number;
  largeCommits: number; // commits >100 linhas
  pullRequests: number;
  codeReviews: number;
  issuesResolved: number;
  achievements: number;
  starsAndForks: number;
  releases: number;
  externalRepos: number;
}

/**
 * Multiplicadores de XP por classe
 * 1.0 = normal, >1.0 = bônus, <1.0 = penalidade
 * BALANCEADO para evitar exploits
 */
export const CLASS_XP_MULTIPLIERS: Record<CharacterClass, ClassMultipliers> = {
  // Orc: Força bruta, commits grandes, releases frequentes
  orc: {
    commits: 1.3, // Reduzido de 1.5
    largeCommits: 1.4, // Reduzido de 1.75
    pullRequests: 1.0, // normal
    codeReviews: 0.9, // Reduzido penalidade de 0.8
    issuesResolved: 0.95, // Reduzido penalidade de 0.9
    achievements: 1.0, // normal
    starsAndForks: 0.85, // Reduzido penalidade de 0.75
    releases: 1.2, // Reduzido de 1.25
    externalRepos: 0.95, // Reduzido penalidade de 0.9
  },

  // Warrior: Colaboração, code review, trabalho em equipe
  warrior: {
    commits: 1.0, // normal
    largeCommits: 1.0, // normal
    pullRequests: 1.25, // Reduzido de 1.5
    codeReviews: 1.3, // Reduzido de 1.5
    issuesResolved: 1.15, // Reduzido de 1.25
    achievements: 1.0, // normal
    starsAndForks: 1.0, // normal
    releases: 1.0, // normal
    externalRepos: 1.15, // Reduzido de 1.25
  },

  // Mage: Inteligência, planejamento, impacto estratégico
  mage: {
    commits: 0.95, // Reduzido penalidade de 0.9
    largeCommits: 0.9, // Reduzido penalidade de 0.8
    pullRequests: 1.15, // Reduzido de 1.25
    codeReviews: 1.15, // Reduzido de 1.25
    issuesResolved: 1.4, // Reduzido de 1.75
    achievements: 1.3, // Reduzido de 1.5
    starsAndForks: 1.3, // Reduzido de 2.0 (maior nerf)
    releases: 1.15, // Reduzido de 1.25
    externalRepos: 1.05, // Reduzido de 1.1
  },
};

/**
 * Retorna o multiplicador de XP para uma atividade específica
 */
export function getClassXpMultiplier(characterClass: CharacterClass, activityType: keyof ClassMultipliers): number {
  return CLASS_XP_MULTIPLIERS[characterClass]?.[activityType] || 1.0;
}

export const CLASS_DESCRIPTIONS: Record<
  CharacterClass,
  {
    name: string;
    title: string;
    description: string;
    strengths: string[];
    playstyle: string;
  }
> = {
  orc: {
    name: "Orc",
    title: "Brute Force Developer",
    description: "Desenvolvedores que preferem ação direta, commits frequentes e entregas rápidas. Gostam de XGH.",
    strengths: [
      "+30% XP em commits",
      "+40% XP em commits grandes (>100 linhas) - EM BREVE",
      "+20% XP em releases - EM BREVE",
    ],
    playstyle: "Agressivo, direto, produtividade bruta",
  },

  warrior: {
    name: "Warrior",
    title: "Full-Stack Warrior",
    description:
      "Guerreiros colaborativos que lutam em múltiplas frentes. Mestres em pull requests e trabalho em equipe.",
    strengths: ["+25% XP em Pull Requests", "+30% XP em Code Reviews - EM BREVE", "+15% XP em issues resolvidas"],
    playstyle: "Colaborativo, versátil, trabalho em equipe",
  },

  mage: {
    name: "Mage",
    title: "Code Architect/Wizard",
    description: "Arquitetos estratégicos que preferem impacto e qualidade. Mestres em problemas complexos.",
    strengths: ["+40% XP em issues resolvidas", "+30% XP em stars e forks - EM BREVE", "-10% XP em commits"],
    playstyle: "Estratégico, impacto e qualidade",
  },
};

/**
 * Retorna a descrição completa de uma classe
 */
export function getClassDescription(characterClass: CharacterClass) {
  return CLASS_DESCRIPTIONS[characterClass];
}

/**
 * Valida se uma string é uma classe válida
 */
export function isValidClass(className: string): className is CharacterClass {
  return ["orc", "warrior", "mage"].includes(className.toLowerCase());
}
