import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { QuestionAttempt, Level, PerformanceMetrics } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsProps {
  attempts: QuestionAttempt[];
  metrics: PerformanceMetrics;
}

const PerformanceAnalytics: React.FC<AnalyticsProps> = ({
  attempts,
  metrics,
}) => {
  const timelineData = attempts.map((attempt, index) => ({
    attempt: index + 1,
    timeTaken: attempt.timeTaken,
    level: attempt.level,
    success: attempt.isCorrect ? 100 : 0,
    usedHint: attempt.usedHint ? 1 : 0,
  }));

  const levelData = Object.entries(metrics.questionsPerLevel).map(
    ([level, count]) => ({
      level: `Level ${level}`,
      questions: count,
      successRate: metrics.successRatePerLevel[level as unknown as Level] || 0,
    })
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p>Current Level: {metrics.currentLevel}</p>
              <p>
                Correct Answers: {metrics.correctAnswers}/
                {metrics.totalAttempts}
              </p>
            </div>
            <div>
              <p>Average Time: {metrics.averageTime.toFixed(1)}s</p>
              <p>Hints Used: {metrics.hintsUsed}</p>
            </div>
          </div>

          <div className="h-64">
            <LineChart width={500} height={200} data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="attempt" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="success"
                stroke="#8884d8"
                name="Success"
              />
              <Line
                type="monotone"
                dataKey="timeTaken"
                stroke="#82ca9d"
                name="Time (s)"
              />
            </LineChart>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Level Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <BarChart width={500} height={200} data={levelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="questions"
                fill="#8884d8"
                name="Questions Attempted"
              />
              <Bar dataKey="successRate" fill="#82ca9d" name="Success Rate %" />
            </BarChart>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceAnalytics;
