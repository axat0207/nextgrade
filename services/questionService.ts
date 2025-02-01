import { Question, Level } from "@/types";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

const MAX_RETRIES = 3;
const BASE_DELAY = 2000;
const MAX_DELAY = 10000;
const RATE_LIMIT_DELAY = 20000;

// Enhanced cache to track generated questions per session
interface SessionCache {
  questions: Question[];
  usedQuestionTexts: Set<string>;
}

const sessionQuestionCache: Record<string, SessionCache> = {};

export async function generateQuestionBatch(
  level: Level,
  topic: string,
  grade: number,
  sessionId: string
): Promise<Question[]> {
  // Initialize session cache if not exists
  if (!sessionQuestionCache[sessionId]) {
    sessionQuestionCache[sessionId] = {
      questions: [],
      usedQuestionTexts: new Set(),
    };
  }

  const sessionCache = sessionQuestionCache[sessionId];

  const gradeTopics = {
    1: ["addition", "subtraction", "shapes", "patterns", "place value"],
    2: ["addition", "subtraction", "measurement", "money", "time"],
    3: ["multiplication", "division", "fractions", "area", "perimeter"],
    4: ["fractions", "decimals", "geometry", "measurement", "word problems"],
    5: ["decimals", "percentages", "geometry", "algebra", "data analysis"],
    6: ["ratios", "proportions", "integers", "equations", "statistics"],
  };

  // Adjust prompt based on current session's difficulty level
  const currentDifficultyAdjustment =
    sessionCache.questions.length > 0
      ? `The previous questions were at ${sessionCache.questions[0].level} difficulty. 
       Now generate questions at the ${level} difficulty while maintaining progression.`
      : "";

  const prompt = `Generate 5 diverse mathematics questions for grade ${grade}, level ${level}. 
${currentDifficultyAdjustment}

Include questions from different topics such as:
${(gradeTopics[grade as keyof typeof gradeTopics] || []).join(", ")}.

Each question should:
- Be grade-appropriate
- Progress from easier to harder while staying within ${level} difficulty
- Avoid repeating question texts from previous questions in this session
- Include clear explanations and helpful hints
- Have 4 multiple choice options where exactly one is correct
- Ensure the correctAnswer matches exactly one of the options

Format the response EXACTLY as shown in this JSON structure with an array of 5 questions:
{
  "questions": [
    {
      "questionText": "What is 8 × 7?",
      "options": ["54", "56", "48", "64"],
      "correctAnswer": "56",
      "hint": "Think of it as 8 groups of 7 or 7 groups of 8",
      "explanation": "8 × 7 = 56 because it's like having 8 groups with 7 items in each group, totaling 56"
    }
  ]
}`;

  const generateWithRetry = async (retryCount = 0): Promise<Question[]> => {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an educational question generator specializing in mathematics. Generate diverse, engaging questions that cover different mathematical concepts appropriate for the specified grade level and difficulty. Avoid repeating question texts.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("No content received from OpenAI");
      }

      const jsonStr = content.replace(/```json|```/g, "").trim();
      let response;

      try {
        response = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse OpenAI response as JSON:", e);
        throw new Error("Failed to parse OpenAI response as JSON");
      }

      if (!response.questions || !Array.isArray(response.questions)) {
        throw new Error("Invalid response structure: missing questions array");
      }

      const filteredQuestions = response.questions.filter(
        (q: Question) => !sessionCache.usedQuestionTexts.has(q.questionText)
      );

      if (filteredQuestions.length < response.questions.length) {
        throw new Error("Some questions were duplicates");
      }

      const questions = filteredQuestions.map((q: Question, index: number) => {
        if (
          !q.questionText ||
          !q.options ||
          !q.correctAnswer ||
          !q.hint ||
          !q.explanation
        ) {
          throw new Error(`Missing required fields in question ${index + 1}`);
        }

        if (!Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`Question ${index + 1} must have exactly 4 options`);
        }

        if (!q.options.includes(q.correctAnswer)) {
          throw new Error(
            `Question ${index + 1}'s correct answer (${
              q.correctAnswer
            }) is not in options: [${q.options.join(", ")}]`
          );
        }

        // Add used question text to session cache
        sessionCache.usedQuestionTexts.add(q.questionText);

        return {
          ...q,
          id: crypto.randomUUID(),
          level,
          topic,
          grade,
        };
      });

      // Update session cache
      sessionCache.questions.push(...questions);

      return questions;
    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed:`, error);

      // Check specifically for rate limit errors
      if (error instanceof Error && error.toString().includes("429")) {
        console.log("Rate limit hit, waiting longer before retry...");
        await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY));
        return generateWithRetry(retryCount);
      }

      if (retryCount < MAX_RETRIES) {
        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = BASE_DELAY * Math.pow(2, retryCount);
        const jitter = Math.random() * 1000;
        const delay = Math.min(exponentialDelay + jitter, MAX_DELAY);

        console.log(
          `Retrying in ${Math.round(delay)}ms... (${
            retryCount + 1
          }/${MAX_RETRIES})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return generateWithRetry(retryCount + 1);
      }

      throw new Error(
        `Failed to generate questions after ${MAX_RETRIES + 1} attempts: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return generateWithRetry();
}
