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
  const [quizSpec, setQuizSpec] = useState<Quiz>(initialQuizSpec);


  return (
    <main className="flex flex-col min-h-screen bg-background">
      <BuilderShell 
        header={<Header />} 
        leftPanel={<Chat />} 
        topRight={<KeyConcepts keyConcepts={KeyConceptsJsonQuizSpec} />} 
        bottomRight={<CodeDisplay quizSpec={quizSpec} />} 
        middleRight={<CodeEditor editorText={editorText} onChange={setEditorText} error={null} />}
      >
      </BuilderShell>
    </main>
  );
}
