<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { UserRole } from '$lib/types';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Trash2 } from 'lucide-svelte';

	let { patientId, currentUserId }: { patientId: string; currentUserId: string } = $props();

	interface RoleWithProfile extends UserRole {
		full_name?: string;
		email?: string;
	}

	let roles = $state<RoleWithProfile[]>([]);
	let loading = $state(true);
	let inviteEmail = $state('');
	let inviteRole = $state<'coordinator' | 'caregiver'>('caregiver');
	let inviting = $state(false);
	let error = $state('');

	onMount(load);

	async function load() {
		loading = true;
		const { data } = await supabase
			.from('user_roles')
			.select('*')
			.eq('patient_id', patientId);

		if (!data) { loading = false; return; }

		const userIds = data.map((r) => r.user_id);
		const { data: profiles } = await supabase
			.from('users')
			.select('id, full_name, email')
			.in('id', userIds);

		roles = data.map((r) => ({
			...r,
			full_name: profiles?.find((p) => p.id === r.user_id)?.full_name,
			email: profiles?.find((p) => p.id === r.user_id)?.email
		}));
		loading = false;
	}

	async function invite() {
		if (!inviteEmail.trim()) return;
		inviting = true;
		error = '';

		const { data: profiles } = await supabase
			.from('users')
			.select('id, email')
			.eq('email', inviteEmail.trim())
			.limit(1);

		if (!profiles || profiles.length === 0) {
			error = 'No user found with that email. They must sign in at least once first.';
			inviting = false;
			return;
		}

		const { error: err } = await supabase.from('user_roles').insert({
			user_id: profiles[0].id,
			patient_id: patientId,
			role: inviteRole
		});

		if (err) {
			error = err.message.includes('unique') ? 'That user is already a member.' : err.message;
		} else {
			inviteEmail = '';
			await load();
		}
		inviting = false;
	}

	async function removeRole(role: RoleWithProfile) {
		if (role.user_id === currentUserId) return;
		await supabase.from('user_roles').delete().eq('id', role.id);
		roles = roles.filter((r) => r.id !== role.id);
	}
</script>

<div>
	<h3 class="mb-3 text-sm font-semibold">Care Team</h3>

	{#if loading}
		<p class="text-muted-foreground text-xs">Loading…</p>
	{:else}
		<div class="mb-4 space-y-2">
			{#each roles as role}
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="text-sm">{role.full_name ?? role.email ?? role.user_id}</span>
						<Badge variant={role.role === 'coordinator' ? 'default' : 'secondary'} class="text-xs capitalize">
							{role.role}
						</Badge>
					</div>
					{#if role.user_id !== currentUserId}
						<button
							class="text-slate-300 transition-colors hover:text-red-500"
							onclick={() => removeRole(role)}
							aria-label="Remove member"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					{/if}
				</div>
			{/each}
		</div>

		<div class="flex gap-2">
			<Input type="email" placeholder="Email to invite" bind:value={inviteEmail} class="h-9 flex-1 text-sm" />
			<select
				bind:value={inviteRole}
				class="border-input bg-background h-9 rounded-md border px-2 text-sm"
			>
				<option value="caregiver">Caregiver</option>
				<option value="coordinator">Coordinator</option>
			</select>
			<Button size="sm" onclick={invite} disabled={inviting || !inviteEmail.trim()}>
				{inviting ? '…' : 'Add'}
			</Button>
		</div>

		{#if error}
			<p class="mt-2 text-xs text-red-600">{error}</p>
		{/if}
	{/if}
</div>
