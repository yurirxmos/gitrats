/**
 * Exemplos de uso do sistema de XP com multiplicadores de classe
 * Este arquivo demonstra como calcular XP para diferentes atividades
 */

import type { CharacterClass } from "./classes";
import {
  calculateCommitXp,
  calculatePullRequestXp,
  calculateCodeReviewXp,
  calculateIssueXp,
  calculateStarForkXp,
  calculateReleaseXp,
  calculateAchievementXp,
} from "./xp-system";

// Exemplo 1: Commit pequeno (50 linhas) em repo próprio
export function exampleSmallCommit(characterClass: CharacterClass) {
  const xp = calculateCommitXp(50, true, characterClass);
  
  // Orc: 5 * 1.5 = 7 XP
  // Warrior: 5 * 1.0 = 5 XP
  // Mage: 5 * 0.9 = 4 XP
  
  return xp;
}

// Exemplo 2: Commit grande (300 linhas) em repo externo
export function exampleLargeCommitExternal(characterClass: CharacterClass) {
  const xp = calculateCommitXp(300, false, characterClass);
  
  // Orc: 8 * 1.5 (external) * 1.75 (large) = 21 XP
  // Warrior: 8 * 1.5 (external) * 1.25 (external class bonus) = 15 XP
  // Mage: 8 * 1.5 (external) * 0.8 (large) * 1.1 (external class bonus) = 10 XP
  
  return xp;
}

// Exemplo 3: Pull Request merged em repo popular (5000 stars)
export function examplePopularPR(characterClass: CharacterClass) {
  const xp = calculatePullRequestXp("merged", false, 5000, characterClass);
  
  // Base: 40 XP (opened + merged)
  // Bonus: 1.5x (1000+ stars)
  // Orc: 40 * 1.5 * 0.9 (external) * 1.0 (PR) = 54 XP
  // Warrior: 40 * 1.5 * 1.25 (external) * 1.5 (PR) = 112 XP
  // Mage: 40 * 1.5 * 1.1 (external) * 1.25 (PR) = 82 XP
  
  return xp;
}

// Exemplo 4: Code Review com mudanças
export function exampleCodeReview(characterClass: CharacterClass) {
  const xp = calculateCodeReviewXp(true, characterClass);
  
  // Orc: 25 * 0.8 = 20 XP
  // Warrior: 25 * 1.5 = 37 XP
  // Mage: 25 * 1.25 = 31 XP
  
  return xp;
}

// Exemplo 5: Issue resolvida (bug fix)
export function exampleBugFix(characterClass: CharacterClass) {
  const xp = calculateIssueXp("bug_fix", characterClass);
  
  // Orc: 40 * 0.9 = 36 XP
  // Warrior: 40 * 1.25 = 50 XP
  // Mage: 40 * 1.75 = 70 XP
  
  return xp;
}

// Exemplo 6: Primeira star em um repo
export function exampleFirstStar(characterClass: CharacterClass) {
  const xp = calculateStarForkXp("star", true, characterClass);
  
  // Orc: 50 * 0.75 = 37 XP
  // Warrior: 50 * 1.0 = 50 XP
  // Mage: 50 * 2.0 = 100 XP
  
  return xp;
}

// Exemplo 7: Major Release (v2.0)
export function exampleMajorRelease(characterClass: CharacterClass) {
  const xp = calculateReleaseXp("major", characterClass);
  
  // Orc: 75 * 1.25 = 93 XP
  // Warrior: 75 * 1.0 = 75 XP
  // Mage: 75 * 1.25 = 93 XP
  
  return xp;
}

// Exemplo 8: Achievement - Package Published
export function examplePackagePublished(characterClass: CharacterClass) {
  const xp = calculateAchievementXp("package_published", characterClass);
  
  // Orc: 500 * 1.0 = 500 XP
  // Warrior: 500 * 1.0 = 500 XP
  // Mage: 500 * 1.5 = 750 XP
  
  return xp;
}

// Comparação completa de um dia de atividades
export function dailyXpComparison() {
  const activities = {
    commits: 10, // 10 commits pequenos
    largeCommits: 2, // 2 commits grandes
    pullRequests: 1, // 1 PR merged
    codeReviews: 2, // 2 code reviews
    issuesResolved: 1, // 1 bug fix
    stars: 5, // 5 stars
  };

  const classes: CharacterClass[] = ["orc", "warrior", "mage"];
  
  return classes.map((characterClass) => {
    let totalXp = 0;
    
    // Commits pequenos
    totalXp += calculateCommitXp(50, true, characterClass) * activities.commits;
    
    // Commits grandes
    totalXp += calculateCommitXp(300, true, characterClass) * activities.largeCommits;
    
    // Pull Request
    totalXp += calculatePullRequestXp("merged", false, 1000, characterClass) * activities.pullRequests;
    
    // Code Reviews
    totalXp += calculateCodeReviewXp(true, characterClass) * activities.codeReviews;
    
    // Issues
    totalXp += calculateIssueXp("bug_fix", characterClass) * activities.issuesResolved;
    
    // Stars
    totalXp += calculateStarForkXp("star", false, characterClass) * activities.stars;
    
    return {
      class: characterClass,
      totalXp,
      breakdown: {
        commits: calculateCommitXp(50, true, characterClass) * activities.commits,
        largeCommits: calculateCommitXp(300, true, characterClass) * activities.largeCommits,
        pullRequests: calculatePullRequestXp("merged", false, 1000, characterClass) * activities.pullRequests,
        codeReviews: calculateCodeReviewXp(true, characterClass) * activities.codeReviews,
        issuesResolved: calculateIssueXp("bug_fix", characterClass) * activities.issuesResolved,
        stars: calculateStarForkXp("star", false, characterClass) * activities.stars,
      },
    };
  });
}

// Executar comparação
// console.log(JSON.stringify(dailyXpComparison(), null, 2));
