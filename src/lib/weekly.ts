const FREE_ROUND_KEY = "black-bull-free-round";

export interface WeeklyPlayRecord {
  wallet: string;
  weekId: string;
  usedFreeRound: boolean;
  lastPlayedAt: string;
}

/**
 * Returns the ISO week identifier for the current week (Monday UTC reset).
 * Format: YYYY-Www (e.g. "2026-W27")
 */
export function getCurrentWeekId(date = new Date()): string {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

  // Shift to Thursday of current week (ISO week date algorithm)
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function getNextMondayReset(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;

  const nextMonday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilMonday,
      0,
      0,
      0,
      0
    )
  );

  return nextMonday;
}

function getAllRecords(): WeeklyPlayRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FREE_ROUND_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: WeeklyPlayRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FREE_ROUND_KEY, JSON.stringify(records));
}

export function hasFreeRoundAvailable(wallet: string): boolean {
  const weekId = getCurrentWeekId();
  const record = getAllRecords().find(
    (r) => r.wallet === wallet && r.weekId === weekId
  );
  return !record?.usedFreeRound;
}

export function markFreeRoundUsed(wallet: string): void {
  const weekId = getCurrentWeekId();
  const records = getAllRecords().filter(
    (r) => !(r.wallet === wallet && r.weekId === weekId)
  );

  records.push({
    wallet,
    weekId,
    usedFreeRound: true,
    lastPlayedAt: new Date().toISOString(),
  });

  saveRecords(records);
}