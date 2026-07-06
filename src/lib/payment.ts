import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { PRIZE_WALLET, ROUND_COST_LAMPORTS } from "./constants";
import { getSolanaRpcEndpoint } from "./solana";

export async function sendRoundPayment(
  publicKey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const connection = new Connection(getSolanaRpcEndpoint(), "confirmed");
  const prizeWallet = new PublicKey(PRIZE_WALLET);

  let blockhash: string;
  let lastValidBlockHeight: number;

  try {
    const latest = await connection.getLatestBlockhash("confirmed");
    blockhash = latest.blockhash;
    lastValidBlockHeight = latest.lastValidBlockHeight;
  } catch {
    throw new Error(
      "Could not reach Solana RPC. Set NEXT_PUBLIC_SOLANA_RPC in .env.local (see README)."
    );
  }

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

  const signed = await signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signed.serialize());

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return signature;
}

export function formatSolAmount(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2);
}