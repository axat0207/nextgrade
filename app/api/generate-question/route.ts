import { NextResponse } from "next/server";
import OpenAI from "openai";
import { Question } from "@/types";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const SUBJECT_TOPICS = {
  mathematics: {
    numbers: ["addition", "subtraction", "multiplication", "division"],
    algebra: ["equations", "expressions", "patterns"],
    geometry: ["shapes", "angles", "measurements"],
    statistics: ["data", "graphs", "probability"],
  },
  english: {
    grammar: ["parts of speech", "sentence structure", "punctuation"],
    vocabulary: ["synonyms", "antonyms", "context clues"],
    reading: ["comprehension", "main idea", "details"],
  },
};

const requestSchema = z.object({
  subject: z.enum(["mathematics", "english"]),
  grade: z.number().min(1).max(12),
  topic: z.string(),
  level: z.enum(["very_easy", "easy", "medium", "hard"]),
});

let usedQuestionIds = new Set<string>();

setInterval(() => {
  usedQuestionIds = new Set();
}, 24 * 60 * 60 * 1000);

function formatMathContent(text: string): string {
  return text
    .replace(/\\\(|\\\)/g, "") // Remove LaTeX delimiters
    .replace(/\*/g, "×") // Replace * with ×
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const { subject, grade, topic, level } = validationResult.data;
    const normalizedSubject = subject.toLowerCase();
    const normalizedTopic = topic.toLowerCase();

    const subjectData =
      SUBJECT_TOPICS[normalizedSubject as keyof typeof SUBJECT_TOPICS];
    if (!subjectData || !Object.keys(subjectData).includes(normalizedTopic)) {
      return NextResponse.json(
        { error: `Invalid subject or topic combination` },
        { status: 400 }
      );
    }

    const prompt = `Create a ${level.replace(
      "_",
      " "
    )} difficulty ${normalizedSubject} question for grade ${grade} students.
    Main Topic: ${normalizedTopic}
       Subtopics: ${(
         subjectData[normalizedTopic as keyof typeof subjectData] as string[]
       ).join(", ")}
    
    Requirements:
    - Do not use LaTeX delimiters (\\( and \\))
    - Use × instead of * for multiplication
    - Keep mathematical expressions simple and readable
    - Provide clear, step-by-step explanations
    
    Return ONLY JSON:
    {
      "id": "unique-uuid",
      "questionText": "question without LaTeX delimiters",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "exact matching option",
      "hint": "helpful clue without direct answer",
      "explanation": "step-by-step solution",
      "level": "${level}",
      "topic": "${normalizedTopic}",
      "grade": ${grade}
    }`;

    let questionData: Question | null = null;
    let retryCount = 0;

    while (!questionData && retryCount < 3) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are an education AI. Return valid JSON with clean mathematical formatting.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) continue;

        const parsedData = JSON.parse(content);
        const uniqueId = crypto.randomUUID();

        if (usedQuestionIds.has(uniqueId)) {
          retryCount++;
          continue;
        }

        parsedData.id = uniqueId;
        parsedData.questionText = formatMathContent(parsedData.questionText);
        parsedData.options = parsedData.options.map(formatMathContent);
        parsedData.correctAnswer = formatMathContent(parsedData.correctAnswer);
        parsedData.explanation = formatMathContent(parsedData.explanation);

        if (validateQuestion(parsedData)) {
          questionData = parsedData;
          usedQuestionIds.add(uniqueId);
          break;
        }
      } catch (err) {
        retryCount++;
      }
    }

    if (!questionData) {
      return NextResponse.json(
        { error: "Failed to generate valid question" },
        { status: 500 }
      );
    }

    return NextResponse.json(questionData);
  } catch (error) {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

function validateQuestion(question: any): question is Question {
  const requiredFields = [
    "id",
    "questionText",
    "options",
    "correctAnswer",
    "hint",
    "explanation",
    "level",
    "topic",
    "grade",
  ];

  return (
    requiredFields.every((field) => question[field]) &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.includes(question.correctAnswer) &&
    typeof question.grade === "number" &&
    question.questionText.length > 0 &&
    question.hint.length > 0 &&
    question.explanation.length > 0
  );
}
