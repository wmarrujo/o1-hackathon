<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Task } from '$lib/types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle, Circle, MapPin, User, RefreshCw } from 'lucide-svelte';
	import TaskFormModal from '$lib/components/TaskFormModal.svelte';

	let { patientId, userId }: { patientId: string; userId: string } = $props();

	let tasks = $state<Task[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingTask = $state<Task | null>(null);

	onMount(() => {
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
			.from('tasks')
			.update(updates)
			.eq('id', task.id)
			.select()
			.single();

		if (data) {
			tasks = tasks.map((t) => (t.id === task.id ? data : t));
		}
	}

	function groupByDate(tasks: Task[]) {
		const groups: Record<string, Task[]> = {};
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (const task of tasks) {
			const key = task.due_time
				? new Date(task.due_time).toDateString()
				: task.start_time
				? new Date(task.start_time).toDateString()
				: 'No date';
			if (!groups[key]) groups[key] = [];
			groups[key].push(task);
		}
		return groups;
	}

	function formatDateLabel(dateStr: string) {
		if (dateStr === 'No date') return 'No date';
		const d = new Date(dateStr);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(today.getDate() + 1);
		if (d.toDateString() === today.toDateString()) return 'Today';
		if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
		return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
	}

	function formatTime(iso: string | null | undefined) {
		if (!iso) return '';
		return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function isOverdue(task: Task) {
		if (task.complete || !task.due_time) return false;
		return new Date(task.due_time) < new Date();
	}

	$effect(() => {
		if (!showForm) {
			editingTask = null;
		}
	});

	let grouped = $derived(groupByDate(tasks));
</script>

<div class="p-4">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-lg font-semibold">Schedule</h2>
		<Button size="sm" onclick={() => { editingTask = null; showForm = true; }}>+ Add task</Button>
	</div>

	{#if loading}
		<div class="flex justify-center py-12">
			<div class="text-muted-foreground text-sm">Loading schedule…</div>
		</div>
	{:else if tasks.length === 0}
		<div class="py-12 text-center">
			<p class="text-muted-foreground text-sm">No tasks scheduled yet.</p>
			<Button class="mt-4" onclick={() => (showForm = true)}>Add first task</Button>
		</div>
	{:else}
		<div class="space-y-6">
			{#each Object.entries(grouped) as [dateStr, dateTasks]}
				<div>
					<div class="mb-2 flex items-center gap-2">
						<h3 class="text-sm font-semibold">{formatDateLabel(dateStr)}</h3>
						<div class="h-px flex-1 bg-slate-200"></div>
					</div>
					<div class="space-y-2">
						{#each dateTasks as task}
							<div
								class="flex items-start gap-3 rounded-xl border bg-white p-3 shadow-sm transition-opacity {task.complete ? 'opacity-60' : ''}"
							>
								<button
									class="mt-0.5 shrink-0 text-slate-400 transition-colors hover:text-primary"
									onclick={() => toggleComplete(task)}
									aria-label={task.complete ? 'Mark incomplete' : 'Mark complete'}
								>
									{#if task.complete}
										<CheckCircle class="h-6 w-6 text-green-500" />
									{:else}
										<Circle class="h-6 w-6" />
									{/if}
								</button>

								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium {task.complete ? 'line-through text-muted-foreground' : ''}">
										{task.description}
									</p>

									<div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
										{#if task.start_time || task.due_time}
											<span>
												{#if task.start_time && task.due_time}
													{formatTime(task.start_time)} – {formatTime(task.due_time)}
												{:else if task.due_time}
													Due {formatTime(task.due_time)}
												{:else}
													Starts {formatTime(task.start_time)}
												{/if}
											</span>
										{/if}

										{#if task.location}
											<span class="flex items-center gap-0.5">
												<MapPin class="h-3 w-3" />
												{task.location}
											</span>
										{/if}

										{#if task.repeat}
											<span class="flex items-center gap-0.5">
												<RefreshCw class="h-3 w-3" />
												{task.repeat}
											</span>
										{/if}
									</div>

									{#if isOverdue(task)}
										<Badge variant="destructive" class="mt-1 text-xs">Overdue</Badge>
									{/if}

									{#if task.complete && task.completed_at}
										<p class="mt-1 text-xs text-green-600">
											Completed {new Date(task.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
										</p>
									{/if}
								</div>

								<button
									class="shrink-0 text-xs text-slate-400 hover:text-slate-600"
									onclick={() => { editingTask = task; showForm = true; }}
								>
									Edit
								</button>
							</div>
						{/each}
					</div>
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
