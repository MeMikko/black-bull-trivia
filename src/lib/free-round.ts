import {
  hasFreeRoundAvailable as hasFreeRoundAvailableLocal,
  markFreeRoundUsed as markFreeRoundUsedLocal,
} from "./weekly";
import { getCurrentWeekId } from "./weekly";

export type FreeRoundSource = "server" | "local";

export async function checkFreeRoundAvailable(
  wallet: string
): Promise<{ available: boolean; source: FreeRoundSource }> {
  const weekId = getCurrentWeekId();
  const usedLocally = !hasFreeRoundAvailableLocal(wallet);

  try {
    const res = await fetch(
      `/api/free-round?wallet=${encodeURIComponent(wallet)}&weekId=${encodeURIComponent(weekId)}`,
      { cache: "no-store" }
    );

    if (res.ok) {
      const data = (await res.json()) as { available: boolean };

      if (!data.available) {
        if (hasFreeRoundAvailableLocal(wallet)) {
          markFreeRoundUsedLocal(wallet);
        }
        return { available: false, source: "server" };
      }

      if (usedLocally) {
        await syncLocalUsageToServer(wallet, weekId);
        return { available: false, source: "local" };
      }

      return { available: true, source: "server" };
    }
  } catch {
    /* fall through */
  }

  return {
    available: hasFreeRoundAvailableLocal(wallet),
    source: "local",
  };
}

async function syncLocalUsageToServer(
  wallet: string,
  weekId: string
): Promise<void> {
  try {
    await fetch("/api/free-round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, weekId }),
    });
  } catch {
    /* best effort */
  }
}

export async function claimFreeRound(
  wallet: string
): Promise<{ ok: boolean; source: FreeRoundSource; error?: string }> {
  const weekId = getCurrentWeekId();

  try {
    const res = await fetch("/api/free-round", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, weekId }),
    });

    if (res.ok) {
      markFreeRoundUsedLocal(wallet);
      return { ok: true, source: "server" };
    }

    if (res.status === 409) {
      markFreeRoundUsedLocal(wallet);
      return { ok: false, source: "server", error: "Free round already used" };
    }
  } catch {
    /* fall through */
  }

  if (!hasFreeRoundAvailableLocal(wallet)) {
    return { ok: false, source: "local", error: "Free round already used" };
  }

  markFreeRoundUsedLocal(wallet);
  await syncLocalUsageToServer(wallet, weekId);
  return { ok: true, source: "local" };
}