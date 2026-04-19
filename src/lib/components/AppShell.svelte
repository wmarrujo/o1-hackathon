<script lang="ts">
	import type { Patient, UserRole } from '$lib/types';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import ScheduleTab from '$lib/components/ScheduleTab.svelte';
	import TasksTab from '$lib/components/TasksTab.svelte';
	import NotesTab from '$lib/components/NotesTab.svelte';
	import MembersPanel from '$lib/components/MembersPanel.svelte';
	import { CalendarDays, ListChecks, FileText, Users, ChevronDown, LogOut, ArrowLeftRight } from 'lucide-svelte';

	let { patient, userRole, userId, userFullName, onSwitchPatient, onSignOut }: {
		patient: Patient;
		userRole: UserRole;
		userId: string;
		userFullName: string;
		onSwitchPatient: () => void;
		onSignOut: () => void;
	} = $props();

	let showMembers = $state(false);
	let activeTab = $state('schedule');
	// Incrementing this causes TasksTab to reload — used when ScheduleTab saves a task
	let taskRefreshKey = $state(0);

	let isCoordinator = $derived(userRole.role === 'coordinator');

	const roleLabel: Record<string, string> = {
		coordinator: 'Coordinator',
		caregiver: 'Caregiver',
		gov_coordinator: 'Gov. Coordinator'
	};
</script>

<div class="flex h-screen flex-col bg-slate-50">
	<!-- Header -->
	<header class="sticky top-0 z-10 border-b bg-white shadow-sm">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<!-- Left: user info -->
			<div class="flex items-center gap-3">
				<div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
					{userFullName.charAt(0).toUpperCase()}
				</div>
				<div>
					<p class="text-sm font-semibold leading-tight">{userFullName}</p>
					<div class="flex items-center gap-1.5">
						<span class="text-muted-foreground text-xs">{roleLabel[userRole.role] ?? userRole.role}</span>
						<span class="text-muted-foreground text-xs">·</span>
						<span class="text-xs font-medium text-slate-600">{patient.full_name}</span>
					</div>
				</div>
			</div>

			<!-- Right: actions -->
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
				<Button variant="ghost" size="sm" onclick={onSwitchPatient} class="gap-1.5 text-xs">
					<ArrowLeftRight class="h-3.5 w-3.5" />
					<span class="hidden sm:inline">Switch</span>
				</Button>
				<Button variant="ghost" size="sm" onclick={onSignOut} class="gap-1.5 text-xs">
					<LogOut class="h-3.5 w-3.5" />
					<span class="hidden sm:inline">Sign out</span>
				</Button>
			</div>
		</div>
	</header>

	<!-- Members panel -->
	{#if showMembers && isCoordinator}
		<div class="border-b bg-white shadow-sm">
			<div class="mx-auto max-w-3xl px-4 py-4">
				<MembersPanel patientId={patient.id} currentUserId={userId} />
			</div>
		</div>
	{/if}

	<!-- Tab layout -->
	<div class="flex-1 overflow-hidden">
		<Tabs bind:value={activeTab} class="flex h-full flex-col">
			<div class="flex-1 overflow-y-auto">
				<TabsContent value="schedule" class="m-0 p-0">
					<div class="mx-auto max-w-3xl">
						<ScheduleTab
							patientId={patient.id}
							{userId}
							onTaskSaved={() => taskRefreshKey++}
						/>
					</div>
				</TabsContent>
				<TabsContent value="tasks" class="m-0 p-0">
					<div class="mx-auto max-w-3xl">
						<TasksTab
							patientId={patient.id}
							{userId}
							refreshKey={taskRefreshKey}
						/>
					</div>
				</TabsContent>
				<TabsContent value="notes" class="m-0 p-0">
					<div class="mx-auto max-w-3xl">
						<NotesTab patientId={patient.id} {userId} />
					</div>
				</TabsContent>
			</div>

			<!-- Bottom tab bar -->
			<div class="border-t bg-white">
				<TabsList class="mx-auto h-16 w-full max-w-3xl rounded-none bg-white px-2">
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
			</div>
		</Tabs>
	</div>
</div>
