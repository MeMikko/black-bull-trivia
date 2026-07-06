const PAID_CREDITS_KEY = "black-bull-paid-credits";

export interface PaidRoundCredit {
  wallet: string;
  txSignature: string;
  purchasedAt: string;
  used: boolean;
}

function getAllCredits(): PaidRoundCredit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PAID_CREDITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCredits(credits: PaidRoundCredit[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAID_CREDITS_KEY, JSON.stringify(credits));
}

export function addPaidRoundCredit(
  wallet: string,
  txSignature: string
): void {
  const credits = getAllCredits();
  credits.push({
    wallet,
    txSignature,
    purchasedAt: new Date().toISOString(),
    used: false,
  });
  saveCredits(credits);
}

export function getUnusedPaidCreditCount(wallet: string): number {
  return getAllCredits().filter((c) => c.wallet === wallet && !c.used).length;
}

export function consumePaidRoundCredit(wallet: string): boolean {
  const credits = getAllCredits();
  const index = credits.findIndex((c) => c.wallet === wallet && !c.used);
  if (index < 0) return false;

  credits[index] = { ...credits[index], used: true };
  saveCredits(credits);
  return true;
}