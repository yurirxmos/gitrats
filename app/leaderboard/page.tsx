import LeaderboardClient from "./leaderboard-client";
import type { GuildLeaderboardEntry, LeaderboardEntry } from "@/lib/types";

const CACHE_TTL_SECONDS = 120;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function getLeaderboard(): Promise<{ data: LeaderboardEntry[]; lastUpdate: string | null }> {
  try {
    const response = await fetch(new URL("/api/leaderboard?limit=50", APP_URL).toString(), {
      next: { revalidate: CACHE_TTL_SECONDS, tags: ["leaderboard"] },
    });
    if (!response.ok) return { data: [], lastUpdate: null };

    const payload = await response.json();
    return { data: payload.data ?? [], lastUpdate: payload.lastUpdate ?? null };
  } catch {
    return { data: [], lastUpdate: null };
  }
}

async function getGuildLeaderboard(): Promise<GuildLeaderboardEntry[]> {
  try {
    const response = await fetch(new URL("/api/leaderboard/guilds", APP_URL).toString(), {
      next: { revalidate: CACHE_TTL_SECONDS, tags: ["guild-leaderboard"] },
    });
    if (!response.ok) return [];

    const payload = await response.json();
    return payload.data ?? [];
  } catch {
    return [];
  }
}

export default async function LeaderboardPage() {
  const [{ data: leaderboard, lastUpdate }, guildLeaderboard] = await Promise.all([
    getLeaderboard(),
    getGuildLeaderboard(),
  ]);

  return (
    <LeaderboardClient
      initialLeaderboard={leaderboard}
      initialGuildLeaderboard={guildLeaderboard}
      initialLastUpdate={lastUpdate}
    />
  );
}
