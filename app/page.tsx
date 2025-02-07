'use client';
import { useState } from 'react';
import SubjectSelection from '@/components/SubjectSelection';
import QuizInterface from '@/components/QuizInterface';
import TestReport from '@/components/TestReport';
import { TestReport as TestReportType } from '@/types';

export default function Home() {
  const [subject, setSubject] = useState<keyof typeof SUBJECT_CONFIG | null>(null);
  const [grade, setGrade] = useState<number>(4); // Default grade set to 4
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [testReport, setTestReport] = useState<TestReportType | null>(null);

  const SUBJECT_CONFIG = {
    mathematics: {
      topics: ['numbers', 'algebra', 'geometry', 'statistics'],
      displayNames: {
        numbers: 'Numbers & Operations',
        algebra: 'Algebra',
        geometry: 'Geometry',
        statistics: 'Statistics & Probability'
      }
    },
    english: {
      topics: ['grammar', 'vocabulary', 'reading'],
      displayNames: {
        grammar: 'Grammar',
        vocabulary: 'Vocabulary',
        reading: 'Reading Comprehension'
      }
    }
  };

  const handleTestComplete = (report: TestReportType) => {
    setIsTestComplete(true);
    setTestReport(report);
  };

  const handleSubjectSelect = (selectedSubject: keyof typeof SUBJECT_CONFIG) => {
    setSubject(selectedSubject);
  };

  if (!subject) {
    return (
      <SubjectSelection 
        onSelect={handleSubjectSelect}
        subjects={Object.keys(SUBJECT_CONFIG).map(subjectKey => ({
          value: subjectKey,
          label: subjectKey.charAt(0).toUpperCase() + subjectKey.slice(1)
        }))}
      />
    );
  }

  if (isTestComplete && testReport) {
    return <TestReport report={testReport} />;
  }

  return (
    <QuizInterface
      subject={subject}
      grade={grade}
      onTestComplete={handleTestComplete}
    />
  );
}