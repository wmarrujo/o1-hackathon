<script lang="ts">
  import { goto } from '$app/navigation'
  import { Button } from '$lib/components/ui/button'
  import { Card, CardContent } from '$lib/components/ui/card'
  import { Mic, Square, Send, Loader2 } from 'lucide-svelte'
  import { supabase } from '$lib/supabaseClient'

  async function authHeader(): Promise<string> {
    const { data } = await supabase.auth.getSession()
    return data.session ? `Bearer ${data.session.access_token}` : ''
  }

  let isRecording = $state(false)
  let transcript = $state('')
  let error = $state('')
  let isTranscribing = $state(false)
  let isSubmitting = $state(false)

  let mediaRecorder: MediaRecorder | null = null
  let audioChunks: Blob[] = []

  async function startRecording() {
    error = ''
    transcript = ''
    audioChunks = []

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      await transcribe(blob)
    }

    mediaRecorder.start()
    isRecording = true
  }

  function stopRecording() {
    mediaRecorder?.stop()
    isRecording = false
  }

  async function transcribe(blob: Blob) {
    isTranscribing = true
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const res = await fetch('/speech-to-text/api', {
        method: 'POST',
        headers: { Authorization: await authHeader() },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
      transcript = data.text
    } catch (e: any) {
      error = e.message
    } finally {
      isTranscribing = false
    }
  }

  async function submitCheckout() {
    if (!transcript.trim()) return
    isSubmitting = true
    error = ''
    try {
      const res = await fetch('/checkout/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: await authHeader() },
        body: JSON.stringify({ text: transcript }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Agent error')
      await goto('/confirm-changes', { state: { changes: data.changes } })
    } catch (e: any) {
      error = e.message
    } finally {
      isSubmitting = false
    }
  }
</script>

<div class="mx-auto max-w-2xl px-4 py-12">
  <h1 class="mb-2 text-2xl font-semibold">Caregiver Check-out</h1>
  <p class="mb-8 text-sm text-muted-foreground">
    Record what you did during your visit. We'll turn it into structured updates for the care team.
  </p>

  <div class="mb-6 flex gap-3">
    {#if !isRecording}
      <Button onclick={startRecording} disabled={isTranscribing || isSubmitting} class="gap-2">
        <Mic class="h-4 w-4" />
        Start Recording
      </Button>
    {:else}
      <Button variant="destructive" onclick={stopRecording} class="gap-2">
        <Square class="h-4 w-4" />
        Stop Recording
      </Button>
    {/if}
  </div>

  {#if isRecording}
    <p class="mb-4 text-sm font-medium text-destructive">Recording...</p>
  {/if}

  {#if isTranscribing}
    <p class="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 class="h-4 w-4 animate-spin" />
      Transcribing...
    </p>
  {/if}

  {#if error}
    <p class="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
  {/if}

  {#if transcript}
    <Card class="mb-4">
      <CardContent class="pt-4">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transcript</p>
        <p class="mb-4 text-sm leading-relaxed">{transcript}</p>
        <Button onclick={submitCheckout} disabled={isSubmitting} class="gap-2">
          {#if isSubmitting}
            <Loader2 class="h-4 w-4 animate-spin" />
            Sending...
          {:else}
            <Send class="h-4 w-4" />
            Submit Check-out
          {/if}
        </Button>
      </CardContent>
    </Card>
  {/if}
</div>
