import { useState, useEffect, useCallback, useRef } from "react";
import { Question, TestReport } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TEST_DURATION_MINUTES } from "@/config/constants";
import { Loader2 } from "lucide-react";
import AnalyticsPanel from "@/components/AnalyticsPanel";

const DIFFICULTY_LEVELS = ["easy", "medium", "hard"];
const SUBJECT_CONFIG = {
  mathematics: {
    topics: ["numbers", "algebra", "geometry", "statistics"],
    displayNames: {
      numbers: "Numbers & Operations",
      algebra: "Algebra",
      geometry: "Geometry",
      statistics: "Statistics & Probability",
    },
  },
  english: {
    topics: ["grammar", "vocabulary", "reading"],
    displayNames: {
      grammar: "Grammar",
      vocabulary: "Vocabulary",
      reading: "Reading Comprehension",
    },
  },
};

export default function QuizInterface({
  subject,
  grade,
  onTestComplete,
}: {
  subject: keyof typeof SUBJECT_CONFIG;
  grade: number;
  onTestComplete: (report: TestReport) => void;
}) {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(
    TEST_DURATION_MINUTES * 60
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentTopic, setCurrentTopic] = useState(
    SUBJECT_CONFIG[subject].topics[0]
  );
  const [currentDifficultyIndex, setCurrentDifficultyIndex] = useState(0); // Tracks current difficulty level
  const [correctStreak, setCorrectStreak] = useState(0); // Tracks consecutive correct answers
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testCompleted, setTestCompleted] = useState(false);
  const [isAnswerProcessing, setIsAnswerProcessing] = useState(false);

  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);
  const questionStartTime = useRef(Date.now());

  const [testReport, setTestReport] = useState<TestReport>({
    totalQuestions: 0,
    correctAnswers: 0,
    hintsUsed: 0,
    timeTaken: 0,
    topicsCompleted: [],
    questionsData: [],
    topicStats: {},
    totalAttempts: 0,
    averageTimePerQuestion: 0,
    revisionNeeded: [],
  });

  const [currentQuestionStats, setCurrentQuestionStats] = useState({
    attempts: 0,
    hintUsed: false,
  });

  // Update hints used in the test report
  useEffect(() => {
    if (showHint && !currentQuestionStats.hintUsed) {
      setTestReport((prev) => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
      setCurrentQuestionStats((prev) => ({ ...prev, hintUsed: true }));
    }
  }, [showHint, currentQuestionStats.hintUsed]);

  // Fetch the next question based on current topic and difficulty
  const fetchNextQuestion = useCallback(async () => {
    if (!isMounted.current || testCompleted) return;

    setIsLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setShowHint(false);
    setShowExplanation(false);
    setCurrentQuestionStats({ attempts: 0, hintUsed: false });
    questionStartTime.current = Date.now();

    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      const level = DIFFICULTY_LEVELS[currentDifficultyIndex];
      const response = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, grade, topic: currentTopic, level }),
        signal: abortController.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();
      setCurrentQuestion(data);
      setTestReport((prev) => ({
        ...prev,
        totalQuestions: prev.totalQuestions + 1,
      }));
    } catch (error: any) {
      if (isMounted.current && error.name !== "AbortError") {
        setError(
          error instanceof Error ? error.message : "Failed to load question"
        );
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [subject, grade, currentTopic, currentDifficultyIndex, testCompleted]);

  // Initialize the quiz and fetch the first question
  useEffect(() => {
    isMounted.current = true;
    fetchNextQuestion();
    return () => {
      isMounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, []);

  // Timer for the test duration
  useEffect(() => {
    const timer =
      timeRemaining > 0 &&
      !testCompleted &&
      setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);

    if (timeRemaining === 0) setTestCompleted(true);
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeRemaining, testCompleted]);

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (
      !currentQuestion ||
      testCompleted ||
      isAnswerProcessing ||
      !selectedAnswer
    )
      return;

    setIsAnswerProcessing(true);
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const timeSpent = Math.floor(
      (Date.now() - questionStartTime.current) / 1000
    );

    setCurrentQuestionStats((prev) => ({
      attempts: prev.attempts + 1,
      hintUsed: prev.hintUsed,
    }));

    if (isCorrect) {
      // Update test report
      setTestReport((prev) => {
        const newStats = { ...prev.topicStats };
        const topicStat = newStats[currentTopic] || {
          total: 0,
          correct: 0,
          totalAttempts: 0,
          totalTime: 0,
          hintsUsed: 0,
        };

        topicStat.total++;
        topicStat.correct++;
        topicStat.totalAttempts += currentQuestionStats.attempts + 1;
        topicStat.totalTime += timeSpent;
        topicStat.hintsUsed += currentQuestionStats.hintUsed ? 1 : 0;

        return {
          ...prev,
          correctAnswers: prev.correctAnswers + 1,
          hintsUsed: prev.hintsUsed + (currentQuestionStats.hintUsed ? 1 : 0),
          totalAttempts: prev.totalAttempts + currentQuestionStats.attempts + 1,
          timeTaken: prev.timeTaken + timeSpent,
          averageTimePerQuestion:
            (prev.timeTaken + timeSpent) / (prev.totalQuestions + 1),
          questionsData: [
            ...prev.questionsData,
            {
              questionId: currentQuestion.id,
              topic: currentQuestion.topic,
              attemptsNeeded: currentQuestionStats.attempts + 1,
              hintUsed: currentQuestionStats.hintUsed,
              timeTaken: timeSpent,
              correct: true,
              difficulty: DIFFICULTY_LEVELS[currentDifficultyIndex],
            },
          ],
          topicStats: { ...newStats, [currentTopic]: topicStat },
        };
      });

      // Handle difficulty progression
      const newStreak = correctStreak + 1;
      if (newStreak >= 5) {
        if (currentDifficultyIndex < DIFFICULTY_LEVELS.length - 1) {
          // Move to next difficulty level
          setCurrentDifficultyIndex((prev) => prev + 1);
        } else {
          // Move to next topic
          const topics = SUBJECT_CONFIG[subject].topics;
          const nextIndex = (topics.indexOf(currentTopic) + 1) % topics.length;
          setCurrentTopic(topics[nextIndex]);
          setCurrentDifficultyIndex(0);
        }
        setCorrectStreak(0);
      } else {
        setCorrectStreak(newStreak);
      }

      setShowExplanation(true);
    } else {
      const newAttempts = currentQuestionStats.attempts + 1;
      if (newAttempts === 1) {
        setShowHint(true);
      } else {
        // Reset streak on final incorrect attempt
        setCorrectStreak(0);
        setTestReport((prev) => {
          const newStats = { ...prev.topicStats };
          const topicStat = newStats[currentTopic] || {
            total: 0,
            correct: 0,
            totalAttempts: 0,
            totalTime: 0,
            hintsUsed: 0,
          };

          topicStat.total++;
          topicStat.totalAttempts += newAttempts;
          topicStat.totalTime += timeSpent;
          topicStat.hintsUsed += currentQuestionStats.hintUsed ? 1 : 0;

          return {
            ...prev,
            hintsUsed: prev.hintsUsed + (currentQuestionStats.hintUsed ? 1 : 0),
            totalAttempts: prev.totalAttempts + newAttempts,
            timeTaken: prev.timeTaken + timeSpent,
            averageTimePerQuestion:
              (prev.timeTaken + timeSpent) / (prev.totalQuestions + 1),
            questionsData: [
              ...prev.questionsData,
              {
                questionId: currentQuestion.id,
                topic: currentQuestion.topic,
                attemptsNeeded: newAttempts,
                hintUsed: currentQuestionStats.hintUsed,
                timeTaken: timeSpent,
                correct: false,
                difficulty: DIFFICULTY_LEVELS[currentDifficultyIndex],
              },
            ],
            topicStats: { ...newStats, [currentTopic]: topicStat },
          };
        });
        setShowExplanation(true);
      }
    }
    setIsAnswerProcessing(false);
  }, [
    currentQuestion,
    currentTopic,
    subject,
    testCompleted,
    isAnswerProcessing,
    selectedAnswer,
    currentQuestionStats,
    currentDifficultyIndex,
    correctStreak,
  ]);

  // Handle moving to the next question
  const handleNextQuestion = useCallback(() => {
    setShowExplanation(false);
    fetchNextQuestion();
  }, [fetchNextQuestion]);

  // Notify parent component when test is completed
  useEffect(() => {
    if (testCompleted) {
      onTestComplete(testReport);
    }
  }, [testCompleted, onTestComplete, testReport]);

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="mb-4 flex justify-between items-center">
          <div className="text-lg font-bold">
            Time: {Math.floor(timeRemaining / 60)}:
            {String(timeRemaining % 60).padStart(2, "0")}
          </div>
          <div className="text-lg">
            {SUBJECT_CONFIG[subject].displayNames[currentTopic]} (Level:{" "}
            {DIFFICULTY_LEVELS[currentDifficultyIndex].replace("_", " ")})
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
            <Button onClick={fetchNextQuestion} className="mt-2">
              Retry
            </Button>
          </Alert>
        )}

        {isLoading ? (
          <Card className="p-6 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Generating question...</p>
            </div>
          </Card>
        ) : (
          currentQuestion && (
            <Card className="p-6">
              <h2
                className="text-xl mb-4"
                dangerouslySetInnerHTML={{
                  __html: currentQuestion.questionText,
                }}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option) => (
                  <Button
                    key={option}
                    onClick={() => setSelectedAnswer(option)}
                    variant={
                      showExplanation
                        ? option === currentQuestion.correctAnswer
                          ? "correct"
                          : option === selectedAnswer
                          ? "destructive"
                          : "outline"
                        : selectedAnswer === option
                        ? "default"
                        : "outline"
                    }
                    disabled={showExplanation}
                    className="p-4 text-lg"
                  >
                    <span dangerouslySetInnerHTML={{ __html: option }} />
                  </Button>
                ))}
              </div>

              {!showExplanation && (
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => setShowHint(true)}
                    disabled={showHint || !!selectedAnswer}
                    variant="outline"
                  >
                    Show Hint
                  </Button>
                  {selectedAnswer && (
                    <>
                      <Button
                        onClick={handleSubmit}
                        disabled={isAnswerProcessing}
                      >
                        Submit Answer
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedAnswer(null)}
                        disabled={isAnswerProcessing}
                      >
                        Clear Selection
                      </Button>
                    </>
                  )}
                </div>
              )}

              {showHint && (
                <Alert className="mt-4">
                  <AlertDescription>
                    <strong>Hint:</strong>{" "}
                    <span
                      dangerouslySetInnerHTML={{ __html: currentQuestion.hint }}
                    />
                  </AlertDescription>
                </Alert>
              )}

              {showExplanation && (
                <Alert className="mt-4">
                  <AlertDescription>
                    <strong>Explanation:</strong>{" "}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: currentQuestion.explanation,
                      }}
                    />
                    <Button className="mt-2" onClick={handleNextQuestion}>
                      Continue
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </Card>
          )
        )}
      </div>

      <AnalyticsPanel testReport={testReport} />
    </div>
  );
}
