/**
 * GET /{patientId}/remote-checkin/api/tasks
 *
 * Today-scoped deterministic slice of the remote check-in:
 *   - completed_today  — tasks completed since UTC midnight
 *   - pending_today    — tasks due today, not yet due, not complete
 *   - missed_today     — tasks due today, past due, not complete
 *   - events_today     — schedule_events starting today (rrule expansion not handled)
 *
 * "Today" is UTC calendar day. Runs in parallel with the AI endpoints.
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createClient } from '@supabase/supabase-js'

export const GET: RequestHandler = async ({ params, request }) => {
  try {
    return await handle(params.patientId!, request)
  } catch (e: any) {
    console.error('[remote-checkin/tasks] unhandled error:', e)
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
  const nowIso = now.toISOString()

  const [
    { data: completedRaw },
    { data: pendingRaw },
    { data: missedRaw },
    { data: eventsRaw },
    { data: usersRaw },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, description, completed_at, completed_by, assignee_id')
      .eq('patient_id', patientId)
      .eq('complete', true)
      .gte('completed_at', startIso)
      .lt('completed_at', endIso)
      .order('completed_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, description, due_time, assignee_id')
      .eq('patient_id', patientId)
      .eq('complete', false)
      .gte('due_time', nowIso)
      .lt('due_time', endIso)
      .order('due_time', { ascending: true }),
    supabase
      .from('tasks')
      .select('id, description, due_time, assignee_id')
      .eq('patient_id', patientId)
      .eq('complete', false)
      .gte('due_time', startIso)
      .lt('due_time', nowIso)
      .order('due_time', { ascending: true }),
    supabase
      .from('schedule_events')
      .select('id, title, event_type, dtstart, dtend, status, assigned_user_id')
      .eq('patient_id', patientId)
      .gte('dtstart', startIso)
      .lt('dtstart', endIso)
      .neq('status', 'CANCELLED')
      .order('dtstart', { ascending: true }),
    supabase.from('users').select('id, full_name'),
  ])

  const userName = new Map<string, string>()
  for (const u of usersRaw ?? []) userName.set(u.id, u.full_name)

  const completed_today = (completedRaw ?? []).map((t) => ({
    id: t.id,
    description: t.description,
    completed_at: t.completed_at,
    completed_by_name: t.completed_by ? userName.get(t.completed_by) ?? null : null,
  }))

  const pending_today = (pendingRaw ?? []).map((t) => ({
    id: t.id,
    description: t.description,
    due_time: t.due_time,
    assignee_name: t.assignee_id ? userName.get(t.assignee_id) ?? null : null,
  }))

  const missed_today = (missedRaw ?? []).map((t) => ({
    id: t.id,
    description: t.description,
    due_time: t.due_time,
    assignee_name: t.assignee_id ? userName.get(t.assignee_id) ?? null : null,
  }))

  const events_today = (eventsRaw ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    event_type: e.event_type,
    dtstart: e.dtstart,
    dtend: e.dtend,
    assignee_name: e.assigned_user_id ? userName.get(e.assigned_user_id) ?? null : null,
  }))

  return json({ completed_today, pending_today, missed_today, events_today })
}
