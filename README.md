# BuildBuddy

Depoloyed Link: https://buildbuddydep.vercel.app

BuildBuddy was inspired by tutoring a young student I’ve worked with for several years who started learning programming at a very young age. One challenge I consistently noticed is that beginners often struggle to understand the fundamental concepts behind code, and with the rise of AI coding tools, this challenge is becoming even more significant: students can now generate working code quickly, but that doesn’t necessarily mean they understand how or why it works. This raises a broader question about how people should learn programming in a world where AI can write code. Instead of focusing only on generating solutions, learners need tools that help them experiment with program structure, observe how changes affect behavior, and ask questions about what the code is doing. BuildBuddy explores this idea by providing a simple environment where users can interact with structured program definitions and receive explanations about them. In the current MVP, I implemented a lesson centered around JSON and structured data, where a quiz is defined through a JSON specification that includes fields like the title, questions, answer choices, and correct answers. Users can modify this specification in a code editor, see a live preview of how the quiz behaves, and ask an AI assistant questions about the code or quiz structure, with the assistant designed to explain concepts rather than automatically modify the program.


---

## Authorship Statement

I (Eliza) did not work on this project with any collaborators. I authored the bulk of the froend code with minimal contributions from Cursor/ ChatGPT. I used on Claude for the backend setup and test suite creation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database / Auth | Supabase (PostgreSQL + magic-link auth) |
| LLM | OpenAI `gpt-4o-mini` |
| Code Editor | CodeMirror 6 with JSON linting |
| E2E Tests | Playwright |
| Unit Tests | Vitest |

---

## Architecture

```
src/
├── proxy.ts               # Session refresh + auth redirects (Next.js 16 proxy convention)
├── app/
│   ├── page.tsx           # Server component — loads project state + chat history from DB
│   ├── login/page.tsx     # Magic-link login form
│   ├── auth/callback/     # Supabase PKCE callback handler
│   ├── components/
│   │   ├── BuilderClient.tsx  # Root client component — owns all mutable state
│   │   ├── Chat.tsx           # Chat panel (freeform + pill messages)
│   │   ├── CodeEditor.tsx     # CodeMirror JSON editor
│   │   ├── CodeDisplay.tsx    # Rendered quiz preview
│   │   └── ...
│   └── api/
│       ├── chat/route.ts           # Calls OpenAI, persists user + assistant messages
│       ├── messages/route.ts       # Persists pill messages without an LLM call
│       └── projects/save/route.ts  # Saves editor text + parsed spec to DB
└── lib/
    ├── supabase/
    │   ├── browser.ts   # Browser Supabase client (auth only)
    │   ├── server.ts    # Server Supabase client (cookie-based sessions)
    │   └── admin.ts     # Service-role client (bypasses RLS for server ops)
    ├── types.ts
    └── jsonQuizSpec.ts  # Default quiz, pill definitions, canned responses
```

### Data flow

1. **Page load** — `page.tsx` (server component) authenticates the user, loads or creates a project, fetches `project_state` (editor text + spec JSON) and the last 20 `chat_messages`, then renders `BuilderClient` with those as props.
2. **Editor changes** — `BuilderClient` re-parses the JSON on every keystroke; valid JSON updates the live quiz preview instantly (client-side only until saved).
3. **Save** — `POST /api/projects/save` writes `editor_text` and `spec_json` to the `project_state` table.
4. **Freeform chat** — `POST /api/chat` inserts the user message, calls OpenAI with the current quiz context, inserts the assistant reply, and returns the text.
5. **Pill actions** — handled entirely client-side (spec mutation + canned response); both messages are then persisted via `POST /api/messages` (fire-and-forget).

### Database schema

```sql
-- One project per user (expandable to many)
create table projects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users,
  created_at timestamptz default now()
);

-- Stores the last-saved editor state
create table project_state (
  project_id  uuid not null references projects,
  user_id     uuid not null references auth.users,
  editor_text text,
  spec_json   jsonb
);

-- Full chat history (both freeform and pill messages)
create table chat_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects,
  user_id     uuid not null references auth.users,
  role        text not null,   -- 'user' | 'assistant'
  content     text not null,
  created_at  timestamptz default now()
);
```

---

## Local Development

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project with the schema above applied
- An [OpenAI](https://platform.openai.com) API key

### 1. Clone and install

```bash
git clone <repo-url>
cd build-buddy
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY
```

### 3. Run the dev server

```bash
npm run dev
# → http://localhost:3000
```

---

## Running Tests

### Unit tests

```bash
npm run test:unit
```

### E2E tests (Playwright)

E2E tests require a running dev server and a real Supabase project.

```bash
# 1. Copy and fill in the test env file
cp .env.test.local.example .env.test.local
# Fill in SUPABASE_SERVICE_ROLE_KEY and TEST_USER_EMAIL

# 2. Run all E2E tests (starts the dev server automatically)
npm run test:e2e

# Interactive UI
npm run test:e2e:ui
```

The Playwright global setup creates a confirmed test user via the Supabase admin API and saves the auth cookies to `playwright/.auth/user.json`. All builder tests reuse this stored session.

---

## Deploying to Vercel

1. **Push to GitHub** and import the repo in the [Vercel dashboard](https://vercel.com/new).
2. **Set environment variables** in Project Settings → Environment Variables:

   | Variable | Required | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Safe to expose to the browser |
   | `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side only — never exposed to browser |
   | `OPENAI_API_KEY` | Yes | Server-side only |

3. **Deploy** — Vercel will run `next build` automatically. No `vercel.json` is needed; the project uses Next.js defaults.

> **Note:** The `/api/test/session` route is guarded by `NODE_ENV === 'production'` and returns 403 in production. It is used only by the Playwright E2E auth setup.

---

## Design Decisions

### Admin client for all server-side DB operations
Supabase Row Level Security (RLS) requires database policies to be configured before queries succeed. Rather than maintaining RLS policies on every table, all server-side DB operations (API routes and server components) use a service-role admin client that bypasses RLS entirely. Auth is verified via the session client *before* any admin call is made, so the security boundary is preserved.

### Two representations of quiz state: `editor_text` + `spec_json`
The editor stores raw text (which may be invalid JSON mid-edit) while `spec_json` is the last successfully parsed version. Both are saved together. On load, `editor_text` is used to populate the editor (preserving formatting and comments), and `spec_json` is used for the initial preview render without re-parsing.

### LLM as read-only assistant
The system prompt explicitly instructs the model not to suggest mutations to the spec or return structured JSON. The chat response is rendered as plain text and never parsed — there is no code path by which an LLM reply can modify `editorText` or `quizSpec`.

### Pill actions are client-side with async DB persistence
Preset pill actions (add question, change title, etc.) apply their changes synchronously in React state for instant feedback. The resulting chat messages are then written to the DB via a fire-and-forget `POST /api/messages` request — the UI never waits for this to complete.

### Single worker in E2E tests
Playwright is configured with `workers: 1` to avoid race conditions when multiple tests share the same Supabase project and database rows (e.g. the same `project_state` row). Tests run serially to ensure predictable DB state.
