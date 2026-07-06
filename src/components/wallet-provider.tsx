"use client";

import { useMemo, type ComponentType, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { getSolanaRpcEndpoint } from "@/lib/solana";

import "@solana/wallet-adapter-react-ui/styles.css";

const RPC_ENDPOINT = getSolanaRpcEndpoint();

/** Workaround for @solana/wallet-adapter React 18/19 type mismatch */
const SolanaConnectionProvider = ConnectionProvider as ComponentType<{
  endpoint: string;
  children: ReactNode;
}>;
const SolanaWalletProvider = WalletProvider as ComponentType<{
  wallets: unknown[];
  autoConnect?: boolean;
  children: ReactNode;
}>;
const SolanaWalletModalProvider = WalletModalProvider as ComponentType<{
  children: ReactNode;
}>;

export function WalletContextProvider({ children }: { children: ReactNode }) {
  // Empty list — Wallet Standard auto-detects Jupiter, Phantom, Solflare, etc.
  const wallets = useMemo(() => [], []);

  return (
    <SolanaConnectionProvider endpoint={RPC_ENDPOINT}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <SolanaWalletModalProvider>{children}</SolanaWalletModalProvider>
      </SolanaWalletProvider>
    </SolanaConnectionProvider>
  );
}