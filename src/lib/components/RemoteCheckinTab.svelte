<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import { supabase } from '$lib/supabaseClient';
	import { Button } from '$lib/components/ui/button';
	import {
		Loader2,
		RefreshCw,
		CheckCircle2,
		AlertTriangle,
		Sparkles,
		TrendingUp,
		Clock,
		CalendarDays
	} from 'lucide-svelte';

	let { patientId }: { patientId: string } = $props();

	type CompletedTask = { id: string; description: string; completed_at: string | null; completed_by_name: string | null };
	type PendingTask = { id: string; description: string; due_time: string | null; assignee_name: string | null };
	type ScheduledEvent = {
		id: string;
		title: string;
		event_type: 'shift' | 'appointment' | 'medication' | 'other';
		dtstart: string;
		dtend: string;
		assignee_name: string | null;
	};
	type TasksPayload = {
		completed_today: CompletedTask[];
		pending_today: PendingTask[];
		missed: PendingTask[];
		events_today: ScheduledEvent[];
	};
	type TodayPayload = { summary: string };
	type TrendsPayload = { trends: string; future_issues: string };

	let tasksLoading = $state(true);
	let tasksError = $state('');
	let tasksData = $state<TasksPayload | null>(null);

	let todayLoading = $state(true);
	let todayError = $state('');
	let todayData = $state<TodayPayload | null>(null);

	let trendsLoading = $state(true);
	let trendsError = $state('');
	let trendsData = $state<TrendsPayload | null>(null);

	marked.setOptions({ gfm: true, breaks: true });

	onMount(run);

	async function authHeader(): Promise<string> {
		const { data } = await supabase.auth.getSession();
		return data.session ? `Bearer ${data.session.access_token}` : '';
	}

	async function fetchJson<T>(path: string): Promise<T> {
		const res = await fetch(path, { headers: { Authorization: await authHeader() } });
		const text = await res.text();
		let body: any = null;
		try {
			body = text ? JSON.parse(text) : null;
		} catch {
			throw new Error(`Server returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
		}
		if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
		return body as T;
	}

	async function run() {
		tasksLoading = true; tasksError = ''; tasksData = null;
		todayLoading = true; todayError = ''; todayData = null;
		trendsLoading = true; trendsError = ''; trendsData = null;

		const base = `/${encodeURIComponent(patientId)}/remote-checkin/api`;

		fetchJson<TasksPayload>(`${base}/tasks`)
			.then((d) => { tasksData = d; })
			.catch((e) => { tasksError = e.message ?? String(e); console.error('[remote-checkin tasks]', e); })
			.finally(() => { tasksLoading = false; });

		fetchJson<TodayPayload>(`${base}/today`)
			.then((d) => { todayData = d; })
			.catch((e) => { todayError = e.message ?? String(e); console.error('[remote-checkin today]', e); })
			.finally(() => { todayLoading = false; });

		fetchJson<TrendsPayload>(`${base}/trends`)
			.then((d) => { trendsData = d; })
			.catch((e) => { trendsError = e.message ?? String(e); console.error('[remote-checkin trends]', e); })
			.finally(() => { trendsLoading = false; });
	}

	let anyLoading = $derived(tasksLoading || todayLoading || trendsLoading);

	function formatTime(iso: string | null): string {
		if (!iso) return '';
		return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function formatDueTime(iso: string | null): string {
		if (!iso) return '';
		const d = new Date(iso);
		const now = new Date();
		const sameDay =
			d.getFullYear() === now.getFullYear() &&
			d.getMonth() === now.getMonth() &&
			d.getDate() === now.getDate();
		if (sameDay) return formatTime(iso);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + formatTime(iso);
	}

	function renderMd(s: string): string {
		return marked.parse(s) as string;
	}

	const eventLabel: Record<ScheduledEvent['event_type'], string> = {
		shift: 'Shift',
		appointment: 'Appointment',
		medication: 'Medication',
		other: 'Event'
	};
</script>

<div class="p-4 pb-6">
	<div class="mb-5 flex items-center justify-between">
		<div>
			<h2 class="font-display text-lg font-semibold">Remote check-in</h2>
			<p class="text-muted-foreground text-xs">Today's status at a glance</p>
		</div>
		<Button size="sm" variant="outline" onclick={run} disabled={anyLoading} class="gap-1.5">
			{#if anyLoading}
				<Loader2 class="h-3.5 w-3.5 animate-spin" />
			{:else}
				<RefreshCw class="h-3.5 w-3.5" />
			{/if}
			Refresh
		</Button>
	</div>

	<!-- TODAY SECTION -->
	<div class="mb-6">
		<h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today</h3>

		<div class="space-y-4">
			<!-- Today AI summary -->
			<section class="rounded-xl border bg-white p-4 shadow-sm">
				<div class="mb-2 flex items-center gap-2">
					<Sparkles class="h-4 w-4 text-primary" />
					<h3 class="text-sm font-semibold">Summary</h3>
					{#if todayLoading}<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />{/if}
				</div>
				{#if todayLoading}
					<p class="text-sm text-muted-foreground">Reading today's notes…</p>
				{:else if todayError}
					<p class="text-sm text-destructive">{todayError}</p>
				{:else if todayData?.summary}
					<div class="prose prose-sm max-w-none text-slate-700">{@html renderMd(todayData.summary)}</div>
				{:else}
					<p class="text-sm text-muted-foreground">No summary available.</p>
				{/if}
			</section>

			<!-- Completed today -->
			<section class="rounded-xl border bg-white p-4 shadow-sm">
				<div class="mb-2 flex items-center gap-2">
					<CheckCircle2 class="h-4 w-4 text-emerald-600" />
					<h3 class="text-sm font-semibold">
						Completed today{tasksData ? ` (${tasksData.completed_today.length})` : ''}
					</h3>
					{#if tasksLoading}<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />{/if}
				</div>
				{#if tasksLoading}
					<p class="text-sm text-muted-foreground">Loading…</p>
				{:else if tasksError}
					<p class="text-sm text-destructive">{tasksError}</p>
				{:else if tasksData && tasksData.completed_today.length === 0}
					<p class="text-sm text-muted-foreground">Nothing completed yet today.</p>
				{:else if tasksData}
					<ul class="space-y-2">
						{#each tasksData.completed_today as t}
							<li class="flex items-start justify-between gap-3 text-sm">
								<span class="text-slate-700">{t.description}</span>
								<span class="shrink-0 text-xs text-slate-400">
									{t.completed_by_name ?? 'unknown'} · {formatTime(t.completed_at)}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<!-- Pending today -->
			<section class="rounded-xl border bg-white p-4 shadow-sm">
				<div class="mb-2 flex items-center gap-2">
					<Clock class="h-4 w-4 text-blue-600" />
					<h3 class="text-sm font-semibold">
						Pending today{tasksData ? ` (${tasksData.pending_today.length})` : ''}
					</h3>
					{#if tasksLoading}<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />{/if}
				</div>
				{#if tasksLoading}
					<p class="text-sm text-muted-foreground">Loading…</p>
				{:else if tasksError}
					<p class="text-sm text-destructive">{tasksError}</p>
				{:else if tasksData && tasksData.pending_today.length === 0}
					<p class="text-sm text-muted-foreground">Nothing pending.</p>
				{:else if tasksData}
					<ul class="space-y-2">
						{#each tasksData.pending_today as t}
							<li class="flex items-start justify-between gap-3 text-sm">
								<span class="text-slate-700">{t.description}</span>
								<span class="shrink-0 text-xs text-slate-400">
									{t.assignee_name ?? 'unassigned'} · due {formatTime(t.due_time)}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<!-- Missed -->
			<section class="rounded-xl border bg-white p-4 shadow-sm">
				<div class="mb-2 flex items-center gap-2">
					<AlertTriangle class="h-4 w-4 text-red-600" />
					<h3 class="text-sm font-semibold">
						Missed{tasksData ? ` (${tasksData.missed.length})` : ''}
					</h3>
					{#if tasksLoading}<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />{/if}
				</div>
				{#if tasksLoading}
					<p class="text-sm text-muted-foreground">Loading…</p>
				{:else if tasksError}
					<p class="text-sm text-destructive">{tasksError}</p>
				{:else if tasksData && tasksData.missed.length === 0}
					<p class="text-sm text-muted-foreground">Nothing missed.</p>
				{:else if tasksData}
					<ul class="space-y-2">
						{#each tasksData.missed as t}
							<li class="flex items-start justify-between gap-3 text-sm">
								<span class="text-slate-700">{t.description}</span>
								<span class="shrink-0 text-xs text-slate-400">
									{t.assignee_name ?? 'unassigned'} · due {formatDueTime(t.due_time)}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<!-- Today's events -->
			<section class="rounded-xl border bg-white p-4 shadow-sm">
				<div class="mb-2 flex items-center gap-2">
					<CalendarDays class="h-4 w-4 text-violet-600" />
					<h3 class="text-sm font-semibold">
						Scheduled today{tasksData ? ` (${tasksData.events_today.length})` : ''}
					</h3>
					{#if tasksLoading}<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />{/if}
				</div>
				{#if tasksLoading}
					<p class="text-sm text-muted-foreground">Loading…</p>
				{:else if tasksError}
					<p class="text-sm text-destructive">{tasksError}</p>
				{:else if tasksData && tasksData.events_today.length === 0}
					<p class="text-sm text-muted-foreground">Nothing scheduled.</p>
				{:else if tasksData}
					<ul class="space-y-2">
						{#each tasksData.events_today as e}
							<li class="flex items-start justify-between gap-3 text-sm">
								<span class="text-slate-700">
									<span class="mr-1 text-xs uppercase tracking-wide text-slate-400">{eventLabel[e.event_type]}</span>
									{e.title}
								</span>
								<span class="shrink-0 text-xs text-slate-400">
									{e.assignee_name ?? 'unassigned'} · {formatTime(e.dtstart)}–{formatTime(e.dtend)}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</div>
	</div>

	<!-- TRENDS SECTION -->
	<div>
		<h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trends — past 7 days</h3>

		<div class="space-y-4">
			<section class="rounded-xl border bg-white p-4 shadow-sm">
				<div class="mb-2 flex items-center gap-2">
					<TrendingUp class="h-4 w-4 text-slate-600" />
					<h3 class="text-sm font-semibold">Patterns</h3>
					{#if trendsLoading}<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />{/if}
				</div>
				{#if trendsLoading}
					<p class="text-sm text-muted-foreground">Analyzing the past week…</p>
				{:else if trendsError}
					<p class="text-sm text-destructive">{trendsError}</p>
				{:else if trendsData?.trends}
					<div class="prose prose-sm max-w-none text-slate-700">{@html renderMd(trendsData.trends)}</div>
				{:else}
					<p class="text-sm text-muted-foreground">No trend data available.</p>
				{/if}
			</section>

			<section class="rounded-xl border bg-white p-4 shadow-sm">
				<div class="mb-2 flex items-center gap-2">
					<AlertTriangle class="h-4 w-4 text-amber-600" />
					<h3 class="text-sm font-semibold">Future issues to watch</h3>
					{#if trendsLoading}<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />{/if}
				</div>
				{#if trendsLoading}
					<p class="text-sm text-muted-foreground">Looking for signals…</p>
				{:else if trendsError}
					<p class="text-sm text-destructive">{trendsError}</p>
				{:else if trendsData?.future_issues}
					<div class="prose prose-sm max-w-none text-slate-700">{@html renderMd(trendsData.future_issues)}</div>
				{:else}
					<p class="text-sm text-muted-foreground">Nothing notable.</p>
				{/if}
			</section>
		</div>
	</div>
</div>
