"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  answerQuestion,
  getResultTitle,
  type QuizState,
} from "@/lib/quiz";
import { claimFreeRound } from "@/lib/free-round";
import { submitScore } from "@/lib/leaderboard";
import {
  saveQuizSession,
  clearQuizSession,
  type RoundType,
} from "@/lib/quiz-session";
import { formatElapsed, getElapsedMs } from "@/lib/timer";
import { ResultCard } from "@/components/result-card";
import { QUESTIONS_PER_ROUND } from "@/lib/constants";

interface QuizGameProps {
  walletAddress: string;
  initialQuiz: QuizState;
  roundType: RoundType;
  startedAtMs: number;
  onExit: () => void;
}

export function QuizGame({
  walletAddress,
  initialQuiz,
  roundType,
  startedAtMs,
  onExit,
}: QuizGameProps) {
  const [quiz, setQuiz] = useState<QuizState>(initialQuiz);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(() => getElapsedMs(startedAtMs));
  const [finalElapsedMs, setFinalElapsedMs] = useState<number | null>(null);

  useEffect(() => {
    if (quiz.isComplete || finalElapsedMs !== null) return;

    const tick = () => setElapsedMs(getElapsedMs(startedAtMs));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startedAtMs, quiz.isComplete, finalElapsedMs]);

  useEffect(() => {
    if (!quiz.isComplete) {
      saveQuizSession({
        wallet: walletAddress,
        quiz,
        roundType,
        startedAt: new Date(startedAtMs).toISOString(),
        startedAtMs,
      });
    }
  }, [quiz, walletAddress, roundType, startedAtMs]);

  const currentQuestion = quiz.questions[quiz.currentIndex];
  const progress = quiz.isComplete
    ? 100
    : (quiz.currentIndex / QUESTIONS_PER_ROUND) * 100;

  const displayElapsed = finalElapsedMs ?? elapsedMs;

  const handleSelect = (index: number) => {
    if (showFeedback || quiz.isComplete) return;

    setSelectedIndex(index);
    setShowFeedback(true);

    setTimeout(() => {
      const newState = answerQuestion(quiz, index);
      setQuiz(newState);
      setSelectedIndex(null);
      setShowFeedback(false);

      if (newState.isComplete) {
        const completedMs = getElapsedMs(startedAtMs);
        setFinalElapsedMs(completedMs);
        clearQuizSession();
        const result = getResultTitle(newState.score, newState.questions.length);
        if (roundType === "free") {
          void claimFreeRound(walletAddress);
        }
        void submitScore(
          walletAddress,
          newState.score,
          newState.questions.length,
          result.title,
          completedMs
        );
      }
    }, 800);
  };

  const handlePlayAgain = () => {
    clearQuizSession();
    onExit();
  };

  if (quiz.isComplete && finalElapsedMs !== null) {
    const result = getResultTitle(quiz.score, quiz.questions.length);
    return (
      <ResultCard
        score={quiz.score}
        total={quiz.questions.length}
        result={result}
        walletAddress={walletAddress}
        elapsedMs={finalElapsedMs}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  const isCorrect =
    selectedIndex !== null &&
    selectedIndex === currentQuestion.correctIndex;

  return (
    <Card className="mx-auto w-full max-w-2xl border-primary/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Question {quiz.currentIndex + 1} of {QUESTIONS_PER_ROUND}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 font-mono tabular-nums text-primary"
            >
              <Clock className="h-3 w-3" />
              {formatElapsed(displayElapsed)}
            </Badge>
            <Badge variant="green">Score: {quiz.score}</Badge>
          </div>
        </div>
        <Progress value={progress} className="mt-2" />
        <p className="mt-1 text-xs text-muted-foreground">
          Faster time wins ties on the leaderboard
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentQuestion.category && (
          <Badge variant="gold" className="text-[10px] uppercase">
            {currentQuestion.category}
          </Badge>
        )}

        <p className="text-lg font-medium leading-relaxed">
          {currentQuestion.question}
        </p>

        <div className="grid gap-3">
          {currentQuestion.options.map((option, index) => {
            let variant: "default" | "outline" | "bull" | "destructive" =
              "outline";

            if (showFeedback && selectedIndex === index) {
              variant = isCorrect ? "bull" : "destructive";
            } else if (
              showFeedback &&
              index === currentQuestion.correctIndex
            ) {
              variant = "bull";
            }

            return (
              <Button
                key={option}
                variant={variant}
                size="lg"
                className="h-auto min-h-12 justify-start whitespace-normal px-4 py-3 text-left"
                onClick={() => handleSelect(index)}
                disabled={showFeedback}
              >
                <span className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
              </Button>
            );
          })}
        </div>

        {showFeedback && (
          <p
            className={`text-center text-sm font-semibold ${
              isCorrect ? "text-accent" : "text-destructive"
            }`}
          >
            {isCorrect ? "Correct! Bull run continues 🐂" : "Wrong! Paper hands detected 📄"}
          </p>
        )}

        <div className="flex justify-end">
          <ChevronRight className="h-5 w-5 animate-pulse text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}