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
  guild_tag?: string | null;
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
  guild_name?: string | null;
  guild_tag?: string | null;
};

export type Guild = {
  id: string;
  name: string;
  description: string | null;
  tag: string | null;
  owner_id: string;
  total_members: number;
  total_xp: number;
  created_at: string;
  updated_at: string;
};

export type GuildMember = {
  guild_id: string;
  user_id: string;
  joined_at: string;
  role: "owner" | "admin" | "member";
  character_name?: string;
  character_class?: "warrior" | "mage" | "orc";
  level?: number;
  total_xp?: number;
  github_username?: string;
  github_avatar_url?: string | null;
};

export type GuildInvite = {
  id: string;
  guild_id: string;
  invited_user_id: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  guild_name?: string;
  guild_tag?: string | null;
  invited_by_username?: string;
};

export type GuildLeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  tag: string | null;
  total_members: number;
  total_xp: number;
  owner_username: string;
  top_members?: GuildMember[];
};
