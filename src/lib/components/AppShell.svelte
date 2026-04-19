<script lang="ts">
	import type { Patient, UserRole } from '$lib/types';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import ScheduleTab from '$lib/components/ScheduleTab.svelte';
	import TasksTab from '$lib/components/TasksTab.svelte';
	import NotesTab from '$lib/components/NotesTab.svelte';
	import MembersPanel from '$lib/components/MembersPanel.svelte';
	import { CalendarDays, ListChecks, FileText, Users } from 'lucide-svelte';

	let { patient, userRole, userId, userEmail, onSwitchPatient, onSignOut }: {
		patient: Patient;
		userRole: UserRole;
		userId: string;
		userEmail: string;
		onSwitchPatient: () => void;
		onSignOut: () => void;
	} = $props();

	let showMembers = $state(false);
	let activeTab = $state('schedule');

	let isCoordinator = $derived(userRole.role === 'coordinator');
</script>

<div class="flex h-screen flex-col bg-slate-50">
	<header class="sticky top-0 z-10 border-b bg-white shadow-sm">
		<div class="flex items-center justify-between px-4 py-3">
			<div class="flex items-center gap-2">
				<span class="text-xl">🏥</span>
				<div>
					<h1 class="text-base font-semibold leading-tight">{patient.full_name}</h1>
					<p class="text-muted-foreground text-xs capitalize">{userRole.role}</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				{#if isCoordinator}
					<Button variant="ghost" size="sm" class="gap-1 text-xs" onclick={() => (showMembers = !showMembers)}>
						<Users class="h-4 w-4" />
						Team
					</Button>
				{/if}
				<Button variant="ghost" size="sm" onclick={onSwitchPatient} class="text-xs">Switch</Button>
				<Button variant="ghost" size="sm" onclick={onSignOut} class="text-xs">Sign out</Button>
			</div>
		</div>
	</header>

	{#if showMembers && isCoordinator}
		<div class="border-b bg-white px-4 py-3 shadow-sm">
			<MembersPanel patientId={patient.id} currentUserId={userId} />
		</div>
	{/if}

	<div class="flex-1 overflow-hidden">
		<Tabs bind:value={activeTab} class="flex h-full flex-col">
			<div class="flex-1 overflow-y-auto">
				<TabsContent value="schedule" class="m-0 h-full p-0">
					<ScheduleTab patientId={patient.id} userId={userId} />
				</TabsContent>
				<TabsContent value="tasks" class="m-0 h-full p-0">
					<TasksTab patientId={patient.id} userId={userId} userEmail={userEmail} />
				</TabsContent>
				<TabsContent value="notes" class="m-0 h-full p-0">
					<NotesTab patientId={patient.id} userId={userId} userEmail={userEmail} />
				</TabsContent>
			</div>

			<TabsList class="h-16 w-full rounded-none border-t bg-white px-2">
				<TabsTrigger value="schedule" class="flex flex-1 flex-col gap-0.5 py-2 text-xs">
					<CalendarDays class="h-5 w-5" />
					Schedule
				</TabsTrigger>
				<TabsTrigger value="tasks" class="flex flex-1 flex-col gap-0.5 py-2 text-xs">
					<ListChecks class="h-5 w-5" />
					Tasks
				</TabsTrigger>
				<TabsTrigger value="notes" class="flex flex-1 flex-col gap-0.5 py-2 text-xs">
					<FileText class="h-5 w-5" />
					Notes
				</TabsTrigger>
			</TabsList>
		</Tabs>
	</div>
</div>
