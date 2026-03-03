"use client";

import Chat from "./components/Chat";
import Header from "./components/Header";
import KeyConcepts from "./components/KeyConcepts";
import CodeEditor from "./components/CodeEditor";
import CodeDisplay from "./components/CodeDisplay";
import BuilderShell from "./components/BuilderShell";
import { KeyConceptsJsonQuizSpec } from "@/lib/jsonQuizSpec";
import { initialEditorText } from "@/lib/jsonQuizSpec";
import { useState } from "react";
import { Quiz } from "@/lib/types";
import { initialQuizSpec } from "@/lib/jsonQuizSpec";

export default function Home() {
  const [editorText, setEditorText] = useState<string>(initialEditorText);
  // handler that validates the editor text, strips comments, and parses the JSON. if valid, set the quiz spec, if invalid, set the error
  const [error, setError] = useState<string | null>(null);
  const [quizSpec, setQuizSpec] = useState<Quiz>(initialQuizSpec);
  const handleEditorTextChange = (text: string) => {
    setEditorText(text);
    const strippedText = text.replace(/(\/\/.*$)/gm, "");
    try {
      const parsedJson = JSON.parse(strippedText);
      if (parsedJson) {
        setQuizSpec(parsedJson);
        setError(null);
      }
    } catch {
      setError("Invalid JSON");
      // do not call setQuizSpec — quizSpec keeps its previous value
    }
  };

  const handleReset = () => {
    setEditorText(initialEditorText);
    setQuizSpec(initialQuizSpec);
    setError(null);
  };

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <BuilderShell 
        header={<Header />} 
        leftPanel={<Chat />} 
        topRight={<KeyConcepts keyConcepts={KeyConceptsJsonQuizSpec} />} 
        bottomRight={<CodeDisplay quizSpec={quizSpec} />} 
        middleRight={<CodeEditor editorText={editorText} onChange={handleEditorTextChange} onReset={handleReset} error={error} />}
      >
      </BuilderShell>
    </main>
  );
}
