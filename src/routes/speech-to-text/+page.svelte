<script lang="ts">
  let isRecording = $state(false)
  let transcript = $state('')
  let error = $state('')
  let isLoading = $state(false)

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
    isLoading = true
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const res = await fetch('/speech-to-text/api', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
      transcript = data.text
    } catch (e: any) {
      error = e.message
    } finally {
      isLoading = false
    }
  }
</script>

<div class="container">
  <h1>ElevenLabs Speech to Text</h1>

  <div class="controls">
    {#if !isRecording}
      <button onclick={startRecording} disabled={isLoading}>
        Start Recording
      </button>
    {:else}
      <button class="stop" onclick={stopRecording}>
        Stop Recording
      </button>
    {/if}
  </div>

  {#if isRecording}
    <p class="status recording">Recording...</p>
  {/if}

  {#if isLoading}
    <p class="status">Transcribing...</p>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  {#if transcript}
    <div class="transcript">
      <h2>Transcript</h2>
      <p>{transcript}</p>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 600px;
    margin: 60px auto;
    padding: 0 20px;
    font-family: sans-serif;
  }

  .controls {
    margin: 24px 0;
  }

  button {
    padding: 12px 28px;
    font-size: 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: #4f46e5;
    color: white;
  }

  button.stop {
    background: #dc2626;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status {
    color: #6b7280;
  }

  .status.recording {
    color: #dc2626;
    font-weight: bold;
  }

  .error {
    color: #dc2626;
    background: #fee2e2;
    padding: 12px;
    border-radius: 6px;
  }

  .transcript {
    margin-top: 24px;
    background: #f3f4f6;
    padding: 20px;
    border-radius: 8px;
  }

  .transcript h2 {
    margin: 0 0 12px;
    font-size: 18px;
  }

  .transcript p {
    margin: 0;
    line-height: 1.6;
  }
</style>
