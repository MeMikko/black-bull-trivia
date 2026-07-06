import { getCurrentWeekId } from "./weekly";

const LEADERBOARD_KEY = "black-bull-leaderboard";

export interface LeaderboardEntry {
  wallet: string;
  score: number;
  total: number;
  title: string;
  weekId: string;
  playedAt: string;
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

export function submitScore(
  wallet: string,
  score: number,
  total: number,
  title: string
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
  };

  if (existingIndex >= 0) {
    if (score > entries[existingIndex].score) {
      entries[existingIndex] = newEntry;
    }
  } else {
    entries.push(newEntry);
  }

  saveEntries(entries);
}

export function getWeeklyLeaderboard(limit = 10): LeaderboardEntry[] {
  const weekId = getCurrentWeekId();
  return getAllEntries()
    .filter((e) => e.weekId === weekId)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}