// components/AnalyticsPanel.tsx
import { BarChart, PieChart } from "@mui/x-charts";
import { Card } from "@/components/ui/card";
import { TestReport } from "@/types";

interface AnalyticsPanelProps {
  testReport: TestReport;
}

export default function AnalyticsPanel({ testReport }: AnalyticsPanelProps) {
  return (
    <Card className="p-4 h-fit">
      <h2 className="text-xl font-bold mb-4">Live Statistics</h2>

      <div className="mb-6">
        <h3 className="font-medium mb-2">Topic Performance</h3>
        <BarChart
          xAxis={[
            { scaleType: "band", data: Object.keys(testReport.topicStats) },
          ]}
          series={[
            {
              data: Object.values(testReport.topicStats).map(
                (ts) => ts.correct
              ),
            },
          ]}
          height={300}
        />
      </div>

      <div className="mb-6">
        <h3 className="font-medium mb-2">Accuracy</h3>
        <PieChart
          series={[
            {
              data: [
                { value: testReport.correctAnswers, label: "Correct" },
                {
                  value: testReport.totalQuestions - testReport.correctAnswers,
                  label: "Incorrect",
                },
              ],
            },
          ]}
          height={200}
        />
      </div>

      <div className="space-y-2">
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
          <span>Average Time/Question:</span>
          <span>{Math.round(testReport.averageTimePerQuestion || 0)}s</span>
        </div>
      </div>
    </Card>
  );
}
