import type { QuizState, RoundType } from "./quiz";

export type { RoundType };

const QUIZ_SESSION_KEY = "black-bull-quiz-session";

export interface QuizSession {
  wallet: string;
  quiz: QuizState;
  roundType: RoundType;
  startedAt: string;
  startedAtMs: number;
}

export function saveQuizSession(session: QuizSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(session));
}

export function loadQuizSession(wallet: string): QuizSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(QUIZ_SESSION_KEY);
    if (!raw) return null;
    const session: QuizSession = JSON.parse(raw);
    if (session.wallet !== wallet || session.quiz.isComplete) return null;

    if (!session.startedAtMs) {
      session.startedAtMs = Date.parse(session.startedAt) || Date.now();
    }

    return session;
  } catch {
    return null;
  }
}

export function clearQuizSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(QUIZ_SESSION_KEY);
}