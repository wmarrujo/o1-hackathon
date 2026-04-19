<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import SalusLogo from '$lib/components/SalusLogo.svelte';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleSignUp() {
		if (!name || !email || !password) return;
		loading = true;
		error = '';
		const { error: err } = await supabase.auth.signUp({
			email,
			password,
			options: { data: { full_name: name } }
		});
		if (err) {
			error = err.message;
		} else {
			await goto('/patients');
		}
		loading = false;
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-background p-4">
	<Card class="w-full max-w-sm">
		<CardHeader class="text-center">
			<div class="mb-3 flex justify-center">
				<SalusLogo class="h-20 w-20" />
			</div>
			<CardTitle class="font-display text-3xl tracking-wide">Salus</CardTitle>
			<CardDescription>Collaborative care coordination for patients and families</CardDescription>
		</CardHeader>
		<CardContent>
			<form onsubmit={(e) => { e.preventDefault(); handleSignUp(); }} class="space-y-4">
				<div class="space-y-2">
					<Label for="name">Full name</Label>
					<Input
						id="name"
						type="text"
						placeholder="Jane Smith"
						bind:value={name}
						disabled={loading}
						class="h-12 text-base"
					/>
				</div>
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
				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						type="password"
						placeholder="••••••••"
						bind:value={password}
						disabled={loading}
						class="h-12 text-base"
					/>
				</div>
				{#if error}
					<p class="text-destructive text-sm">{error}</p>
				{/if}
				<Button type="submit" class="h-12 w-full text-base" disabled={loading || !name || !email || !password}>
					{loading ? 'Creating account…' : 'Create account'}
				</Button>
				<p class="text-muted-foreground text-center text-sm">
					Already have an account? <a href="/login" class="text-foreground underline underline-offset-4">Sign in</a>
				</p>
			</form>
		</CardContent>
	</Card>
</div>
