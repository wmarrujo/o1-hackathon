<script lang="ts">
	import RemoteCheckinTab from '$lib/components/RemoteCheckinTab.svelte';

	let { data } = $props();

	let isCoordinator = $derived(data.userRole.role === 'coordinator');
</script>

{#if isCoordinator}
	<div class="mx-auto max-w-3xl">
		<RemoteCheckinTab patientId={data.patient.id} />
	</div>
{:else}
	<div class="mx-auto max-w-3xl px-4 py-8">
		<h1 class="mb-1 text-2xl font-semibold">{data.patient.full_name}</h1>
		<p class="text-muted-foreground text-sm">Use the tabs below to view tasks, schedule, and notes.</p>
	</div>
{/if}
