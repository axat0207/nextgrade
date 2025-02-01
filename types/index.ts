export type Level = 1 | 2 | 3 | 4 | 5;

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  hint: string;
  explanation: string;
  level: Level;
}

export interface QuestionAttempt {
  questionId: string;
  isCorrect: boolean;
  timeTaken: number;
  usedHint: boolean;
  numberOfAttempts: number;
  level: Level;
  attemptedAt: Date;
  timeoutExpired: boolean;
}

export interface SessionMetrics {
  correctAnswers: number;
  totalAttempts: number;
  averageTime: number;
  hintsUsed: number;
  timeoutsExpired: number;
  currentLevel: Level;
  questionsPerLevel: Record<Level, number>;
  successRatePerLevel: Record<Level, number>;
  unattemptedQuestions: number;
  consecutiveCorrect: number;
}

export interface SessionState {
  currentBatch: {
    questions: Question[];
    currentIndex: number;
    level: Level;
  } | null;
  attempts: QuestionAttempt[];
  timeRemaining: number;
  metrics: SessionMetrics;
  isSessionActive: boolean;
  currentQuestionTimer: number;
  showHint: boolean;
  showExplanation: boolean;
}
