import { test, expect } from '@playwright/test'

const isMac = process.platform === 'darwin'
const selectAll = isMac ? 'Meta+A' : 'Control+A'

test.describe('Builder UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.cm-content', { timeout: 15_000 })
  })

  test('shows the full builder layout after login', async ({ page }) => {
    await expect(page.getByText('BuildBuddy')).toBeVisible()
    await expect(page.getByText('Build Buddy Chat')).toBeVisible()
    await expect(page.getByText('Code Editor')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
  })

  test('pill "Add a new question" increments question count in preview', async ({ page }) => {
    const countBefore = await page.locator('[data-testid="question-card"]').count()
    await page.getByRole('button', { name: 'Add a new question' }).click()
    await expect(page.locator('[data-testid="question-card"]')).toHaveCount(countBefore + 1, {
      timeout: 5_000,
    })
    await expect(page.getByText('Question added successfully')).toBeVisible()
  })

  test('pill "Change the quiz title" changes the quiz title in preview', async ({ page }) => {
    const titleBefore = await page.locator('[data-testid="quiz-title"]').textContent()
    await page.getByRole('button', { name: 'Change the quiz title' }).click()
    // Title should differ from original OR be a known randomQuizTitles value
    await expect(page.locator('[data-testid="quiz-title"]')).not.toHaveText(titleBefore ?? '', {
      timeout: 3_000,
    })
    await expect(page.getByText('Quiz title changed successfully')).toBeVisible()
  })

  test('pill "Add a new choice to each question" appends a choice to each card', async ({
    page,
  }) => {
    const firstCard = page.locator('[data-testid="question-card"]').first()
    const choicesBefore = await firstCard.getByRole('button').count()

    await page.getByRole('button', { name: 'Add a new choice to each question' }).click()

    await expect(firstCard.getByRole('button')).toHaveCount(choicesBefore + 1, {
      timeout: 3_000,
    })
    await expect(page.getByText('New choice added successfully')).toBeVisible()
  })

  test('Reset to Original restores default editor content', async ({ page }) => {
    const editor = page.locator('.cm-content')
    await editor.click()
    await page.keyboard.press(selectAll)
    await page.keyboard.type('{"title":"Temp","pointsPerQuestion":1,"questions":[]}')
    await expect(page.locator('[data-testid="quiz-title"]')).toContainText('Temp', {
      timeout: 3_000,
    })

    await page.getByRole('button', { name: 'Reset to Original' }).click()
    await expect(page.locator('[data-testid="quiz-title"]')).toContainText('Animal Quiz', {
      timeout: 3_000,
    })
  })

  test('Save button shows "Saving…" while in-flight then returns to "Save"', async ({ page }) => {
    await page.route('/api/projects/save', async (route) => {
      await new Promise((r) => setTimeout(r, 400))
      await route.fulfill({ json: { ok: true } })
    })

    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('button', { name: 'Saving…' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 5_000 })
  })

  test('Save failure shows error text in header', async ({ page }) => {
    await page.route('/api/projects/save', (route) =>
      route.fulfill({ status: 500, json: { error: 'DB connection failed' } })
    )
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.locator('text=DB connection failed')).toBeVisible({ timeout: 5_000 })
  })

  test('invalid JSON shows error message in editor', async ({ page }) => {
    const editor = page.locator('.cm-content')
    await editor.click()
    await page.keyboard.press(selectAll)
    await page.keyboard.type('{invalid json here}')
    await expect(page.locator('.text-red-500', { hasText: 'Invalid JSON' })).toBeVisible({ timeout: 3_000 })
  })

  test('freeform chat shows loading placeholder then AI response', async ({ page }) => {
    await page.route('/api/chat', async (route) => {
      await new Promise((r) => setTimeout(r, 300))
      await route.fulfill({ json: { text: 'BuildBuddy stub response.' } })
    })

    await page.getByPlaceholder('Ask a question…').fill('What is the quiz title?')
    await page.getByRole('button', { name: 'Send' }).click()

    // User message appears immediately
    await expect(page.getByText('What is the quiz title?')).toBeVisible()
    // Loading placeholder appears
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('…')
    // Replaced by actual response
    await expect(page.getByText('BuildBuddy stub response.')).toBeVisible({ timeout: 5_000 })
  })
})
