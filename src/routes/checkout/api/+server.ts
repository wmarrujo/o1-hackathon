/**
 * POST /checkout/api
 *
 * Orchestrates the caregiver check-out flow:
 *   1. Sends the transcribed check-out text to the DigitalOcean "test-agent",
 *      which returns a structured JSON payload of proposed task edits and notes.
 *   2. Injects the caller-supplied patient_id (the agent doesn't know it) as a
 *      top-level field, then forwards the payload to /api/propose-changes for
 *      validation.
 *   3. Returns the validated changes so the client can redirect to /confirm-changes.
 *
 * Request: application/json
 *   { text: string, patient_id: string (UUID) }
 *
 * Response 200: { ok: true, changes: LLMPayload }   — from /api/propose-changes
 * Response 400: { error: string }  — missing/invalid fields
 * Response 502: { error: string }  — agent returned non-JSON or unparseable reply
 * Response 5xx: { error: string }  — agent or propose-changes upstream error
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { DIGITALOCEAN_AGENT_ACCESS_KEY, DIGITALOCEAN_AGENT_ENDPOINT } from '$env/static/private'
import { validateProposeChanges } from '$lib/proposeChanges'

export const POST: RequestHandler = async ({ request }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text, patient_id } = body as Record<string, unknown>
  if (typeof text !== 'string' || text.trim() === '') {
    return json({ error: 'text must be a non-empty string' }, { status: 400 })
  }
  if (typeof patient_id !== 'string' || patient_id.trim() === '') {
    return json({ error: 'patient_id must be a non-empty string' }, { status: 400 })
  }
  const patientId: string = patient_id

  const res = await fetch(`${DIGITALOCEAN_AGENT_ENDPOINT}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DIGITALOCEAN_AGENT_ACCESS_KEY}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: text.trim() }],
    }),
  })

  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')

  if (!res.ok) {
    const detail = isJson
      ? (await res.json())?.error?.message
      : await res.text()
    return json({ error: detail ?? `Agent returned ${res.status}` }, { status: res.status })
  }

  if (!isJson) {
    const raw = await res.text()
    return json({ error: `Unexpected response from agent: ${raw.slice(0, 200)}` }, { status: 502 })
  }

  const data = await res.json()
  const replyText = data?.choices?.[0]?.message?.content ?? ''

  let parsed: unknown
  try {
    parsed = JSON.parse(replyText)
  } catch {
    return json({ error: `Agent reply was not valid JSON: ${replyText.slice(0, 200)}` }, { status: 502 })
  }

  // patient_id is a top-level field expected by /api/propose-changes
  const payload = parsed as Record<string, unknown>
  const proposePayload = {
    patient_id: patientId,
    task_edits: Array.isArray(payload.task_edits) ? payload.task_edits : [],
    notes: Array.isArray(payload.notes) ? payload.notes : [],
  }

  const result = validateProposeChanges(proposePayload)
  if (!result.ok) {
    return json({ error: result.error }, { status: result.status })
  }

  return json({ ok: true, changes: result.changes })
}
