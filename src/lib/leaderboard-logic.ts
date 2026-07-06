import { getCurrentWeekId } from "./weekly";

export interface LeaderboardEntry {
  wallet: string;
  score: number;
  total: number;
  title: string;
  weekId: string;
  playedAt: string;
  elapsedMs?: number;
}

export function isBetterEntry(
  candidate: LeaderboardEntry,
  existing: LeaderboardEntry
): boolean {
  if (candidate.score > existing.score) return true;
  if (candidate.score < existing.score) return false;

  const candidateTime = candidate.elapsedMs ?? Infinity;
  const existingTime = existing.elapsedMs ?? Infinity;
  return candidateTime < existingTime;
}

export function mergeEntry(
  entries: LeaderboardEntry[],
  newEntry: LeaderboardEntry
): LeaderboardEntry[] {
  const next = [...entries];
  const index = next.findIndex(
    (e) => e.wallet === newEntry.wallet && e.weekId === newEntry.weekId
  );

  if (index >= 0) {
    if (isBetterEntry(newEntry, next[index])) {
      next[index] = newEntry;
    }
  } else {
    next.push(newEntry);
  }

  return next;
}

export function compareEntries(
  a: LeaderboardEntry,
  b: LeaderboardEntry
): number {
  if (b.score !== a.score) return b.score - a.score;
  const aTime = a.elapsedMs ?? Infinity;
  const bTime = b.elapsedMs ?? Infinity;
  return aTime - bTime;
}

export function getTopEntries(
  entries: LeaderboardEntry[],
  weekId = getCurrentWeekId(),
  limit = 10
): LeaderboardEntry[] {
  return entries
    .filter((e) => e.weekId === weekId)
    .sort(compareEntries)
    .slice(0, limit);
}