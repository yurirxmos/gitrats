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
 */
export const CLASS_XP_MULTIPLIERS: Record<CharacterClass, ClassMultipliers> = {
  // Orc: Força bruta, commits grandes, releases frequentes
  orc: {
    commits: 1.5, // +50% em commits
    largeCommits: 1.75, // +75% em commits grandes
    pullRequests: 1.0, // normal
    codeReviews: 0.8, // -20% (não é o forte)
    issuesResolved: 0.9, // -10%
    achievements: 1.0, // normal
    starsAndForks: 0.75, // -25% (foca menos em popularidade)
    releases: 1.25, // +25% em releases
    externalRepos: 0.9, // -10% (prefere dominar seus próprios repos)
  },

  // Warrior: Colaboração, code review, trabalho em equipe
  warrior: {
    commits: 1.0, // normal
    largeCommits: 1.0, // normal
    pullRequests: 1.5, // +50% em PRs
    codeReviews: 1.5, // +50% em code reviews
    issuesResolved: 1.25, // +25%
    achievements: 1.0, // normal
    starsAndForks: 1.0, // normal
    releases: 1.0, // normal
    externalRepos: 1.25, // +25% em repos externos (guerreiro em múltiplas frentes)
  },

  // Mage: Inteligência, planejamento, impacto estratégico
  mage: {
    commits: 0.9, // -10% (foca em qualidade, não quantidade)
    largeCommits: 0.8, // -20% (prefere commits menores e precisos)
    pullRequests: 1.25, // +25%
    codeReviews: 1.25, // +25%
    issuesResolved: 1.75, // +75% em resolver issues
    achievements: 1.5, // +50% em achievements especiais
    starsAndForks: 2.0, // +100% em stars/forks (impacto na comunidade)
    releases: 1.25, // +25%
    externalRepos: 1.1, // +10%
  },
};

/**
 * Retorna o multiplicador de XP para uma atividade específica
 */
export function getClassXpMultiplier(
  characterClass: CharacterClass,
  activityType: keyof ClassMultipliers
): number {
  return CLASS_XP_MULTIPLIERS[characterClass]?.[activityType] || 1.0;
}

/**
 * Descrições das classes para onboarding
 */
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
    description:
      "Desenvolvedores que preferem ação direta, commits grandes e entregas rápidas. Dominam seus projetos com força e determinação.",
    strengths: [
      "+50% XP em commits normais",
      "+75% XP em commits grandes (>100 linhas)",
      "+25% XP em releases",
    ],
    playstyle: "Agressivo, direto, focado em produtividade bruta",
  },

  warrior: {
    name: "Warrior",
    title: "Full-Stack Warrior",
    description:
      "Guerreiros colaborativos que lutam em múltiplas frentes. Mestres em pull requests, code reviews e trabalho em equipe.",
    strengths: [
      "+50% XP em Pull Requests",
      "+50% XP em Code Reviews",
      "+25% XP em contribuições externas",
    ],
    playstyle: "Colaborativo, versátil, trabalho em equipe",
  },

  mage: {
    name: "Mage",
    title: "Code Architect/Wizard",
    description:
      "Arquitetos estratégicos que preferem impacto e qualidade. Mestres em resolver problemas complexos e criar projetos influentes.",
    strengths: [
      "+75% XP em issues resolvidas",
      "+100% XP em stars e forks",
      "+50% XP em achievements especiais",
    ],
    playstyle: "Estratégico, focado em impacto e qualidade",
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
