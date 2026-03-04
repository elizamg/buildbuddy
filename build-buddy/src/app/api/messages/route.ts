import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, messages } = await request.json() as {
    projectId: string
    messages: { role: 'user' | 'assistant'; content: string }[]
  }

  if (!projectId || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const admin = createAdminClient()

  const rows = messages.map((m) => ({
    project_id: projectId,
    user_id: user.id,
    role: m.role,
    content: m.content,
  }))

  const { error } = await admin.from('chat_messages').insert(rows)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
