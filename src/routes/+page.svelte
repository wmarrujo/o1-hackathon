<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';
	import type { AuthSession } from '@supabase/supabase-js';
	import type { Patient, UserRole } from '$lib/types';
	import LoginPage from '$lib/components/LoginPage.svelte';
	import PatientSelector from '$lib/components/PatientSelector.svelte';
	import AppShell from '$lib/components/AppShell.svelte';

	let session = $state<AuthSession | null>(null);
	let devUserId = $state<string | null>(null);
	let patients = $state<Patient[]>([]);
	let userRoles = $state<UserRole[]>([]);
	let selectedPatient = $state<Patient | null>(null);
	let previousPatient = $state<Patient | null>(null);
	let userFullName = $state('');
	let loading = $state(true);

	// The active user ID — from dev picker or real session
	let userId = $derived(import.meta.env.DEV ? devUserId : session?.user.id ?? null);
	let isLoggedIn = $derived(!!userId);

	onMount(() => {
		if (import.meta.env.DEV) {
			loading = false;
			return;
		}

		supabase.auth.getSession().then(({ data }) => {
			session = data.session;
			if (session) loadPatients(session.user.id);
			else loading = false;
		});

		supabase.auth.onAuthStateChange((_event, _session) => {
			session = _session;
			if (_session) loadPatients(_session.user.id);
			else {
				patients = [];
				userRoles = [];
				selectedPatient = null;
				userFullName = '';
				loading = false;
			}
		});
	});

	async function handleDevLogin(id: string) {
		devUserId = id;
		await loadPatients(id);
	}

	async function ensureProfile(uid: string) {
		const fallbackName = uid.slice(0, 8);
		await supabase.from('users').upsert({
			id: uid,
			email: session?.user.email ?? '',
			full_name: session?.user.user_metadata?.full_name ?? fallbackName
		}, { onConflict: 'id', ignoreDuplicates: true });

		const { data } = await supabase.from('users').select('full_name').eq('id', uid).single();
		userFullName = data?.full_name ?? fallbackName;
	}

	async function loadPatients(uid: string) {
		loading = true;
		await ensureProfile(uid);

		const { data: roleData } = await supabase
			.from('user_roles')
			.select('*')
			.eq('user_id', uid);

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

	async function handleSignOut() {
		if (import.meta.env.DEV) {
			devUserId = null;
			patients = [];
			userRoles = [];
			selectedPatient = null;
			userFullName = '';
		} else {
			await supabase.auth.signOut();
		}
	}
</script>

{#if loading}
	<div class="flex h-screen items-center justify-center">
		<div class="text-muted-foreground text-sm">Loading...</div>
	</div>
{:else if !isLoggedIn}
	<LoginPage onDevLogin={handleDevLogin} />
{:else if !selectedPatient}
	<PatientSelector
		{patients}
		onSelect={(p) => { previousPatient = null; selectedPatient = p; }}
		userEmail={session?.user.email ?? ''}
		onBack={previousPatient ? () => (selectedPatient = previousPatient) : null}
	/>
{:else}
	<AppShell
		patient={selectedPatient}
		userRole={currentRole()!}
		userId={userId!}
		{userFullName}
		onSwitchPatient={() => { previousPatient = selectedPatient; selectedPatient = null; }}
		onSignOut={handleSignOut}
	/>
{/if}
