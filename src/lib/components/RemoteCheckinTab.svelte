<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import { Button } from '$lib/components/ui/button';
	import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, Sparkles, TrendingUp } from 'lucide-svelte';

	let { patientId }: { patientId: string } = $props();

	type CompletedTask = { id: string; description: string; completed_at: string | null; completed_by_name: string | null };
	type MissedTask = { id: string; description: string; due_time: string | null; assignee_name: string | null };
	type TasksPayload = { completed_tasks: CompletedTask[]; missed_tasks: MissedTask[] };
	type AiPayload = { summary: string; future_issues: string };

	let tasksLoading = $state(true);
	let tasksError = $state('');
	let tasksData = $state<TasksPayload | null>(null);

	let aiLoading = $state(true);
	let aiError = $state('');
	let aiData = $state<AiPayload | null>(null);

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
		tasksLoading = true;
		tasksError = '';
		tasksData = null;
		aiLoading = true;
		aiError = '';
		aiData = null;

		const base = `/${encodeURIComponent(patientId)}/remote-checkin/api`;

		fetchJson<TasksPayload>(`${base}/tasks`)
			.then((d) => { tasksData = d; })
			.catch((e) => { tasksError = e.message ?? String(e); console.error('[remote-checkin tasks]', e); })
			.finally(() => { tasksLoading = false; });

		fetchJson<AiPayload>(`${base}/ai`)
			.then((d) => { aiData = d; })
			.catch((e) => { aiError = e.message ?? String(e); console.error('[remote-checkin ai]', e); })
			.finally(() => { aiLoading = false; });
	}

	let anyLoading = $derived(tasksLoading || aiLoading);

	function formatTime(iso: string | null): string {
		if (!iso) return '';
		const d = new Date(iso);
		const today = new Date();
		if (d.toDateString() === today.toDateString()) {
			return 'Today ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
		}
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}
</script>

<div class="p-4 pb-6">
	<div class="mb-5 flex items-center justify-between">
		<div>
			<h2 class="font-display text-lg font-semibold">Remote check-in</h2>
			<p class="text-muted-foreground text-xs">Last 48 hours of activity</p>
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

	<div class="space-y-4">
		<!-- AI summary -->
		<section class="rounded-xl border bg-white p-4 shadow-sm">
			<div class="mb-2 flex items-center gap-2">
				<Sparkles class="h-4 w-4 text-primary" />
				<h3 class="text-sm font-semibold">Summary</h3>
				{#if aiLoading}
					<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
				{/if}
			</div>
			{#if aiLoading}
				<p class="text-sm text-muted-foreground">Analyzing recent notes and check-ins…</p>
			{:else if aiError}
				<p class="text-sm text-destructive">{aiError}</p>
			{:else if aiData?.summary}
				<p class="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{aiData.summary}</p>
			{:else}
				<p class="text-sm text-muted-foreground">No summary available.</p>
			{/if}
		</section>

		<!-- Future issues -->
		<section class="rounded-xl border bg-white p-4 shadow-sm">
			<div class="mb-2 flex items-center gap-2">
				<TrendingUp class="h-4 w-4 text-amber-600" />
				<h3 class="text-sm font-semibold">Future issues to watch</h3>
				{#if aiLoading}
					<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
				{/if}
			</div>
			{#if aiLoading}
				<p class="text-sm text-muted-foreground">Looking for trends…</p>
			{:else if aiError}
				<p class="text-sm text-destructive">{aiError}</p>
			{:else if aiData?.future_issues}
				<p class="text-sm leading-relaxed whitespace-pre-wrap text-slate-700">{aiData.future_issues}</p>
			{:else}
				<p class="text-sm text-muted-foreground">Nothing notable.</p>
			{/if}
		</section>

		<!-- Completed tasks -->
		<section class="rounded-xl border bg-white p-4 shadow-sm">
			<div class="mb-2 flex items-center gap-2">
				<CheckCircle2 class="h-4 w-4 text-emerald-600" />
				<h3 class="text-sm font-semibold">
					Tasks completed{tasksData ? ` (${tasksData.completed_tasks.length})` : ''}
				</h3>
				{#if tasksLoading}
					<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
				{/if}
			</div>
			{#if tasksLoading}
				<p class="text-sm text-muted-foreground">Loading…</p>
			{:else if tasksError}
				<p class="text-sm text-destructive">{tasksError}</p>
			{:else if tasksData && tasksData.completed_tasks.length === 0}
				<p class="text-sm text-muted-foreground">None in the last 48 hours.</p>
			{:else if tasksData}
				<ul class="space-y-2">
					{#each tasksData.completed_tasks as t}
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

		<!-- Missed tasks -->
		<section class="rounded-xl border bg-white p-4 shadow-sm">
			<div class="mb-2 flex items-center gap-2">
				<AlertTriangle class="h-4 w-4 text-red-600" />
				<h3 class="text-sm font-semibold">
					Tasks missed{tasksData ? ` (${tasksData.missed_tasks.length})` : ''}
				</h3>
				{#if tasksLoading}
					<Loader2 class="h-3.5 w-3.5 animate-spin text-muted-foreground" />
				{/if}
			</div>
			{#if tasksLoading}
				<p class="text-sm text-muted-foreground">Loading…</p>
			{:else if tasksError}
				<p class="text-sm text-destructive">{tasksError}</p>
			{:else if tasksData && tasksData.missed_tasks.length === 0}
				<p class="text-sm text-muted-foreground">Nothing overdue.</p>
			{:else if tasksData}
				<ul class="space-y-2">
					{#each tasksData.missed_tasks as t}
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
	</div>
</div>
