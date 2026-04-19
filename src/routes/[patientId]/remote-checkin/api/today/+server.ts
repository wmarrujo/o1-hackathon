/**
 * GET /{patientId}/remote-checkin/api/today
 *
 * Fast-ish AI summary of the patient's state TODAY. Only looks at notes and
 * check-ins created today (UTC). Output may contain markdown.
 *
 * Response 200: { summary: string }
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createClient } from '@supabase/supabase-js'
import {
  DIGITALOCEAN_REMOTE_CHECKIN_TODAY_ACCESS_KEY,
  DIGITALOCEAN_REMOTE_CHECKIN_TODAY_ENDPOINT,
} from '$env/static/private'

const NOTE_LIMIT = 30
const CHECK_IN_LIMIT = 10

export const GET: RequestHandler = async ({ params, request }) => {
  try {
    return await handle(params.patientId!, request)
  } catch (e: any) {
    console.error('[remote-checkin/today] unhandled error:', e)
    return json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}

async function handle(patientId: string, request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const now = new Date()
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const endOfToday = new Date(startOfToday.getTime() + 24 * 3600 * 1000)
  const startIso = startOfToday.toISOString()
  const endIso = endOfToday.toISOString()

  const [
    { data: notesRaw },
    { data: checkInsRaw },
    { data: completedRaw },
    { data: eventsRaw },
    { data: usersRaw },
  ] = await Promise.all([
    supabase
      .from('notes')
      .select('id, content, author_id, created_at')
      .eq('patient_id', patientId)
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(NOTE_LIMIT),
    supabase
      .from('check_ins')
      .select('id, check_in_type, health_status_note, ai_summary, created_at, user_id')
      .eq('patient_id', patientId)
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: false })
      .limit(CHECK_IN_LIMIT),
    supabase
      .from('tasks')
      .select('description, completed_at, completed_by')
      .eq('patient_id', patientId)
      .eq('complete', true)
      .gte('completed_at', startIso)
      .lt('completed_at', endIso),
    supabase
      .from('schedule_events')
      .select('title, event_type, dtstart, dtend, assigned_user_id, status')
      .eq('patient_id', patientId)
      .gte('dtstart', startIso)
      .lt('dtstart', endIso)
      .neq('status', 'CANCELLED'),
    supabase.from('users').select('id, full_name'),
  ])

  const userName = new Map<string, string>()
  for (const u of usersRaw ?? []) userName.set(u.id, u.full_name)

  const agentInput = buildAgentInput({
    notes: (notesRaw ?? []).map((n) => ({
      content: n.content,
      author: userName.get(n.author_id) ?? 'Unknown',
      created_at: n.created_at,
    })),
    checkIns: (checkInsRaw ?? []).map((c) => ({
      type: c.check_in_type,
      user: c.user_id ? userName.get(c.user_id) ?? 'Unknown' : 'Unknown',
      note: c.health_status_note,
      ai_summary: c.ai_summary,
      created_at: c.created_at,
    })),
    completed: (completedRaw ?? []).map((t) => ({
      description: t.description,
      completed_at: t.completed_at,
      completed_by_name: t.completed_by ? userName.get(t.completed_by) ?? null : null,
    })),
    events: (eventsRaw ?? []).map((e) => ({
      title: e.title,
      event_type: e.event_type,
      dtstart: e.dtstart,
      dtend: e.dtend,
      assignee_name: e.assigned_user_id ? userName.get(e.assigned_user_id) ?? null : null,
    })),
  })

  const summary = await callAgent(agentInput)
  return json({ summary })
}

function buildAgentInput(ctx: {
  notes: { content: string; author: string; created_at: string }[]
  checkIns: { type: string; user: string; note: string | null; ai_summary: string | null; created_at: string }[]
  completed: { description: string; completed_at: string | null; completed_by_name: string | null }[]
  events: { title: string; event_type: string; dtstart: string; dtend: string; assignee_name: string | null }[]
}): string {
  const parts: string[] = []
  parts.push('Remote check-in — TODAY only. Summarize how the patient is doing today.')

  if (ctx.notes.length > 0) {
    parts.push("\nToday's caregiver notes (most recent first):")
    for (const n of ctx.notes) {
      parts.push(`- [${n.created_at} · ${n.author}] ${n.content}`)
    }
  } else {
    parts.push("\nToday's caregiver notes: none")
  }

  if (ctx.checkIns.length > 0) {
    parts.push("\nToday's shift check-ins:")
    for (const c of ctx.checkIns) {
      const body = [c.note, c.ai_summary].filter(Boolean).join(' | ')
      parts.push(`- [${c.created_at} · ${c.user} · ${c.type}] ${body || '(no notes)'}`)
    }
  } else {
    parts.push("\nToday's shift check-ins: none")
  }

  parts.push(`\nTasks completed today (${ctx.completed.length}):`)
  for (const t of ctx.completed) {
    parts.push(`- "${t.description}" by ${t.completed_by_name ?? 'unknown'} at ${t.completed_at}`)
  }

  parts.push(`\nScheduled events today (${ctx.events.length}):`)
  for (const e of ctx.events) {
    parts.push(`- [${e.event_type}] ${e.title} ${e.dtstart}–${e.dtend}, ${e.assignee_name ?? 'unassigned'}`)
  }

  return parts.join('\n')
}

async function callAgent(content: string): Promise<string> {
  if (!DIGITALOCEAN_REMOTE_CHECKIN_TODAY_ENDPOINT || !DIGITALOCEAN_REMOTE_CHECKIN_TODAY_ACCESS_KEY) {
    throw new Error('DIGITALOCEAN_REMOTE_CHECKIN_TODAY_ENDPOINT/ACCESS_KEY not set. Restart the dev server after editing .env.')
  }
  const res = await fetch(`${DIGITALOCEAN_REMOTE_CHECKIN_TODAY_ENDPOINT}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DIGITALOCEAN_REMOTE_CHECKIN_TODAY_ACCESS_KEY}`,
    },
    body: JSON.stringify({ messages: [{ role: 'user', content }] }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('[remote-checkin/today] agent error:', res.status, detail)
    throw new Error(`Agent returned ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  const replyText: string = data?.choices?.[0]?.message?.content ?? ''

  const cleaned = stripCodeFences(replyText)
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Agent returned raw text instead of JSON — accept it as the summary.
    return cleaned
  }

  const p = parsed as Record<string, unknown>
  if (typeof p.summary === 'string' && p.summary.trim()) return p.summary
  // Fallback: some other string field, or the whole thing as text
  for (const v of Object.values(p)) {
    if (typeof v === 'string' && v.trim()) return v
  }
  return ''
}

function stripCodeFences(s: string): string {
  const trimmed = s.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : trimmed
}
