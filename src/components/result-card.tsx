"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type ResultTitle } from "@/lib/quiz";
import { formatElapsed } from "@/lib/timer";
import { truncateAddress } from "@/lib/utils";

interface ResultCardProps {
  score: number;
  total: number;
  result: ResultTitle;
  walletAddress: string;
  elapsedMs: number;
  onPlayAgain: () => void;
}

const tierGradients: Record<ResultTitle["tier"], string> = {
  legend: "from-primary via-yellow-500 to-primary",
  chad: "from-accent to-primary",
  degen: "from-orange-500 to-primary",
  rekt: "from-red-600 to-muted-foreground",
};

export function ResultCard({
  score,
  total,
  result,
  walletAddress,
  elapsedMs,
  onPlayAgain,
}: ResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const pct = Math.round((score / total) * 100);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement("a");
      link.download = `black-bull-trivia-${score}-${total}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Failed to generate share card:", err);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div
        ref={cardRef}
        className="overflow-hidden rounded-xl border-2 border-primary/40 bg-[#0a0a0a] p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐂</span>
            <div>
              <p className="font-display text-sm font-bold text-primary">
                BLACK BULL TRIVIA
              </p>
              <p className="text-[10px] text-muted-foreground">$ANSEM Community</p>
            </div>
          </div>
          <Badge variant="gold">{pct}%</Badge>
        </div>

        <div
          className={`mb-4 rounded-lg bg-gradient-to-r ${tierGradients[result.tier]} p-[1px]`}
        >
          <div className="rounded-lg bg-[#0a0a0a] px-4 py-3 text-center">
            <p className="font-display text-xl font-bold text-primary">
              {result.title}
            </p>
          </div>
        </div>

        <div className="mb-4 text-center">
          <p className="text-5xl font-bold text-foreground">
            {score}
            <span className="text-2xl text-muted-foreground">/{total}</span>
          </p>
          <p className="mt-1 text-sm text-accent">correct answers</p>
          <p className="mt-2 font-mono text-sm text-primary">
            ⏱ {formatElapsed(elapsedMs)}
          </p>
        </div>

        <p className="mb-4 text-center text-sm italic text-muted-foreground">
          &ldquo;{result.meme}&rdquo;
        </p>

        <div className="rounded-md border border-border/50 bg-secondary/20 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Wallet
          </p>
          <p className="font-mono text-xs text-foreground">
            {truncateAddress(walletAddress, 8)}
          </p>
        </div>

      </div>

      <Card className="border-primary/20">
        <CardContent className="flex flex-col gap-3 pt-6">
          <Button
            variant="bull"
            size="lg"
            onClick={handleShare}
            disabled={isSharing}
            className="w-full"
          >
            {isSharing ? (
              "Generating..."
            ) : (
              <>
                <Share2 className="mr-2 h-4 w-4" />
                Download Share Card
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onPlayAgain} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Play Another Round
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}