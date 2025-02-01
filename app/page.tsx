// app/page.tsx
"use client";

// import { useState } from "react";
import QuestionInterface from "@/components/QuestionInterface";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Adaptive Learning Platform
        </h1>
        <QuestionInterface />
      </div>
    </main>
  );
}
