"use client";

import { KeyConceptsProps as KeyConceptsProps } from "@/lib/types";
import { useState } from "react";
import CodeBox from "./CodeBox";
import Button from "./Buttons";

export default function KeyConcepts(
  { keyConcepts }: KeyConceptsProps
) {
  const [currentKeyConcept, setCurrentKeyConcept] = useState(0);
  const handleNextKeyConcept = () => {
    setCurrentKeyConcept(currentKeyConcept + 1);
  }
  const handlePreviousKeyConcept = () => {
    setCurrentKeyConcept(currentKeyConcept - 1);
  }
  const canGoPrevious = currentKeyConcept > 0;
  const canGoNext = currentKeyConcept < keyConcepts.length - 1;
  if (keyConcepts.length === 0) {
    return (
        <div>No key concepts found</div>
    );
  }
  return (
    <div className="flex flex-col gap-4 rounded-md p-4 bg-panel text-foreground">
      <h1 className="text-xl text-header-from font-bold">Key Concepts</h1>
      {/* carosel of key concepts */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">{keyConcepts[currentKeyConcept].title}</h2>
        <div className="text-sm whitespace-pre-line">{keyConcepts[currentKeyConcept].body}</div>
        <CodeBox code={keyConcepts[currentKeyConcept].codeSegment} />
        <div className="flex items-center justify-between">
          <Button variant="primary" size="md" onClick={handlePreviousKeyConcept} disabled={!canGoPrevious}>Previous</Button>
          <Button variant="primary" size="md" onClick={handleNextKeyConcept} disabled={!canGoNext}>Next</Button>
        </div>
      </div>
      
    </div>
  );
}