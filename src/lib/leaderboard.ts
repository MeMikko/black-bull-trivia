import {
  getTopEntries,
  mergeEntry,
  type LeaderboardEntry,
} from "./leaderboard-logic";
import { getCurrentWeekId } from "./weekly";

export type { LeaderboardEntry };

const LOCAL_KEY = "black-bull-leaderboard";

function getLocalEntries(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalEntries(entries: LeaderboardEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
}

function getLocalWeeklyLeaderboard(limit = 10): LeaderboardEntry[] {
  return getTopEntries(getLocalEntries(), getCurrentWeekId(), limit);
}

function submitScoreLocal(
  wallet: string,
  score: number,
  total: number,
  title: string,
  elapsedMs: number
): void {
  const weekId = getCurrentWeekId();
  const newEntry: LeaderboardEntry = {
    wallet,
    score,
    total,
    title,
    weekId,
    playedAt: new Date().toISOString(),
    elapsedMs,
  };
  saveLocalEntries(mergeEntry(getLocalEntries(), newEntry));
}

export async function getWeeklyLeaderboard(
  limit = 10
): Promise<{ entries: LeaderboardEntry[]; source: "server" | "local" }> {
  const weekId = getCurrentWeekId();

  try {
    const res = await fetch(
      `/api/leaderboard?weekId=${encodeURIComponent(weekId)}&limit=${limit}`,
      { cache: "no-store" }
    );

    if (res.ok) {
      const entries = (await res.json()) as LeaderboardEntry[];
      return { entries, source: "server" };
    }
  } catch {
    /* fall through to local */
  }

  return { entries: getLocalWeeklyLeaderboard(limit), source: "local" };
}

export async function submitScore(
  wallet: string,
  score: number,
  total: number,
  title: string,
  elapsedMs: number
): Promise<void> {
  const weekId = getCurrentWeekId();
  const payload: LeaderboardEntry = {
    wallet,
    score,
    total,
    title,
    weekId,
    playedAt: new Date().toISOString(),
    elapsedMs,
  };

  try {
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) return;
  } catch {
    /* fall through to local */
  }

  submitScoreLocal(wallet, score, total, title, elapsedMs);
}