import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { PRIZE_WALLET, ROUND_COST_LAMPORTS } from "./constants";
import { getSolanaRpcEndpoint } from "./solana";

const MAX_ATTEMPTS = 3;

function isExpiredBlockhashError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("block height exceeded") ||
    msg.includes("has expired") ||
    msg.includes("Blockhash not found")
  );
}

async function waitForConfirmation(
  connection: Connection,
  signature: string,
  blockhash: string,
  lastValidBlockHeight: number
): Promise<void> {
  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }
}

async function isSignatureConfirmed(
  connection: Connection,
  signature: string
): Promise<boolean> {
  const status = await connection.getSignatureStatus(signature);
  if (!status.value) return false;
  const conf = status.value.confirmationStatus;
  return conf === "confirmed" || conf === "finalized";
}

function createTransferTransaction(
  publicKey: PublicKey,
  prizeWallet: PublicKey,
  blockhash: string,
  lastValidBlockHeight: number
): Transaction {
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

export async function sendRoundPayment(
  publicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const connection = new Connection(getSolanaRpcEndpoint(), {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60_000,
  });
  const prizeWallet = new PublicKey(PRIZE_WALLET);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let blockhash: string;
    let lastValidBlockHeight: number;

    try {
      const latest = await connection.getLatestBlockhash("finalized");
      blockhash = latest.blockhash;
      lastValidBlockHeight = latest.lastValidBlockHeight;
    } catch {
      throw new Error(
        "Could not reach Solana RPC. Set NEXT_PUBLIC_SOLANA_RPC in your environment variables."
      );
    }

    const transaction = createTransferTransaction(
      publicKey,
      prizeWallet,
      blockhash,
      lastValidBlockHeight
    );

    try {
      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signed.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3,
          preflightCommitment: "confirmed",
        }
      );

      try {
        await waitForConfirmation(
          connection,
          signature,
          blockhash,
          lastValidBlockHeight
        );
        return signature;
      } catch (confirmErr) {
        if (await isSignatureConfirmed(connection, signature)) {
          return signature;
        }
        if (isExpiredBlockhashError(confirmErr) && attempt < MAX_ATTEMPTS - 1) {
          lastError =
            confirmErr instanceof Error
              ? confirmErr
              : new Error(String(confirmErr));
          continue;
        }
        throw confirmErr;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (isExpiredBlockhashError(err) && attempt < MAX_ATTEMPTS - 1) {
        continue;
      }

      if (lastError.message.includes("User rejected")) {
        throw new Error("Transaction cancelled in wallet.");
      }

      throw lastError;
    }
  }

  throw (
    lastError ??
    new Error("Payment failed. Please try again — approve quickly in your wallet.")
  );
}

export function formatSolAmount(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2);
}