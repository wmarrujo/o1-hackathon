<script lang="ts">
	import type { Patient } from '$lib/types';
	import { supabase } from '$lib/supabaseClient';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	let { patients, onSelect, userEmail }: {
		patients: Patient[];
		onSelect: (p: Patient) => void;
		userEmail: string;
	} = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
	<div class="w-full max-w-md">
		<div class="mb-6 text-center">
			<div class="mb-2 text-4xl">🏥</div>
			<h1 class="text-2xl font-bold">CareTrack</h1>
			<p class="text-muted-foreground mt-1 text-sm">Signed in as {userEmail}</p>
		</div>

		{#if patients.length === 0}
			<Card>
				<CardContent class="pt-6 text-center">
					<p class="text-muted-foreground text-sm">
						You are not assigned to any patients yet. Please contact your coordinator.
					</p>
				</CardContent>
			</Card>
		{:else}
			<h2 class="mb-3 text-lg font-semibold">Select a patient</h2>
			<div class="space-y-3">
				{#each patients as patient}
					<button
						class="w-full text-left"
						onclick={() => onSelect(patient)}
					>
						<Card class="cursor-pointer transition-shadow hover:shadow-md active:scale-[0.99]">
							<CardHeader class="pb-2">
								<CardTitle class="text-lg">{patient.name}</CardTitle>
								{#if patient.date_of_birth}
									<CardDescription>DOB: {new Date(patient.date_of_birth).toLocaleDateString()}</CardDescription>
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
			onclick={() => supabase.auth.signOut()}
		>
			Sign out
		</Button>
	</div>
</div>
