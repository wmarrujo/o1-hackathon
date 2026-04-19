<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { AuthSession } from '@supabase/supabase-js';
	import type { Patient, UserRole } from '$lib/types';
	import LoginPage from '$lib/components/LoginPage.svelte';
	import PatientSelector from '$lib/components/PatientSelector.svelte';
	import AppShell from '$lib/components/AppShell.svelte';

	let session = $state<AuthSession | null>(null);
	let patients = $state<Patient[]>([]);
	let userRoles = $state<UserRole[]>([]);
	let selectedPatient = $state<Patient | null>(null);
	let userFullName = $state('');
	let loading = $state(true);

	onMount(() => {
		supabase.auth.getSession().then(({ data }) => {
			session = data.session;
			if (session) loadPatients();
			else loading = false;
		});

		supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
			if (_session) loadPatients();
			else {
				patients = [];
				userRoles = [];
				selectedPatient = null;
				userFullName = '';
				loading = false;
			}
		});
	});

	async function ensureProfile() {
		const user = session!.user;
		const fallbackName = user.email?.split('@')[0] ?? 'Unknown';
		await supabase.from('users').upsert({
			id: user.id,
			email: user.email ?? '',
			full_name: user.user_metadata?.full_name ?? fallbackName
		}, { onConflict: 'id', ignoreDuplicates: true });

		// Fetch the stored full_name for display
		const { data } = await supabase.from('users').select('full_name').eq('id', user.id).single();
		userFullName = data?.full_name ?? fallbackName;
	}

	async function loadPatients() {
		loading = true;
		await ensureProfile();

		const { data: roleData } = await supabase
			.from('user_roles')
			.select('*')
			.eq('user_id', session!.user.id);

		userRoles = roleData ?? [];

		if (userRoles.length === 0) {
			loading = false;
			return;
		}

		const patientIds = userRoles.map((r) => r.patient_id);
		const { data: patientData } = await supabase
			.from('patients')
			.select('*')
			.in('id', patientIds)
			.order('full_name');

		patients = patientData ?? [];

		if (patients.length === 1) selectedPatient = patients[0];
		loading = false;
	}

	function currentRole(): UserRole | undefined {
		return userRoles.find((r) => r.patient_id === selectedPatient?.id);
	}
</script>

{#if loading}
	<div class="flex h-screen items-center justify-center">
		<div class="text-muted-foreground text-sm">Loading...</div>
	</div>
{:else if !session}
	<LoginPage />
{:else if !selectedPatient}
	<PatientSelector {patients} onSelect={(p) => (selectedPatient = p)} userEmail={session.user.email ?? ''} />
{:else}
	<AppShell
		patient={selectedPatient}
		userRole={currentRole()!}
		userId={session.user.id}
		{userFullName}
		onSwitchPatient={() => (selectedPatient = null)}
		onSignOut={async () => { await supabase.auth.signOut(); }}
	/>
{/if}
