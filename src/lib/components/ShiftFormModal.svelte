<script lang="ts">
	import { untrack } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { ScheduleEvent, UserProfile } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { X, Trash2 } from 'lucide-svelte';

	let {
		patientId,
		userId,
		event: initialEvent = null,
		members,
		defaults = null,
		onClose,
		onSaved,
		onDeleted
	}: {
		patientId: string;
		userId: string;
		event?: ScheduleEvent | null;
		members: UserProfile[];
		defaults?: { dtstart: string; dtend: string } | null;
		onClose: () => void;
		onSaved: (e: ScheduleEvent) => void;
		onDeleted: (id: string) => void;
	} = $props();

	// Helpers
	function toLocal(iso: string): string {
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	function fromLocal(s: string): string {
		return new Date(s).toISOString();
	}

	function defaultStart(): string {
		if (defaults) return toLocal(defaults.dtstart);
		const d = new Date();
		d.setMinutes(0, 0, 0);
		return toLocal(d.toISOString());
	}

	function defaultEnd(): string {
		if (defaults) return toLocal(defaults.dtend);
		const d = new Date();
		d.setMinutes(0, 0, 0);
		d.setHours(d.getHours() + 1);
		return toLocal(d.toISOString());
	}

	// Capture initial values once (avoid reactive re-init)
	const ev = untrack(() => initialEvent);

	let title = $state(ev?.title ?? '');
	let eventType = $state<ScheduleEvent['event_type']>(ev?.event_type ?? 'shift');
	const initialUserId = untrack(() => userId);
	let assignedUserId = $state<string>(ev?.assigned_user_id ?? initialUserId);
	let dtstart = $state(ev ? toLocal(ev.dtstart) : defaultStart());
	let dtend = $state(ev ? toLocal(ev.dtend) : defaultEnd());
	let notes = $state(ev?.additional_notes ?? '');

	let saving = $state(false);
	let deleting = $state(false);
	let error = $state('');

	const isEditing = !!ev;

	async function save() {
		if (!title.trim()) { error = 'Title is required.'; return; }
		if (dtend <= dtstart) { error = 'End must be after start.'; return; }
		saving = true;
		error = '';

		const payload = {
			patient_id: patientId,
			title: title.trim(),
			event_type: eventType,
			assigned_user_id: assignedUserId || null,
			dtstart: fromLocal(dtstart),
			dtend: fromLocal(dtend),
			additional_notes: notes.trim() || null,
			status: 'CONFIRMED' as const
		};

		if (isEditing) {
			const { data, error: err } = await supabase
				.from('schedule_events')
				.update(payload)
				.eq('id', ev!.id)
				.select()
				.single();
			if (err) { error = err.message; saving = false; return; }
			onSaved(data as ScheduleEvent);
		} else {
			const { data, error: err } = await supabase
				.from('schedule_events')
				.insert(payload)
				.select()
				.single();
			if (err) { error = err.message; saving = false; return; }
			onSaved(data as ScheduleEvent);
		}
	}

	async function deleteEvent() {
		if (!ev) return;
		deleting = true;
		await supabase.from('schedule_events').delete().eq('id', ev.id);
		onDeleted(ev.id);
	}

	const EVENT_TYPE_LABELS: Record<ScheduleEvent['event_type'], string> = {
		shift: 'Shift',
		appointment: 'Appointment',
		medication: 'Medication',
		other: 'Other'
	};
</script>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
	onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
>
	<div class="w-full max-w-md rounded-t-2xl bg-card p-6 shadow-xl sm:rounded-2xl">
		<!-- Header -->
		<div class="mb-5 flex items-center justify-between">
			<h2 class="font-display text-lg font-semibold">
				{isEditing ? 'Edit shift' : 'Add shift'}
			</h2>
			<button class="rounded-full p-1.5 hover:bg-muted transition-colors" onclick={onClose}>
				<X class="h-4 w-4 text-muted-foreground" />
			</button>
		</div>

		<div class="space-y-4">
			<!-- Title -->
			<div>
				<label class="mb-1.5 block text-sm font-medium" for="shift-title">Title</label>
				<input
					id="shift-title"
					type="text"
					placeholder="e.g. Morning shift"
					bind:value={title}
					class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				/>
			</div>

			<!-- Event type -->
			<div>
				<label class="mb-1.5 block text-sm font-medium" for="shift-type">Type</label>
				<select
					id="shift-type"
					bind:value={eventType}
					class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				>
					{#each Object.entries(EVENT_TYPE_LABELS) as [val, label]}
						<option value={val}>{label}</option>
					{/each}
				</select>
			</div>

			<!-- Assigned caregiver -->
			<div>
				<label class="mb-1.5 block text-sm font-medium" for="shift-assignee">Assigned to</label>
				<select
					id="shift-assignee"
					bind:value={assignedUserId}
					class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				>
					<option value="">— Unassigned —</option>
					{#each members as m}
						<option value={m.id}>{m.full_name}</option>
					{/each}
				</select>
			</div>

			<!-- Date/time row -->
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="mb-1.5 block text-sm font-medium" for="shift-start">Start</label>
					<input
						id="shift-start"
						type="datetime-local"
						bind:value={dtstart}
						class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
				<div>
					<label class="mb-1.5 block text-sm font-medium" for="shift-end">End</label>
					<input
						id="shift-end"
						type="datetime-local"
						bind:value={dtend}
						class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>
			</div>

			<!-- Notes -->
			<div>
				<label class="mb-1.5 block text-sm font-medium" for="shift-notes">Notes (optional)</label>
				<textarea
					id="shift-notes"
					rows={2}
					placeholder="Any additional details…"
					bind:value={notes}
					class="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
				></textarea>
			</div>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}
		</div>

		<!-- Actions -->
		<div class="mt-6 flex items-center justify-between gap-3">
			{#if isEditing}
				<Button
					variant="ghost"
					size="sm"
					class="text-destructive hover:text-destructive hover:bg-destructive/10"
					onclick={deleteEvent}
					disabled={deleting}
				>
					<Trash2 class="h-3.5 w-3.5 mr-1" />
					{deleting ? 'Deleting…' : 'Delete'}
				</Button>
			{:else}
				<div></div>
			{/if}
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={onClose}>Cancel</Button>
				<Button size="sm" onclick={save} disabled={saving}>
					{saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add shift'}
				</Button>
			</div>
		</div>
	</div>
</div>
