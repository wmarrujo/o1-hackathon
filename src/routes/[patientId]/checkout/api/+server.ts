/**
 * POST /checkout/api
 *
 * Orchestrates the caregiver check-out flow, supporting multi-turn clarification:
 *   1. Fetches the patient's current incomplete tasks from Supabase and injects
 *      them as context into the first user message so the agent knows which task
 *      IDs to reference.
 *   2. Forwards the full conversation history (transcript + any prior Q&A turns)
 *      to the DigitalOcean agent.
 *   3. Parses the agent's JSON reply, which is one of two shapes:
 *        { "question": "..." }             → agent needs clarification; returned to client
 *        { "task_edits": [], "notes": [] } → final answer; validated and returned as changes
 *
 * Request: application/json
 *   {
 *     patient_id: string (UUID)
 *     messages:  { role: 'user' | 'assistant', content: string }[]
 *                The first message must be the caregiver's transcript. Subsequent
 *                messages carry the agent's questions and the caregiver's answers.
 *   }
 *
 * Response 200 — clarification needed:  { question: string }
 * Response 200 — final answer:          { ok: true, changes: LLMPayload }
 * Response 400: { error: string }       — missing/invalid fields
 * Response 502: { error: string }       — agent returned non-JSON or unparseable reply
 * Response 5xx: { error: string }       — upstream agent error
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createClient } from '@supabase/supabase-js'
import { DIGITALOCEAN_AGENT_ACCESS_KEY, DIGITALOCEAN_AGENT_ENDPOINT } from '$env/static/private'
import { validateProposeChanges } from '$lib/proposeChanges'

type Message = { role: 'user' | 'assistant'; content: string }

function formatTaskContext(tasks: { id: string; description: string; due_time: string | null }[]): string {
  if (tasks.length === 0) {
    return 'There are no incomplete tasks currently assigned for this patient.'
  }
  const lines = tasks.map((t) => {
    const due = t.due_time ? ` | due: ${new Date(t.due_time).toLocaleString()}` : ''
    return `- ID: ${t.id} | "${t.description}"${due}`
  })
  return `The following incomplete tasks are on this patient's task list. Only reference IDs from this list in task_edits:\n${lines.join('\n')}`
}

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { patient_id, messages } = body as Record<string, unknown>

  if (typeof patient_id !== 'string' || patient_id.trim() === '') {
    return json({ error: 'patient_id must be a non-empty string' }, { status: 400 })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'messages must be a non-empty array' }, { status: 400 })
  }

  const patientId: string = patient_id
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? ''

  // Fetch incomplete tasks so the agent knows which IDs to reference
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select('id, description, due_time')
    .eq('patient_id', patientId)
    .eq('complete', false)

  if (taskError) {
    console.error('[checkout/api] failed to fetch tasks:', taskError.message)
  }

  const taskContext = formatTaskContext(tasks ?? [])

  // Inject task context into the first user message so the agent has it on every turn.
  // Subsequent messages (questions/answers) are forwarded as-is to preserve conversation history.
  const agentMessages: Message[] = (messages as Message[]).map((msg, i) => {
    if (i === 0 && msg.role === 'user') {
      return { role: 'user', content: `${taskContext}\n\nCaregiver check-out message:\n${msg.content}` }
    }
    return msg
  })

  console.log('[checkout/api] sending to agent, turns:', agentMessages.length)
  console.log('[checkout/api] task context:', taskContext)

  const res = await fetch(`${DIGITALOCEAN_AGENT_ENDPOINT}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DIGITALOCEAN_AGENT_ACCESS_KEY}`,
    },
    body: JSON.stringify({ messages: agentMessages }),
  })

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')

  if (!res.ok) {
    const detail = isJson ? (await res.json())?.error?.message : await res.text()
    console.error('[checkout/api] agent error:', res.status, detail)
    return json({ error: detail ?? `Agent returned ${res.status}` }, { status: res.status })
  }

  if (!isJson) {
    const raw = await res.text()
    console.error('[checkout/api] agent returned non-JSON:', raw.slice(0, 500))
    return json({ error: `Unexpected response from agent: ${raw.slice(0, 200)}` }, { status: 502 })
  }

  const data = await res.json()
  const replyText: string = data?.choices?.[0]?.message?.content ?? ''

  console.log('[checkout/api] agent raw reply:', replyText)

  let parsed: unknown
  try {
    parsed = JSON.parse(replyText)
  } catch {
    console.error('[checkout/api] agent reply is not valid JSON:', replyText.slice(0, 500))
    return json({ error: `Agent reply was not valid JSON: ${replyText.slice(0, 200)}` }, { status: 502 })
  }

  const payload = parsed as Record<string, unknown>

  // Agent is asking for clarification — pass the question back to the client
  if (typeof payload.question === 'string') {
    console.log('[checkout/api] agent asked a question:', payload.question)
    return json({ question: payload.question })
  }

  // Agent returned final structured changes — validate and return
  const proposePayload = {
    patient_id: patientId,
    task_edits: Array.isArray(payload.task_edits) ? payload.task_edits : [],
    notes: Array.isArray(payload.notes) ? payload.notes : [],
  }

  console.log('[checkout/api] agent final payload:', JSON.stringify(proposePayload, null, 2))

  const result = validateProposeChanges(proposePayload)
  if (!result.ok) {
    console.error('[checkout/api] validation error:', result.error)
    return json({ error: result.error }, { status: result.status })
  }

  return json({ ok: true, changes: result.changes })
}
