"use client";

import { useState, useCallback } from "react";
import Chat from "./Chat";
import Header from "./Header";
import KeyConcepts from "./KeyConcepts";
import CodeEditor from "./CodeEditor";
import CodeDisplay from "./CodeDisplay";
import BuilderShell from "./BuilderShell";
import {
  KeyConceptsJsonQuizSpec,
  initialEditorText as defaultEditorText,
  initialQuizSpec as defaultQuizSpec,
  presetPillOptions,
  pillResponses,
  randomQuizTitles,
} from "@/lib/jsonQuizSpec";
import { Quiz, Chat as ChatType } from "@/lib/types";

type BuilderClientProps = {
  projectId: string;
  initialEditorText: string;
  initialQuizSpec: Quiz;
  initialChats: ChatType[];
};

export default function BuilderClient({
  projectId,
  initialEditorText,
  initialQuizSpec,
  initialChats,
}: BuilderClientProps) {
  const [editorText, setEditorText] = useState<string>(initialEditorText);
  const [error, setError] = useState<string | null>(null);
  const [quizSpec, setQuizSpec] = useState<Quiz>(initialQuizSpec);
  const [currentChats, setCurrentChats] = useState<ChatType[]>(initialChats);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

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
    }
  };

  const handleReset = () => {
    setEditorText(defaultEditorText);
    setQuizSpec(defaultQuizSpec);
    setError(null);
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/projects/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, editorText, quizSpec }),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? "Save failed");
      }
    } catch {
      setSaveError("Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [projectId, editorText, quizSpec]);

  const handleAddChat = async (chat: ChatType): Promise<void> => {
    if (chat.chatType === "pill") {
      // Pill actions: local spec mutation + canned response, no LLM
      let pillResponse: ChatType | null = null;
      let newSpec: Quiz | null = null;

      switch (chat.message) {
        case "Add a new question":
          newSpec = {
            ...quizSpec,
            questions: [
              ...quizSpec.questions,
              {
                id: crypto.randomUUID(),
                prompt: "New question",
                choices: [],
                correctIndex: 0,
              },
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
          newSpec = {
            ...quizSpec,
            questions: quizSpec.questions.map((q) => ({
              ...q,
              choices: [...q.choices, "New choice"],
            })),
          };
          pillResponse = pillResponses[2];
          break;
        case "Change the correct answer for the first question": {
          const first = quizSpec.questions[0];
          const numChoices = first?.choices.length ?? 0;
          const newCorrectIndex =
            numChoices > 0 ? Math.floor(Math.random() * numChoices) : 0;
          newSpec = {
            ...quizSpec,
            questions: quizSpec.questions.map((q, i) =>
              i === 0 ? { ...q, correctIndex: newCorrectIndex } : q
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
        setCurrentChats((prev) => [
          ...prev,
          chat,
          { ...pillResponse!, id: crypto.randomUUID() },
        ]);
        // Persist pill messages to DB (fire-and-forget)
        fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            messages: [
              { role: "user", content: chat.message },
              { role: "assistant", content: pillResponse.message },
            ],
          }),
        }).catch(() => {});
      } else {
        setCurrentChats((prev) => [...prev, chat]);
      }
    } else {
      // Freeform: call OpenAI via API
      setCurrentChats((prev) => [...prev, chat]);
      const loadingId = crypto.randomUUID();
      setCurrentChats((prev) => [
        ...prev,
        { id: loadingId, message: "…", chatType: "freeform", sender: "assistant" },
      ]);
      setIsChatLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            message: chat.message,
            editorText,
            quizSpec,
          }),
        });
        const data = await res.json();
        const responseText = res.ok
          ? (data.text ?? "No response")
          : (data.error ?? "Error getting response");

        setCurrentChats((prev) =>
          prev.map((c) =>
            c.id === loadingId ? { ...c, message: responseText } : c
          )
        );
      } catch {
        setCurrentChats((prev) =>
          prev.map((c) =>
            c.id === loadingId
              ? { ...c, message: "Failed to get response." }
              : c
          )
        );
      } finally {
        setIsChatLoading(false);
      }
    }
  };

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <BuilderShell
        header={
          <Header
            onSave={handleSave}
            isSaving={isSaving}
            saveError={saveError}
          />
        }
        leftPanel={
          <Chat
            currentChats={currentChats}
            presetPillOptions={presetPillOptions}
            onAddChat={handleAddChat}
            isLoading={isChatLoading}
          />
        }
        topRight={<KeyConcepts keyConcepts={KeyConceptsJsonQuizSpec} />}
        bottomRight={<CodeDisplay quizSpec={quizSpec} />}
        middleRight={
          <CodeEditor
            editorText={editorText}
            onChange={handleEditorTextChange}
            onReset={handleReset}
            error={error}
          />
        }
      />
    </main>
  );
}
