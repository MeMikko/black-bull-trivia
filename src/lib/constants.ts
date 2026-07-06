/** Prize & donation pot wallet */
export const PRIZE_WALLET = "2ya93F943VD84PhF6gTCLfq8Y6hSNC18WxygsYGyFMHh";

/** Wallet for optional donations to the prize pot */
export const DONATION_WALLET = PRIZE_WALLET;

/** Share of paid fees & donations allocated to weekly prizes */
export const PRIZE_POOL_PERCENT = 80;

/** Cost per extra round in SOL */
export const ROUND_COST_SOL = 0.02;

/** Cost in lamports (0.02 SOL = 20,000,000 lamports) */
export const ROUND_COST_LAMPORTS = ROUND_COST_SOL * 1_000_000_000;

/** Questions per round */
export const QUESTIONS_PER_ROUND = 10;