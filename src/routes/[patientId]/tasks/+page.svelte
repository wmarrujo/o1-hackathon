<script lang="ts">
	import TasksTab from '$lib/components/TasksTab.svelte';

	let { data } = $props();
</script>

<div class="mx-auto max-w-3xl">
	<TasksTab patientId={data.patient.id} userId={data.userId} canManageTasks={data.canManageTasks} />
</div>
