export const GITHUB_SYNC_EVENT_NAME = "gitrats:github-sync";

export const GITHUB_SYNC_INTERVAL_MS = 10 * 60 * 1000;
export const GITHUB_SYNC_INITIAL_DELAY_MS = 5 * 1000;
export const GITHUB_SYNC_LOCK_MS = 30 * 1000;

export const GITHUB_SYNC_STORAGE_KEYS = {
  lastSyncAt: "gitrats:last-github-sync-at",
  lockUntil: "gitrats:github-sync-lock-until",
} as const;
