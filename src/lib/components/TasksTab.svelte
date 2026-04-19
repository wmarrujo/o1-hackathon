<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Task } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle, Circle, MapPin, RefreshCw, StickyNote } from 'lucide-svelte';
	import TaskFormModal from '$lib/components/TaskFormModal.svelte';
	import NoteInlineForm from '$lib/components/NoteInlineForm.svelte';

	let { patientId, userId, userEmail }: { patientId: string; userId: string; userEmail: string } = $props();

	type Filter = 'all' | 'incomplete' | 'mine' | 'overdue';

	let tasks = $state<Task[]>([]);
	let loading = $state(true);
	let filter = $state<Filter>('incomplete');
	let showForm = $state(false);
	let editingTask = $state<Task | null>(null);
	let noteTaskId = $state<string | null>(null);

	onMount(loadTasks);

	async function loadTasks() {
		loading = true;
		const { data } = await supabase
			.from('tasks')
			.select('*')
			.eq('patient_id', patientId)
			.order('due_time', { ascending: true, nullsFirst: false });
		tasks = data ?? [];
		loading = false;
	}

	async function toggleComplete(task: Task) {
		const now = new Date().toISOString();
		const updates = task.complete
			? { complete: false, completed_at: null, completed_by: null }
			: { complete: true, completed_at: now, completed_by: userId };

		const { data } = await supabase
			.from('tasks')
			.update(updates)
			.eq('id', task.id)
			.select()
			.single();

		if (data) tasks = tasks.map((t) => (t.id === task.id ? data : t));
	}

	function isOverdue(task: Task) {
		if (task.complete || !task.due_time) return false;
		return new Date(task.due_time) < new Date();
	}

	let filtered = $derived(
		tasks.filter((t) => {
			if (filter === 'incomplete') return !t.complete;
			if (filter === 'mine') return t.assignee_id === userId;
			if (filter === 'overdue') return isOverdue(t);
			return true;
		})
	);

	function formatDateTime(iso: string | null | undefined) {
		if (!iso) return '';
		return new Date(iso).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	$effect(() => {
		if (!showForm) editingTask = null;
	});
</script>

<div class="p-4">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold">Tasks</h2>
		<Button size="sm" onclick={() => { editingTask = null; showForm = true; }}>+ Add task</Button>
	</div>

	<!-- Filters -->
	<div class="mb-4 flex gap-2 overflow-x-auto pb-1">
		{#each [['incomplete', 'Incomplete'], ['all', 'All'], ['mine', 'Mine'], ['overdue', 'Overdue']] as [val, label]}
			<button
				class="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors
					{filter === val ? 'bg-primary text-primary-foreground' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
				onclick={() => (filter = val as Filter)}
			>
				{label}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="flex justify-center py-12">
			<div class="text-muted-foreground text-sm">Loading tasks…</div>
		</div>
	{:else if filtered.length === 0}
		<div class="py-12 text-center">
			<p class="text-muted-foreground text-sm">No tasks match this filter.</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each filtered as task}
				<div
					class="rounded-xl border bg-white p-3 shadow-sm {task.complete ? 'opacity-60' : ''}"
				>
					<div class="flex items-start gap-3">
						<button
							class="mt-0.5 shrink-0 transition-colors"
							onclick={() => toggleComplete(task)}
							aria-label={task.complete ? 'Mark incomplete' : 'Mark complete'}
						>
							{#if task.complete}
								<CheckCircle class="h-6 w-6 text-green-500" />
							{:else}
								<Circle class="h-6 w-6 text-slate-400 hover:text-primary" />
							{/if}
						</button>

						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium {task.complete ? 'line-through text-muted-foreground' : ''}">
								{task.description}
							</p>

							<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
								{#if task.due_time}
									<span>Due {formatDateTime(task.due_time)}</span>
								{/if}
								{#if task.start_time && !task.due_time}
									<span>Starts {formatDateTime(task.start_time)}</span>
								{/if}
								{#if task.location}
									<span class="flex items-center gap-0.5">
										<MapPin class="h-3 w-3" />{task.location}
									</span>
								{/if}
								{#if task.repeat}
									<span class="flex items-center gap-0.5">
										<RefreshCw class="h-3 w-3" />{task.repeat}
									</span>
								{/if}
							</div>

							{#if isOverdue(task)}
								<Badge variant="destructive" class="mt-1 text-xs">Overdue</Badge>
							{/if}

							{#if task.complete && task.completed_at}
								<p class="mt-1 text-xs text-green-600">
									Completed {formatDateTime(task.completed_at)}
								</p>
							{/if}
						</div>

						<div class="flex shrink-0 flex-col items-end gap-1">
							<button
								class="text-xs text-slate-400 hover:text-slate-600"
								onclick={() => { editingTask = task; showForm = true; }}
							>
								Edit
							</button>
							<button
								class="flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600"
								onclick={() => (noteTaskId = noteTaskId === task.id ? null : task.id)}
							>
								<StickyNote class="h-3 w-3" />
								Note
							</button>
						</div>
					</div>

					{#if noteTaskId === task.id}
						<div class="mt-3 border-t pt-3">
							<NoteInlineForm
								{patientId}
								taskId={task.id}
								{userId}
								onSaved={() => (noteTaskId = null)}
							/>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showForm}
	<TaskFormModal
		{patientId}
		{userId}
		task={editingTask}
		onClose={() => (showForm = false)}
		onSaved={loadTasks}
	/>
{/if}
