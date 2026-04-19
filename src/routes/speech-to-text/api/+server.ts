/**
 * POST /speech-to-text/api
 *
 * Transcribes an audio recording using the ElevenLabs Scribe API.
 *
 * Request: multipart/form-data
 *   audio  File  — audio blob (webm) recorded in the browser
 *
 * Response 200: { text: string }
 * Response 400: { error: string }  — missing audio field
 * Response 5xx: { error: string }  — ElevenLabs error, forwarded as-is
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { ELEVENLABS_API_KEY } from '$env/static/private'

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData()
  const audio = formData.get('audio') as File | null

  if (!audio) {
    return json({ error: 'No audio provided' }, { status: 400 })
  }

  const body = new FormData()
  body.append('file', audio, audio.name)
  body.append('model_id', 'scribe_v1')

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    body
  })

  const data = await res.json()

  if (!res.ok) {
    return json({ error: data?.detail ?? 'ElevenLabs error' }, { status: res.status })
  }

  return json({ text: data.text })
}
