import { useState, useEffect, useCallback, useRef } from "react";
import { Question, TestReport } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TEST_DURATION_MINUTES,
  CONSECUTIVE_TOPIC_CHANGE,
} from "@/config/constants";
import { Loader2 } from "lucide-react";
import AnalyticsPanel from "@/components/AnalyticsPanel";

const DIFFICULTY_LEVELS = ["very_easy", "easy", "medium", "hard"];
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
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  const [difficultyLevel, setDifficultyLevel] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [testCompleted, setTestCompleted] = useState(false);
  const [isAnswerProcessing, setIsAnswerProcessing] = useState(false);

  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);

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
  });

  const fetchNextQuestion = useCallback(async () => {
    if (!isMounted.current || testCompleted || isAnswerProcessing) return;

    setIsLoading(true);
    setError(null);
    setSelectedAnswer(null);
    setShowHint(false);
    setShowExplanation(false);
    setAttemptCount(0);

    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      const level =
        DIFFICULTY_LEVELS[
          Math.min(difficultyLevel, DIFFICULTY_LEVELS.length - 1)
        ];
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
      if (askedQuestions.has(data.id)) {
        return fetchNextQuestion();
      }

      setAskedQuestions((prev) => new Set(prev).add(data.id));
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
  }, [
    subject,
    grade,
    currentTopic,
    difficultyLevel,
    askedQuestions,
    testCompleted,
    isAnswerProcessing,
  ]);

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

  useEffect(() => {
    const timer =
      timeRemaining > 0 &&
      !testCompleted &&
      setInterval(() => {
        setTimeRemaining((prev) => {
          const newValue = Math.max(0, prev - 1);
          if (newValue === 0) setTestCompleted(true);
          return newValue;
        });
      }, 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeRemaining, testCompleted]);

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!currentQuestion || testCompleted || isAnswerProcessing) return;

      setIsAnswerProcessing(true);
      setSelectedAnswer(answer);
      const isCorrect = answer === currentQuestion.correctAnswer;
      const timeSpent = TEST_DURATION_MINUTES * 60 - timeRemaining;

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
        topicStat.totalAttempts += attemptCount + 1;
        topicStat.totalTime += timeSpent;
        topicStat.hintsUsed += showHint ? 1 : 0;
        if (isCorrect) topicStat.correct++;

        return {
          ...prev,
          correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
          hintsUsed: prev.hintsUsed + (showHint ? 1 : 0),
          totalAttempts: prev.totalAttempts + attemptCount + 1,
          timeTaken: prev.timeTaken + timeSpent,
          averageTimePerQuestion:
            (prev.timeTaken + timeSpent) / (prev.totalQuestions + 1),
          questionsData: [
            ...prev.questionsData,
            {
              questionId: currentQuestion.id,
              topic: currentQuestion.topic,
              attemptsNeeded: attemptCount + 1,
              hintUsed: showHint,
              timeTaken: timeSpent,
            },
          ],
          topicStats: { ...newStats, [currentTopic]: topicStat },
        };
      });

      if (isCorrect) {
        setConsecutiveCorrect((prev) => {
          const newCount = prev + 1;
          if (newCount >= CONSECUTIVE_TOPIC_CHANGE) {
            setCurrentTopic((prevTopic) => {
              const topics = SUBJECT_CONFIG[subject].topics;
              const nextIndex = (topics.indexOf(prevTopic) + 1) % topics.length;
              return topics[nextIndex];
            });
            setDifficultyLevel(0);
            return 0;
          }
          setDifficultyLevel(Math.min(newCount, DIFFICULTY_LEVELS.length - 1));
          return newCount;
        });

        setTimeout(() => {
          setIsAnswerProcessing(false);
          fetchNextQuestion();
        }, 1500);
      } else {
        setConsecutiveCorrect(0);
        setDifficultyLevel(0);
        setAttemptCount((prev) => prev + 1);

        if (attemptCount === 0) {
          setShowHint(true);
        } else {
          setShowExplanation(true);
        }
        setIsAnswerProcessing(false);
      }
    },
    [
      currentQuestion,
      attemptCount,
      showHint,
      currentTopic,
      subject,
      fetchNextQuestion,
      testCompleted,
      timeRemaining,
      isAnswerProcessing,
    ]
  );

  const handleNextQuestion = useCallback(() => {
    setShowExplanation(false);
    fetchNextQuestion();
  }, [fetchNextQuestion]);

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
            {SUBJECT_CONFIG[subject].displayNames[currentTopic]}
            (Level: {DIFFICULTY_LEVELS[difficultyLevel].replace("_", " ")})
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
                    onClick={() => handleAnswer(option)}
                    disabled={!!selectedAnswer || isAnswerProcessing}
                    variant={
                      selectedAnswer === option
                        ? option === currentQuestion.correctAnswer
                          ? "default"
                          : "destructive"
                        : "outline"
                    }
                    className="p-4 text-lg"
                  >
                    <span dangerouslySetInnerHTML={{ __html: option }} />
                  </Button>
                ))}
              </div>

              {showHint && (
                <Alert className="mt-4">
                  <AlertDescription
                    dangerouslySetInnerHTML={{ __html: currentQuestion.hint }}
                  />
                </Alert>
              )}

              {showExplanation && (
                <Alert className="mt-4">
                  <AlertDescription>
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
