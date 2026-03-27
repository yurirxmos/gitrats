import type { SupabaseClient } from "@supabase/supabase-js";
import GitHubService from "@/lib/github-service";
import { BASE_ACTIVITY_XP } from "@/lib/github-xp";
import { getClassXpMultiplier, type CharacterClass } from "@/lib/classes";

export type GitHubActivityType = "commit" | "pull_request" | "issue";

export interface GitHubActivityEventInput {
  user_id: string;
  github_username: string;
  activity_type: GitHubActivityType;
  external_id: string;
  repo_name: string | null;
  title: string | null;
  url: string | null;
  occurred_at: string;
  payload: Record<string, unknown>;
  source: string;
}

interface GitHubActivityEventRow extends GitHubActivityEventInput {
  id: string;
}

interface AchievementJoinRow {
  achievement:
    | {
        xp_reward: number | null;
      }
    | Array<{
        xp_reward: number | null;
      }>
    | null;
}

interface UserActivitySummary {
  events: number;
  commits: number;
  prs: number;
  issues: number;
  activityXp: number;
}

export const GITHUB_ACTIVITY_RULE_VERSION = "github-activity-v1";
const SEARCH_WINDOW_DAYS = 30;

function chunkDateRange(
  startDate: Date,
  endDate: Date,
): Array<{ from: Date; to: Date }> {
  const ranges: Array<{ from: Date; to: Date }> = [];
  let cursor = new Date(startDate);

  while (cursor < endDate) {
    const next = new Date(cursor);
    next.setDate(next.getDate() + SEARCH_WINDOW_DAYS);

    ranges.push({
      from: new Date(cursor),
      to: next > endDate ? new Date(endDate) : next,
    });

    cursor = next;
  }

  return ranges;
}

export async function fetchGitHubActivityEvents(
  githubService: GitHubService,
  userId: string,
  githubUsername: string,
  startDate: Date,
  endDate: Date,
): Promise<GitHubActivityEventInput[]> {
  const allEvents: GitHubActivityEventInput[] = [];
  const ranges = chunkDateRange(startDate, endDate);

  for (const range of ranges) {
    const [commits, pullRequests, issues] = await Promise.all([
      githubService.getCommitsViaSearch(githubUsername, range.from, range.to),
      githubService.getPullRequestsViaSearch(
        githubUsername,
        range.from,
        range.to,
      ),
      githubService.getIssuesViaSearch(githubUsername, range.from, range.to),
    ]);

    allEvents.push(
      ...commits.map((commit) => ({
        user_id: userId,
        github_username: githubUsername,
        activity_type: "commit" as const,
        external_id: commit.sha,
        repo_name: commit.repoName,
        title: commit.message,
        url: commit.url,
        occurred_at: commit.timestamp.toISOString(),
        payload: {
          sha: commit.sha,
          message: commit.message,
        },
        source: "github_search_commits",
      })),
      ...pullRequests.map((pullRequest) => ({
        user_id: userId,
        github_username: githubUsername,
        activity_type: "pull_request" as const,
        external_id: pullRequest.id,
        repo_name: pullRequest.repoName,
        title: pullRequest.title,
        url: pullRequest.url,
        occurred_at: pullRequest.createdAt.toISOString(),
        payload: {
          number: pullRequest.number,
          title: pullRequest.title,
        },
        source: "github_search_prs",
      })),
      ...issues.map((issue) => ({
        user_id: userId,
        github_username: githubUsername,
        activity_type: "issue" as const,
        external_id: issue.id,
        repo_name: issue.repoName,
        title: issue.title,
        url: issue.url,
        occurred_at: issue.closedAt.toISOString(),
        payload: {
          number: issue.number,
          title: issue.title,
        },
        source: "github_search_issues",
      })),
    );
  }

  const deduped = new Map<string, GitHubActivityEventInput>();

  for (const event of allEvents) {
    const key = `${event.activity_type}:${event.external_id}`;
    deduped.set(key, event);
  }

  return Array.from(deduped.values()).sort((left, right) =>
    left.occurred_at.localeCompare(right.occurred_at),
  );
}

