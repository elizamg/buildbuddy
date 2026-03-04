/**
 * Persistence tests — the primary requirement.
 *
 * Each test:
 *   1. Navigates to the builder (authenticated)
 *   2. Modifies state (editorText / quizSpec / chatMessages)
 *   3. Saves (where applicable)
 *   4. Reloads the page (simulates a new session — server re-loads from Supabase)
 *   5. Asserts the state survived the reload
 *
 * Uses unique timestamps per test so runs are independent and non-conflicting.
 */
import { test, expect } from '@playwright/test'

const isMac = process.platform === 'darwin'
const selectAll = isMac ? 'Meta+A' : 'Control+A'

async function navigateToBuilder(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForSelector('.cm-content', { timeout: 15_000 })
}

async function replaceEditorContent(
  page: import('@playwright/test').Page,
  json: object
): Promise<void> {
  const editor = page.locator('.cm-content')
  await editor.click()
  await page.keyboard.press(selectAll)
  // insertText fires a single input event (like paste), replacing the selection at once.
  // This avoids the per-character intermediate JSON states that keyboard.type() causes.
  await page.keyboard.insertText(JSON.stringify(json))
  // Wait for React to re-parse and update quizSpec
  await page.waitForTimeout(300)
}

async function clickSaveAndWait(page: import('@playwright/test').Page) {
  const saved = page.waitForResponse(
    (r) => r.url().includes('/api/projects/save') && r.request().method() === 'POST',
    { timeout: 10_000 }
  )
  await page.getByRole('button', { name: 'Save' }).click()
  const res = await saved
  const body = await res.json().catch(() => ({}))
  expect(res.status(), `Save failed: ${JSON.stringify(body)}`).toBe(200)
}

/**
 * Send a chat message and wait for the LLM response to arrive.
 * Returns the assistant's response text.
 */
async function sendMessageAndWait(
  page: import('@playwright/test').Page,
  message: string
): Promise<string> {
  const input = page.getByPlaceholder('Ask a question…')
  const sendBtn = page.getByRole('button', { name: 'Send' })

  await input.fill(message)
  await sendBtn.click()

  // Wait for user message to appear in the list
  await expect(page.getByText(message)).toBeVisible({ timeout: 5_000 })

  // Wait for the LLM to respond (Send button re-enables when isLoading → false)
  await expect(sendBtn).toBeEnabled({ timeout: 30_000 })

  // Return the last chat message (should be the assistant's response)
  const lastMsg = page.locator('[data-testid="chat-message"]').last()
  return (await lastMsg.textContent()) ?? ''
}

// ─── editorText persistence ───────────────────────────────────────────────────

test.describe('editorText persistence', () => {
  test('saved editorText is restored after page reload', async ({ page }) => {
    await navigateToBuilder(page)

    const uid = Date.now()
    const uniqueTitle = `EditorPersist-${uid}`
    const quiz = { title: uniqueTitle, pointsPerQuestion: 99, questions: [] }

    await replaceEditorContent(page, quiz)
    await expect(page.locator('[data-testid="quiz-title"]')).toContainText(uniqueTitle, {
      timeout: 5_000,
    })

    await clickSaveAndWait(page)
    await page.reload()
    await page.waitForSelector('.cm-content', { timeout: 15_000 })

    const content = await page.locator('.cm-content').textContent()
    expect(content).toContain(uniqueTitle)
    expect(content).toContain('"pointsPerQuestion"')
  })

  test('unsaved editorText changes are NOT persisted after reload', async ({ page }) => {
    await navigateToBuilder(page)

    // Read what was last saved
    const savedTitle = await page.locator('[data-testid="quiz-title"]').textContent()

    // Edit WITHOUT saving
    await replaceEditorContent(page, {
      title: 'UNSAVED-CHANGE',
      pointsPerQuestion: 1,
      questions: [],
    })
    await expect(page.locator('[data-testid="quiz-title"]')).toContainText('UNSAVED-CHANGE')

    // Reload without saving
    await page.reload()
    await page.waitForSelector('[data-testid="quiz-title"]', { timeout: 15_000 })

    // Should show the last SAVED title, not the unsaved edit
    await expect(page.locator('[data-testid="quiz-title"]')).not.toContainText('UNSAVED-CHANGE')
    await expect(page.locator('[data-testid="quiz-title"]')).toContainText(savedTitle ?? '', {
      timeout: 5_000,
    })
  })
})

