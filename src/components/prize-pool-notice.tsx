"use client";

import { useState } from "react";
import { Copy, Check, PiggyBank } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DONATION_WALLET, PRIZE_POOL_PERCENT } from "@/lib/constants";

export function PrizePoolNotice() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(DONATION_WALLET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Card className="mt-4 border-accent/20 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-accent">
          <PiggyBank className="h-4 w-4" />
          Prize Pool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-primary">
            {PRIZE_POOL_PERCENT}%
          </span>{" "}
          of all paid round fees go toward next week&apos;s prizes.
        </p>
        <p>
          Want to boost the pot? Donate SOL to the wallet below —{" "}
          <span className="font-semibold text-primary">
            {PRIZE_POOL_PERCENT}%
          </span>{" "}
          of donations also go to weekly prizes.
        </p>
        <div className="rounded-md border border-border/50 bg-secondary/30 p-2.5">
          <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Donation wallet
          </p>
          <p className="break-all font-mono text-[11px] leading-relaxed text-foreground">
            {DONATION_WALLET}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 h-7 w-full text-xs"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="mr-1.5 h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3 w-3" />
                Copy address
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}