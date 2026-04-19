<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import RemoteCheckinTab from '$lib/components/RemoteCheckinTab.svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import { CheckCircle2, Circle, CalendarDays, ListChecks, FileText, Clock, MapPin } from 'lucide-svelte';
	import type { Task, ScheduleEvent } from '$lib/types';

	let { data } = $props();

	let isCoordinator = $derived(data.userRole.role === 'coordinator');
	let isCaregiver = $derived(data.userRole.role === 'caregiver');

	// ── Caregiver home state ───────────────────────────────────
	let myTasks = $state<Task[]>([]);
	let upcomingShifts = $state<ScheduleEvent[]>([]);
	let loading = $state(true);
	let togglingId = $state<string | null>(null);

	onMount(async () => {
		if (!isCaregiver) return;

		const now = new Date();
		const next4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

		const [tasksRes, shiftsRes] = await Promise.all([
			supabase
				.from('tasks')
				.select('*')
				.eq('patient_id', data.patient.id)
				.eq('assignee_id', data.userId)
				.eq('complete', false)
				.order('due_time', { ascending: true, nullsFirst: false }),
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
		upcomingShifts = shiftsRes.data ?? [];
		loading = false;
	});

	async function markComplete(task: Task) {
		togglingId = task.id;
		await supabase
			.from('tasks')
			.update({ complete: true, completed_at: new Date().toISOString(), completed_by: data.userId })
			.eq('id', task.id);
		myTasks = myTasks.filter((t) => t.id !== task.id);
		togglingId = null;
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


</script>

{#if isCoordinator}
	<div class="mx-auto max-w-3xl">
		<RemoteCheckinTab patientId={data.patient.id} />
	</div>

{:else if isCaregiver}
	<div class="mx-auto max-w-2xl px-4 py-6">

		<!-- Greeting -->
		<div class="mb-6">
			<h1 class="text-2xl font-semibold">Hi, {data.userFullName.split(' ')[0]}</h1>
			<p class="text-sm text-muted-foreground">Caring for {data.patient.full_name}</p>
		</div>

		<!-- Upcoming shifts -->
		{#if upcomingShifts.length > 0}
			<section class="mb-6">
				<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
					Upcoming shifts
				</h2>
				<div class="flex flex-col gap-2">
					{#each upcomingShifts as shift, i (shift.id)}
						<div class="rounded-xl border bg-card px-4 py-3">
							<div class="flex items-center gap-3">
								<Clock class="h-4 w-4 shrink-0 text-primary" />
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium">{shift.title}</p>
									<p class="text-xs text-muted-foreground">
										{new Date(shift.dtstart).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
										·
										{new Date(shift.dtstart).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}–{new Date(shift.dtend).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
									</p>
								</div>
								{#if new Date(shift.dtstart) <= new Date()}
									<span class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Now</span>
								{/if}
							</div>
							{#if i === 0 && shift.additional_notes}
								<p class="mt-2 border-t pt-2 text-xs leading-relaxed text-muted-foreground">{shift.additional_notes}</p>
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- My tasks -->
		<section class="mb-8">
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
				Your tasks
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
							onclick={() => markComplete(task)}
							disabled={togglingId === task.id}
							class="flex w-full items-start gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
						>
							{#if togglingId === task.id}
								<CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
							{:else}
								<Circle class="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
							{/if}
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium leading-snug">{task.description}</p>
								<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
									{#if task.due_time}
										<span class="{new Date(task.due_time) < new Date() ? 'text-destructive font-medium' : ''}">
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

		<!-- Secondary navigation -->
		<div class="flex gap-3">
			<a
				href="/{data.patient.id}/tasks"
				class="flex flex-1 items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
			>
				<ListChecks class="h-4 w-4 text-muted-foreground" />
				All tasks
			</a>
			<a
				href="/{data.patient.id}/schedule"
				class="flex flex-1 items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
			>
				<CalendarDays class="h-4 w-4 text-muted-foreground" />
				Schedule
			</a>
			<a
				href="/{data.patient.id}/notes"
				class="flex flex-1 items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
			>
				<FileText class="h-4 w-4 text-muted-foreground" />
				Notes
			</a>
		</div>
	</div>

{:else}
	<!-- gov_coordinator and other roles -->
	<div class="mx-auto max-w-3xl px-4 py-8">
		<h1 class="mb-1 text-2xl font-semibold">{data.patient.full_name}</h1>
		<p class="text-sm text-muted-foreground">Use the tabs below to view tasks, schedule, and notes.</p>
	</div>
{/if}
