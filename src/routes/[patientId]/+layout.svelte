<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { Button } from '$lib/components/ui/button';
	import MembersPanel from '$lib/components/MembersPanel.svelte';
	import { CalendarDays, ListChecks, FileText, Users, LogOut, ArrowLeftRight, ClipboardCheck, Stethoscope } from 'lucide-svelte';

	let { data, children } = $props();

	let showMembers = $state(false);

	let isCoordinator = $derived(data.userRole.role === 'coordinator');
	let isCaregiver = $derived(data.userRole.role === 'caregiver');

	const roleLabel: Record<string, string> = {
		coordinator: 'Coordinator',
		caregiver: 'Caregiver',
		gov_coordinator: 'Gov. Coordinator'
	};

	function isActive(tab: string) {
		return page.url.pathname === `/${data.patient.id}/${tab}`;
	}

	function isBaseActive() {
		return page.url.pathname === `/${data.patient.id}`;
	}

	async function signOut() {
		await supabase.auth.signOut();
		await goto('/login');
	}
</script>

<div class="flex h-dvh flex-col bg-background">
	<!-- Header -->
	<header class="sticky top-0 z-10 border-b bg-card shadow-sm">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<div class="flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
					{data.userFullName.charAt(0).toUpperCase()}
				</div>
				<div>
					<p class="text-sm font-semibold leading-tight">{data.userFullName}</p>
					<div class="flex items-center gap-1.5">
						<span class="text-muted-foreground text-xs">{roleLabel[data.userRole.role] ?? data.userRole.role}</span>
						<span class="text-muted-foreground text-xs">·</span>
						<span class="text-xs font-medium text-foreground/60">{data.patient.full_name}</span>
					</div>
				</div>
			</div>

			<div class="flex items-center gap-1">
				{#if isCoordinator}
					<Button
						variant={showMembers ? 'secondary' : 'ghost'}
						size="sm"
						class="gap-1.5 text-xs"
						onclick={() => (showMembers = !showMembers)}
					>
						<Users class="h-3.5 w-3.5" />
						Team
					</Button>
				{/if}
				{#if data.patientCount > 1}
					<Button variant="ghost" size="sm" onclick={() => goto('/patients?switch=1')} class="gap-1.5 text-xs">
						<ArrowLeftRight class="h-3.5 w-3.5" />
						<span class="hidden sm:inline">Switch</span>
					</Button>
				{/if}
				<Button variant="ghost" size="sm" onclick={signOut} class="gap-1.5 text-xs">
					<LogOut class="h-3.5 w-3.5" />
					<span class="hidden sm:inline">Sign out</span>
				</Button>
			</div>
		</div>
	</header>

	<!-- Members panel -->
	{#if showMembers && isCoordinator}
		<div class="border-b bg-card shadow-sm">
			<div class="mx-auto max-w-3xl px-4 py-4">
				<MembersPanel patientId={data.patient.id} currentUserId={data.userId} />
			</div>
		</div>
	{/if}

	<!-- Page content -->
	<div class="relative flex-1 overflow-y-auto">
		{@render children()}
	</div>

	<!-- Bottom tab bar -->
	<nav class="shrink-0 border-t bg-card pb-[env(safe-area-inset-bottom)]">
		<div class="mx-auto max-w-3xl">
			<div class="flex h-16 w-full px-2">
				{#if isCaregiver}
					<!-- Simplified caregiver nav -->
					<a
						href="/{data.patient.id}"
						class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors {isBaseActive() ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
					>
						<ListChecks class="h-5 w-5" />
						Home
					</a>
					<a
						href="/{data.patient.id}/checkout"
						class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors {isActive('checkout') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
					>
						<ClipboardCheck class="h-5 w-5" />
						Check-out
					</a>
				{:else}
					<!-- Full coordinator nav -->
					{#if isCoordinator}
						<a
							href="/{data.patient.id}"
							class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors {isBaseActive() ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
						>
							<Stethoscope class="h-5 w-5" />
							Check-in
						</a>
					{/if}
					<a
						href="/{data.patient.id}/tasks"
						class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors {isActive('tasks') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
					>
						<ListChecks class="h-5 w-5" />
						Tasks
					</a>
					<a
						href="/{data.patient.id}/schedule"
						class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors {isActive('schedule') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
					>
						<CalendarDays class="h-5 w-5" />
						Schedule
					</a>
					<a
						href="/{data.patient.id}/notes"
						class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors {isActive('notes') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
					>
						<FileText class="h-5 w-5" />
						Notes
					</a>
					<a
						href="/{data.patient.id}/checkout"
						class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors {isActive('checkout') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}"
					>
						<ClipboardCheck class="h-5 w-5" />
						Check-out
					</a>
				{/if}
			</div>
		</div>
	</nav>
</div>
