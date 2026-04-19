<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import RemoteCheckinTab from '$lib/components/RemoteCheckinTab.svelte';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import { CheckCircle2, Circle, Clock, MapPin, User } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import type { Task, ScheduleEvent } from '$lib/types';

	let { data } = $props();

	let isCoordinator = $derived(data.userRole.role === 'coordinator');
	let isCaregiver = $derived(data.userRole.role === 'caregiver');

	// ── Caregiver home state ───────────────────────────────────
	let myTasks = $state<Task[]>([]);
	let otherTasks = $state<Task[]>([]);
	let upcomingShifts = $state<ScheduleEvent[]>([]);
	let loading = $state(true);

	onMount(async () => {
		if (!isCaregiver) return;

		const now = new Date();
		const next4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

		const [tasksRes, otherTasksRes, shiftsRes] = await Promise.all([
			supabase
				.from('tasks')
				.select('*')
				.eq('patient_id', data.patient.id)
				.eq('assignee_id', data.userId)
				.eq('complete', false)
				.order('due_time', { ascending: true, nullsFirst: false }),
			supabase
				.from('tasks')
				.select('*')
				.eq('patient_id', data.patient.id)
				.eq('complete', false)
				.or(`assignee_id.is.null,assignee_id.neq.${data.userId}`)
				.order('due_time', { ascending: true, nullsFirst: false })
				.limit(5),
			supabase
				.from('schedule_events')
				.select('*')
				.eq('patient_id', data.patient.id)
				.eq('assigned_user_id', data.userId)
				.eq('event_type', 'shift')
				.gte('dtend', now.toISOString())
				.lte('dtstart', next4Days.toISOString())
				.order('dtstart', { ascending: true })
				.limit(3),
		]);

		myTasks = tasksRes.data ?? [];
		otherTasks = otherTasksRes.data ?? [];
		upcomingShifts = shiftsRes.data ?? [];
		loading = false;
	});

	async function completeTask(task: Task, list: 'mine' | 'other') {
		// Optimistically remove from list
		if (list === 'mine') myTasks = myTasks.filter((t) => t.id !== task.id);
		else otherTasks = otherTasks.filter((t) => t.id !== task.id);

		const completedAt = new Date().toISOString();

		await supabase
			.from('tasks')
			.update({ complete: true, completed_at: completedAt, completed_by: data.userId })
			.eq('id', task.id);

		toast.success('Task completed', {
			duration: 4000,
			action: {
				label: 'Undo',
				onClick: async () => {
					await supabase
						.from('tasks')
						.update({ complete: false, completed_at: null, completed_by: null })
						.eq('id', task.id);
					if (list === 'mine') myTasks = [task, ...myTasks];
					else otherTasks = [task, ...otherTasks];
				}
			}
		});
	}

	function formatDue(iso: string) {
		const d = new Date(iso);
		const now = new Date();
		const diffMs = d.getTime() - now.getTime();
		const diffH = diffMs / (1000 * 60 * 60);
		if (diffH < 0) return 'Overdue';
		if (diffH < 1) return `Due in ${Math.round(diffMs / 60000)} min`;
		if (diffH < 24) return `Due in ${Math.round(diffH)}h`;
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function isOverdue(iso: string) {
		return new Date(iso) < new Date();
	}

	function getGreeting() {
		const h = new Date().getHours();
		if (h < 12) return 'Good morning';
		if (h < 17) return 'Good afternoon';
		return 'Good evening';
	}
</script>

{#if isCoordinator}
	<div class="mx-auto max-w-3xl">
		<RemoteCheckinTab patientId={data.patient.id} />
	</div>

{:else if isCaregiver}
	<!-- Gradient greeting banner -->
	<div class="bg-gradient-to-br from-primary/40 via-accent/20 to-background px-4 pb-6 pt-6">
		<div class="mx-auto max-w-2xl">
			<p class="mb-0.5 text-sm font-medium text-primary">{getGreeting()}</p>
			<h1 class="font-display text-3xl font-bold tracking-tight text-foreground">
				{data.userFullName.split(' ')[0]}
			</h1>
			<p class="mt-1 text-sm text-muted-foreground">Caring for {data.patient.full_name}</p>

			<!-- Upcoming shifts inline in banner -->
			{#if upcomingShifts.length > 0}
				<div class="mt-5 flex flex-col gap-2">
					{#each upcomingShifts as shift, i (shift.id)}
						<div class="rounded-xl border border-primary/20 bg-card px-4 py-3 shadow-sm">
							<div class="flex items-center gap-3">
								<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
									<Clock class="h-4 w-4 text-primary" />
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-semibold text-foreground">{shift.title}</p>
									<p class="text-xs text-muted-foreground">
										{new Date(shift.dtstart).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
										·
										{new Date(shift.dtstart).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}–{new Date(shift.dtend).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
									</p>
								</div>
								{#if new Date(shift.dtstart) <= new Date()}
									<span class="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">Now</span>
								{:else if i === 0}
									<span class="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">Next</span>
								{/if}
							</div>
							{#if i === 0 && shift.additional_notes}
								<p class="mt-2 border-t border-border pt-2 text-xs leading-relaxed text-muted-foreground">{shift.additional_notes}</p>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Task sections -->
	<div class="mx-auto max-w-2xl px-4 py-6">

		<!-- Your Tasks -->
		<section class="mb-8">
			<h2 class="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
				Your Tasks
			</h2>

			{#if loading}
				<div class="flex flex-col gap-3">
					{#each [1, 2, 3] as _}
						<Skeleton class="h-16 w-full rounded-xl" />
					{/each}
				</div>
			{:else if myTasks.length === 0}
				<p class="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
					No tasks assigned to you right now.
				</p>
			{:else}
				<div class="flex flex-col gap-2">
					{#each myTasks as task (task.id)}
						<button
							onclick={() => completeTask(task, 'mine')}
							class="flex w-full items-start gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
						>
							<Circle class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/50" />
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium leading-snug text-foreground">{task.description}</p>
								<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
									{#if task.due_time}
										<span class="font-medium {isOverdue(task.due_time) ? 'text-destructive' : 'text-primary/70'}">
											{formatDue(task.due_time)}
										</span>
									{/if}
									{#if task.location}
										<span class="flex items-center gap-0.5">
											<MapPin class="h-3 w-3" />{task.location}
										</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Other Tasks -->
		{#if !loading && otherTasks.length > 0}
			<section class="mb-6">
				<h2 class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					Other Tasks
				</h2>
				<div class="flex flex-col gap-2">
					{#each otherTasks as task (task.id)}
						<button
							onclick={() => completeTask(task, 'other')}
							class="flex w-full items-start gap-3 rounded-xl border border-dashed bg-card/60 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-card hover:shadow-md"
						>
							<Circle class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/30" />
							<div class="min-w-0 flex-1">
								<p class="text-sm text-foreground/70 leading-snug">{task.description}</p>
								<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
									{#if task.due_time}
										<span class="{isOverdue(task.due_time) ? 'text-destructive font-medium' : ''}">
											{formatDue(task.due_time)}
										</span>
									{/if}
									{#if !task.assignee_id}
										<span class="flex items-center gap-0.5 italic">
											<User class="h-3 w-3" />Unassigned
										</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
				<a
					href="/{data.patient.id}/tasks"
					class="mt-3 block text-center text-xs font-medium text-primary hover:underline"
				>
					View all tasks →
				</a>
			</section>
		{/if}
	</div>


{:else}
	<!-- gov_coordinator and other roles -->
	<div class="mx-auto max-w-3xl px-4 py-8">
		<h1 class="mb-1 text-2xl font-semibold">{data.patient.full_name}</h1>
		<p class="text-sm text-muted-foreground">Use the tabs below to view tasks, schedule, and notes.</p>
	</div>
{/if}