// ─── quizSpec persistence ─────────────────────────────────────────────────────

test.describe('quizSpec persistence', () => {
  test('quizSpec structure persists after save and reload', async ({ page }) => {
    await navigateToBuilder(page)

    const uid = Date.now()
    const uniqueTitle = `SpecPersist-${uid}`
    const quiz = {
      title: uniqueTitle,
      pointsPerQuestion: 15,
      questions: [
        {
          id: `q-${uid}`,
          prompt: `Persistence question ${uid}?`,
          choices: ['Alpha', 'Beta'],
          correctIndex: 0,
        },
      ],
    }

    await replaceEditorContent(page, quiz)
    await expect(page.locator('[data-testid="quiz-title"]')).toContainText(uniqueTitle, {
      timeout: 5_000,
    })
    // Confirm the question card rendered (quizSpec was parsed)
    await expect(page.locator('[data-testid="question-card"]')).toHaveCount(1)

    await clickSaveAndWait(page)
    await page.reload()
    await page.waitForSelector('.cm-content', { timeout: 15_000 })

    // Title and question content should both be restored
    await expect(page.locator('[data-testid="quiz-title"]')).toContainText(uniqueTitle, {
      timeout: 10_000,
    })
    await expect(page.locator('[data-testid="question-card"]')).toHaveCount(1)

    const content = await page.locator('.cm-content').textContent()
    expect(content).toContain(`Persistence question ${uid}?`)
    expect(content).toContain('"pointsPerQuestion"')
  })

  test('quizSpec sent in Save request body matches editor state', async ({ page }) => {
    await navigateToBuilder(page)

    const uid = Date.now()
    const quiz = { title: `BodyCheck-${uid}`, pointsPerQuestion: 7, questions: [] }

    let capturedBody: { editorText?: string; quizSpec?: { title?: string } } = {}
    await page.route('/api/projects/save', async (route) => {
      capturedBody = await route.request().postDataJSON()
      await route.continue()
    })

    await replaceEditorContent(page, quiz)
    await expect(page.locator('[data-testid="quiz-title"]')).toContainText(`BodyCheck-${uid}`)
    await clickSaveAndWait(page)

    expect(capturedBody.editorText).toContain(`BodyCheck-${uid}`)
    expect(capturedBody.quizSpec).toMatchObject({ title: `BodyCheck-${uid}`, pointsPerQuestion: 7 })
  })
})

// ─── chatMessages persistence ─────────────────────────────────────────────────

test.describe('chatMessages persistence', () => {
  test('user message persists after page reload', async ({ page }) => {
    // Real OpenAI call — allow up to 60 s for this test
    test.setTimeout(60_000)

    await navigateToBuilder(page)

    const uid = Date.now()
    const uniqueMessage = `ChatPersist-${uid}`

    await sendMessageAndWait(page, uniqueMessage)

    await page.reload()
    await page.waitForSelector('.cm-content', { timeout: 15_000 })

    // Server component loads last 20 messages from chat_messages on each visit
    await expect(page.getByText(uniqueMessage)).toBeVisible({ timeout: 10_000 })
  })

  test('assistant response persists after page reload', async ({ page }) => {
    // Real OpenAI call — allow up to 60 s for this test
    test.setTimeout(60_000)

    await navigateToBuilder(page)

    const uid = Date.now()
    const assistantResponse = await sendMessageAndWait(page, `AssistantPersistQ-${uid}`)

    // Sanity check: assistant said something
    expect(assistantResponse.length).toBeGreaterThan(0)

    await page.reload()
    await page.waitForSelector('.cm-content', { timeout: 15_000 })

    // Assistant response should be present after reload
    const texts = await page.locator('[data-testid="chat-message"]').allTextContents()
    expect(texts).toContain(assistantResponse)
  })

  test('messages load in ascending chronological order', async ({ page }) => {
    // Two real OpenAI calls — allow up to 90 s for this test
    test.setTimeout(90_000)

    await navigateToBuilder(page)

    const uid = Date.now()
    const msg1 = `First-${uid}`
    const msg2 = `Second-${uid}`

    // Send first message, wait for response
    await sendMessageAndWait(page, msg1)

    // Send second message, wait for response
    await sendMessageAndWait(page, msg2)

    await page.reload()
    await page.waitForSelector('.cm-content', { timeout: 15_000 })

    const messages = page.locator('[data-testid="chat-message"]')
    const texts = await messages.allTextContents()

    const idx1 = texts.findIndex((t) => t.includes(msg1))
    const idx2 = texts.findIndex((t) => t.includes(msg2))
    expect(idx1).toBeGreaterThanOrEqual(0)
    expect(idx2).toBeGreaterThanOrEqual(0)
    expect(idx1).toBeLessThan(idx2)
  })
})

