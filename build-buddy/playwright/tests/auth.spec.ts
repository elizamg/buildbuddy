import { test, expect } from '@playwright/test'

// These tests verify unauthenticated behavior — no stored auth state
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Auth redirect', () => {
  test('unauthenticated GET / redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page renders the magic link form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send magic link' })).toBeVisible()
    await expect(page.getByText('BuildBuddy')).toBeVisible()
  })

  test('submitting email shows confirmation message', async ({ page }) => {
    // Stub the Supabase OTP endpoint so any email returns a success response
    await page.route('**/auth/v1/otp**', (route) =>
      route.fulfill({ status: 200, json: {} })
    )

    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill('anyone@example.com')
    await page.getByRole('button', { name: 'Send magic link' }).click()
    await expect(page.getByText('Check your email')).toBeVisible({ timeout: 10_000 })
  })

  test('send button shows "Sending…" while the request is in flight', async ({ page }) => {
    // Delay the Supabase OTP request so we can observe the loading state
    await page.route('**/auth/v1/otp**', async (route) => {
      await new Promise((r) => setTimeout(r, 600))
      await route.continue()
    })

    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill('slow@example.com')
    await page.getByRole('button', { name: 'Send magic link' }).click()
    await expect(page.getByRole('button', { name: 'Sending…' })).toBeVisible()
  })
})