export async function upsertGitHubActivityEvents(
  supabase: SupabaseClient,
  events: GitHubActivityEventInput[],
): Promise<void> {
  if (!events.length) return;

  const { error } = await supabase
    .from("github_activity_events")
    .upsert(events, {
      onConflict: "user_id,activity_type,external_id",
    });

  if (error) {
    throw new Error(`Erro ao salvar atividades do GitHub: ${error.message}`);
  }
}

export async function replaceGitHubActivityEventsForUser(
  supabase: SupabaseClient,
  userId: string,
  events: GitHubActivityEventInput[],
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("github_activity_events")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(
      `Erro ao limpar atividades antigas: ${deleteError.message}`,
    );
  }

  await upsertGitHubActivityEvents(supabase, events);
}

function calculateEventXp(
  activityType: GitHubActivityType,
  characterClass: CharacterClass,
): number {
  if (activityType === "commit") {
    return Math.floor(
      BASE_ACTIVITY_XP.commit * getClassXpMultiplier(characterClass, "commits"),
    );
  }

  if (activityType === "pull_request") {
    return Math.floor(
      BASE_ACTIVITY_XP.pr *
        getClassXpMultiplier(characterClass, "pullRequests"),
    );
  }

  return Math.floor(
    BASE_ACTIVITY_XP.issue *
      getClassXpMultiplier(characterClass, "issuesResolved"),
  );
}

export async function rebuildGithubActivityLedger(
  supabase: SupabaseClient,
  userId: string,
  characterClass: CharacterClass,
): Promise<UserActivitySummary> {
  const { data: events, error: eventsError } = await supabase
    .from("github_activity_events")
    .select(
      "id, user_id, github_username, activity_type, external_id, repo_name, title, url, occurred_at, payload, source",
    )
    .eq("user_id", userId)
    .order("occurred_at", { ascending: true });

  if (eventsError) {
    throw new Error(
      `Erro ao carregar atividades salvas: ${eventsError.message}`,
    );
  }

  const activityEvents = (events || []) as GitHubActivityEventRow[];

  const { error: deleteError } = await supabase
    .from("xp_ledger")
    .delete()
    .eq("user_id", userId)
    .eq("source_type", "github_activity");

  if (deleteError) {
    throw new Error(`Erro ao limpar ledger de XP: ${deleteError.message}`);
  }

  if (!activityEvents.length) {
    return { events: 0, commits: 0, prs: 0, issues: 0, activityXp: 0 };
  }

  const ledgerRows = activityEvents.map((event) => ({
    user_id: userId,
    activity_event_id: event.id,
    source_type: "github_activity",
    source_ref: `${event.activity_type}:${event.external_id}`,
    xp_amount: calculateEventXp(event.activity_type, characterClass),
    rule_version: GITHUB_ACTIVITY_RULE_VERSION,
    metadata: {
      activity_type: event.activity_type,
      repo_name: event.repo_name,
      occurred_at: event.occurred_at,
    },
  }));

  const { error: insertError } = await supabase
    .from("xp_ledger")
    .insert(ledgerRows);

  if (insertError) {
    throw new Error(`Erro ao recriar ledger de XP: ${insertError.message}`);
  }

  return {
    events: activityEvents.length,
    commits: activityEvents.filter((event) => event.activity_type === "commit")
      .length,
    prs: activityEvents.filter(
      (event) => event.activity_type === "pull_request",
    ).length,
    issues: activityEvents.filter((event) => event.activity_type === "issue")
      .length,
    activityXp: ledgerRows.reduce((sum, row) => sum + row.xp_amount, 0),
  };
}

export async function getAchievementXpTotal(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select("achievement:achievements(xp_reward)")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Erro ao buscar achievements: ${error.message}`);
  }

  return ((data || []) as AchievementJoinRow[]).reduce((sum, row) => {
    const achievement = Array.isArray(row.achievement)
      ? row.achievement[0]
      : row.achievement;

    return sum + (achievement?.xp_reward || 0);
  }, 0);
}
