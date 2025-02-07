// components/AnalyticsPanel.tsx
import { BarChart, PieChart } from "@mui/x-charts";
import { Card } from "@/components/ui/card";
import { TestReport } from "@/types";
import { DIFFICULTY_LEVELS } from "@/config/constants";

interface AnalyticsPanelProps {
  testReport: TestReport;
}

export default function AnalyticsPanel({ testReport }: AnalyticsPanelProps) {
  // Calculate topic-wise accuracy with difficulty consideration
  const topicStats = Object.entries(testReport.topicStats).map(
    ([topic, stats]) => ({
      topic,
      accuracy: (stats.correct / stats.total) * 100 || 0,
      hintsUsed: stats.hintsUsed,
      incorrect: stats.total - stats.correct,
      averageTime: stats.totalTime / stats.total || 0,
    })
  );

  // Calculate revision needed topics with difficulty levels
  const revisionMap = testReport.questionsData
    .filter((q) => !q.correct)
    .reduce((acc, q) => {
      const key = `${q.topic}_${q.difficulty}`;
      if (!acc[key]) {
        acc[key] = {
          topic: q.topic,
          difficulty: q.difficulty,
          count: 0,
        };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { topic: string; difficulty: string; count: number }>);

  const revisionNeeded = Object.values(revisionMap)
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      label: `${entry.topic}: ${entry.difficulty.replace("_", " ")}`,
      count: entry.count,
    }));

  // Calculate actual incorrect counts (questions not attempts)
  const incorrectCounts = testReport.questionsData.reduce((acc, q) => {
    if (!q.correct) acc[q.topic] = (acc[q.topic] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="p-4 h-fit">
      <h2 className="text-xl font-bold mb-4">Live Statistics</h2>

      {/* Topic Performance Bar Chart */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">Topic Performance</h3>
        <BarChart
          xAxis={[{ scaleType: "band", data: topicStats.map((t) => t.topic) }]}
          series={[
            { data: topicStats.map((t) => t.accuracy), label: "Accuracy (%)" },
            { data: topicStats.map((t) => t.hintsUsed), label: "Hints Used" },
            {
              data: topicStats.map((t) => incorrectCounts[t.topic] || 0),
              label: "Incorrect Questions",
            },
          ]}
          height={300}
        />
      </div>

      {/* Accuracy Pie Chart */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">Overall Accuracy</h3>
        <PieChart
          series={[
            {
              data: [
                {
                  value: testReport.correctAnswers,
                  label: "Correct",
                  color: "#4CAF50",
                },
                {
                  value: testReport.totalQuestions - testReport.correctAnswers,
                  label: "Incorrect",
                  color: "#F44336",
                },
              ],
              innerRadius: 30,
            },
          ]}
          height={200}
        />
      </div>

      {/* Key Metrics */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between">
          <span>Total Questions:</span>
          <span>{testReport.totalQuestions}</span>
        </div>
        <div className="flex justify-between">
          <span>Correct Answers:</span>
          <span>{testReport.correctAnswers}</span>
        </div>
        <div className="flex justify-between">
          <span>Hints Used:</span>
          <span>{testReport.hintsUsed}</span>
        </div>
        <div className="flex justify-between">
          <span>Avg Time/Question:</span>
          <span>{Math.round(testReport.averageTimePerQuestion)}s</span>
        </div>
      </div>

      {/* Revision Needed */}
      <div className="mb-6">
        <h3 className="font-medium mb-2">Revision Needed</h3>
        {revisionNeeded.length > 0 ? (
          <ul className="list-disc pl-5">
            {revisionNeeded.map((item, i) => (
              <li key={i} className="text-red-600">
                {item.label} ({item.count} questions)
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No topics need revision yet.</p>
        )}
      </div>

      {/* Topic-wise Breakdown */}
      <div>
        <h3 className="font-medium mb-2">Topic-wise Breakdown</h3>
        <div className="space-y-2">
          {topicStats.map((topic) => (
            <div key={topic.topic} className="p-3 border rounded-lg">
              <h4 className="font-medium">{topic.topic}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className="font-medium">
                    {topic.accuracy.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hints Used:</span>
                  <span className="font-medium">{topic.hintsUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Incorrect:</span>
                  <span className="font-medium">
                    {incorrectCounts[topic.topic] || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Time:</span>
                  <span className="font-medium">
                    {Math.round(topic.averageTime)}s
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
