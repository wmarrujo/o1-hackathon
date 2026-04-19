<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import SalusLogo from '$lib/components/SalusLogo.svelte';
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
	<div class="mb-4">
		<SalusLogo class="h-24 w-24" />
	</div>
	<h1 class="mb-2 font-display text-4xl font-bold tracking-wide">Salus</h1>
	<p class="mb-8 max-w-sm text-muted-foreground">
		Collaborative care coordination for patients and families.
	</p>
	<Button href="/login">Sign in</Button>
</div>
