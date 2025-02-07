import { Button } from '@/components/ui/button';

interface Subject {
  value: string;
  label: string;
}

interface SubjectSelectionProps {
  onSelect: (subject: string) => void;
  subjects: Subject[];
}

export default function SubjectSelection({ onSelect, subjects }: SubjectSelectionProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-8">Select a Subject</h1>
      <div className="flex gap-4">
        {subjects.map(subject => (
          <Button
            key={subject.value}
            onClick={() => onSelect(subject.value)}
            className="px-8 py-4 text-lg"
          >
            {subject.label}
          </Button>
        ))}
      </div>
    </div>
  );
}