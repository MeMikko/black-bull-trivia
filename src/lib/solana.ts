/** Mainnet RPC — override with NEXT_PUBLIC_SOLANA_RPC for production (Helius, QuickNode, etc.) */
const DEFAULT_MAINNET_RPC = "https://solana-rpc.publicnode.com";

export function getSolanaRpcEndpoint(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC ?? DEFAULT_MAINNET_RPC;
}