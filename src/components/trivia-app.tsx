"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { StartScreen } from "@/components/start-screen";
import { QuizGame } from "@/components/quiz-game";
import { Leaderboard } from "@/components/leaderboard";
import { PrizePoolNotice } from "@/components/prize-pool-notice";
import { WalletButton } from "@/components/wallet-button";
import { createQuizRound, type QuizState } from "@/lib/quiz";
import {
  loadQuizSession,
  saveQuizSession,
  clearQuizSession,
  type RoundType,
} from "@/lib/quiz-session";

type AppView = "start" | "quiz";

export function TriviaApp() {
  const { publicKey } = useWallet();
  const [view, setView] = useState<AppView>("start");
  const [initialQuiz, setInitialQuiz] = useState<QuizState | null>(null);
  const [roundType, setRoundType] = useState<RoundType>("free");
  const [hydrated, setHydrated] = useState(false);

  const walletAddress = publicKey?.toBase58() ?? "";

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !walletAddress) return;

    const session = loadQuizSession(walletAddress);
    if (session) {
      setInitialQuiz(session.quiz);
      setRoundType(session.roundType);
      setView("quiz");
    }
  }, [hydrated, walletAddress]);

  const handleStartQuiz = useCallback(
    (type: RoundType) => {
      const quiz = createQuizRound(type);
      if (walletAddress) {
        saveQuizSession({
          wallet: walletAddress,
          quiz,
          roundType: type,
          startedAt: new Date().toISOString(),
        });
      }
      setInitialQuiz(quiz);
      setRoundType(type);
      setView("quiz");
    },
    [walletAddress]
  );

  const handleExitQuiz = useCallback(() => {
    clearQuizSession();
    setInitialQuiz(null);
    setView("start");
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="container mx-auto flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🐂</span>
          <div>
            <h1 className="font-display text-xl font-bold text-primary">
              Black Bull Trivia
            </h1>
            <p className="text-xs text-muted-foreground">$ANSEM Community</p>
          </div>
        </div>
        <WalletButton />
      </header>

      <main className="container mx-auto px-4 pb-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <section>
            {view === "quiz" && walletAddress && initialQuiz ? (
              <QuizGame
                walletAddress={walletAddress}
                initialQuiz={initialQuiz}
                roundType={roundType}
                onExit={handleExitQuiz}
              />
            ) : (
              <StartScreen onStartQuiz={handleStartQuiz} />
            )}
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Leaderboard />
            <PrizePoolNotice />
          </aside>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 text-center">
        <p className="text-xs text-muted-foreground/60">
          Built for the $ANSEM community 🐂
        </p>
      </footer>
    </div>
  );
}