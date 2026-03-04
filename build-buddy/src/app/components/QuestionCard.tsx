"use client";

import { useState } from "react";
import { QuestionCardProps as QuestionCardProps } from "@/lib/types";

export default function QuestionCard(
  { question, correctIndex }: QuestionCardProps
) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleAnswer = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  const getButtonClass = (index: number) => {
    const base =
      "w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors border-2 ";
    if (selectedIndex === null) {
      return `${base} border-border bg-panel text-foreground hover:border-accent hover:bg-accent/5`;
    }
    if (index === selectedIndex) {
      return index === correctIndex
        ? `${base} border-green-600 bg-green-600 text-white shadow-sm`
        : `${base} border-red-600 bg-red-600 text-white shadow-sm`;
    }
    return `${base} border-border bg-panel text-foreground hover:border-accent hover:bg-accent/5`;
  };

  return (
    <div data-testid="question-card" className="flex flex-col gap-4 rounded-xl border border-border bg-panel p-5 text-foreground shadow-sm">
      <div className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
        {question.prompt}
      </div>
      <div className="flex flex-col gap-2">
        {question.choices.map((choice, index) => (
          <button
            key={index}
            type="button"
            className={getButtonClass(index)}
            onClick={() => handleAnswer(index)}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}