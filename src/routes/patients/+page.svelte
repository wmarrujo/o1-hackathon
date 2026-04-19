<script lang="ts">
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { supabase } from '$lib/supabaseClient';
	import { Card, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import SalusLogo from '$lib/components/SalusLogo.svelte';

	let { data, form } = $props();

	let forceShowForm = $state(false);
	let showForm = $derived(data.patients.length === 0 || forceShowForm);
	let submitting = $state(false);
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background p-4">
	<div class="w-full max-w-md">
		<div class="mb-6 text-center">
			<div class="mb-2 flex justify-center"><SalusLogo class="h-16 w-16" /></div>
			<h1 class="font-display text-2xl font-bold">Salus</h1>
			<p class="text-muted-foreground mt-1 text-sm">Signed in as {data.userEmail}</p>
		</div>

		{#if data.patients.length > 0}
			<h2 class="font-display mb-3 text-lg font-semibold">Select a patient</h2>
			<div class="space-y-3">
				{#each data.patients as patient (patient.id)}
					<button class="w-full text-left" onclick={() => goto(`/${patient.id}`)}>
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

		{#if showForm}
			<Card class="mt-4">
				<div class="p-6 space-y-4">
					<h2 class="font-display text-lg font-semibold">Add a patient</h2>
					<p class="text-muted-foreground text-sm">Enter the details of the person you're coordinating care for.</p>

					{#if form?.error}
						<p class="text-destructive text-sm">{form.error}</p>
					{/if}

					<form method="POST" action="?/createPatient" use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							submitting = false;
							await update();
						};
					}} class="space-y-4">
						<div class="space-y-1">
							<Label for="full_name">Full name</Label>
							<Input id="full_name" name="full_name" placeholder="Jane Smith" required />
						</div>
						<div class="space-y-1">
							<Label for="dob">Date of birth <span class="text-muted-foreground">(optional)</span></Label>
							<Input id="dob" name="dob" type="date" />
						</div>
						<Button type="submit" class="w-full" disabled={submitting}>
							{submitting ? 'Creating...' : 'Create patient'}
						</Button>
					</form>
				</div>
			</Card>
		{:else if data.patients.length === 0}
			<Card>
				<div class="p-6 text-center">
					<p class="text-muted-foreground text-sm mb-4">
						You are not assigned to any patients yet.
					</p>
					<Button onclick={() => forceShowForm = true}>Add a patient</Button>
				</div>
			</Card>
		{/if}

		{#if data.patients.length > 0 && !showForm}
			<Button
				variant="outline"
				class="mt-4 w-full text-sm"
				onclick={() => forceShowForm = true}
			>
				+ Add another patient
			</Button>
		{/if}

		<Button
			variant="ghost"
			class="mt-4 w-full text-sm"
			onclick={async () => { await supabase.auth.signOut(); await goto('/login'); }}
		>
			Sign out
		</Button>
	</div>
</div>
