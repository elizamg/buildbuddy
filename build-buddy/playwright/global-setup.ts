import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '.auth/user.json')
export const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? 'buildbuddy-e2e@test.local'

export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing env vars for E2E auth setup.\n' +
        'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in .env.local'
    )
  }

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  // Make sure the test user exists (idempotent)
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  await admin.auth.admin.createUser({ email: TEST_EMAIL, email_confirm: true })

  const browser = await chromium.launch()
  const page = await browser.newPage()

  // POST /api/test/session — exchanges a server-generated magic link token for a
  // real session and sets the Supabase auth cookies in the HTTP response.
  // page.request shares the browser's cookie jar, so those Set-Cookie headers
  // are immediately applied and will be present on the next page.goto().
  const res = await page.request.post('http://localhost:3000/api/test/session', {
    data: { email: TEST_EMAIL },
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok()) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`Test session API failed (${res.status()}): ${JSON.stringify(body)}`)
  }

  // Navigate to the builder — the auth cookies are already in the browser
  await page.goto('http://localhost:3000/')
  await page.waitForURL('http://localhost:3000/', { timeout: 15_000 })
  // Verify the builder UI loaded (ensures project + project_state were created in DB)
  await page.waitForSelector('.cm-content', { timeout: 15_000 })

  await page.context().storageState({ path: AUTH_FILE })
  await browser.close()
}
