<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Mic, Square, Send, Loader2, MessageCircle } from 'lucide-svelte';

	let { patientId }: { patientId: string } = $props();

	type Message = { role: 'user' | 'assistant'; content: string };

	async function authHeader(): Promise<string> {
		const { data } = await supabase.auth.getSession();
		return data.session ? `Bearer ${data.session.access_token}` : '';
	}

	let isRecording = $state(false);
	let transcript = $state('');
	let error = $state('');
	let isTranscribing = $state(false);
	let isSubmitting = $state(false);

	// Conversation state
	let messages = $state<Message[]>([]);
	let pendingQuestion = $state('');
	let followUpAnswer = $state('');

	// Follow-up dictation state
	let isRecordingFollowUp = $state(false);
	let isTranscribingFollowUp = $state(false);
	let followUpMediaRecorder: MediaRecorder | null = null;
	let followUpAudioChunks: Blob[] = [];

	let mediaRecorder: MediaRecorder | null = null;
	let audioChunks: Blob[] = [];

	function reset() {
		transcript = '';
		messages = [];
		pendingQuestion = '';
		followUpAnswer = '';
		error = '';
	}

	async function startRecording() {
		reset();
		audioChunks = [];

		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		mediaRecorder = new MediaRecorder(stream);

		mediaRecorder.ondataavailable = (e) => {
			if (e.data.size > 0) audioChunks.push(e.data);
		};

		mediaRecorder.onstop = async () => {
			stream.getTracks().forEach((t) => t.stop());
			const blob = new Blob(audioChunks, { type: 'audio/webm' });
			await transcribe(blob);
		};

		mediaRecorder.start();
		isRecording = true;
	}

	function stopRecording() {
		mediaRecorder?.stop();
		isRecording = false;
	}

	async function transcribe(blob: Blob) {
		isTranscribing = true;
		try {
			const formData = new FormData();
			formData.append('audio', blob, 'recording.webm');

			const res = await fetch('/speech-to-text/api', {
				method: 'POST',
				headers: { Authorization: await authHeader() },
				body: formData,
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Transcription failed');
			transcript = data.text;
			// Kick off the first turn automatically after transcription
			await sendToAgent([{ role: 'user', content: data.text }]);
		} catch (e: any) {
			error = e.message;
		} finally {
			isTranscribing = false;
		}
	}

	async function sendToAgent(msgs: Message[]) {
		isSubmitting = true;
		error = '';
		try {
			const res = await fetch('/checkout/api', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: await authHeader() },
				body: JSON.stringify({ patient_id: patientId, messages: msgs }),
			});

			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Agent error');

			if (data.question) {
				// Agent needs clarification — store message history and show the question
				messages = [...msgs, { role: 'assistant', content: data.question }];
				pendingQuestion = data.question;
				followUpAnswer = '';
			} else {
				await goto('/confirm-changes', { state: { changes: data.changes } });
			}
		} catch (e: any) {
			error = e.message;
		} finally {
			isSubmitting = false;
		}
	}

	async function startFollowUpRecording() {
		followUpAudioChunks = [];
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		followUpMediaRecorder = new MediaRecorder(stream);
		followUpMediaRecorder.ondataavailable = (e) => {
			if (e.data.size > 0) followUpAudioChunks.push(e.data);
		};
		followUpMediaRecorder.onstop = async () => {
			stream.getTracks().forEach((t) => t.stop());
			const blob = new Blob(followUpAudioChunks, { type: 'audio/webm' });
			isTranscribingFollowUp = true;
			try {
				const formData = new FormData();
				formData.append('audio', blob, 'recording.webm');
				const res = await fetch('/speech-to-text/api', {
					method: 'POST',
					headers: { Authorization: await authHeader() },
					body: formData,
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error ?? 'Transcription failed');
				followUpAnswer = data.text;
			} catch (e: any) {
				error = e.message;
			} finally {
				isTranscribingFollowUp = false;
			}
		};
		followUpMediaRecorder.start();
		isRecordingFollowUp = true;
	}

	function stopFollowUpRecording() {
		followUpMediaRecorder?.stop();
		isRecordingFollowUp = false;
	}

	async function submitFollowUp() {
		if (!followUpAnswer.trim()) return;
		const updatedMessages: Message[] = [
			...messages,
			{ role: 'user', content: followUpAnswer.trim() },
		];
		pendingQuestion = '';
		await sendToAgent(updatedMessages);
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8">
	<h2 class="mb-1 text-xl font-semibold">Check-out</h2>
	<p class="mb-6 text-sm text-muted-foreground">
		Record what you did during your visit and we'll turn it into structured updates for the care team.
	</p>

	<!-- Recording controls — hidden once we have a transcript -->
	{#if !transcript}
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
	{/if}

	{#if error}
		<p class="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
	{/if}

	<!-- Transcript card -->
	{#if transcript}
		<Card class="mb-4">
			<CardContent class="pt-4">
				<div class="mb-2 flex items-center justify-between">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your check-out</p>
					<Button variant="ghost" size="sm" onclick={reset} class="gap-1 text-xs h-7">
						<Mic class="h-3 w-3" />
						Re-record
					</Button>
				</div>
				<p class="text-sm leading-relaxed">{transcript}</p>
			</CardContent>
		</Card>
	{/if}

	<!-- Submitting spinner (first turn) -->
	{#if isSubmitting && !pendingQuestion}
		<p class="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
			<Loader2 class="h-4 w-4 animate-spin" />
			Processing...
		</p>
	{/if}

	<!-- Clarifying question from agent -->
	{#if pendingQuestion}
		<Card class="mb-4 border-primary/30 bg-primary/5">
			<CardContent class="pt-4">
				<div class="mb-3 flex items-center gap-2">
					<MessageCircle class="h-4 w-4 text-primary" />
					<p class="text-xs font-semibold uppercase tracking-wide text-primary">Follow-up question</p>
				</div>
				<p class="mb-4 text-sm leading-relaxed">{pendingQuestion}</p>
				<div class="mb-2 flex items-center gap-2">
					{#if !isRecordingFollowUp}
						<Button
							variant="outline"
							size="sm"
							onclick={startFollowUpRecording}
							disabled={isTranscribingFollowUp || isSubmitting}
							class="gap-1 shrink-0"
						>
							{#if isTranscribingFollowUp}
								<Loader2 class="h-3 w-3 animate-spin" />
								Transcribing...
							{:else}
								<Mic class="h-3 w-3" />
								Record answer
							{/if}
						</Button>
					{:else}
						<Button variant="destructive" size="sm" onclick={stopFollowUpRecording} class="gap-1 shrink-0">
							<Square class="h-3 w-3" />
							Stop
						</Button>
						<span class="text-xs font-medium text-destructive">Recording...</span>
					{/if}
				</div>
				<Textarea
					bind:value={followUpAnswer}
					placeholder="Type your answer or use the mic above..."
					class="mb-3 resize-none"
					rows={3}
					onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitFollowUp(); } }}
				/>
				<Button onclick={submitFollowUp} disabled={isSubmitting || !followUpAnswer.trim()} class="gap-2">
					{#if isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin" />
						Sending...
					{:else}
						<Send class="h-4 w-4" />
						Send Answer
					{/if}
				</Button>
			</CardContent>
		</Card>
	{/if}

</div>
