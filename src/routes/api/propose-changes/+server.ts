import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export interface LLMPayload {
  task_edits: {
    id: string
    description?: string
    complete?: boolean
    start_time?: string | null
    due_time?: string | null
    location?: string | null
  }[]
  notes: {
    patient_id: string
    task_id?: string | null
    content: string
  }[]
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUUID(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return json({ error: 'Body must be a JSON object' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>

  // Validate task_edits
  if (!Array.isArray(raw.task_edits)) {
    return json({ error: 'task_edits must be an array' }, { status: 400 })
  }
  for (const edit of raw.task_edits) {
    if (typeof edit !== 'object' || edit === null) {
      return json({ error: 'Each task_edit must be an object' }, { status: 400 })
    }
    const e = edit as Record<string, unknown>
    if (!isUUID(e.id)) {
      return json({ error: `task_edit.id must be a valid UUID, got: ${e.id}` }, { status: 400 })
    }
    if ('complete' in e && typeof e.complete !== 'boolean') {
      return json({ error: 'task_edit.complete must be a boolean' }, { status: 400 })
    }
  }

  // Validate notes
  if (!Array.isArray(raw.notes)) {
    return json({ error: 'notes must be an array' }, { status: 400 })
  }
  for (const note of raw.notes) {
    if (typeof note !== 'object' || note === null) {
      return json({ error: 'Each note must be an object' }, { status: 400 })
    }
    const n = note as Record<string, unknown>
    if (!isUUID(n.patient_id)) {
      return json({ error: `note.patient_id must be a valid UUID, got: ${n.patient_id}` }, { status: 400 })
    }
    if (typeof n.content !== 'string' || n.content.trim() === '') {
      return json({ error: 'note.content must be a non-empty string' }, { status: 400 })
    }
    if ('task_id' in n && n.task_id !== null && !isUUID(n.task_id)) {
      return json({ error: `note.task_id must be a valid UUID or null, got: ${n.task_id}` }, { status: 400 })
    }
  }

  const changes: LLMPayload = {
    task_edits: (raw.task_edits as Record<string, unknown>[]).map((e) => ({
      id: e.id as string,
      ...(e.description !== undefined && { description: e.description as string }),
      ...(e.complete !== undefined && { complete: e.complete as boolean }),
      ...(e.start_time !== undefined && { start_time: e.start_time as string | null }),
      ...(e.due_time !== undefined && { due_time: e.due_time as string | null }),
      ...(e.location !== undefined && { location: e.location as string | null }),
    })),
    notes: (raw.notes as Record<string, unknown>[]).map((n) => ({
      patient_id: n.patient_id as string,
      content: (n.content as string).trim(),
      ...('task_id' in n && { task_id: n.task_id as string | null }),
    })),
  }

  return json({ ok: true, changes })
}
