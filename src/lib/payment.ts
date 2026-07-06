import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  type SendOptions,
} from "@solana/web3.js";
import { PRIZE_WALLET, ROUND_COST_LAMPORTS } from "./constants";

const CONFIRM_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_500;

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

async function buildTransaction(
  connection: Connection,
  publicKey: PublicKey,
  prizeWallet: PublicKey
): Promise<Transaction> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  return new Transaction({
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
}

async function assertSufficientBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<void> {
  const balance = await connection.getBalance(publicKey);
  const required = ROUND_COST_LAMPORTS + 10_000;
  if (balance < required) {
    throw new Error("Not enough SOL in your wallet for this payment.");
  }
}

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

/**
 * Single sign-and-send path via wallet adapter. Jupiter Wallet (and other
 * Wallet Standard wallets) use signAndSendTransaction under the hood.
 */
export async function sendRoundPayment(
  publicKey: PublicKey,
  sendTransaction:
    | ((
        transaction: Transaction,
        connection: Connection,
        options?: SendOptions
      ) => Promise<string>)
    | undefined,
  connection: Connection
): Promise<string> {
  if (!sendTransaction) {
    throw new Error("Wallet cannot send transactions.");
  }

  const prizeWallet = new PublicKey(PRIZE_WALLET);
  await assertSufficientBalance(connection, publicKey);

  const transaction = await buildTransaction(connection, publicKey, prizeWallet);

  let signature: string;
  try {
    signature = await sendTransaction(transaction, connection, {
      skipPreflight: false,
      maxRetries: 3,
      preflightCommitment: "confirmed",
    });
  } catch (err) {
    throw normalizeWalletError(err);
  }

  try {
    await pollForConfirmation(connection, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("timed out")) throw err;
    throw normalizeWalletError(err);
  }

  return signature;
}

export function formatSolAmount(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2);
}

export function getPaymentRecipient(): string {
  return PRIZE_WALLET;
}