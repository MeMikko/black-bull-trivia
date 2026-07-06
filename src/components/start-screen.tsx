"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Coins, Gift, Loader2, Play, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WalletButton } from "@/components/wallet-button";
import { ROUND_COST_SOL } from "@/lib/constants";
import { getPaymentRecipient, sendRoundPayment } from "@/lib/payment";
import { checkFreeRoundAvailable, claimFreeRound } from "@/lib/free-round";
import { getNextMondayReset, getCurrentWeekId } from "@/lib/weekly";
import {
  addPaidRoundCredit,
  consumePaidRoundCredit,
  getUnusedPaidCreditCount,
} from "@/lib/round-credits";
import { getTotalQuestionCount } from "@/lib/quiz";
import type { RoundType } from "@/lib/quiz-session";
import { useToast } from "@/hooks/use-toast";

interface StartScreenProps {
  onStartQuiz: (roundType: RoundType) => void;
}

function PaymentDetails({ walletName }: { walletName?: string }) {
  const recipient = getPaymentRecipient();

  return (
    <div className="rounded-md border border-border/50 bg-secondary/30 p-3 text-xs text-muted-foreground">
      <p>
        You send{" "}
        <span className="font-semibold text-primary">{ROUND_COST_SOL} SOL</span>{" "}
        to the prize pool for one extra round.
      </p>
      <p className="mt-1.5 break-all font-mono text-[10px] leading-relaxed text-foreground/80">
        {recipient}
      </p>
      <p className="mt-2 text-[11px]">
        {walletName === "Jupiter"
          ? "Jupiter scans new sites with HyperNative. If you see a red warning, choose \"I know what I'm doing\" — this app only requests a simple SOL transfer, not token approvals."
          : "Your wallet may warn on new sites — this is a simple SOL transfer, not a token approval. Safe to confirm if you trust this app."}
      </p>
    </div>
  );
}

