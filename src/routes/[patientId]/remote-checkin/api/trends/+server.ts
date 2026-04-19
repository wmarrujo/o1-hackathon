/**
 * GET /{patientId}/remote-checkin/api/trends
 *
 * Slow AI call that looks at the last 7 days of notes, check-ins, task
 * outcomes, and scheduled events and returns a markdown-formatted trends
 * summary plus forward-looking concerns.
 *
 * Response 200: { trends: string, future_issues: string }
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createClient } from '@supabase/supabase-js'
import {
  DIGITALOCEAN_REMOTE_CHECKIN_TRENDS_ACCESS_KEY,
  DIGITALOCEAN_REMOTE_CHECKIN_TRENDS_ENDPOINT,
} from '$env/static/private'

const WINDOW_DAYS = 7
const NOTE_LIMIT = 100
const CHECK_IN_LIMIT = 40

export const GET: RequestHandler = async ({ params, request }) => {
  try {
    return await handle(params.patientId!, request)
  } catch (e: any) {
    console.error('[remote-checkin/trends] unhandled error:', e)
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

  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 3600 * 1000).toISOString()

  const [
    { data: completedRaw },
    { data: missedRaw },
    { data: notesRaw },
    { data: checkInsRaw },
    { data: eventsRaw },
    { data: conditionsRaw },
    { data: usersRaw },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('description, completed_at, completed_by, assignee_id')
      .eq('patient_id', patientId)
      .eq('complete', true)
      .gte('completed_at', windowStart)
      .order('completed_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('description, due_time, assignee_id')
      .eq('patient_id', patientId)
      .eq('complete', false)
      .not('due_time', 'is', null)
      .gte('due_time', windowStart)
      .lt('due_time', new Date().toISOString())
      .order('due_time', { ascending: true }),
    supabase
      .from('notes')
      .select('content, author_id, created_at')
      .eq('patient_id', patientId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .limit(NOTE_LIMIT),
    supabase
      .from('check_ins')
      .select('check_in_type, health_status_note, ai_summary, created_at, user_id')
      .eq('patient_id', patientId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })
      .limit(CHECK_IN_LIMIT),
    supabase
      .from('schedule_events')
      .select('title, event_type, dtstart, dtend, status, assigned_user_id')
      .eq('patient_id', patientId)
      .gte('dtstart', windowStart)
      .neq('status', 'CANCELLED')
      .order('dtstart', { ascending: false }),
    supabase
      .from('health_conditions')
      .select('name, description, ai_summary')
      .eq('patient_id', patientId),
    supabase.from('users').select('id, full_name'),
  ])

  const userName = new Map<string, string>()
  for (const u of usersRaw ?? []) userName.set(u.id, u.full_name)

  const agentInput = buildAgentInput({
    completed: (completedRaw ?? []).map((t) => ({
      description: t.description,
      completed_at: t.completed_at,
      completed_by_name: t.completed_by ? userName.get(t.completed_by) ?? null : null,
    })),
    missed: (missedRaw ?? []).map((t) => ({
      description: t.description,
      due_time: t.due_time,
      assignee_name: t.assignee_id ? userName.get(t.assignee_id) ?? null : null,
    })),
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
    events: (eventsRaw ?? []).map((e) => ({
      title: e.title,
      event_type: e.event_type,
      dtstart: e.dtstart,
      dtend: e.dtend,
      assignee_name: e.assigned_user_id ? userName.get(e.assigned_user_id) ?? null : null,
    })),
    conditions: (conditionsRaw ?? []).map((c) => ({
      name: c.name,
      description: c.description,
      ai_summary: c.ai_summary,
    })),
    windowDays: WINDOW_DAYS,
  })

  const ai = await callAgent(agentInput)
  return json(ai)
}

function buildAgentInput(ctx: {
  completed: { description: string; completed_at: string | null; completed_by_name: string | null }[]
  missed: { description: string; due_time: string | null; assignee_name: string | null }[]
  notes: { content: string; author: string; created_at: string }[]
  checkIns: { type: string; user: string; note: string | null; ai_summary: string | null; created_at: string }[]
  events: { title: string; event_type: string; dtstart: string; dtend: string; assignee_name: string | null }[]
  conditions: { name: string; description: string | null; ai_summary: string | null }[]
  windowDays: number
}): string {
  const parts: string[] = []
  parts.push(`Remote check-in — longer-term trends (last ${ctx.windowDays} days):`)

  if (ctx.conditions.length > 0) {
    parts.push('\nKnown health conditions:')
    for (const c of ctx.conditions) {
      const extra = c.ai_summary ?? c.description ?? ''
      parts.push(`- ${c.name}${extra ? `: ${extra}` : ''}`)
    }
  }

  if (ctx.notes.length > 0) {
    parts.push('\nCaregiver notes (most recent first):')
    for (const n of ctx.notes) {
      parts.push(`- [${n.created_at} · ${n.author}] ${n.content}`)
    }
  } else {
    parts.push('\nCaregiver notes: none')
  }

  if (ctx.checkIns.length > 0) {
    parts.push('\nShift check-ins:')
    for (const c of ctx.checkIns) {
      const body = [c.note, c.ai_summary].filter(Boolean).join(' | ')
      parts.push(`- [${c.created_at} · ${c.user} · ${c.type}] ${body || '(no notes)'}`)
    }
  } else {
    parts.push('\nShift check-ins: none')
  }

  parts.push(`\nTasks completed in window (${ctx.completed.length}):`)
  for (const t of ctx.completed) {
    parts.push(`- "${t.description}" by ${t.completed_by_name ?? 'unknown'} at ${t.completed_at}`)
  }

  parts.push(`\nTasks missed / overdue in window (${ctx.missed.length}):`)
  for (const t of ctx.missed) {
    parts.push(`- "${t.description}" due ${t.due_time}, assigned to ${t.assignee_name ?? 'unassigned'}`)
  }

  parts.push(`\nScheduled events in window (${ctx.events.length}):`)
  for (const e of ctx.events) {
    parts.push(`- [${e.event_type}] ${e.title} ${e.dtstart}–${e.dtend}, ${e.assignee_name ?? 'unassigned'}`)
  }

  return parts.join('\n')
}

async function callAgent(content: string): Promise<{ trends: string; future_issues: string }> {
  if (!DIGITALOCEAN_REMOTE_CHECKIN_TRENDS_ENDPOINT || !DIGITALOCEAN_REMOTE_CHECKIN_TRENDS_ACCESS_KEY) {
    throw new Error('DIGITALOCEAN_REMOTE_CHECKIN_TRENDS_ENDPOINT/ACCESS_KEY not set. Restart the dev server after editing .env.')
  }
  const res = await fetch(`${DIGITALOCEAN_REMOTE_CHECKIN_TRENDS_ENDPOINT}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DIGITALOCEAN_REMOTE_CHECKIN_TRENDS_ACCESS_KEY}`,
    },
    body: JSON.stringify({ messages: [{ role: 'user', content }] }),
  })

  if (!res.ok) {
    const detail = await res.text()
    console.error('[remote-checkin/trends] agent error:', res.status, detail)
    throw new Error(`Agent returned ${res.status}: ${detail.slice(0, 200)}`)
  }

  const data = await res.json()
  const replyText: string = data?.choices?.[0]?.message?.content ?? ''

  const cleaned = stripCodeFences(replyText)
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`Agent reply was not valid JSON: ${cleaned.slice(0, 200)}`)
  }

  const p = parsed as Record<string, unknown>
  return {
    trends: typeof p.trends === 'string' ? p.trends : '',
    future_issues: typeof p.future_issues === 'string' ? p.future_issues : '',
  }
}

function stripCodeFences(s: string): string {
  const trimmed = s.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : trimmed
}
