"use client";

import { useCallback, useEffect, useState } from "react";
import { Trophy, Medal, Clock, Globe, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getWeeklyLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import { formatElapsed } from "@/lib/timer";
import { truncateAddress } from "@/lib/utils";
import { getCurrentWeekId } from "@/lib/weekly";

const medalColors = ["text-primary", "text-muted-foreground", "text-accent"];

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [source, setSource] = useState<"server" | "local">("local");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getWeeklyLeaderboard(10);
    setEntries(result.entries);
    setSource(result.source);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" />
            Weekly Leaderboard
          </CardTitle>
          <Badge variant="gold">{getCurrentWeekId()}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <p className="text-xs text-muted-foreground">
            Ties broken by fastest time
          </p>
          {source === "server" ? (
            <Badge variant="green" className="gap-1 text-[10px]">
              <Globe className="h-2.5 w-2.5" />
              Global
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Smartphone className="h-2.5 w-2.5" />
              This device only
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading scores...
          </p>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No scores yet this week. Be the first bull to charge!
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry, i) => (
              <li
                key={`${entry.wallet}-${entry.playedAt}`}
                className="flex items-center gap-3 rounded-md border border-border/50 bg-secondary/30 px-3 py-2.5"
              >
                <span className="flex w-6 items-center justify-center">
                  {i < 3 ? (
                    <Medal className={`h-4 w-4 ${medalColors[i]}`} />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm">
                    {truncateAddress(entry.wallet, 6)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.title}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant="green">
                    {entry.score}/{entry.total}
                  </Badge>
                  {entry.elapsedMs !== undefined && (
                    <span className="flex items-center gap-0.5 font-mono text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {formatElapsed(entry.elapsedMs)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={refresh}
          className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-primary"
        >
          Refresh leaderboard
        </button>
      </CardContent>
    </Card>
  );
}