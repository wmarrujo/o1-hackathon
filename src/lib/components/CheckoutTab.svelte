<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import type { LLMPayload } from '$lib/proposeChanges';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Separator } from '$lib/components/ui/separator';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import { Mic, Square, Send, Loader2, MessageCircle } from 'lucide-svelte';

	let { patientId, onDone }: { patientId: string; onDone?: () => void } = $props();

	type Phase = 'input' | 'confirm' | 'done';
	type Message = { role: 'user' | 'assistant'; content: string };
	type Task = { id: string; description: string; complete: boolean };

	async function authHeader(): Promise<string> {
		const { data } = await supabase.auth.getSession();
		return data.session ? `Bearer ${data.session.access_token}` : '';
	}

	// Phase
	let phase = $state<Phase>('input');

	// Input phase state
	let isRecording = $state(false);
	let transcript = $state('');
	let textInput = $state('');
	let error = $state('');
	let isTranscribing = $state(false);
	let isSubmitting = $state(false);
	let messages = $state<Message[]>([]);
	let pendingQuestion = $state('');
	let followUpAnswer = $state('');
	let isRecordingFollowUp = $state(false);
	let isTranscribingFollowUp = $state(false);
	let followUpMediaRecorder: MediaRecorder | null = null;
	let followUpAudioChunks: Blob[] = [];
	let mediaRecorder: MediaRecorder | null = null;
	let audioChunks: Blob[] = [];

	// Confirm phase state
	let pendingChanges = $state<LLMPayload | null>(null);
	let currentTasks = $state<Record<string, Task>>({});
	let loadingTasks = $state(false);
	let isConfirming = $state(false);

	function reset() {
		phase = 'input';
		transcript = '';
		textInput = '';
		messages = [];
		pendingQuestion = '';
		followUpAnswer = '';
		error = '';
		pendingChanges = null;
		currentTasks = {};
	}

	// ── Input phase ──────────────────────────────────────────────

	async function startRecording() {
		reset();
		audioChunks = [];
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		mediaRecorder = new MediaRecorder(stream);
		mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
		mediaRecorder.onstop = async () => {
			stream.getTracks().forEach((t) => t.stop());
			await transcribe(new Blob(audioChunks, { type: 'audio/webm' }));
		};
		mediaRecorder.start();
		isRecording = true;
	}

	function stopRecording() { mediaRecorder?.stop(); isRecording = false; }

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
			await sendToAgent([{ role: 'user', content: data.text }]);
		} catch (e: any) {
			error = e.message;
		} finally {
			isTranscribing = false;
		}
	}

	async function submitTextInput() {
		if (!textInput.trim()) return;
		transcript = textInput.trim();
		await sendToAgent([{ role: 'user', content: transcript }]);
	}

	async function sendToAgent(msgs: Message[]) {
		isSubmitting = true;
		error = '';
		try {
			const res = await fetch(`/${patientId}/checkout/api`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: await authHeader() },
				body: JSON.stringify({ patient_id: patientId, messages: msgs }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Agent error');

			if (data.question) {
				messages = [...msgs, { role: 'assistant', content: data.question }];
				pendingQuestion = data.question;
				followUpAnswer = '';
			} else {
				pendingChanges = data.changes;
				await fetchTaskDetails(data.changes);
				phase = 'confirm';
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
		followUpMediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) followUpAudioChunks.push(e.data); };
		followUpMediaRecorder.onstop = async () => {
			stream.getTracks().forEach((t) => t.stop());
			isTranscribingFollowUp = true;
			try {
				const formData = new FormData();
				formData.append('audio', new Blob(followUpAudioChunks, { type: 'audio/webm' }), 'recording.webm');
				const res = await fetch('/speech-to-text/api', {
					method: 'POST',
					headers: { Authorization: await authHeader() },
					body: formData,
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error ?? 'Transcription failed');
				followUpAnswer = data.text;
				await submitFollowUp();
			} catch (e: any) {
				error = e.message;
			} finally {
				isTranscribingFollowUp = false;
			}
		};
		followUpMediaRecorder.start();
		isRecordingFollowUp = true;
	}

	function stopFollowUpRecording() { followUpMediaRecorder?.stop(); isRecordingFollowUp = false; }

	async function submitFollowUp() {
		if (!followUpAnswer.trim()) return;
		const updatedMessages: Message[] = [...messages, { role: 'user', content: followUpAnswer.trim() }];
		pendingQuestion = '';
		await sendToAgent(updatedMessages);
	}

	// ── Confirm phase ─────────────────────────────────────────────

	async function fetchTaskDetails(changes: LLMPayload) {
		if (changes.task_edits.length === 0) return;
		loadingTasks = true;
		const ids = changes.task_edits.map((e) => e.id);
		const { data, error: fetchError } = await supabase
			.from('tasks')
			.select('id, description, complete')
			.in('id', ids);
		if (fetchError) { error = fetchError.message; }
		else if (data) { for (const t of data) currentTasks[t.id] = t; }
		loadingTasks = false;
	}

	async function confirm() {
		if (!pendingChanges) return;
		isConfirming = true;
		error = '';
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) throw new Error('Not authenticated');

			const taskUpdates = pendingChanges.task_edits.map(({ id, ...fields }) =>
				supabase.from('tasks').update(fields).eq('id', id)
			);
			const noteInserts = pendingChanges.notes.length > 0
				? [supabase.from('notes').insert(pendingChanges.notes.map((n) => ({ ...n, author_id: user.id })))]
				: [];

			const results = await Promise.all([...taskUpdates, ...noteInserts]);
			const failed = results.find((r) => r.error);
			if (failed?.error) throw new Error(failed.error.message);

			phase = 'done';
		} catch (e: any) {
			error = e.message;
		} finally {
			isConfirming = false;
		}
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8">

	<!-- ── Input phase ───────────────────────────────────────── -->
	{#if phase === 'input'}
		<h2 class="mb-1 text-xl font-semibold">Check-out</h2>
		<p class="mb-6 text-sm text-muted-foreground">
			Record what you did during your visit and we'll turn it into structured updates for the care team.
		</p>

		{#if !transcript}
			<div class="mb-4 flex items-center gap-3">
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
					<span class="text-sm font-medium text-destructive">Recording...</span>
				{/if}
				{#if isTranscribing}
					<span class="flex items-center gap-1 text-sm text-muted-foreground">
						<Loader2 class="h-4 w-4 animate-spin" />
						Transcribing...
					</span>
				{/if}
			</div>

			<div class="mb-4 flex items-center gap-3">
				<Separator class="flex-1" />
				<span class="text-xs text-muted-foreground">or type below</span>
				<Separator class="flex-1" />
			</div>

			<Textarea
				bind:value={textInput}
				placeholder="Describe what you did during the visit..."
				class="mb-3 resize-none"
				rows={4}
				disabled={isRecording || isTranscribing || isSubmitting}
				onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitTextInput(); } }}
			/>
			<Button onclick={submitTextInput} disabled={isSubmitting || isRecording || isTranscribing || !textInput.trim()} class="gap-2">
				{#if isSubmitting}
					<Loader2 class="h-4 w-4 animate-spin" />
					Processing...
				{:else}
					<Send class="h-4 w-4" />
					Submit
				{/if}
			</Button>
		{/if}

		{#if error}
			<p class="mb-4 mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
		{/if}

		{#if transcript}
			<Card class="mb-4">
				<CardContent class="pt-4">
					<div class="mb-2 flex items-center justify-between">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your check-out</p>
						<Button variant="ghost" size="sm" onclick={reset} class="h-7 text-xs">Start over</Button>
					</div>
					<p class="text-sm leading-relaxed">{transcript}</p>
				</CardContent>
			</Card>
		{/if}

		{#if isSubmitting && !pendingQuestion}
			<p class="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 class="h-4 w-4 animate-spin" />
				Processing...
			</p>
		{/if}

		{#if pendingQuestion}
			<Card class="mb-4 border-primary/30 bg-primary/5">
				<CardContent class="pt-4">
					<div class="mb-3 flex items-center gap-2">
						<MessageCircle class="h-4 w-4 text-primary" />
						<p class="text-xs font-semibold uppercase tracking-wide text-primary">Follow-up question</p>
					</div>
					<p class="mb-4 text-sm leading-relaxed">{pendingQuestion}</p>

					<div class="mb-4 flex items-center gap-2">
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

					<div class="mb-3 flex items-center gap-3">
						<Separator class="flex-1" />
						<span class="text-xs text-muted-foreground">or type below</span>
						<Separator class="flex-1" />
					</div>

					<Textarea
						bind:value={followUpAnswer}
						placeholder="Type your answer..."
						class="mb-3 resize-none"
						rows={3}
						disabled={isRecordingFollowUp || isTranscribingFollowUp || isSubmitting}
						onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitFollowUp(); } }}
					/>
					<Button onclick={submitFollowUp} disabled={isSubmitting || isRecordingFollowUp || isTranscribingFollowUp || !followUpAnswer.trim()} class="gap-2">
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

	<!-- ── Confirm phase ─────────────────────────────────────── -->
	{:else if phase === 'confirm'}
		<h2 class="mb-1 text-xl font-semibold">Review Changes</h2>
		<p class="mb-6 text-sm text-muted-foreground">Confirm to save, or go back to re-enter your check-out.</p>

		{#if pendingChanges && pendingChanges.task_edits.length > 0}
			<section class="mb-6">
				<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Task Changes ({pendingChanges.task_edits.length})
				</h3>
				<div class="flex flex-col gap-3">
					{#each pendingChanges.task_edits as edit (edit.id)}
						{@const current = currentTasks[edit.id]}
						<Card size="sm">
							<CardContent class="pt-4">
								{#if loadingTasks}
									<Skeleton class="mb-2 h-4 w-3/4" />
									<Skeleton class="h-3 w-1/2" />
								{:else if current}
									<p class="mb-2 text-sm font-medium">{current.description}</p>
									<div class="flex items-center gap-1 text-xs text-muted-foreground">
										<span class="font-medium text-foreground">complete:</span>
										<span class="line-through">{current.complete}</span>
										<span>→</span>
										<Badge variant={edit.complete ? 'default' : 'outline'}>{edit.complete}</Badge>
									</div>
								{:else}
									<p class="text-sm italic text-muted-foreground">Task not found: {edit.id}</p>
								{/if}
							</CardContent>
						</Card>
					{/each}
				</div>
			</section>
		{/if}

		{#if pendingChanges && pendingChanges.notes.length > 0}
			<section class="mb-6">
				<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					New Notes ({pendingChanges.notes.length})
				</h3>
				<div class="flex flex-col gap-3">
					{#each pendingChanges.notes as note, i (i)}
						<Card size="sm">
							<CardContent class="pt-4">
								<p class="mb-1 text-xs text-muted-foreground">
									{new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
									{#if note.task_id}&nbsp;· linked to task{/if}
								</p>
								<p class="text-sm leading-relaxed">{note.content}</p>
							</CardContent>
						</Card>
					{/each}
				</div>
			</section>
		{/if}

		{#if error}
			<p class="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
		{/if}

		<Separator class="mb-6" />

		<div class="flex justify-between">
			<Button variant="outline" onclick={reset} disabled={isConfirming}>Go back</Button>
			<Button onclick={confirm} disabled={isConfirming || loadingTasks}>
				{isConfirming ? 'Saving…' : 'Confirm Changes'}
			</Button>
		</div>

	<!-- ── Done ──────────────────────────────────────────────── -->
	{:else if phase === 'done'}
		<div class="py-8 text-center">
			<p class="mb-4 text-lg font-medium">Changes saved.</p>
			<Button onclick={() => onDone ? onDone() : goto(`/${patientId}/tasks`)}>Done</Button>
		</div>
	{/if}

</div>
