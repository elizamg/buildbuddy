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
import { presetPillOptions, pillResponses, randomQuizTitles } from "@/lib/jsonQuizSpec";
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
    if (chat.chatType === "pill") {
      // Add user pill + matching assistant response in one update
      let pillResponse: ChatType | null = null;
      let newSpec: Quiz | null = null;
      switch (chat.message) {
        case "Add a new question":
          newSpec = {
            ...quizSpec,
            questions: [
              ...quizSpec.questions,
              { id: crypto.randomUUID(), prompt: "New question", choices: [], correctIndex: 0 },
            ],
          };
          pillResponse = pillResponses[0];
          break;
        case "Change the quiz title": {
          const newTitle =
            randomQuizTitles[Math.floor(Math.random() * randomQuizTitles.length)];
          newSpec = { ...quizSpec, title: newTitle };
          pillResponse = pillResponses[1];
          break;
        }
        case "Add a new choice to each question":
          newSpec = { ...quizSpec, questions: quizSpec.questions.map((question) => ({ ...question, choices: [...question.choices, "New choice"] })) };
          pillResponse = pillResponses[2];
          break;
        case "Change the correct answer for the first question": {
          const first = quizSpec.questions[0];
          const numChoices = first?.choices.length ?? 0;
          const newCorrectIndex =
            numChoices > 0 ? Math.floor(Math.random() * numChoices) : 0;
          newSpec = {
            ...quizSpec,
            questions: quizSpec.questions.map((question, index) =>
              index === 0 ? { ...question, correctIndex: newCorrectIndex } : question
            ),
          };
          pillResponse = pillResponses[3];
          break;
        }
      }
      if (newSpec) {
        setQuizSpec(newSpec);
        setEditorText(JSON.stringify(newSpec, null, 2));
      }
      if (pillResponse) {
        setCurrentChats((prev) => [...prev, chat, { ...pillResponse, id: crypto.randomUUID() }]);
      } else {
        setCurrentChats((prev) => [...prev, chat]);
      }
    } else {
      setCurrentChats((prev) => [...prev, chat]);
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
