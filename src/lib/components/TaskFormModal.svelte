<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import type { Task, UserProfile } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { X } from 'lucide-svelte';
	import { untrack } from 'svelte';

	let { patientId, userId, members = [], task: initialTask, onClose, onSaved }: {
		patientId: string;
		userId: string;
		members?: UserProfile[];
		task: Task | null;
		onClose: () => void;
		onSaved: () => void;
	} = $props();

	// Capture prop value outside reactivity — modal is mounted fresh each time, so
	// initializing form state from the task once is intentional.
	const t = untrack(() => initialTask);
	let description = $state(t?.description ?? '');
	let startTime = $state(t?.start_time ? toDatetimeLocal(t.start_time) : '');
	let dueTime = $state(t?.due_time ? toDatetimeLocal(t.due_time) : '');
	let location = $state(t?.location ?? '');
	let repeat: 'daily' | 'weekly' | 'monthly' | '' = $state(
		(t?.repeat ?? '') as 'daily' | 'weekly' | 'monthly' | ''
	);
	let assigneeId = $state(t?.assignee_id ?? '');
	let saving = $state(false);
	let deleting = $state(false);
	let error = $state('');

	function toDatetimeLocal(iso: string) {
		const d = new Date(iso);
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	async function save() {
		if (!description.trim()) { error = 'Description is required.'; return; }
		saving = true;
		error = '';

		const payload = {
			patient_id: patientId,
			description: description.trim(),
			start_time: startTime ? new Date(startTime).toISOString() : null,
			due_time: dueTime ? new Date(dueTime).toISOString() : null,
			location: location.trim() || null,
			repeat: repeat || null,
			assignee_id: assigneeId || null,
		};

		let err;
		if (t) {
			({ error: err } = await supabase.from('tasks').update(payload).eq('id', t.id));
		} else {
			({ error: err } = await supabase.from('tasks').insert({ ...payload, created_by: userId, complete: false }));
		}

		saving = false;
		if (err) { error = err.message; return; }
		onSaved();
		onClose();
	}

	async function deleteTask() {
		if (!t) return;
		deleting = true;
		await supabase.from('tasks').delete().eq('id', t.id);
		deleting = false;
		onSaved();
		onClose();
	}
</script>

<!-- Backdrop -->
<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
	role="dialog"
	aria-modal="true"
>
	<div class="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold">{t ? 'Edit task' : 'New task'}</h2>
			<button onclick={onClose} aria-label="Close"><X class="h-5 w-5" /></button>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); save(); }} class="space-y-4">
			<div class="space-y-1.5">
				<Label for="desc">Description *</Label>
				<Textarea
					id="desc"
					placeholder="What needs to be done?"
					bind:value={description}
					rows={2}
					class="resize-none"
				/>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1.5">
					<Label for="start">Start</Label>
					<Input id="start" type="datetime-local" bind:value={startTime} />
				</div>
				<div class="space-y-1.5">
					<Label for="due">Due</Label>
					<Input id="due" type="datetime-local" bind:value={dueTime} />
				</div>
			</div>

			<div class="space-y-1.5">
				<Label for="loc">Location</Label>
				<Input id="loc" type="text" placeholder="Room, building…" bind:value={location} />
			</div>

			<div class="space-y-1.5">
				<Label for="repeat">Repeat</Label>
				<select
					id="repeat"
					bind:value={repeat}
					class="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
				>
					<option value="">None</option>
					<option value="daily">Daily</option>
					<option value="weekly">Weekly</option>
					<option value="monthly">Monthly</option>
				</select>
			</div>

			{#if members.length > 0}
				<div class="space-y-1.5">
					<Label for="assignee">Assign to</Label>
					<select
						id="assignee"
						bind:value={assigneeId}
						class="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
					>
						<option value="">Unassigned</option>
						{#each members as member}
							<option value={member.id}>{member.full_name}</option>
						{/each}
					</select>
				</div>
			{/if}

			{#if error}
				<p class="text-sm text-red-600">{error}</p>
			{/if}

			<div class="flex gap-2 pt-2">
				{#if t}
					<Button
						type="button"
						variant="destructive"
						class="flex-1"
						disabled={deleting}
						onclick={deleteTask}
					>
						{deleting ? 'Deleting…' : 'Delete'}
					</Button>
				{/if}
				<Button type="submit" class="flex-1" disabled={saving}>
					{saving ? 'Saving…' : t ? 'Save changes' : 'Add task'}
				</Button>
			</div>
		</form>
	</div>
</div>
