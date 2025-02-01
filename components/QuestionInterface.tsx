import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Timer, HelpCircle, AlertCircle, Loader } from "lucide-react";
import { QuestionAttempt, Level, SessionState } from "@/types";
import { generateQuestionBatch } from "@/services/questionService";
import PerformanceAnalytics from "./PerformanceChart";

const QUESTION_TIME_LIMIT = 60;
const CONSECUTIVE_CORRECT_FOR_LEVEL_UP = 7;

const initialMetrics: SessionState["metrics"] = {
  correctAnswers: 0,
  totalAttempts: 0,
  averageTime: 0,
  hintsUsed: 0,
  timeoutsExpired: 0,
  currentLevel: 1,
  questionsPerLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  successRatePerLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  unattemptedQuestions: 0,
  consecutiveCorrect: 0,
};

const QuestionInterface: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionReady, setQuestionReady] = useState(false);

  const [sessionState, setSessionState] = useState<SessionState>({
    currentBatch: null,
    attempts: [],
    timeRemaining: QUESTION_TIME_LIMIT,
    metrics: initialMetrics,
    isSessionActive: false,
    currentQuestionTimer: QUESTION_TIME_LIMIT,
    showHint: false,
    showExplanation: false,
  });

  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [startTime, setStartTime] = useState<number>(0);
  const [currentAttempt, setCurrentAttempt] = useState<number>(1);

  const handleTimeExpired = useCallback(() => {
    if (
      !sessionState.currentBatch?.questions[
        sessionState.currentBatch.currentIndex
      ]
    )
      return;

    const currentQuestion =
      sessionState.currentBatch.questions[
        sessionState.currentBatch.currentIndex
      ];

    setSessionState((prev) => ({
      ...prev,
      showExplanation: true,
      attempts: [
        ...prev.attempts,
        {
          questionId: currentQuestion.id,
          isCorrect: false,
          timeTaken: QUESTION_TIME_LIMIT,
          usedHint: prev.showHint,
          numberOfAttempts: currentAttempt,
          level: currentQuestion.level,
          attemptedAt: new Date(),
          timeoutExpired: true,
        },
      ],
      metrics: {
        ...prev.metrics,
        timeoutsExpired: prev.metrics.timeoutsExpired + 1,
        unattemptedQuestions: prev.metrics.unattemptedQuestions + 1,
        consecutiveCorrect: 0,
      },
    }));

    setTimeout(() => {
      moveToNextQuestion(false);
    }, 3000);
  }, [currentAttempt, sessionState.currentBatch]);

  const loadQuestionBatch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setQuestionReady(false);

    try {
      const questions = await generateQuestionBatch(
        sessionState.metrics.currentLevel,
        "multiplication",
        5,
        "easy"
      );

      setSessionState((prev) => ({
        ...prev,
        currentBatch: {
          questions,
          currentIndex: 0,
          level: prev.metrics.currentLevel,
        },
        currentQuestionTimer: QUESTION_TIME_LIMIT,
        showHint: false,
        showExplanation: false,
      }));

      setStartTime(Date.now());
      setSelectedAnswer("");
      setCurrentAttempt(1);

      // Set question ready after a small delay to ensure render
      setTimeout(() => setQuestionReady(true), 100);
    } catch (error) {
      setError("Failed to load questions. Please try again.");
      console.error("Failed to load questions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionState.metrics.currentLevel]);

  useEffect(() => {
    if (
      sessionState.isSessionActive &&
      !sessionState.currentBatch &&
      !isLoading
    ) {
      loadQuestionBatch();
    }
  }, [
    sessionState.isSessionActive,
    sessionState.currentBatch,
    loadQuestionBatch,
    isLoading,
  ]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (
      sessionState.isSessionActive &&
      questionReady &&
      sessionState.currentQuestionTimer > 0 &&
      !sessionState.showExplanation
    ) {
      timer = setInterval(() => {
        setSessionState((prev) => ({
          ...prev,
          currentQuestionTimer: prev.currentQuestionTimer - 1,
        }));
      }, 1000);
    } else if (sessionState.currentQuestionTimer === 0) {
      handleTimeExpired();
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [
    sessionState.isSessionActive,
    sessionState.currentQuestionTimer,
    questionReady,
    sessionState.showExplanation,
    handleTimeExpired,
  ]);

  const moveToNextQuestion = useCallback(
    (wasCorrect: boolean) => {
      setQuestionReady(false);
      setSessionState((prev) => {
        if (!prev.currentBatch) return prev;

        const needsNewBatch =
          (wasCorrect &&
            prev.metrics.consecutiveCorrect >=
              CONSECUTIVE_CORRECT_FOR_LEVEL_UP) ||
          prev.currentBatch.currentIndex ===
            prev.currentBatch.questions.length - 1;

        if (needsNewBatch) {
          loadQuestionBatch();
          return prev;
        }

        return {
          ...prev,
          currentBatch: {
            ...prev.currentBatch,
            currentIndex: prev.currentBatch.currentIndex + 1,
          },
          currentQuestionTimer: QUESTION_TIME_LIMIT,
          showHint: false,
          showExplanation: false,
        };
      });

      setSelectedAnswer("");
      setStartTime(Date.now());
      setCurrentAttempt(1);

      // Set question ready after a small delay to ensure render
      setTimeout(() => setQuestionReady(true), 100);
    },
    [loadQuestionBatch]
  );

  const handleAnswerSubmit = useCallback(() => {
    if (
      !sessionState.currentBatch?.questions[
        sessionState.currentBatch.currentIndex
      ]
    )
      return;

    const currentQuestion =
      sessionState.currentBatch.questions[
        sessionState.currentBatch.currentIndex
      ];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    if (!isCorrect && currentAttempt === 1) {
      setSessionState((prev) => ({ ...prev, showHint: true }));
      setCurrentAttempt(2);
      return;
    }

    const newAttempt: QuestionAttempt = {
      questionId: currentQuestion.id,
      isCorrect,
      timeTaken,
      usedHint: sessionState.showHint,
      numberOfAttempts: currentAttempt,
      level: currentQuestion.level,
      attemptedAt: new Date(),
      timeoutExpired: false,
    };

    const newConsecutiveCorrect = isCorrect
      ? sessionState.metrics.consecutiveCorrect + 1
      : 0;

    let newLevel = sessionState.metrics.currentLevel;
    if (
      newConsecutiveCorrect >= CONSECUTIVE_CORRECT_FOR_LEVEL_UP &&
      newLevel < 5
    ) {
      newLevel = (newLevel + 1) as Level;
    }

    const updatedQuestionsPerLevel = {
      ...sessionState.metrics.questionsPerLevel,
      [currentQuestion.level]:
        sessionState.metrics.questionsPerLevel[currentQuestion.level] + 1,
    };

    const levelAttempts =
      sessionState.attempts.filter((a) => a.level === currentQuestion.level)
        .length + 1;

    const levelSuccesses =
      sessionState.attempts.filter(
        (a) => a.level === currentQuestion.level && a.isCorrect
      ).length + (isCorrect ? 1 : 0);

    const updatedSuccessRatePerLevel = {
      ...sessionState.metrics.successRatePerLevel,
      [currentQuestion.level]: (levelSuccesses / levelAttempts) * 100,
    };

    setSessionState((prev) => ({
      ...prev,
      attempts: [...prev.attempts, newAttempt],
      metrics: {
        ...prev.metrics,
        correctAnswers: prev.metrics.correctAnswers + (isCorrect ? 1 : 0),
        totalAttempts: prev.metrics.totalAttempts + 1,
        averageTime:
          (prev.metrics.averageTime * prev.metrics.totalAttempts + timeTaken) /
          (prev.metrics.totalAttempts + 1),
        hintsUsed: prev.metrics.hintsUsed + (sessionState.showHint ? 1 : 0),
        currentLevel: newLevel,
        questionsPerLevel: updatedQuestionsPerLevel,
        successRatePerLevel: updatedSuccessRatePerLevel,
        consecutiveCorrect: newConsecutiveCorrect,
      },
      showExplanation: !isCorrect,
    }));

    if (!isCorrect) {
      setTimeout(() => {
        moveToNextQuestion(false);
      }, 3000);
    } else {
      moveToNextQuestion(true);
    }
  }, [
    currentAttempt,
    moveToNextQuestion,
    selectedAnswer,
    sessionState,
    startTime,
  ]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentQuestion = useCallback(() => {
    return sessionState.currentBatch?.questions[
      sessionState.currentBatch.currentIndex
    ];
  }, [sessionState.currentBatch]);

  const startSession = () => {
    setSessionState((prev) => ({
      ...prev,
      isSessionActive: true,
      currentQuestionTimer: QUESTION_TIME_LIMIT,
    }));
  };

  const currentQuestion = getCurrentQuestion();

  if (error) {
    return (
      <Card className="max-w-4xl mx-auto p-4">
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-center text-red-500">{error}</p>
          <Button onClick={() => loadQuestionBatch()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">
              Mathematics Practice - Level {sessionState.metrics.currentLevel}
            </CardTitle>
            {questionReady && (
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                <span className="font-mono">
                  {formatTime(sessionState.currentQuestionTimer)}
                </span>
              </div>
            )}
          </div>
          {questionReady && (
            <Progress
              value={
                (sessionState.currentQuestionTimer / QUESTION_TIME_LIMIT) * 100
              }
              className="w-full"
            />
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4 p-8">
              <Loader className="h-8 w-8 animate-spin" />
              <p>Loading questions...</p>
            </div>
          ) : !sessionState.isSessionActive ? (
            <Button onClick={startSession}>Start Session</Button>
          ) : currentQuestion ? (
            <div className="space-y-6">
              <div className="text-lg font-medium">
                {currentQuestion.questionText}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {currentQuestion.options.map((option, idx) => (
                  <Button
                    key={idx}
                    variant={selectedAnswer === option ? "default" : "outline"}
                    className="w-full justify-start p-4"
                    onClick={() => setSelectedAnswer(option)}
                    disabled={sessionState.showExplanation}
                  >
                    {option}
                  </Button>
                ))}
              </div>

              {sessionState.showHint && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="h-4 w-4" />
                    <span className="font-medium">Hint:</span>
                  </div>
                  <p className="text-sm">{currentQuestion.hint}</p>
                </div>
              )}

              {sessionState.showExplanation && (
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Explanation:</span>
                  </div>
                  <p className="text-sm">{currentQuestion.explanation}</p>
                  <p className="mt-2 font-medium">
                    Correct answer: {currentQuestion.correctAnswer}
                  </p>
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setSessionState((prev) => ({ ...prev, showHint: true }))
                  }
                  disabled={
                    sessionState.showHint || sessionState.showExplanation
                  }
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Show Hint
                </Button>
                <Button
                  onClick={handleAnswerSubmit}
                  disabled={!selectedAnswer || sessionState.showExplanation}
                >
                  Submit Answer
                </Button>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Progress</h3>
                <div className="text-sm text-muted-foreground">
                  Consecutive Correct: {sessionState.metrics.consecutiveCorrect}
                  /{CONSECUTIVE_CORRECT_FOR_LEVEL_UP}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {sessionState.attempts.length > 0 && (
        <div className="mt-8">
          <PerformanceAnalytics
            attempts={sessionState.attempts}
            metrics={sessionState.metrics}
          />
        </div>
      )}
    </div>
  );
};

export default QuestionInterface;
