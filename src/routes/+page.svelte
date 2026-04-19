<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { AuthSession } from '@supabase/supabase-js';
	import type { Patient, Member } from '$lib/types';
	import LoginPage from '$lib/components/LoginPage.svelte';
	import PatientSelector from '$lib/components/PatientSelector.svelte';
	import AppShell from '$lib/components/AppShell.svelte';

	let session = $state<AuthSession | null>(null);
	let patients = $state<Patient[]>([]);
	let members = $state<Member[]>([]);
	let selectedPatient = $state<Patient | null>(null);
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
				members = [];
				selectedPatient = null;
				loading = false;
			}
		});
	});

	async function loadPatients() {
		loading = true;
		// Load memberships for current user
		const { data: memberData } = await supabase
			.from('members')
			.select('*')
			.eq('user_id', session!.user.id);

		members = memberData ?? [];

		if (members.length === 0) {
			loading = false;
			return;
		}

		const patientIds = members.map((m) => m.patient_id);
		const { data: patientData } = await supabase
			.from('patients')
			.select('*')
			.in('id', patientIds)
			.order('name');

		patients = patientData ?? [];

		// Auto-select if only one patient
		if (patients.length === 1) {
			selectedPatient = patients[0];
		}
		loading = false;
	}

	function currentMember(): Member | undefined {
		return members.find((m) => m.patient_id === selectedPatient?.id);
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
		member={currentMember()!}
		userId={session.user.id}
		userEmail={session.user.email ?? ''}
		onSwitchPatient={() => (selectedPatient = null)}
		onSignOut={async () => {
			await supabase.auth.signOut();
		}}
	/>
{/if}
