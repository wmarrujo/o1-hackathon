import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// What the LLM sends — no patient_id, that's the server's job
interface LLMBody {
  patient_id: string
  task_edits: {
    id: string
    complete: boolean
  }[]
  notes: {
    content: string
    task_id?: string | null
  }[]
}

// What gets returned to the client for the preview page
export interface LLMPayload {
  task_edits: {
    id: string
    complete: boolean
  }[]
  notes: {
    content: string
    task_id?: string | null
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

  // Validate patient_id (set by the calling app, not the LLM)
  if (!isUUID(raw.patient_id)) {
    return json({ error: 'patient_id must be a valid UUID' }, { status: 400 })
  }
  const patient_id = raw.patient_id as string

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
    if (typeof e.complete !== 'boolean') {
      return json({ error: 'task_edit.complete is required and must be a boolean' }, { status: 400 })
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
      complete: e.complete as boolean,
    })),
    notes: (raw.notes as Record<string, unknown>[]).map((n) => ({
      content: (n.content as string).trim(),
      ...('task_id' in n && { task_id: (n as Record<string, unknown>).task_id as string | null }),
    })),
  }

  return json({ ok: true, changes })
}
