/**
 * GET /{patientId}/remote-checkin/api/tasks
 *
 * Fast, deterministic slice of the remote check-in: completed and missed tasks
 * in the last 48h. Runs in parallel with the slower AI endpoint so the UI can
 * render task lists immediately.
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createClient } from '@supabase/supabase-js'

const WINDOW_HOURS = 48

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

  const windowStart = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString()
  const nowIso = new Date().toISOString()

  const [{ data: completedRaw }, { data: missedRaw }, { data: usersRaw }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, description, completed_at, completed_by, assignee_id')
      .eq('patient_id', patientId)
      .eq('complete', true)
      .gte('completed_at', windowStart)
      .order('completed_at', { ascending: false }),
    supabase
      .from('tasks')
      .select('id, description, due_time, assignee_id')
      .eq('patient_id', patientId)
      .eq('complete', false)
      .not('due_time', 'is', null)
      .lt('due_time', nowIso)
      .order('due_time', { ascending: true }),
    supabase.from('users').select('id, full_name'),
  ])

  const userName = new Map<string, string>()
  for (const u of usersRaw ?? []) userName.set(u.id, u.full_name)

  const completed_tasks = (completedRaw ?? []).map((t) => ({
    id: t.id,
    description: t.description,
    completed_at: t.completed_at,
    completed_by_name: t.completed_by ? userName.get(t.completed_by) ?? null : null,
  }))

  const missed_tasks = (missedRaw ?? []).map((t) => ({
    id: t.id,
    description: t.description,
    due_time: t.due_time,
    assignee_name: t.assignee_id ? userName.get(t.assignee_id) ?? null : null,
  }))

  return json({ completed_tasks, missed_tasks })
}
