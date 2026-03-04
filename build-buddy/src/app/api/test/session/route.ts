/**
 * Test-only endpoint: exchanges a Supabase magic-link token for a real session
 * and sets the auth cookies in the HTTP response so Playwright can pick them up.
 *
 * NEVER active in production — returns 403 if NODE_ENV === 'production'.
 */
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const { email } = await request.json()

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Ensure test user exists with a confirmed email
  await admin.auth.admin.createUser({ email, email_confirm: true })

  // Generate a magic link token (server-to-server — no email sent)
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  // Verify the token server-to-server to get auth tokens back
  const verifyRes = await fetch(
    `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(linkData.properties.hashed_token)}&type=magiclink`,
    { method: 'GET', redirect: 'manual', headers: { apikey: anonKey } }
  )

  // Tokens land in the redirect Location header
  // Implicit flow:  Location: ...#access_token=...&refresh_token=...
  // PKCE flow:      Location: ...?code=...
  const location = verifyRes.headers.get('location') ?? ''
  let accessToken: string | null = null
  let refreshToken: string | null = null

  const hashIdx = location.indexOf('#')
  if (hashIdx !== -1) {
    const frag = new URLSearchParams(location.slice(hashIdx + 1))
    accessToken = frag.get('access_token')
    refreshToken = frag.get('refresh_token')
  } else {
    // PKCE: exchange the code
    const codeUrl = new URL(location.startsWith('/') ? `http://localhost${location}` : location)
    const code = codeUrl.searchParams.get('code')
    if (code) {
      const cookieStore = await cookies()
      const ssrClient = createServerClient(supabaseUrl, anonKey, {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      })
      const { data, error } = await ssrClient.auth.exchangeCodeForSession(code)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, uid: data.user?.id })
    }
  }

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: `Could not extract tokens from location: ${location}` },
      { status: 500 }
    )
  }

  // Set the session as cookies in this response via the SSR client
  const cookieStore = await cookies()
  const ssrClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  })

  const { data, error: sessionError } = await ssrClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, uid: data.user?.id })
}