export function StartScreen({ onStartQuiz }: StartScreenProps) {
  const { publicKey, connected, sendTransaction, wallet } = useWallet();
  const walletName = wallet?.adapter.name;
  const { connection } = useConnection();
  const { toast } = useToast();
  const [freeAvailable, setFreeAvailable] = useState(false);
  const [freeRoundSource, setFreeRoundSource] = useState<"server" | "local">(
    "local"
  );
  const [paidCredits, setPaidCredits] = useState(0);
  const [isPaying, setIsPaying] = useState(false);
  const [isClaimingFree, setIsClaimingFree] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [resetDate, setResetDate] = useState("");

  const walletAddress = publicKey?.toBase58() ?? "";

  const refreshAvailability = useCallback(async () => {
    if (!walletAddress) {
      setFreeAvailable(false);
      setPaidCredits(0);
      setFreeRoundSource("local");
      return;
    }

    setAvailabilityLoading(true);
    try {
      const { available, source } = await checkFreeRoundAvailable(walletAddress);
      setFreeAvailable(available);
      setFreeRoundSource(source);
      setPaidCredits(getUnusedPaidCreditCount(walletAddress));
    } finally {
      setAvailabilityLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void refreshAvailability();
    setResetDate(
      getNextMondayReset().toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }) + " UTC"
    );
  }, [refreshAvailability]);

  const handleFreeRound = async () => {
    if (!walletAddress || isClaimingFree) return;

    setIsClaimingFree(true);
    try {
      const result = await claimFreeRound(walletAddress);
      if (!result.ok) {
        setFreeAvailable(false);
        toast({
          title: "Free round already used",
          description: "This wallet played its free round this week.",
          variant: "destructive",
        });
        return;
      }

      setFreeAvailable(false);
      setFreeRoundSource(result.source);
      onStartQuiz("free");
      toast({
        title: "Free round activated! 🐂",
        description: "Good luck, bull.",
      });
    } finally {
      setIsClaimingFree(false);
    }
  };

  const handlePurchasedRound = () => {
    if (!walletAddress) return;
    if (!consumePaidRoundCredit(walletAddress)) {
      toast({
        title: "No purchased rounds",
        description: "Buy a new round to continue.",
        variant: "destructive",
      });
      void refreshAvailability();
      return;
    }
    setPaidCredits((c) => Math.max(0, c - 1));
    onStartQuiz("paid");
    toast({
      title: "Purchased round activated! 🐂",
      description: "Good luck, bull.",
    });
  };

  const handlePaidRound = async () => {
    if (!publicKey || !connection || !sendTransaction) {
      toast({
        title: "Wallet not ready",
        description: "Please connect a wallet that supports transactions.",
        variant: "destructive",
      });
      return;
    }

    setIsPaying(true);
    try {
      const signature = await sendRoundPayment(
        publicKey,
        sendTransaction,
        connection
      );
      addPaidRoundCredit(walletAddress, signature);
      if (!consumePaidRoundCredit(walletAddress)) {
        throw new Error("Failed to activate purchased round");
      }
      await refreshAvailability();
      onStartQuiz("paid");
      toast({
        title: "Payment confirmed! 🎉",
        description: `Tx: ${signature.slice(0, 8)}...`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Transaction failed";
      toast({
        title: "Payment failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-lg border-primary/30 bg-card/80 backdrop-blur-sm animate-pulse-gold">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 text-5xl">🐂</div>
        <CardTitle className="font-display text-3xl text-primary">
          Black Bull Trivia
        </CardTitle>
        <CardDescription className="text-base">
          Test your $ANSEM knowledge. Charge forward, degen.
        </CardDescription>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Badge variant="gold">10 questions / round</Badge>
          <Badge variant="green">{getTotalQuestionCount()} total questions</Badge>
          <Badge variant="outline">{getCurrentWeekId()}</Badge>
          <Badge variant="outline">Mainnet</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <WalletButton />
        </div>

        {!connected ? (
          <p className="text-center text-sm text-muted-foreground">
            Connect your Solana wallet to play
          </p>
        ) : (
          <>
            <Separator />

            {paidCredits > 0 && (
              <Button
                variant="bull"
                size="lg"
                className="w-full"
                onClick={handlePurchasedRound}
              >
                <Ticket className="mr-2 h-5 w-5" />
                Play Purchased Round ({paidCredits} left)
              </Button>
            )}

            {availabilityLoading ? (
              <Button variant="bull" size="lg" className="w-full" disabled>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Checking free round...
              </Button>
            ) : freeAvailable ? (
              <Button
                variant="bull"
                size="lg"
                className="w-full"
                onClick={() => void handleFreeRound()}
                disabled={isClaimingFree}
              >
                {isClaimingFree ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Starting round...
                  </>
                ) : (
                  <>
                    <Gift className="mr-2 h-5 w-5" />
                    Play Free Weekly Round
                  </>
                )}
              </Button>
            ) : paidCredits === 0 ? (
              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  Free round used this week. Resets {resetDate}.
                </p>
                <PaymentDetails walletName={walletName} />
                <Button
                  variant="bull"
                  size="lg"
                  className="w-full"
                  onClick={handlePaidRound}
                  disabled={isPaying}
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing payment...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-5 w-5" />
                      Pay {ROUND_COST_SOL} SOL for New Round
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <PaymentDetails walletName={walletName} />
                <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handlePaidRound}
                disabled={isPaying}
              >
                {isPaying ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing payment...
                  </>
                ) : (
                  <>
                    <Coins className="mr-2 h-5 w-5" />
                    Buy Another Round ({ROUND_COST_SOL} SOL)
                  </>
                )}
              </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              disabled
            >
              <Play className="mr-2 h-4 w-4" />
              {availabilityLoading
                ? "Checking weekly free round..."
                : freeAvailable
                  ? freeRoundSource === "server"
                    ? "1 free round available (tracked globally)"
                    : "1 free round available this week"
                  : paidCredits > 0
                    ? `${paidCredits} purchased round(s) ready`
                    : `Extra rounds: ${ROUND_COST_SOL} SOL each`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}