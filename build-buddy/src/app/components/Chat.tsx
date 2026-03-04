"use client";

import { useState, useEffect, useRef } from "react";
import { ChatProps } from "@/lib/types";

export default function Chat(
  { currentChats, presetPillOptions, onAddChat, isLoading = false }: ChatProps
) {
  const [input, setInput] = useState("");
  const prevCountRef = useRef(0);
  const chatListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    prevCountRef.current = currentChats.length;
  }, [currentChats.length]);

  useEffect(() => {
    chatListRef.current?.scrollTo({ top: chatListRef.current.scrollHeight, behavior: "smooth" });
  }, [currentChats]);

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAddChat({
      id: crypto.randomUUID(),
      message: trimmed,
      chatType: "freeform",
      sender: "user",
    });
    setInput("");
  };

  const handlePillClick = (pill: (typeof presetPillOptions)[number]) => {
    onAddChat({
      ...pill,
      id: crypto.randomUUID(),
    });
  };

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-panel text-foreground h-full p-4 shadow-sm overflow-hidden">
      <h1 className="text-xl font-bold bg-gradient-to-r from-header-from to-header-to bg-clip-text text-transparent">
        Build Buddy Chat
      </h1>

      {/* current chats */}
      <div ref={chatListRef} className="flex flex-col gap-3 min-h-0 flex-1 overflow-y-auto">
        {currentChats.length === 0 ? (
          <p className="text-sm text-foreground/60">Ask me anything about your quiz!</p>
        ) : (
          currentChats.map((chat, index) => {
            const isNew = index >= prevCountRef.current;
            const staggerDelay = isNew ? (index - prevCountRef.current) * 80 : 0;
            return (
              <div
                key={chat.id}
                data-testid="chat-message"
                className={`rounded-lg px-3 py-2 text-sm ${
                  isNew ? "chat-message-enter" : ""
                } ${
                  chat.sender === "user"
                    ? "bg-accent/15 text-accent border border-accent/30 ml-4"
                    : "bg-background border border-border mr-4"
                }`}
                style={isNew ? { animationDelay: `${staggerDelay}ms` } : undefined}
              >
                {chat.message}
              </div>
            );
          })
        )}
      </div>

      {/* preset pill options - horizontal scroll */}
      <div className="overflow-x-auto overflow-y-hidden -mx-1 px-1">
        <div className="flex gap-2 w-max">
          {presetPillOptions.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => handlePillClick(pill)}
              className="rounded-full px-4 py-2 text-sm font-medium bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:border-accent/50 active:scale-[0.98] transition-colors shrink-0 whitespace-nowrap"
            >
              {pill.message}
            </button>
          ))}
        </div>
      </div>

      {/* input to add a new chat */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isLoading}
          className="rounded-lg px-4 py-2.5 text-sm font-medium bg-accent text-white hover:bg-accent/90 active:scale-[0.98] transition-colors shrink-0 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
