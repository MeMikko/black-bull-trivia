import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  type TransactionSignature,
} from "@solana/web3.js";
import { PRIZE_WALLET, ROUND_COST_LAMPORTS } from "./constants";

const CONFIRM_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 1_500;

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isSignatureError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Missing signature") ||
    msg.includes("Signature verification failed") ||
    msg.includes("not signed") ||
    msg.includes("block height exceeded") ||
    msg.includes("has expired")
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

function buildTransferInstruction(publicKey: PublicKey, prizeWallet: PublicKey) {
  return SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: prizeWallet,
    lamports: ROUND_COST_LAMPORTS,
  });
}

function assertFeePayerSigned(
  transaction: Transaction,
  publicKey: PublicKey
): void {
  const entry = transaction.signatures.find((s) =>
    s.publicKey.equals(publicKey)
  );
  if (!entry?.signature) {
    throw new Error(
      "Wallet did not sign the transaction. Please try again in your wallet app."
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

/** Mobile-friendly: sign in wallet, then broadcast immediately */
async function sendViaSignTransaction(
  publicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  connection: Connection,
  prizeWallet: PublicKey
): Promise<TransactionSignature> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    feePayer: publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(buildTransferInstruction(publicKey, prizeWallet));

  const signed = await signTransaction(transaction);
  assertFeePayerSigned(signed, publicKey);

  return connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: true,
    maxRetries: 5,
  });
}

/** Desktop: wallet fills blockhash and broadcasts */
async function sendViaSendTransaction(
  publicKey: PublicKey,
  sendTransaction: (
    transaction: Transaction,
    connection: Connection
  ) => Promise<TransactionSignature>,
  connection: Connection,
  prizeWallet: PublicKey
): Promise<TransactionSignature> {
  const transaction = new Transaction().add(
    buildTransferInstruction(publicKey, prizeWallet)
  );
  transaction.feePayer = publicKey;

  return sendTransaction(transaction, connection);
}

export async function sendRoundPayment(
  publicKey: PublicKey,
  sendTransaction:
    | ((transaction: Transaction, connection: Connection) => Promise<string>)
    | undefined,
  signTransaction:
    | ((transaction: Transaction) => Promise<Transaction>)
    | undefined,
  connection: Connection
): Promise<string> {
  const prizeWallet = new PublicKey(PRIZE_WALLET);
  const mobile = isMobileBrowser();

  let signature: string;
  let lastError: Error | null = null;

  const trySign = async () => {
    if (!signTransaction) throw new Error("Wallet cannot sign transactions.");
    return sendViaSignTransaction(
      publicKey,
      signTransaction,
      connection,
      prizeWallet
    );
  };

  const trySend = async () => {
    if (!sendTransaction) throw new Error("Wallet cannot send transactions.");
    return sendViaSendTransaction(
      publicKey,
      sendTransaction,
      connection,
      prizeWallet
    );
  };

  const attempts = mobile
    ? [trySign, trySend]
    : [trySend, trySign];

  for (const attempt of attempts) {
    try {
      signature = await attempt();
      lastError = null;
      break;
    } catch (err) {
      lastError = normalizeWalletError(err);
      if (lastError.message.includes("cancelled")) throw lastError;
      if (!isSignatureError(err)) throw lastError;
    }
  }

  if (lastError) throw lastError;

  try {
    await pollForConfirmation(connection, signature!);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("timed out")) throw err;
    throw normalizeWalletError(err);
  }

  return signature!;
}

export function formatSolAmount(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2);
}