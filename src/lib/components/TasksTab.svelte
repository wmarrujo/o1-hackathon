<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Task } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle2, Circle, MapPin, RefreshCw, StickyNote, ClipboardList } from 'lucide-svelte';
	import TaskFormModal from '$lib/components/TaskFormModal.svelte';
	import NoteInlineForm from '$lib/components/NoteInlineForm.svelte';

	let { patientId, userId, canManageTasks, refreshKey = 0 }: {
		patientId: string;
		userId: string;
		canManageTasks: boolean;
		refreshKey?: number;
	} = $props();

	type Filter = 'all' | 'incomplete' | 'mine' | 'overdue';

	let tasks = $state<Task[]>([]);
	let loading = $state(true);
	let filter = $state<Filter>('incomplete');
	let showForm = $state(false);
	let editingTask = $state<Task | null>(null);
	let noteTaskId = $state<string | null>(null);

	onMount(loadTasks);

	// Reload whenever the parent increments refreshKey (e.g. after ScheduleTab saves)
	$effect(() => {
		refreshKey;
		loadTasks();
	});

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
			.from('tasks').update(updates).eq('id', task.id).select().single();
		if (data) tasks = tasks.map((t) => (t.id === task.id ? data : t));
	}

	function isOverdue(task: Task) {
		return !task.complete && !!task.due_time && new Date(task.due_time) < new Date();
	}

	let filtered = $derived(tasks.filter((t) => {
		if (filter === 'incomplete') return !t.complete;
		if (filter === 'mine') return t.assignee_id === userId;
		if (filter === 'overdue') return isOverdue(t);
		return true;
	}));

	let counts = $derived({
		incomplete: tasks.filter(t => !t.complete).length,
		all: tasks.length,
		mine: tasks.filter(t => t.assignee_id === userId).length,
		overdue: tasks.filter(t => isOverdue(t)).length,
	});

	function formatDateTime(iso: string | null | undefined) {
		if (!iso) return '';
		return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}

	$effect(() => { if (!showForm) editingTask = null; });

	let filterOptions = $derived<[Filter, string, number][]>([
		['incomplete', 'Incomplete', counts.incomplete],
		['all', 'All', counts.all],
		['mine', 'Mine', counts.mine],
		['overdue', 'Overdue', counts.overdue],
	]);
</script>

<div class="p-4 pb-6">
	<div class="mb-5 flex items-center justify-between">
		<div>
			<h2 class="font-display text-lg font-semibold">Tasks</h2>
			<p class="text-muted-foreground text-xs">{counts.incomplete} incomplete</p>
		</div>
		{#if canManageTasks}
			<Button size="sm" onclick={() => { editingTask = null; showForm = true; }}>+ Add task</Button>
		{/if}
	</div>

	<!-- Filters -->
	<div class="mb-4 flex gap-1.5 overflow-x-auto pb-1">
		{#each filterOptions as [val, label, count]}
			<button
				class="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors
					{filter === val
						? 'bg-primary text-primary-foreground shadow-sm'
						: 'bg-white border text-slate-600 hover:bg-slate-50'}"
				onclick={() => (filter = val)}
			>
				{label}
				{#if count > 0}
					<span class="rounded-full {filter === val ? 'bg-white/20' : 'bg-slate-100'} px-1.5 py-0.5 text-[10px] font-semibold">
						{count}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	{#if loading}
		<div class="flex flex-col items-center justify-center gap-2 py-16">
			<div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
			<p class="text-muted-foreground text-sm">Loading tasks…</p>
		</div>
	{:else if filtered.length === 0}
		<div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
			<ClipboardList class="text-muted-foreground h-10 w-10 opacity-40" />
			<p class="text-muted-foreground text-sm">No tasks match this filter.</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each filtered as task}
				<div class="group rounded-xl border bg-white shadow-sm transition-all {task.complete ? 'opacity-50' : 'hover:shadow-md'}">
					<div class="flex items-start gap-3 p-4">
						<button
							class="mt-0.5 shrink-0 transition-colors"
							onclick={() => toggleComplete(task)}
							aria-label={task.complete ? 'Mark incomplete' : 'Mark complete'}
						>
							{#if task.complete}
								<CheckCircle2 class="h-5 w-5 text-success" />
							{:else}
								<Circle class="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
							{/if}
						</button>

						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium leading-snug {task.complete ? 'line-through text-muted-foreground' : 'text-slate-800'}">
								{task.description}
							</p>

							<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
								{#if task.due_time}
									<span class="font-medium text-slate-500">Due {formatDateTime(task.due_time)}</span>
								{/if}
								{#if task.start_time && !task.due_time}
									<span class="font-medium text-slate-500">Starts {formatDateTime(task.start_time)}</span>
								{/if}
								{#if task.location}
									<span class="flex items-center gap-1"><MapPin class="h-3 w-3" />{task.location}</span>
								{/if}
								{#if task.repeat}
									<span class="flex items-center gap-1"><RefreshCw class="h-3 w-3" />{task.repeat}</span>
								{/if}
							</div>

							{#if isOverdue(task)}
								<Badge variant="destructive" class="mt-2 text-[10px]">Overdue</Badge>
							{/if}

							{#if task.complete && task.completed_at}
								<p class="mt-1 text-xs text-success">✓ Completed {formatDateTime(task.completed_at)}</p>
							{/if}
						</div>

						<div class="flex shrink-0 flex-col items-end gap-1">
							{#if canManageTasks}
								<button
									class="rounded px-2 py-1 text-xs text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
									onclick={() => { editingTask = task; showForm = true; }}
								>
									Edit
								</button>
							{/if}
							<button
								class="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
								onclick={() => (noteTaskId = noteTaskId === task.id ? null : task.id)}
							>
								<StickyNote class="h-3 w-3" />
								Note
							</button>
						</div>
					</div>

					{#if noteTaskId === task.id}
						<div class="border-t px-4 pb-3 pt-3">
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
