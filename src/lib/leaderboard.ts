import { getCurrentWeekId } from "./weekly";

const LEADERBOARD_KEY = "black-bull-leaderboard";

export interface LeaderboardEntry {
  wallet: string;
  score: number;
  total: number;
  title: string;
  weekId: string;
  playedAt: string;
  /** Round completion time in ms — lower is better for tie-breaks */
  elapsedMs?: number;
}

function getAllEntries(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: LeaderboardEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
}

function isBetterEntry(
  candidate: LeaderboardEntry,
  existing: LeaderboardEntry
): boolean {
  if (candidate.score > existing.score) return true;
  if (candidate.score < existing.score) return false;

  const candidateTime = candidate.elapsedMs ?? Infinity;
  const existingTime = existing.elapsedMs ?? Infinity;
  return candidateTime < existingTime;
}

export function submitScore(
  wallet: string,
  score: number,
  total: number,
  title: string,
  elapsedMs: number
): void {
  const weekId = getCurrentWeekId();
  const entries = getAllEntries();

  const existingIndex = entries.findIndex(
    (e) => e.wallet === wallet && e.weekId === weekId
  );

  const newEntry: LeaderboardEntry = {
    wallet,
    score,
    total,
    title,
    weekId,
    playedAt: new Date().toISOString(),
    elapsedMs,
  };

  if (existingIndex >= 0) {
    if (isBetterEntry(newEntry, entries[existingIndex])) {
      entries[existingIndex] = newEntry;
    }
  } else {
    entries.push(newEntry);
  }

  saveEntries(entries);
}

function compareEntries(a: LeaderboardEntry, b: LeaderboardEntry): number {
  if (b.score !== a.score) return b.score - a.score;
  const aTime = a.elapsedMs ?? Infinity;
  const bTime = b.elapsedMs ?? Infinity;
  return aTime - bTime;
}

export function getWeeklyLeaderboard(limit = 10): LeaderboardEntry[] {
  const weekId = getCurrentWeekId();
  return getAllEntries()
    .filter((e) => e.weekId === weekId)
    .sort(compareEntries)
    .slice(0, limit);
}