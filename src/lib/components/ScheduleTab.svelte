<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Task } from '$lib/types';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle2, Circle, MapPin, RefreshCw, CalendarX } from 'lucide-svelte';
	import TaskFormModal from '$lib/components/TaskFormModal.svelte';

	let { patientId, userId, onTaskSaved }: {
		patientId: string;
		userId: string;
		onTaskSaved: () => void;
	} = $props();

	let tasks = $state<Task[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingTask = $state<Task | null>(null);

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
			.from('tasks').update(updates).eq('id', task.id).select().single();
		if (data) tasks = tasks.map((t) => (t.id === task.id ? data : t));
	}

	function groupByDate(tasks: Task[]) {
		const groups: Record<string, Task[]> = {};
		for (const task of tasks) {
			const key = task.due_time
				? new Date(task.due_time).toDateString()
				: task.start_time
				? new Date(task.start_time).toDateString()
				: 'No date';
			(groups[key] ??= []).push(task);
		}
		return groups;
	}

	function formatDateLabel(dateStr: string) {
		if (dateStr === 'No date') return 'No date';
		const d = new Date(dateStr);
		const today = new Date(); today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
		if (d.toDateString() === today.toDateString()) return 'Today';
		if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
		return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
	}

	function formatTime(iso: string | null | undefined) {
		if (!iso) return '';
		return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function isOverdue(task: Task) {
		return !task.complete && !!task.due_time && new Date(task.due_time) < new Date();
	}

	function isToday(dateStr: string) {
		return new Date(dateStr).toDateString() === new Date().toDateString();
	}

	$effect(() => { if (!showForm) editingTask = null; });

	let grouped = $derived(groupByDate(tasks));
</script>

<div class="p-4 pb-6">
	<div class="mb-5 flex items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold">Schedule</h2>
			<p class="text-muted-foreground text-xs">
				{tasks.filter(t => !t.complete).length} tasks remaining
			</p>
		</div>
		<Button size="sm" onclick={() => { editingTask = null; showForm = true; }}>+ Add task</Button>
	</div>

	{#if loading}
		<div class="flex flex-col items-center justify-center gap-2 py-16">
			<div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
			<p class="text-muted-foreground text-sm">Loading schedule…</p>
		</div>
	{:else if tasks.length === 0}
		<div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
			<CalendarX class="text-muted-foreground h-10 w-10 opacity-40" />
			<p class="text-muted-foreground text-sm">No tasks scheduled yet.</p>
			<Button variant="outline" onclick={() => (showForm = true)}>Add first task</Button>
		</div>
	{:else}
		<div class="space-y-7">
			{#each Object.entries(grouped) as [dateStr, dateTasks]}
				<div>
					<!-- Date header -->
					<div class="mb-3 flex items-center gap-3">
						<div class="flex items-center gap-2">
							<span class="text-sm font-semibold {isToday(dateStr) ? 'text-primary' : 'text-slate-700'}">
								{formatDateLabel(dateStr)}
							</span>
							{#if isToday(dateStr)}
								<span class="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-white">Today</span>
							{/if}
						</div>
						<div class="h-px flex-1 bg-slate-200"></div>
						<span class="text-muted-foreground text-xs">{dateTasks.length}</span>
					</div>

					<div class="space-y-2">
						{#each dateTasks as task}
							<div class="group flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all
								{task.complete ? 'opacity-50' : 'hover:shadow-md'}">

								<!-- Checkbox -->
								<button
									class="mt-0.5 shrink-0 transition-colors"
									onclick={() => toggleComplete(task)}
									aria-label={task.complete ? 'Mark incomplete' : 'Mark complete'}
								>
									{#if task.complete}
										<CheckCircle2 class="h-5 w-5 text-green-500" />
									{:else}
										<Circle class="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
									{/if}
								</button>

								<!-- Content -->
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium leading-snug {task.complete ? 'line-through text-muted-foreground' : 'text-slate-800'}">
										{task.description}
									</p>

									<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
										{#if task.start_time || task.due_time}
											<span class="font-medium text-slate-500">
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
											<span class="flex items-center gap-1">
												<MapPin class="h-3 w-3" />{task.location}
											</span>
										{/if}
										{#if task.repeat}
											<span class="flex items-center gap-1">
												<RefreshCw class="h-3 w-3" />{task.repeat}
											</span>
										{/if}
									</div>

									{#if isOverdue(task)}
										<Badge variant="destructive" class="mt-2 text-[10px]">Overdue</Badge>
									{/if}

									{#if task.complete && task.completed_at}
										<p class="mt-1 text-xs text-green-600">
											✓ Completed at {formatTime(task.completed_at)}
										</p>
									{/if}
								</div>

								<!-- Edit button (visible on hover) -->
								<button
									class="shrink-0 rounded px-2 py-1 text-xs text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-600"
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
		onSaved={() => { loadTasks(); onTaskSaved(); }}
	/>
{/if}
