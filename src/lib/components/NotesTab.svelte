<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Note, Task } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Trash2, LinkIcon } from 'lucide-svelte';
	import NoteInlineForm from '$lib/components/NoteInlineForm.svelte';

	let { patientId, userId, userEmail }: { patientId: string; userId: string; userEmail: string } = $props();

	let notes = $state<Note[]>([]);
	let tasks = $state<Task[]>([]);
	let loading = $state(true);
	let showCompose = $state(false);

	onMount(load);

	async function load() {
		loading = true;
		const [{ data: noteData }, { data: taskData }] = await Promise.all([
			supabase
				.from('notes')
				.select('*')
				.eq('patient_id', patientId)
				.order('created_at', { ascending: false }),
			supabase
				.from('tasks')
				.select('id, description')
				.eq('patient_id', patientId)
		]);
		notes = noteData ?? [];
		tasks = (taskData as Task[]) ?? [];
		loading = false;
	}

	async function deleteNote(id: string) {
		await supabase.from('notes').delete().eq('id', id);
		notes = notes.filter((n) => n.id !== id);
	}

	function taskDescription(taskId: string | null | undefined) {
		if (!taskId) return null;
		return tasks.find((t) => t.id === taskId)?.description ?? null;
	}

	function formatDate(iso: string) {
		const d = new Date(iso);
		const today = new Date();
		if (d.toDateString() === today.toDateString()) {
			return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		}
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}
</script>

<div class="p-4">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold">Notes</h2>
		<Button size="sm" onclick={() => (showCompose = !showCompose)}>
			{showCompose ? 'Cancel' : '+ Add note'}
		</Button>
	</div>

	{#if showCompose}
		<div class="mb-4 rounded-xl border bg-white p-3 shadow-sm">
			<p class="mb-2 text-xs font-medium text-slate-500">General note (not linked to a task)</p>
			<NoteInlineForm
				{patientId}
				taskId={null}
				{userId}
				onSaved={() => { showCompose = false; load(); }}
			/>
		</div>
	{/if}

	{#if loading}
		<div class="flex justify-center py-12">
			<div class="text-muted-foreground text-sm">Loading notes…</div>
		</div>
	{:else if notes.length === 0}
		<div class="py-12 text-center">
			<p class="text-muted-foreground text-sm">No notes yet. Add one above.</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each notes as note}
				<div class="rounded-xl border bg-white p-3 shadow-sm">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							{#if note.task_id}
								{@const desc = taskDescription(note.task_id)}
								{#if desc}
									<div class="mb-1 flex items-center gap-1 text-xs text-slate-500">
										<LinkIcon class="h-3 w-3 shrink-0" />
										<span class="truncate">Re: {desc}</span>
									</div>
								{/if}
							{/if}
							<p class="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
						</div>
						{#if note.author_id === userId}
							<button
								class="shrink-0 text-slate-300 hover:text-red-500 transition-colors"
								onclick={() => deleteNote(note.id)}
								aria-label="Delete note"
							>
								<Trash2 class="h-4 w-4" />
							</button>
						{/if}
					</div>
					<p class="mt-2 text-xs text-slate-400">
						{formatDate(note.created_at)}
					</p>
				</div>
			{/each}
		</div>
	{/if}
</div>
