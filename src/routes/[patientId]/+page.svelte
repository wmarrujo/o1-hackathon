<script lang="ts">
	let { data } = $props();
</script>

<div class="mx-auto max-w-3xl px-4 py-8">
	<h1 class="mb-1 text-2xl font-semibold">{data.patient.full_name}</h1>
	<p class="text-muted-foreground text-sm">Coordinator summary — coming soon.</p>
</div>
