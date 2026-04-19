<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { Member } from '$lib/types';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Trash2 } from 'lucide-svelte';

	let { patientId, currentUserId }: { patientId: string; currentUserId: string } = $props();

	interface MemberWithEmail extends Member {
		email?: string;
	}

	let members = $state<MemberWithEmail[]>([]);
	let loading = $state(true);
	let inviteEmail = $state('');
	let inviteCoordinator = $state(false);
	let inviting = $state(false);
	let error = $state('');

	onMount(load);

	async function load() {
		loading = true;
		const { data } = await supabase
			.from('members')
			.select('*')
			.eq('patient_id', patientId);

		if (!data) { loading = false; return; }

		// Fetch user emails via user_profiles view
		const userIds = data.map((m) => m.user_id);
		const { data: profiles } = await supabase
			.from('user_profiles')
			.select('id, email')
			.in('id', userIds);

		members = data.map((m) => ({
			...m,
			email: profiles?.find((p) => p.id === m.user_id)?.email
		}));
		loading = false;
	}

	async function invite() {
		if (!inviteEmail.trim()) return;
		inviting = true;
		error = '';

		// Look up user by email
		const { data: profiles } = await supabase
			.from('user_profiles')
			.select('id, email')
			.eq('email', inviteEmail.trim())
			.limit(1);

		if (!profiles || profiles.length === 0) {
			error = 'No user found with that email. They must sign in at least once first.';
			inviting = false;
			return;
		}

		const targetUserId = profiles[0].id;
		const { error: err } = await supabase.from('members').insert({
			user_id: targetUserId,
			patient_id: patientId,
			coordinator: inviteCoordinator
		});

		if (err) {
			error = err.message.includes('unique') ? 'That user is already a member.' : err.message;
		} else {
			inviteEmail = '';
			inviteCoordinator = false;
			await load();
		}
		inviting = false;
	}

	async function removeMember(member: MemberWithEmail) {
		if (member.user_id === currentUserId) return;
		await supabase.from('members').delete().eq('id', member.id);
		members = members.filter((m) => m.id !== member.id);
	}
</script>

<div>
	<h3 class="mb-3 text-sm font-semibold">Care Team</h3>

	{#if loading}
		<p class="text-muted-foreground text-xs">Loading…</p>
	{:else}
		<div class="mb-4 space-y-2">
			{#each members as member}
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="text-sm">{member.email ?? member.user_id}</span>
						<Badge variant={member.coordinator ? 'default' : 'secondary'} class="text-xs">
							{member.coordinator ? 'Coordinator' : 'Caretaker'}
						</Badge>
					</div>
					{#if member.user_id !== currentUserId}
						<button
							class="text-slate-300 hover:text-red-500 transition-colors"
							onclick={() => removeMember(member)}
							aria-label="Remove member"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					{/if}
				</div>
			{/each}
		</div>

		<div class="flex gap-2">
			<Input
				type="email"
				placeholder="Email to invite"
				bind:value={inviteEmail}
				class="flex-1 h-9 text-sm"
			/>
			<label class="flex items-center gap-1 text-xs whitespace-nowrap">
				<input type="checkbox" bind:checked={inviteCoordinator} class="rounded" />
				Coordinator
			</label>
			<Button size="sm" onclick={invite} disabled={inviting || !inviteEmail.trim()}>
				{inviting ? '…' : 'Add'}
			</Button>
		</div>

		{#if error}
			<p class="mt-2 text-xs text-red-600">{error}</p>
		{/if}
	{/if}
</div>
