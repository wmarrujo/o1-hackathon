<script lang="ts">
	import type { Patient, Member } from '$lib/types';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ScheduleTab from '$lib/components/ScheduleTab.svelte';
	import TasksTab from '$lib/components/TasksTab.svelte';
	import NotesTab from '$lib/components/NotesTab.svelte';
	import MembersPanel from '$lib/components/MembersPanel.svelte';
	import { CalendarDays, ListChecks, FileText, Users, ChevronDown } from 'lucide-svelte';

	let { patient, member, userId, userEmail, onSwitchPatient, onSignOut }: {
		patient: Patient;
		member: Member;
		userId: string;
		userEmail: string;
		onSwitchPatient: () => void;
		onSignOut: () => void;
	} = $props();

	let showMembers = $state(false);
	let activeTab = $state('schedule');
</script>

<div class="flex h-screen flex-col bg-slate-50">
	<!-- Header -->
	<header class="sticky top-0 z-10 border-b bg-white shadow-sm">
		<div class="flex items-center justify-between px-4 py-3">
			<div class="flex items-center gap-2">
				<span class="text-xl">🏥</span>
				<div>
					<h1 class="text-base font-semibold leading-tight">{patient.name}</h1>
					<p class="text-muted-foreground text-xs">
						{member.coordinator ? 'Coordinator' : 'Caretaker'}
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				{#if member.coordinator}
					<Button
						variant="ghost"
						size="sm"
						class="gap-1 text-xs"
						onclick={() => (showMembers = !showMembers)}
					>
						<Users class="h-4 w-4" />
						Team
					</Button>
				{/if}
				<Button variant="ghost" size="sm" onclick={onSwitchPatient} class="text-xs">
					Switch
				</Button>
				<Button variant="ghost" size="sm" onclick={onSignOut} class="text-xs">
					Sign out
				</Button>
			</div>
		</div>
	</header>

	<!-- Members panel (coordinator only) -->
	{#if showMembers && member.coordinator}
		<div class="border-b bg-white px-4 py-3 shadow-sm">
			<MembersPanel patientId={patient.id} currentUserId={userId} />
		</div>
	{/if}

	<!-- Tab content -->
	<div class="flex-1 overflow-hidden">
		<Tabs bind:value={activeTab} class="flex h-full flex-col">
			<!-- Tab content area -->
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

			<!-- Bottom tab bar -->
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
