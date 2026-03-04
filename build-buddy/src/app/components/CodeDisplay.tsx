import { CodeDisplayProps as CodeDisplayProps } from "@/lib/types";
import { useState } from "react";
import Button from "./Buttons";
import QuestionCard from "./QuestionCard";

export default function CodeDisplay(
  { quizSpec }: CodeDisplayProps
) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  return (
    <div className="flex flex-col gap-4 rounded-md p-4 bg-panel text-foreground">
      <h1 data-testid="quiz-title" className="text-xl text-header-from font-bold"> {quizSpec.title} </h1>
      <div className="flex flex-col gap-4"> 
        {(quizSpec.questions ?? []).map((question) => (
          <QuestionCard key={question.id} question={question} correctIndex={question.correctIndex} />
        ))}
      </div>

    </div>
  );
}
