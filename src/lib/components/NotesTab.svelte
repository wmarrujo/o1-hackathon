<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Note, Task } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Trash2, Link, NotebookPen } from 'lucide-svelte';
	import NoteInlineForm from '$lib/components/NoteInlineForm.svelte';

	let { patientId, userId }: { patientId: string; userId: string } = $props();

	let notes = $state<Note[]>([]);
	let tasks = $state<Pick<Task, 'id' | 'description'>[]>([]);
	let loading = $state(true);
	let showCompose = $state(false);

	onMount(load);

	async function load() {
		loading = true;
		const [{ data: noteData }, { data: taskData }] = await Promise.all([
			supabase.from('notes').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
			supabase.from('tasks').select('id, description').eq('patient_id', patientId)
		]);
		notes = noteData ?? [];
		tasks = (taskData as Pick<Task, 'id' | 'description'>[]) ?? [];
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
			return 'Today at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		}
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);
		if (d.toDateString() === yesterday.toDateString()) {
			return 'Yesterday at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		}
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}
</script>

<div class="p-4 pb-6">
	<div class="mb-5 flex items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold">Notes</h2>
			<p class="text-muted-foreground text-xs">{notes.length} note{notes.length === 1 ? '' : 's'}</p>
		</div>
		<Button size="sm" variant={showCompose ? 'secondary' : 'default'} onclick={() => (showCompose = !showCompose)}>
			{showCompose ? 'Cancel' : '+ Add note'}
		</Button>
	</div>

	{#if showCompose}
		<div class="mb-5 rounded-xl border bg-white p-4 shadow-sm">
			<p class="mb-3 text-xs font-medium text-slate-500">General note — not linked to a task</p>
			<NoteInlineForm
				{patientId}
				taskId={null}
				{userId}
				onSaved={() => { showCompose = false; load(); }}
			/>
		</div>
	{/if}

	{#if loading}
		<div class="flex flex-col items-center justify-center gap-2 py-16">
			<div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
			<p class="text-muted-foreground text-sm">Loading notes…</p>
		</div>
	{:else if notes.length === 0}
		<div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
			<NotebookPen class="text-muted-foreground h-10 w-10 opacity-40" />
			<p class="text-muted-foreground text-sm">No notes yet.</p>
			<Button variant="outline" onclick={() => (showCompose = true)}>Add first note</Button>
		</div>
	{:else}
		<div class="space-y-3">
			{#each notes as note}
				<div class="group rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md">
					{#if note.task_id}
						{@const desc = taskDescription(note.task_id)}
						{#if desc}
							<div class="mb-2 flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
								<Link class="h-3 w-3 shrink-0" />
								<span class="truncate">Re: {desc}</span>
							</div>
						{/if}
					{/if}

					<p class="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{note.content}</p>

					<div class="mt-3 flex items-center justify-between">
						<p class="text-xs text-slate-400">{formatDate(note.created_at)}</p>
						{#if note.author_id === userId}
							<button
								class="rounded p-1 text-slate-200 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-50 hover:text-red-400"
								onclick={() => deleteNote(note.id)}
								aria-label="Delete note"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
