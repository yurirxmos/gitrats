export interface ActivityCounters {
  commits: number;
  prs: number;
  issues: number;
}

export interface ActivityMultipliers {
  commitMultiplier: number;
  prMultiplier: number;
  issueMultiplier: number;
}

export const BASE_ACTIVITY_XP = {
  commit: 10,
  pr: 25,
  issue: 35,
} as const;

export function calculateXpFromActivities(
  activities: ActivityCounters,
  multipliers: ActivityMultipliers,
): {
  xpFromCommits: number;
  xpFromPRs: number;
  xpFromIssues: number;
  totalXp: number;
} {
  const xpFromCommits = Math.floor(
    activities.commits * BASE_ACTIVITY_XP.commit * multipliers.commitMultiplier,
  );
  const xpFromPRs = Math.floor(
    activities.prs * BASE_ACTIVITY_XP.pr * multipliers.prMultiplier,
  );
  const xpFromIssues = Math.floor(
    activities.issues * BASE_ACTIVITY_XP.issue * multipliers.issueMultiplier,
  );

  return {
    xpFromCommits,
    xpFromPRs,
    xpFromIssues,
    totalXp: xpFromCommits + xpFromPRs + xpFromIssues,
  };
}
