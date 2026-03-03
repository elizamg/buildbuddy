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
import { presetPillOptions } from "@/lib/jsonQuizSpec";
import { Chat as ChatType } from "@/lib/types";

export default function Home() {
  const [editorText, setEditorText] = useState<string>(initialEditorText);
  // handler that validates the editor text, strips comments, and parses the JSON. if valid, set the quiz spec, if invalid, set the error
  const [error, setError] = useState<string | null>(null);
  const [quizSpec, setQuizSpec] = useState<Quiz>(initialQuizSpec);
  const [currentChats, setCurrentChats] = useState<ChatType[]>([]);

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

  const handleAddChat = (chat: ChatType) => {
    setCurrentChats([...currentChats, chat]);
    // check if chat is a pill
    if (chat.chatType === "pill") {
      //modify the quiz spec based on the pill and modify code editor text to reflect the changes
      switch (chat.message) {
        case "Add a new question":
          setQuizSpec({ ...quizSpec, questions: [...quizSpec.questions, { id: "new", prompt: "New question", choices: [], correctIndex: 0 }] });
          setEditorText(editorText + "\n" + "  { \"prompt\": \"New question\", \"choices\": [], \"correctIndex\": 0 }");
          break;
        case "Change the quiz title":
          setQuizSpec({ ...quizSpec, title: chat.message });
          setEditorText(editorText + "\n" + "  \"title\": \"" + chat.message + "\"");
          break;
        case "Add a new choice to each question":
          setQuizSpec({ ...quizSpec, questions: quizSpec.questions.map((question) => ({ ...question, choices: [...question.choices, "New choice"] })) });
          setEditorText(editorText + "\n" + "  \"choices\": [...question.choices, \"New choice\"]");
          break;
        case "Change the correct answer for the first question":
          setQuizSpec({ ...quizSpec, questions: quizSpec.questions.map((question, index) => index === 0 ? { ...question, correctIndex: 1 } : question) });
          setEditorText(editorText + "\n" + "  \"correctIndex\": 1");
          break;
      }
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <BuilderShell 
        header={<Header />} 
        leftPanel={<Chat currentChats={currentChats} presetPillOptions={presetPillOptions} onAddChat={handleAddChat} />} 
        topRight={<KeyConcepts keyConcepts={KeyConceptsJsonQuizSpec} />} 
        bottomRight={<CodeDisplay quizSpec={quizSpec} />} 
        middleRight={<CodeEditor editorText={editorText} onChange={handleEditorTextChange} onReset={handleReset} error={error} />}
      >
      </BuilderShell>
    </main>
  );
}
