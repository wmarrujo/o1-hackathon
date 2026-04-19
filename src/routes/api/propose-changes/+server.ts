/**
 * POST /api/propose-changes
 *
 * Validates a structured payload of AI-proposed task edits and notes before
 * presenting them to the user for confirmation. Does not write to the database —
 * the confirm-changes page applies the changes after user approval.
 *
 * patient_id is supplied by the calling server (checkout/api), not the AI agent,
 * since the agent has no knowledge of the patient context.
 *
 * Request: application/json
 *   {
 *     patient_id: string (UUID)
 *     task_edits: { id: UUID, complete: boolean }[]
 *     notes:      { content: string, task_id?: UUID | null }[]
 *   }
 *
 * Response 200: { ok: true, changes: LLMPayload }
 * Response 400: { error: string }  — field-level validation failure
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { validateProposeChanges } from '$lib/proposeChanges'

export type { LLMPayload } from '$lib/proposeChanges'

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = validateProposeChanges(body)
  if (!result.ok) {
    return json({ error: result.error }, { status: result.status })
  }

  return json({ ok: true, changes: result.changes })
}
