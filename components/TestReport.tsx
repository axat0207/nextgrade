import type { TestReport } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';

export default function TestReport({ report }: { report: TestReport }) {
  const timePerformanceData = report.questionsData.map((q, index) => ({
    questionNumber: index + 1,
    timeTaken: q.timeTaken,
    hintUsed: q.hintUsed ? 1 : 0,
  }));

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Test Report</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="text-xl mb-4">Summary</h2>
          <div className="space-y-2">
            <p>Total Questions: {report.totalQuestions}</p>
            <p>Correct Answers: {report.correctAnswers}</p>
            <p>Accuracy: {((report.correctAnswers / report.totalQuestions) * 100).toFixed(1)}%</p>
            <p>Hints Used: {report.hintsUsed}</p>
            <p>Time Taken: {Math.floor(report.timeTaken / 60)}:{report.timeTaken % 60}</p>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-xl mb-4">Performance Over Time</h2>
          <LineChart width={500} height={300} data={timePerformanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="questionNumber" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="timeTaken" 
              stroke="#8884d8" 
              name="Time (seconds)" 
            />
            <Line 
              type="monotone" 
              dataKey="hintUsed" 
              stroke="#82ca9d" 
              name="Hint Used" 
            />
          </LineChart>
        </Card>
      </div>
    </div>
  );
}