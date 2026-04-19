<script lang="ts">
	import CheckoutTab from '$lib/components/CheckoutTab.svelte';

	let { data } = $props();
</script>

<CheckoutTab patientId={data.patient.id} />
