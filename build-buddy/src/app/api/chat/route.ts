import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  // Verify auth via session client
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, message, editorText, quizSpec } = await request.json()

  if (!projectId || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Use admin client for DB inserts (bypasses RLS)
  const admin = createAdminClient()

  // Persist the user message
  const { error: userMsgErr } = await admin.from('chat_messages').insert({
    project_id: projectId,
    user_id: user.id,
    role: 'user',
    content: message,
  })
  if (userMsgErr) console.log('[chat] user insert error:', userMsgErr.message)

  // Build the prompt with current context
  const userContent = `Question: ${message}

Current Quiz JSON:
${JSON.stringify(quizSpec, null, 2)}

Current Editor Text:
${editorText}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          "You are BuildBuddy, a coding assistant. Answer questions about the user's quiz JSON and code editor text. Do not modify the quiz or suggest code changes that mutate the spec. Return only plain text explanations.",
      },
      { role: 'user', content: userContent },
    ],
    max_tokens: 500,
  })

  const assistantText = completion.choices[0]?.message?.content ?? 'No response'

  // Persist the assistant response
  const { error: asstMsgErr } = await admin.from('chat_messages').insert({
    project_id: projectId,
    user_id: user.id,
    role: 'assistant',
    content: assistantText,
  })
  if (asstMsgErr) console.log('[chat] assistant insert error:', asstMsgErr.message)

  return NextResponse.json({ text: assistantText })
}
