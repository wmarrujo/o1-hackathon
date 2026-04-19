<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';

	const DEV_USERS = [
		{ id: '00000000-0000-0000-0000-000000000001', name: 'Alice Coordinator', hint: 'Coordinator' },
		{ id: '00000000-0000-0000-0000-000000000002', name: 'Bob Coordinator', hint: 'Coordinator' },
		{ id: '00000000-0000-0000-0000-000000000003', name: 'Maria Caregiver', hint: 'Caregiver · Spanish' },
	] as const;

	let { onDevLogin }: { onDevLogin?: (userId: string) => void } = $props();

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleLogin() {
		if (!email || !password) return;
		loading = true;
		error = '';
		const { error: err } = await supabase.auth.signInWithPassword({ email, password });
		if (err) error = err.message;
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
			{#if import.meta.env.DEV}
				<div class="space-y-2">
					<p class="text-muted-foreground mb-3 text-center text-xs">Dev mode — sign in as:</p>
					{#each DEV_USERS as u}
						<Button
							variant="outline"
							class="h-12 w-full justify-between"
							onclick={() => onDevLogin?.(u.id)}
						>
							<span class="font-medium">{u.name}</span>
							<span class="text-muted-foreground text-xs">{u.hint}</span>
						</Button>
					{/each}
				</div>
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
					<Button type="submit" class="h-12 w-full text-base" disabled={loading || !email || !password}>
						{loading ? 'Signing in…' : 'Sign in'}
					</Button>
				</form>
			{/if}
		</CardContent>
	</Card>
</div>
