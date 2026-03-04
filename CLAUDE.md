# BuildBuddy — Codebase Documentation

This document describes the BuildBuddy project for AI assistants and developers.

## Overview

**BuildBuddy** is a Next.js web app that lets users build and preview a **JSON Quiz** through a chat-style interface and a live code editor. The app teaches key concepts (arrays of objects, rendering choices) while users edit quiz JSON and see the quiz update in real time.

- **Tech stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, CodeMirror 6
- **App location:** `build-buddy/` (main source under `build-buddy/src/`)

## Project structure

```
buildbuddy/
├── build-buddy/                 # Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout, Geist fonts, metadata
│   │   │   ├── page.tsx         # Main page: state, handlers, BuilderShell
│   │   │   ├── globals.css      # Tailwind, CSS variables, theme, animations
│   │   │   └── components/      # UI components
│   │   └── lib/
│   │       ├── types.ts         # Shared TypeScript types
│   │       └── jsonQuizSpec.ts  # Initial quiz data, key concepts, pill options
│   ├── package.json
│   └── .env.local               # Env vars (e.g. API keys), gitignored
├── CLAUDE.md                    # This file
└── ...
```

## Key concepts (domain)

- **Quiz spec:** JSON with `title`, `pointsPerQuestion`, and `questions[]`. Each question has `id`, `prompt`, `choices[]`, `correctIndex`.
- **Chat:** Messages are either **freeform** (user types) or **pill** (preset buttons). Pill actions can mutate the quiz (add question, change title, add choice, change correct answer); the app applies the change and appends a canned assistant response.
- **Key concepts:** Carousel of educational cards (title, body, code snippet) explaining the quiz schema and React patterns.
- **Single source of truth:** The live quiz state is the parsed JSON from the editor. Editor text is validated (comments stripped, then `JSON.parse`); invalid JSON shows an error and leaves the previous `quizSpec` unchanged.

## Entry point and data flow

- **`src/app/page.tsx`** is the single page. It holds:
  - `editorText` / `setEditorText` — raw CodeMirror content
  - `error` — `"Invalid JSON"` or `null`
  - `quizSpec` — parsed `Quiz` (used by CodeDisplay and pill handlers)
  - `currentChats` — list of `Chat` messages

- **Editor → spec:** `handleEditorTextChange` strips `//` line comments, parses JSON; on success updates `quizSpec` and clears `error`; on failure sets `error` and leaves `quizSpec` as-is.

- **Chat pills → spec:** `handleAddChat` runs when a pill is clicked. It computes a new `Quiz` (and optional assistant pill response), then `setQuizSpec`, `setEditorText(JSON.stringify(newSpec, null, 2))`, and appends user + assistant chats.

- **Layout:** `BuilderShell` receives slots: `header`, `leftPanel` (Chat), `topRight` (KeyConcepts), `middleRight` (CodeEditor), `bottomRight` (CodeDisplay).

## Components

| Component       | Path                    | Purpose |
|----------------|-------------------------|--------|
| **BuilderShell** | `components/BuilderShell.tsx` | Layout: header + 2-column grid (left panel 360px, right column with top/middle/bottom slots). |
| **Header**     | `components/Header.tsx`  | Sticky bar: "BuildBuddy" and "JSON Quiz". |
| **Chat**       | `components/Chat.tsx`     | Chat UI: scrollable message list, preset pill buttons, text input + Send. Calls `onAddChat` for new messages (freeform or pill). Auto-scrolls and animates new messages (`.chat-message-enter`). |
| **CodeEditor** | `components/CodeEditor.tsx` | CodeMirror with JSON lang, Reset button. Shows `error` when present. `onChange` / `onReset` from props. |
| **CodeDisplay**| `components/CodeDisplay.tsx` | Renders `quizSpec.title` and a `QuestionCard` per question. |
| **QuestionCard** | `components/QuestionCard.tsx` | Prompt + choice buttons; click to select, shows green/red for correct/incorrect. |
| **KeyConcepts** | `components/KeyConcepts.tsx` | Carousel of key concepts with Previous/Next; each item has title, body, and `CodeBox` for code. |
| **CodeBox**     | `components/CodeBox.tsx`  | Renders a code string in a dark block (`bg-foreground text-background`, monospace). |
| **Button**      | `components/Buttons.tsx` | Reusable button: `variant` (primary/secondary/ghost), `size` (sm/md/lg), `onClick`, `disabled`. |

## Types (`src/lib/types.ts`)

- **KeyConcept:** `id`, `title`, `body`, `codeSegment`
- **Question:** `id`, `prompt`, `choices`, `correctIndex`
- **Quiz:** `title`, `pointsPerQuestion`, `questions`
- **Chat:** `id`, `message`, `chatType: "freeform" | "pill"`, `sender: "user" | "assistant"`
- **BuilderShellProps:** `header`, `leftPanel`, `topRight`, `bottomRight`, `middleRight` (all `React.ReactNode`)
- **CodeEditorProps:** `editorText`, `onChange`, `onReset`, `error?`
- **CodeDisplayProps:** `quizSpec`
- **ChatProps:** `currentChats`, `presetPillOptions`, `onAddChat`
- **ButtonProps:** `variant`, `size`, `onClick`, `children`, `disabled?`

## Data and config (`src/lib/jsonQuizSpec.ts`)

- **KeyConceptsJsonQuizSpec:** Array of `KeyConcept` for the KeyConcepts carousel.
- **initialEditorText:** Default JSON string (no comments) for the editor.
- **initialQuizSpec:** Parsed default `Quiz` in sync with `initialEditorText`.
- **randomQuizTitles:** List of titles; "Change the quiz title" pill picks one at random.
- **presetPillOptions:** User pill messages (e.g. "Add a new question", "Change the quiz title").
- **pillResponses:** Corresponding assistant messages; `handleAddChat` in `page.tsx` maps each pill action to the right response index.

## Styling and theme

- **Tailwind 4** with `@import "tailwindcss"` and `@theme inline` in `globals.css`.
- **CSS variables** in `:root`: `--background`, `--foreground`, `--bb-header-from`, `--bb-header-to`, `--bb-accent`, `--bb-border`, `--bb-panel`, etc. Mapped into Tailwind via `@theme` (e.g. `--color-accent`, `--color-panel`).
- **Fonts:** Geist Sans and Geist Mono from `next/font/google` in `layout.tsx`; CSS uses `.font-code`, `code`, `pre`, `[data-code]` for monospace.
- **Chat animation:** `@keyframes chat-fade-in` and `.chat-message-enter` for new messages.

## Scripts and env

- **Scripts:** `npm run dev` (Next dev), `npm run build`, `npm run start`, `npm run lint`.
- **Secrets:** Use `.env.local` in `build-buddy/`; do not commit. No API calls are implemented in the current code; the app is local-only (editor + pill handlers).

## Conventions

- Use `@/lib/...` and `@/app/...` for imports from `src/`.
- Components that need client state use `"use client"` (e.g. Chat, CodeEditor, KeyConcepts, QuestionCard, page).
- New IDs use `crypto.randomUUID()` for chats and new questions.
- Editor JSON is normalized with comments stripped only at parse time; stored editor text can still contain `//` lines until the next parse.
