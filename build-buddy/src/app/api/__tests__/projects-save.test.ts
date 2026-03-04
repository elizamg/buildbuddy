import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks (hoisted before imports) ─────────────────────────────────────────

const mockGetUser = vi.fn()
const mockEq = vi.fn()
const mockUpdate = vi.fn(() => ({ eq: mockEq }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({ update: mockUpdate })),
  })),
}))

// ─── Import route AFTER mocks are registered ────────────────────────────────

import { POST } from '@/app/api/projects/save/route'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AUTHED_USER = { data: { user: { id: 'user-123' } } }
const NO_USER = { data: { user: null } }

function makeRequest(body: object): Request {
  return new Request('http://localhost/api/projects/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/projects/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEq.mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: mockEq })
  })

  // ── Auth ──────────────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue(NO_USER)

      const res = await POST(
        makeRequest({ projectId: 'p1', editorText: '{}', quizSpec: {} })
      )

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ error: 'Unauthorized' })
    })

    it('does not touch the database when unauthenticated', async () => {
      mockGetUser.mockResolvedValue(NO_USER)
      await POST(makeRequest({ projectId: 'p1', editorText: '{}', quizSpec: {} }))
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  // ── Validation ────────────────────────────────────────────────────────────

  describe('input validation', () => {
    it('returns 400 when projectId is missing', async () => {
      mockGetUser.mockResolvedValue(AUTHED_USER)
      const res = await POST(makeRequest({ editorText: '{}', quizSpec: {} }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Missing projectId')
    })
  })

  // ── Persistence ───────────────────────────────────────────────────────────

  describe('persistence', () => {
    it('updates project_state with editor_text and spec_json', async () => {
      mockGetUser.mockResolvedValue(AUTHED_USER)
      const quizSpec = { title: 'My Quiz', pointsPerQuestion: 5, questions: [] }
      const editorText = JSON.stringify(quizSpec, null, 2)

      const res = await POST(
        makeRequest({ projectId: 'proj-abc', editorText, quizSpec })
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ ok: true })

      expect(mockUpdate).toHaveBeenCalledWith({
        editor_text: editorText,
        spec_json: quizSpec,
      })
      expect(mockEq).toHaveBeenCalledWith('project_id', 'proj-abc')
    })

    it('passes editor_text as a string, spec_json as an object', async () => {
      mockGetUser.mockResolvedValue(AUTHED_USER)
      const quizSpec = { title: 'Test', pointsPerQuestion: 1, questions: [] }
      const editorText = '  { "title": "Test" }  '

      await POST(makeRequest({ projectId: 'p1', editorText, quizSpec }))

      const updateArg = mockUpdate.mock.calls[0][0]
      expect(typeof updateArg.editor_text).toBe('string')
      expect(typeof updateArg.spec_json).toBe('object')
    })

    it('scopes the update to the correct project via .eq()', async () => {
      mockGetUser.mockResolvedValue(AUTHED_USER)
      await POST(makeRequest({ projectId: 'specific-project-id', editorText: '{}', quizSpec: {} }))
      expect(mockEq).toHaveBeenCalledWith('project_id', 'specific-project-id')
    })

    it('returns 500 with error message when Supabase update fails', async () => {
      mockGetUser.mockResolvedValue(AUTHED_USER)
      mockEq.mockResolvedValue({ error: { message: 'Row not found' } })

      const res = await POST(
        makeRequest({ projectId: 'p1', editorText: '{}', quizSpec: {} })
      )

      expect(res.status).toBe(500)
      expect((await res.json()).error).toBe('Row not found')
    })
  })
})
