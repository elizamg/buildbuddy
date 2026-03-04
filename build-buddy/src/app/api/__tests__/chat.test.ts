import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted mocks: must be defined before vi.mock factories run ─────────────
// vi.hoisted() runs at hoist time so these are available inside vi.mock() factories.

const { mockCreate, mockGetUser, mockInsert } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockGetUser: vi.fn(),
  mockInsert: vi.fn(),
}))

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({ insert: mockInsert })),
  })),
}))

// OpenAI is module-level: `const openai = new OpenAI(...)` in the route.
// The mock must be a constructor (function, not arrow function).
vi.mock('openai', () => ({
  default: vi.fn(function (this: Record<string, unknown>) {
    this.chat = { completions: { create: mockCreate } }
  }),
}))

// ─── Import route AFTER mocks are registered ─────────────────────────────────

import { POST } from '@/app/api/chat/route'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AUTHED = { data: { user: { id: 'user-123' } } }
const UNAUTHED = { data: { user: null } }

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'AI response text' } }],
    })
  })

  // ── Auth ──────────────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue(UNAUTHED)
      const res = await POST(
        makeRequest({ projectId: 'p1', message: 'hi', editorText: '{}', quizSpec: {} })
      )
      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized' })
    })

    it('does not call OpenAI when unauthenticated', async () => {
      mockGetUser.mockResolvedValue(UNAUTHED)
      await POST(makeRequest({ projectId: 'p1', message: 'hi', editorText: '{}', quizSpec: {} }))
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('does not insert messages when unauthenticated', async () => {
      mockGetUser.mockResolvedValue(UNAUTHED)
      await POST(makeRequest({ projectId: 'p1', message: 'hi', editorText: '{}', quizSpec: {} }))
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  // ── Validation ────────────────────────────────────────────────────────────

  describe('input validation', () => {
    it('returns 400 when projectId is missing', async () => {
      mockGetUser.mockResolvedValue(AUTHED)
      const res = await POST(makeRequest({ message: 'hi', editorText: '{}', quizSpec: {} }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Missing required fields')
    })

    it('returns 400 when message is missing', async () => {
      mockGetUser.mockResolvedValue(AUTHED)
      const res = await POST(makeRequest({ projectId: 'p1', editorText: '{}', quizSpec: {} }))
      expect(res.status).toBe(400)
    })
  })

  // ── OpenAI call ───────────────────────────────────────────────────────────

  describe('OpenAI integration', () => {
    it('calls OpenAI with gpt-4o-mini model', async () => {
      mockGetUser.mockResolvedValue(AUTHED)
      await POST(makeRequest({ projectId: 'p1', message: 'hi', editorText: '{}', quizSpec: {} }))
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o-mini' }))
    })

    it('includes user question and quizSpec in the user message', async () => {
      mockGetUser.mockResolvedValue(AUTHED)
      const quizSpec = { title: 'Science Quiz', pointsPerQuestion: 5, questions: [] }

      await POST(
        makeRequest({
          projectId: 'p1',
          message: 'What is the title?',
          editorText: JSON.stringify(quizSpec),
          quizSpec,
        })
      )

      const { messages } = mockCreate.mock.calls[0][0]
      const userMsg = messages.find((m: { role: string }) => m.role === 'user')
      expect(userMsg.content).toContain('What is the title?')
      expect(userMsg.content).toContain('Science Quiz')
    })

    it('system prompt prohibits spec modification', async () => {
      mockGetUser.mockResolvedValue(AUTHED)
      await POST(makeRequest({ projectId: 'p1', message: 'hi', editorText: '{}', quizSpec: {} }))
      const { messages } = mockCreate.mock.calls[0][0]
      const sys = messages.find((m: { role: string }) => m.role === 'system')
      expect(sys.content).toMatch(/do not modify/i)
    })

    it('returns only { text } — never quizSpec or editorText', async () => {
      mockGetUser.mockResolvedValue(AUTHED)
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'The title is Animal Quiz.' } }],
      })

      const res = await POST(
        makeRequest({ projectId: 'p1', message: 'hi', editorText: '{}', quizSpec: {} })
      )

      expect(res.status).toBe(200)
      const body = await res.json()
      // ARCHITECTURE INVARIANT: LLM response cannot mutate client state
      expect(body).toEqual({ text: 'The title is Animal Quiz.' })
      expect(body).not.toHaveProperty('quizSpec')
      expect(body).not.toHaveProperty('editorText')
      expect(body).not.toHaveProperty('spec_json')
    })

    it('returns "No response" when OpenAI returns empty choices', async () => {
      mockGetUser.mockResolvedValue(AUTHED)
      mockCreate.mockResolvedValue({ choices: [] })
      const res = await POST(
        makeRequest({ projectId: 'p1', message: 'hi', editorText: '{}', quizSpec: {} })
      )
      expect((await res.json()).text).toBe('No response')
    })
  })

  // ── Persistence ───────────────────────────────────────────────────────────

  describe('message persistence', () => {
    it('inserts user message to chat_messages', async () => {
      mockGetUser.mockResolvedValue(AUTHED)

      await POST(
        makeRequest({
          projectId: 'proj-abc',
          message: 'How many questions?',
          editorText: '{}',
          quizSpec: {},
        })
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: 'proj-abc', role: 'user', content: 'How many questions?' })
      )
    })

    it('inserts assistant response to chat_messages', async () => {
      mockGetUser.mockResolvedValue(AUTHED)
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'There are 3 questions.' } }],
      })

      await POST(
        makeRequest({ projectId: 'proj-abc', message: 'Count?', editorText: '{}', quizSpec: {} })
      )

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ project_id: 'proj-abc', role: 'assistant', content: 'There are 3 questions.' })
      )
    })

    it('inserts exactly 2 rows per request (user then assistant)', async () => {
      mockGetUser.mockResolvedValue(AUTHED)
      await POST(makeRequest({ projectId: 'p1', message: 'hi', editorText: '{}', quizSpec: {} }))
      expect(mockInsert).toHaveBeenCalledTimes(2)
    })

    it('inserts user message BEFORE calling OpenAI', async () => {
      mockGetUser.mockResolvedValue(AUTHED)
      const callOrder: string[] = []
      mockInsert.mockImplementation((args: { role: string }) => {
        callOrder.push(`insert:${args.role}`)
        return Promise.resolve({ error: null })
      })
      mockCreate.mockImplementation(() => {
        callOrder.push('openai')
        return Promise.resolve({ choices: [{ message: { content: 'hi' } }] })
      })

      await POST(makeRequest({ projectId: 'p1', message: 'hi', editorText: '{}', quizSpec: {} }))

      expect(callOrder).toEqual(['insert:user', 'openai', 'insert:assistant'])
    })
  })
})
