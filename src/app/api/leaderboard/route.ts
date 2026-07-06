import { NextResponse } from "next/server";
import {
  getTopEntries,
  mergeEntry,
  type LeaderboardEntry,
} from "@/lib/leaderboard-logic";
import { getRedis, isRedisConfigured } from "@/lib/redis";
import { getCurrentWeekId } from "@/lib/weekly";

const KEY_PREFIX = "leaderboard:";

async function loadWeek(weekId: string): Promise<LeaderboardEntry[]> {
  const redis = await getRedis();
  const raw = await redis.get(`${KEY_PREFIX}${weekId}`);
  if (!raw) return [];
  return JSON.parse(raw) as LeaderboardEntry[];
}

async function saveWeek(
  weekId: string,
  entries: LeaderboardEntry[]
): Promise<void> {
  const redis = await getRedis();
  await redis.set(`${KEY_PREFIX}${weekId}`, JSON.stringify(entries));
}

export async function GET(request: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Leaderboard storage not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const weekId = searchParams.get("weekId") ?? getCurrentWeekId();
  const limit = Math.min(
    Number(searchParams.get("limit") ?? "10") || 10,
    50
  );

  try {
    const entries = await loadWeek(weekId);
    return NextResponse.json(getTopEntries(entries, weekId, limit));
  } catch {
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Leaderboard storage not configured" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as Partial<LeaderboardEntry>;

    if (
      !body.wallet ||
      typeof body.score !== "number" ||
      typeof body.total !== "number" ||
      !body.title
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const weekId = body.weekId ?? getCurrentWeekId();
    const newEntry: LeaderboardEntry = {
      wallet: body.wallet,
      score: body.score,
      total: body.total,
      title: body.title,
      weekId,
      playedAt: body.playedAt ?? new Date().toISOString(),
      elapsedMs: body.elapsedMs,
    };

    const entries = await loadWeek(weekId);
    const merged = mergeEntry(entries, newEntry);
    await saveWeek(weekId, merged);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to save score" },
      { status: 500 }
    );
  }
}