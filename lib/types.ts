export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  character_name: string;
  character_class: "warrior" | "mage" | "orc";
  level: number;
  total_xp: number;
  github_username: string;
  github_avatar_url: string | null;
  total_commits: number;
  total_prs: number;
  total_issues: number;
  achievement_codes?: string[];
};

export type UserProfile = {
  character_name: string;
  character_class: "warrior" | "mage" | "orc";
  level: number;
  current_xp: number;
  total_xp: number;
  rank: number;
  total_commits: number;
  total_prs: number;
  total_issues: number;
  github_username: string;
  created_at?: string;
  achievement_codes?: string[];
};
