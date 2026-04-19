<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';

	let email = $state('');
	let loading = $state(false);
	let sent = $state(false);
	let error = $state('');

	async function handleLogin() {
		if (!email) return;
		loading = true;
		error = '';
		const { error: err } = await supabase.auth.signInWithOtp({ email });
		if (err) {
			error = err.message;
		} else {
			sent = true;
		}
		loading = false;
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<Card class="w-full max-w-sm">
		<CardHeader class="text-center">
			<div class="mb-2 text-4xl">🏥</div>
			<CardTitle class="font-display text-2xl">CareTrack</CardTitle>
			<CardDescription>Collaborative care coordination for patients and families</CardDescription>
		</CardHeader>
		<CardContent>
			{#if sent}
				<div class="rounded-lg bg-success/10 p-4 text-center text-sm text-success">
					<p class="font-medium">Check your email</p>
					<p class="mt-1 opacity-80">We sent a magic link to <strong>{email}</strong></p>
				</div>
				<Button variant="ghost" class="mt-4 w-full" onclick={() => { sent = false; email = ''; }}>
					Use a different email
				</Button>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
					<div class="space-y-2">
						<Label for="email">Email address</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							disabled={loading}
							class="h-12 text-base"
						/>
					</div>
					{#if error}
						<p class="text-destructive text-sm">{error}</p>
					{/if}
					<Button type="submit" class="h-12 w-full text-base" disabled={loading || !email}>
						{loading ? 'Sending…' : 'Send magic link'}
					</Button>
				</form>
			{/if}
		</CardContent>
	</Card>
</div>
