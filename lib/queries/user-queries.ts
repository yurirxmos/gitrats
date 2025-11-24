import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";

interface CharacterData {
  id: string;
  name: string;
  class: string;
  level: number;
  current_xp: number;
  total_xp: number;
  created_at: string;
  achievement_codes: string[];
  github_stats: {
    total_commits: number;
    total_prs: number;
    total_issues: number;
  };
}

interface UserData {
  notifications_enabled: boolean;
}

export async function fetchUserCharacter(): Promise<CharacterData | null> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) throw new Error("No token");

  const response = await fetch("/api/character", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Character fetch failed: ${response.status}`);

  const { data } = await response.json();
  return data;
}

export async function fetchUserData(): Promise<UserData | null> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) return null;

  const response = await fetch("/api/user", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) return null;

  const { data } = await response.json();
  return data;
}

export async function fetchUserRank(userId: string): Promise<number> {
  const response = await fetch(`/api/leaderboard/${userId}`);
  if (!response.ok) return 0;

  const { data } = await response.json();
  return data?.rank || 0;
}

export async function fetchUserProfile(
  userId: string,
  userMetadata: any
): Promise<{ profile: UserProfile; notificationsEnabled: boolean } | null> {
  const [characterData, userData, rank] = await Promise.allSettled([
    fetchUserCharacter(),
    fetchUserData(),
    fetchUserRank(userId),
  ]);

  if (characterData.status === "rejected") throw characterData.reason;
  if (!characterData.value) return null;

  const character = characterData.value;
  const user = userData.status === "fulfilled" ? userData.value : null;
  const userRank = rank.status === "fulfilled" ? rank.value : 0;

  const profile: UserProfile = {
    character_name: character.name,
    character_class: character.class as "warrior" | "mage" | "orc",
    level: character.level,
    current_xp: character.current_xp,
    total_xp: character.total_xp,
    rank: userRank,
    total_commits: character.github_stats?.total_commits || 0,
    total_prs: character.github_stats?.total_prs || 0,
    total_issues: character.github_stats?.total_issues || 0,
    github_username: userMetadata?.user_name || userMetadata?.email?.split("@")[0] || "User",
    created_at: character.created_at,
    achievement_codes: character.achievement_codes || [],
  };

  return {
    profile,
    notificationsEnabled: user?.notifications_enabled ?? true,
  };
}

export async function updateUserNotifications(enabled: boolean): Promise<void> {
  const response = await fetch("/api/user", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notificationsEnabled: enabled }),
  });

  if (!response.ok) throw new Error("Failed to update notifications");
}
