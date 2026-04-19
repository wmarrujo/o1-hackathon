<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import type { Patient } from '$lib/types';
	import { Card, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background p-4">
	<div class="w-full max-w-md">
		<div class="mb-6 text-center">
			<div class="mb-2 text-4xl">🏥</div>
			<h1 class="font-display text-2xl font-bold">Salus</h1>
			<p class="text-muted-foreground mt-1 text-sm">Signed in as {data.userEmail}</p>
		</div>

		{#if data.patients.length === 0}
			<Card>
				<div class="p-6 text-center">
					<p class="text-muted-foreground text-sm">
						You are not assigned to any patients yet. Please contact your coordinator.
					</p>
				</div>
			</Card>
		{:else}
			<h2 class="font-display mb-3 text-lg font-semibold">Select a patient</h2>
			<div class="space-y-3">
				{#each data.patients as patient (patient.id)}
					<button class="w-full text-left" onclick={() => goto(`/${patient.id}/tasks`)}>
						<Card class="cursor-pointer transition-shadow hover:shadow-md active:scale-[0.99]">
							<CardHeader class="pb-2">
								<CardTitle class="text-lg">{patient.full_name}</CardTitle>
								{#if patient.dob}
									<CardDescription>DOB: {new Date(patient.dob).toLocaleDateString()}</CardDescription>
								{/if}
							</CardHeader>
						</Card>
					</button>
				{/each}
			</div>
		{/if}

		<Button
			variant="ghost"
			class="mt-8 w-full text-sm"
			onclick={async () => { await supabase.auth.signOut(); await goto('/login'); }}
		>
			Sign out
		</Button>
	</div>
</div>
