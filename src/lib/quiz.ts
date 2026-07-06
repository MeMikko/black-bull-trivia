import questionsData from "@/data/questions.json";
import { QUESTIONS_PER_ROUND } from "./constants";
import { getCurrentWeekId } from "./weekly";
export type RoundType = "free" | "paid";

export interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  category?: string;
}

export interface QuizState {
  questions: Question[];
  currentIndex: number;
  score: number;
  answers: (number | null)[];
  isComplete: boolean;
}

export interface ResultTitle {
  title: string;
  meme: string;
  tier: "legend" | "chad" | "degen" | "rekt";
}

const allQuestions: Question[] = questionsData as Question[];

/** Fisher-Yates shuffle (random — for paid rounds) */
function shuffleRandom<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

/** Seeded Fisher-Yates — same seed = same order for everyone */
function shuffleSeeded<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let state = seed;

  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function selectQuestions(roundType: RoundType): Question[] {
  if (roundType === "free") {
    const weekId = getCurrentWeekId();
    const seed = hashString(`black-bull-free-${weekId}`);
    return shuffleSeeded(allQuestions, seed).slice(0, QUESTIONS_PER_ROUND);
  }
  return shuffleRandom(allQuestions).slice(0, QUESTIONS_PER_ROUND);
}

export function createQuizRound(roundType: RoundType): QuizState {
  const selected = selectQuestions(roundType);

  return {
    questions: selected,
    currentIndex: 0,
    score: 0,
    answers: new Array(selected.length).fill(null),
    isComplete: false,
  };
}

export function answerQuestion(
  state: QuizState,
  selectedIndex: number
): QuizState {
  if (state.isComplete) return state;

  const isCorrect =
    selectedIndex === state.questions[state.currentIndex].correctIndex;

  const newAnswers = [...state.answers];
  newAnswers[state.currentIndex] = selectedIndex;

  const newScore = isCorrect ? state.score + 1 : state.score;
  const nextIndex = state.currentIndex + 1;
  const isComplete = nextIndex >= state.questions.length;

  return {
    ...state,
    answers: newAnswers,
    score: newScore,
    currentIndex: isComplete ? state.currentIndex : nextIndex,
    isComplete,
  };
}

export function getResultTitle(score: number, total: number): ResultTitle {
  const pct = score / total;

  if (pct >= 0.9) {
    return {
      title: "Diamond Hand Bull",
      meme: "You held through every question like a true $ANSEM believer. Wen lambo? Now.",
      tier: "legend",
    };
  }
  if (pct >= 0.7) {
    return {
      title: "Charge Forward Champion",
      meme: "The bull charges, the chart pumps, and your brain is mostly green candles.",
      tier: "chad",
    };
  }
  if (pct >= 0.5) {
    return {
      title: "Stimmy Legend",
      meme: "Not quite alpha, not quite rekt. Living that stimmy check lifestyle.",
      tier: "degen",
    };
  }
  if (pct >= 0.3) {
    return {
      title: "Paper Hand Panda",
      meme: "You folded faster than a leverage long on a bad CPI print.",
      tier: "degen",
    };
  }
  return {
    title: "Exit Liquidity Enjoyer",
    meme: "Sir, this is a trivia app. You just became the liquidity.",
    tier: "rekt",
  };
}

export function getTotalQuestionCount(): number {
  return allQuestions.length;
}