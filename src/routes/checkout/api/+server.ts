import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { DIGITALOCEAN_AGENT_ACCESS_KEY, DIGITALOCEAN_AGENT_ENDPOINT } from '$env/static/private'

export const POST: RequestHandler = async ({ request, fetch }) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { text } = body as Record<string, unknown>
  if (typeof text !== 'string' || text.trim() === '') {
    return json({ error: 'text must be a non-empty string' }, { status: 400 })
  }

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

  const proposeRes = await fetch('/api/propose-changes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed),
  })

  const proposeData = await proposeRes.json()
  if (!proposeRes.ok) {
    return json({ error: proposeData?.error ?? 'propose-changes error' }, { status: proposeRes.status })
  }

  return json(proposeData)
}
