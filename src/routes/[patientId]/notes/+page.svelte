<script lang="ts">
	import NotesTab from '$lib/components/NotesTab.svelte';

	let { data } = $props();
</script>

<div class="mx-auto max-w-3xl">
	<NotesTab patientId={data.patient.id} userId={data.userId} refreshKey={0} />
</div>
