import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const { topic, grade } = await request.json();

  const prompt = `Generate a grade ${grade} mathematics question on the topic of ${topic}.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const question = response.choices[0].message.content;

  return NextResponse.json({ question });
}
