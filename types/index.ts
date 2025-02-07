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

export interface TestReport {
  totalQuestions: number;
  correctAnswers: number;
  hintsUsed: number;
  timeTaken: number;
  topicsCompleted: string[];
  questionsData: Array<{
    questionId: string;
    topic: string;
    attemptsNeeded: number;
    hintUsed: boolean;
    timeTaken: number;
  }>;
  topicStats: {
    [key: string]: {
      total: number;
      correct: number;
      totalAttempts: number;
      totalTime: number;
      hintsUsed: number;
    };
  };
  totalAttempts: number;
  averageTimePerQuestion: number;
  revisionNeeded: Array<{ topic: string; level: string }>;
}
