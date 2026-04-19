<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
</script>

<svelte:head>
	<title>Salus</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<Toaster position="bottom-center" offset={80} />
