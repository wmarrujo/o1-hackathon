<script lang="ts">
	import type { Patient } from '$lib/types';
	import { supabase } from '$lib/supabaseClient';
	import { Card, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from 'lucide-svelte';

	let { patients, onSelect, userEmail, onBack = null }: {
		patients: Patient[];
		onSelect: (p: Patient) => void;
		userEmail: string;
		onBack?: (() => void) | null;
	} = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background p-4">
	<div class="w-full max-w-md">
		{#if onBack}
			<button
				class="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
				onclick={onBack}
			>
				<ArrowLeft class="h-4 w-4" />
				Back
			</button>
		{/if}

		<div class="mb-6 text-center">
			<div class="mb-2 text-4xl">🏥</div>
			<h1 class="font-display text-2xl font-bold">CareTrack</h1>
			<p class="text-muted-foreground mt-1 text-sm">Signed in as {userEmail}</p>
		</div>

		{#if patients.length === 0}
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
				{#each patients as patient}
					<button class="w-full text-left" onclick={() => onSelect(patient)}>
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

		<Button variant="ghost" class="mt-8 w-full text-sm" onclick={() => supabase.auth.signOut()}>
			Sign out
		</Button>
	</div>
</div>
