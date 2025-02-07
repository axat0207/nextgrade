// types.ts
export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  hint: string;
  explanation: string;
  level: string;
  topic: string;
  grade: number;
}

// types.ts (or wherever your types are defined)
export interface TestReport {
  totalQuestions: number;
  correctAnswers: number;
  hintsUsed: number;
  timeTaken: number;
  topicsCompleted: string[];
  questionsData: {
    questionId: string;
    topic: string;
    attemptsNeeded: number;
    hintUsed: boolean;
    timeTaken: number;
    correct: boolean; // Add this
    difficulty: string; // Add this
  }[];
  topicStats: {
    [topic: string]: {
      total: number;
      correct: number;
      totalAttempts: number;
      totalTime: number;
      hintsUsed: number;
    };
  };
  totalAttempts: number;
  averageTimePerQuestion: number;
  revisionNeeded: string[];
}