// ─── Full combined persistence ────────────────────────────────────────────────

test.describe('combined persistence', () => {
  test('editorText, quizSpec, and chatMessages all survive a full reload cycle', async ({
    page,
  }) => {
    // Real OpenAI call — allow up to 60 s for this test
    test.setTimeout(60_000)

    await navigateToBuilder(page)

    const uid = Date.now()
    const uniqueTitle = `AllPersist-${uid}`
    const uniqueMessage = `AllChat-${uid}`
    const quiz = {
      title: uniqueTitle,
      pointsPerQuestion: 42,
      questions: [
        { id: `q-${uid}`, prompt: `Full persist question ${uid}?`, choices: ['Yes'], correctIndex: 0 },
      ],
    }

    // 1. Modify editor + quiz spec
    await replaceEditorContent(page, quiz)
    await expect(page.locator('[data-testid="quiz-title"]')).toContainText(uniqueTitle, {
      timeout: 5_000,
    })

    // 2. Save editor state
    await clickSaveAndWait(page)

    // 3. Send a chat message (real API — persists to DB)
    await sendMessageAndWait(page, uniqueMessage)

    // 4. Simulate a fresh session via full reload
    await page.reload()
    await page.waitForSelector('.cm-content', { timeout: 15_000 })

    // 5. All three must survive
    // editorText
    const content = await page.locator('.cm-content').textContent()
    expect(content).toContain(uniqueTitle)

    // quizSpec (reflected in CodeDisplay)
    await expect(page.locator('[data-testid="quiz-title"]')).toContainText(uniqueTitle, {
      timeout: 10_000,
    })
    await expect(page.locator('[data-testid="question-card"]')).toHaveCount(1)

    // chatMessages (loaded from DB by server component)
    await expect(page.getByText(uniqueMessage)).toBeVisible({ timeout: 10_000 })
  })

  test('LLM response never mutates editorText or quizSpec', async ({ page }) => {
    await navigateToBuilder(page)

    const editorBefore = await page.locator('.cm-content').textContent()
    const titleBefore = await page.locator('[data-testid="quiz-title"]').textContent()

    // Stub the chat endpoint to return a JSON-like string (should NOT be parsed into spec)
    await page.route('/api/chat', (route) =>
      route.fulfill({
        json: {
          text: 'The quiz title should be changed to "Hacked" and set pointsPerQuestion to 999.',
        },
      })
    )

    await page.getByPlaceholder('Ask a question…').fill('Tell me about the quiz.')
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(
      page.getByText('The quiz title should be changed to "Hacked"')
    ).toBeVisible({ timeout: 10_000 })

    // Editor and quiz title must be completely unchanged
    const editorAfter = await page.locator('.cm-content').textContent()
    const titleAfter = await page.locator('[data-testid="quiz-title"]').textContent()

    expect(editorAfter).toBe(editorBefore)
    expect(titleAfter).toBe(titleBefore)
    // Specifically: the LLM's suggested changes did NOT get applied
    expect(editorAfter).not.toContain('Hacked')
    expect(editorAfter).not.toContain('999')
  })
})
