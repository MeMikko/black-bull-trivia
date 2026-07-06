import { NextResponse } from "next/server";
import { getRedis, isRedisConfigured } from "@/lib/redis";
import { getCurrentWeekId } from "@/lib/weekly";

const KEY_PREFIX = "free-round:";

function freeRoundKey(weekId: string, wallet: string): string {
  return `${KEY_PREFIX}${weekId}:${wallet}`;
}

export async function GET(request: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Free round storage not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  const weekId = searchParams.get("weekId") ?? getCurrentWeekId();

  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
  }

  try {
    const redis = await getRedis();
    const used = await redis.exists(freeRoundKey(weekId, wallet));
    return NextResponse.json({ available: used === 0, weekId });
  } catch {
    return NextResponse.json(
      { error: "Failed to check free round" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Free round storage not configured" },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { wallet?: string; weekId?: string };

    if (!body.wallet) {
      return NextResponse.json({ error: "wallet required" }, { status: 400 });
    }

    const weekId = body.weekId ?? getCurrentWeekId();
    const key = freeRoundKey(weekId, body.wallet);
    const redis = await getRedis();

    const claimed = await redis.set(key, new Date().toISOString(), {
      NX: true,
      EX: 60 * 60 * 24 * 8,
    });

    if (!claimed) {
      return NextResponse.json(
        { error: "Free round already used this week" },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, weekId });
  } catch {
    return NextResponse.json(
      { error: "Failed to claim free round" },
      { status: 500 }
    );
  }
}