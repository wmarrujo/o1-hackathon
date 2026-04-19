<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';

	let { patientId, taskId, userId, onSaved }: {
		patientId: string;
		taskId?: string | null;
		userId: string;
		onSaved: () => void;
	} = $props();

	let content = $state('');
	let saving = $state(false);

	async function submit() {
		if (!content.trim()) return;
		saving = true;
		await supabase.from('notes').insert({
			patient_id: patientId,
			task_id: taskId ?? null,
			author_id: userId,
			content: content.trim()
		});
		saving = false;
		content = '';
		onSaved();
	}
</script>

<form onsubmit={(e) => { e.preventDefault(); submit(); }} class="flex gap-2">
	<Textarea
		placeholder="Add a note…"
		bind:value={content}
		rows={2}
		class="flex-1 resize-none text-sm"
	/>
	<Button type="submit" size="sm" disabled={saving || !content.trim()} class="self-end">
		{saving ? '…' : 'Save'}
	</Button>
</form>
