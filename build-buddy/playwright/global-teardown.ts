import { createClient } from '@supabase/supabase-js'
import { TEST_EMAIL } from './global-setup'

export default async function globalTeardown() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { users } } = await admin.auth.admin.listUsers()
  const testUser = users.find((u) => u.email === TEST_EMAIL)
  if (!testUser) return

  const { data: projects } = await admin
    .from('projects')
    .select('id')
    .eq('user_id', testUser.id)

  if (projects?.length) {
    const ids = projects.map((p: { id: string }) => p.id)
    await admin.from('chat_messages').delete().in('project_id', ids)
    await admin.from('project_state').delete().in('project_id', ids)
    await admin.from('projects').delete().in('id', ids)
  }
}
