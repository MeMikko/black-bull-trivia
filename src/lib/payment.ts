import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { PRIZE_WALLET, ROUND_COST_LAMPORTS } from "./constants";

const CONFIRM_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_500;

async function pollForConfirmation(
  connection: Connection,
  signature: string
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < CONFIRM_TIMEOUT_MS) {
    const { value } = await connection.getSignatureStatus(signature);

    if (value?.err) {
      throw new Error("Transaction failed on-chain.");
    }

    if (
      value?.confirmationStatus === "confirmed" ||
      value?.confirmationStatus === "finalized"
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  const { value } = await connection.getSignatureStatus(signature);
  if (
    value?.confirmationStatus === "confirmed" ||
    value?.confirmationStatus === "finalized"
  ) {
    return;
  }

  throw new Error(
    "Transaction sent but confirmation timed out. Check your wallet — if SOL was deducted, your round may already be paid."
  );
}

function normalizeWalletError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);

  if (
    message.includes("User rejected") ||
    message.includes("user rejected") ||
    message.includes("cancelled")
  ) {
    return new Error("Transaction cancelled in wallet.");
  }

  return err instanceof Error ? err : new Error(message);
}

/**
 * Send payment via wallet adapter — opens wallet ONCE.
 * Uses wallet sendTransaction (sign + broadcast) then polls for confirmation.
 */
export async function sendRoundPayment(
  publicKey: PublicKey,
  sendTransaction: (
    transaction: Transaction,
    connection: Connection
  ) => Promise<string>,
  connection: Connection
): Promise<string> {
  const prizeWallet = new PublicKey(PRIZE_WALLET);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: prizeWallet,
      lamports: ROUND_COST_LAMPORTS,
    })
  );

  let signature: string;

  try {
    signature = await sendTransaction(transaction, connection);
  } catch (err) {
    throw normalizeWalletError(err);
  }

  try {
    await pollForConfirmation(connection, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("timed out")) {
      throw err;
    }
    throw normalizeWalletError(err);
  }

  return signature;
}

export function formatSolAmount(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2);
}