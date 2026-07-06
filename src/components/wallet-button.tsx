"use client";

import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        className="wallet-adapter-button"
        disabled
        aria-label="Loading wallet"
      >
        Connect Wallet
      </button>
    ),
  }
);

export function WalletButton() {
  return <WalletMultiButton />;
}