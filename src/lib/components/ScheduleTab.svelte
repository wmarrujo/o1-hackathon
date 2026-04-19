<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import type { ScheduleEvent, UserProfile } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight, CalendarX } from 'lucide-svelte';
	import ShiftFormModal from '$lib/components/ShiftFormModal.svelte';

	let { patientId, userId }: { patientId: string; userId: string } = $props();

	// ── Calendar constants ────────────────────────────────────────────────────
	const HOUR_HEIGHT = 56; // px per hour
	const START_HOUR = 6;   // 6 am
	const END_HOUR = 22;    // 10 pm
	const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
	const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

	// ── State ──────────────────────────────────────────────────────────────────
	let events = $state<ScheduleEvent[]>([]);
	let members = $state<UserProfile[]>([]);
	let loading = $state(true);
	let showForm = $state(false);
	let editingEvent = $state<ScheduleEvent | null>(null);
	let newDefaults = $state<{ dtstart: string; dtend: string } | null>(null);

	// ── Week navigation ────────────────────────────────────────────────────────
	let weekStart = $state(getMonday(new Date()));

	function getMonday(d: Date): Date {
		const day = new Date(d);
		day.setHours(0, 0, 0, 0);
		const dow = day.getDay();
		day.setDate(day.getDate() - (dow === 0 ? 6 : dow - 1));
		return day;
	}

	let weekDays = $derived(
		Array.from({ length: 7 }, (_, i) => {
			const d = new Date(weekStart);
			d.setDate(weekStart.getDate() + i);
			return d;
		})
	);

	function prevWeek() {
		const d = new Date(weekStart);
		d.setDate(d.getDate() - 7);
		weekStart = d;
	}
	function nextWeek() {
		const d = new Date(weekStart);
		d.setDate(d.getDate() + 7);
		weekStart = d;
	}
	function goToday() {
		weekStart = getMonday(new Date());
	}

	// ── Data loading ──────────────────────────────────────────────────────────
	$effect(() => {
		const ws = weekStart; // establish dependency
		load(ws);
	});

	async function load(ws: Date) {
		loading = true;
		const end = new Date(ws);
		end.setDate(ws.getDate() + 7);

		const [{ data: evData }, { data: roleData }] = await Promise.all([
			supabase
				.from('schedule_events')
				.select('*')
				.eq('patient_id', patientId)
				.gte('dtstart', ws.toISOString())
				.lt('dtstart', end.toISOString())
				.order('dtstart'),
			supabase
				.from('user_roles')
				.select('users(id, full_name, email)')
				.eq('patient_id', patientId)
		]);

		events = evData ?? [];
		members = ((roleData ?? []).map((r: any) => r.users).filter(Boolean)) as UserProfile[];
		loading = false;
	}

	// ── Helpers ────────────────────────────────────────────────────────────────
	function eventsForDay(day: Date): ScheduleEvent[] {
		const str = day.toDateString();
		return events.filter((e) => new Date(e.dtstart).toDateString() === str);
	}

	function topPx(iso: string): number {
		const d = new Date(iso);
		const mins = d.getHours() * 60 + d.getMinutes() - START_HOUR * 60;
		return Math.max(0, (mins / 60) * HOUR_HEIGHT);
	}

	function heightPx(start: string, end: string): number {
		const ms = new Date(end).getTime() - new Date(start).getTime();
		return Math.max(20, (ms / 3600000) * HOUR_HEIGHT);
	}

	function formatHour(h: number): string {
		return h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`;
	}

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	}

	function memberName(uid: string | null): string {
		if (!uid) return 'Unassigned';
		return members.find((m) => m.id === uid)?.full_name ?? 'Unknown';
	}

	function isToday(day: Date): boolean {
		return day.toDateString() === new Date().toDateString();
	}

	function formatWeekRange(): string {
		const end = new Date(weekStart);
		end.setDate(weekStart.getDate() + 6);
		const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
		const startStr = weekStart.toLocaleDateString('en-US', opts);
		const endStr = end.toLocaleDateString('en-US',
			weekStart.getMonth() === end.getMonth() ? { day: 'numeric' } : opts
		);
		return `${startStr}–${endStr}, ${weekStart.getFullYear()}`;
	}

	// ── Color assignment per user ──────────────────────────────────────────────
	// Each caregiver gets a stable, theme-compatible color band
	const COLORS: { bg: string; border: string; text: string }[] = [
		{ bg: 'oklch(0.95 0.04 155)', border: 'oklch(0.55 0.1 155)', text: 'oklch(0.28 0.08 155)' },
		{ bg: 'oklch(0.96 0.06 50)',  border: 'oklch(0.68 0.13 50)',  text: 'oklch(0.28 0.08 50)'  },
		{ bg: 'oklch(0.94 0.04 240)', border: 'oklch(0.55 0.1 240)', text: 'oklch(0.28 0.08 240)' },
		{ bg: 'oklch(0.95 0.04 300)', border: 'oklch(0.55 0.1 300)', text: 'oklch(0.28 0.08 300)' },
		{ bg: 'oklch(0.95 0.05 20)',  border: 'oklch(0.55 0.15 20)', text: 'oklch(0.28 0.1 20)'   },
	];

	function colorFor(uid: string | null) {
		if (!uid) return COLORS[0];
		let h = 0;
		for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
		return COLORS[h % COLORS.length];
	}

	// ── Click-to-add ───────────────────────────────────────────────────────────
	function handleColumnClick(day: Date, e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const relY = e.clientY - rect.top;
		// Snap to 30-min slots
		const totalMins = START_HOUR * 60 + Math.floor(relY / HOUR_HEIGHT * 60 / 30) * 30;
		const clamped = Math.min(Math.max(totalMins, START_HOUR * 60), END_HOUR * 60 - 60);
		const start = new Date(day);
		start.setHours(Math.floor(clamped / 60), clamped % 60, 0, 0);
		const end = new Date(start);
		end.setHours(end.getHours() + 1);
		newDefaults = { dtstart: start.toISOString(), dtend: end.toISOString() };
		editingEvent = null;
		showForm = true;
	}

	// ── Form callbacks ─────────────────────────────────────────────────────────
	function onSaved(ev: ScheduleEvent) {
		// Insert or replace in local list
		const idx = events.findIndex((e) => e.id === ev.id);
		if (idx >= 0) events = events.map((e) => (e.id === ev.id ? ev : e));
		else events = [...events, ev].sort((a, b) => a.dtstart.localeCompare(b.dtstart));
		showForm = false;
	}

	function onDeleted(id: string) {
		events = events.filter((e) => e.id !== id);
		showForm = false;
	}

	const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex shrink-0 items-center justify-between px-4 py-3 border-b bg-card">
		<div class="flex items-center gap-2">
			<button
				class="rounded-full p-1.5 hover:bg-muted transition-colors"
				onclick={prevWeek}
				aria-label="Previous week"
			>
				<ChevronLeft class="h-4 w-4 text-muted-foreground" />
			</button>
			<span class="font-display text-sm font-semibold">{formatWeekRange()}</span>
			<button
				class="rounded-full p-1.5 hover:bg-muted transition-colors"
				onclick={nextWeek}
				aria-label="Next week"
			>
				<ChevronRight class="h-4 w-4 text-muted-foreground" />
			</button>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="sm" class="text-xs" onclick={goToday}>Today</Button>
			<Button size="sm" onclick={() => { editingEvent = null; newDefaults = null; showForm = true; }}>
				+ Add shift
			</Button>
		</div>
	</div>

	{#if loading}
		<div class="flex flex-1 flex-col items-center justify-center gap-2">
			<div class="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
			<p class="text-muted-foreground text-sm">Loading schedule…</p>
		</div>
	{:else}
		<!-- Calendar -->
		<div class="flex-1 overflow-auto">
			<div style="min-width: 560px;">
				<!-- Day header row -->
				<div class="sticky top-0 z-10 flex border-b bg-card">
					<!-- Time gutter spacer -->
					<div class="w-11 shrink-0"></div>
					{#each weekDays as day, i}
						<div
							class="flex-1 border-l py-2 text-center {isToday(day) ? 'bg-primary/5' : ''}"
						>
							<p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
								{DAY_NAMES[i]}
							</p>
							<p
								class="mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold
								{isToday(day) ? 'bg-primary text-primary-foreground' : 'text-foreground'}"
							>
								{day.getDate()}
							</p>
						</div>
					{/each}
				</div>

				<!-- Time grid -->
				<div class="flex">
					<!-- Hour labels -->
					<div class="w-11 shrink-0">
						{#each HOURS as h}
							<div
								style="height: {HOUR_HEIGHT}px"
								class="relative flex items-start justify-end pr-2 pt-px"
							>
								<span class="text-[10px] text-muted-foreground leading-none">
									{formatHour(h)}
								</span>
							</div>
						{/each}
					</div>

					<!-- Day columns -->
					{#each weekDays as day}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div
							class="relative flex-1 border-l {isToday(day) ? 'bg-primary/[0.02]' : ''}"
							style="height: {TOTAL_HEIGHT}px"
							onclick={(e) => handleColumnClick(day, e)}
							role="button"
							tabindex="0"
							aria-label="Add shift"
						>
							<!-- Hour lines -->
							{#each HOURS as _, i}
								<div
									class="pointer-events-none absolute left-0 right-0 border-t border-border/40"
									style="top: {i * HOUR_HEIGHT}px"
								></div>
								<!-- Half-hour tick -->
								<div
									class="pointer-events-none absolute left-0 right-0 border-t border-border/20 border-dashed"
									style="top: {i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px"
								></div>
							{/each}

							<!-- Shift blocks -->
							{#each eventsForDay(day) as ev}
								{@const c = colorFor(ev.assigned_user_id)}
								{@const h = heightPx(ev.dtstart, ev.dtend)}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div
									class="absolute left-1 right-1 overflow-hidden rounded-md border px-1.5 py-1 cursor-pointer shadow-sm transition-shadow hover:shadow-md"
									style="
										top: {topPx(ev.dtstart)}px;
										height: {h}px;
										background-color: {c.bg};
										border-color: {c.border};
										color: {c.text};
									"
									onclick={(e) => {
										e.stopPropagation();
										editingEvent = ev;
										newDefaults = null;
										showForm = true;
									}}
									role="button"
									tabindex="0"
								>
									<p class="truncate text-[11px] font-semibold leading-tight">{ev.title}</p>
									{#if h > 36}
										<p class="truncate text-[10px] leading-tight opacity-75">{memberName(ev.assigned_user_id)}</p>
									{/if}
									{#if h > 52}
										<p class="text-[10px] leading-tight opacity-60">{formatTime(ev.dtstart)}–{formatTime(ev.dtend)}</p>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Empty state overlay (only if truly no events this week) -->
		{#if events.length === 0}
			<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center pt-24">
				<CalendarX class="text-muted-foreground h-10 w-10 opacity-30" />
				<p class="text-muted-foreground text-sm">No shifts scheduled this week.</p>
				<p class="text-muted-foreground text-xs">Click a time slot or use + Add shift.</p>
			</div>
		{/if}
	{/if}
</div>

{#if showForm}
	<ShiftFormModal
		{patientId}
		{userId}
		event={editingEvent}
		{members}
		defaults={newDefaults}
		onClose={() => (showForm = false)}
		{onSaved}
		{onDeleted}
	/>
{/if}
