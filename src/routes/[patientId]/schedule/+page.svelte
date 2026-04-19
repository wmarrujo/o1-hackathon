<script lang="ts">
	import ScheduleTab from '$lib/components/ScheduleTab.svelte';

	let { data } = $props();
</script>

<div class="mx-auto h-full max-w-3xl">
	<ScheduleTab patientId={data.patient.id} userId={data.userId} />
</div>
