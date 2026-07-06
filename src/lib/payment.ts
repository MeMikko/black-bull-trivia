import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  type SendOptions,
} from "@solana/web3.js";
import { PRIZE_WALLET, ROUND_COST_LAMPORTS } from "./constants";

const CONFIRM_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_500;
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);
const PAYMENT_MEMO = "Black Bull Trivia: paid round";

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
  })
    .add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: prizeWallet,
        lamports: ROUND_COST_LAMPORTS,
      })
    )
    .add(
      new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(PAYMENT_MEMO, "utf8"),
      })
    );
}

async function assertTransactionWillSucceed(
  connection: Connection,
  transaction: Transaction
): Promise<void> {
  const simulation = await connection.simulateTransaction(transaction);

  if (simulation.value.err) {
    const detail = JSON.stringify(simulation.value.err);
    if (detail.includes("InsufficientFundsForRent") || detail.includes("0x1")) {
      throw new Error("Not enough SOL in your wallet for this payment.");
    }
    throw new Error(
      "Transaction could not be verified. Refresh the page and try again."
    );
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
 * Wallet adapter sendTransaction — Phantom uses signAndSendTransaction.
 * Pre-simulate so Phantom is less likely to show a malicious-tx warning.
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
  const transaction = await buildTransaction(connection, publicKey, prizeWallet);

  const balance = await connection.getBalance(publicKey);
  const required = ROUND_COST_LAMPORTS + 10_000;
  if (balance < required) {
    throw new Error("Not enough SOL in your wallet for this payment.");
  }

  await assertTransactionWillSucceed(connection, transaction);

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