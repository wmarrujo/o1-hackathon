/**
 * Shared validation logic for AI-proposed task edits and notes.
 * Called directly by server handlers to avoid an internal HTTP hop.
 */

export interface LLMPayload {
  task_edits: {
    id: string
    complete: boolean
  }[]
  notes: {
    patient_id: string
    content: string
    task_id?: string | null
  }[]
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUUID(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}

export type ProposeChangesResult =
  | { ok: true; changes: LLMPayload }
  | { ok: false; error: string; status: number }

export function validateProposeChanges(body: unknown): ProposeChangesResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Body must be a JSON object', status: 400 }
  }

  const raw = body as Record<string, unknown>

  if (!isUUID(raw.patient_id)) {
    return { ok: false, error: 'patient_id must be a valid UUID', status: 400 }
  }

  if (!Array.isArray(raw.task_edits)) {
    return { ok: false, error: 'task_edits must be an array', status: 400 }
  }
  for (const edit of raw.task_edits) {
    if (typeof edit !== 'object' || edit === null) {
      return { ok: false, error: 'Each task_edit must be an object', status: 400 }
    }
    const e = edit as Record<string, unknown>
    if (!isUUID(e.id)) {
      return { ok: false, error: `task_edit.id must be a valid UUID, got: ${e.id}`, status: 400 }
    }
    if (typeof e.complete !== 'boolean') {
      return { ok: false, error: 'task_edit.complete is required and must be a boolean', status: 400 }
    }
  }

  if (!Array.isArray(raw.notes)) {
    return { ok: false, error: 'notes must be an array', status: 400 }
  }
  for (const note of raw.notes) {
    if (typeof note !== 'object' || note === null) {
      return { ok: false, error: 'Each note must be an object', status: 400 }
    }
    const n = note as Record<string, unknown>
    if (typeof n.content !== 'string' || n.content.trim() === '') {
      return { ok: false, error: 'note.content must be a non-empty string', status: 400 }
    }
    if ('task_id' in n && n.task_id !== null && !isUUID(n.task_id)) {
      return { ok: false, error: `note.task_id must be a valid UUID or null, got: ${n.task_id}`, status: 400 }
    }
  }

  const changes: LLMPayload = {
    task_edits: (raw.task_edits as Record<string, unknown>[]).map((e) => ({
      id: e.id as string,
      complete: e.complete as boolean,
    })),
    notes: (raw.notes as Record<string, unknown>[]).map((n) => ({
      patient_id: raw.patient_id as string,
      content: (n.content as string).trim(),
      ...('task_id' in n && { task_id: (n as Record<string, unknown>).task_id as string | null }),
    })),
  }

  return { ok: true, changes }
}
