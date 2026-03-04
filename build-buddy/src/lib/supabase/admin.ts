import { createClient } from '@supabase/supabase-js'

/**
 * Server-only admin client using the service role key.
 * Bypasses RLS — only use in server-side code that has already verified auth.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
