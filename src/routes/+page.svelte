<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import SalusLogo from '$lib/components/SalusLogo.svelte';
	import { onMount } from 'svelte';

	const testimonials = [
		{
			quote:
				"I'm never quite sure if she's safe. Are they eating? Taking their medication? Has anyone checked in today?",
			source: 'Family coordinator'
		},
		{
			quote:
				"The caregivers come in and there's almost no supervision. It's easy for them to just... not do things.",
			source: 'Family coordinator'
		},
		{
			quote: "The delegation is frustrating. There's no clear way to know who's doing what.",
			source: 'Family coordinator'
		},
		{
			quote: "We tried a shared Google Doc but there are no reminders, no structure. It's not built for this.",
			source: 'Family coordinator'
		},
		{
			quote: "The time it takes to call and text everyone just to get a basic update is incredible. Doctors don't always get current information from the caregiver. The whole care team would give better care with more knowledge, in real time.",
			source: 'Family coordinator'
		},
		{
			quote: "Right now I need to find a walking assistive device for someone recovering from surgery. The right kind for his height and weight, available in our state, cost, return policy, insurance coverage. I'm looking at 5 to 7 hours of calls and research. I wish I could just ask.",
			source: 'Family coordinator'
		}
	];

	let current = $state(0);
	let autoplay = $state(true);

	function next() {
		current = (current + 1) % testimonials.length;
	}
	function prev() {
		current = (current - 1 + testimonials.length) % testimonials.length;
	}

	onMount(() => {
		const t = setInterval(() => {
			if (autoplay) next();
		}, 8000);
		return () => clearInterval(t);
	});

	const problems = [
		{
			icon: '❓',
			title: 'Constant uncertainty',
			body: "Has she moved today? Taken her medication? Eaten enough? Without a shared system, you're always guessing."
		},
		{
			icon: '🔄',
			title: 'Coordination chaos',
			body: 'Multiple family members, multiple caregivers, no single source of truth. Effort gets duplicated and things get missed.'
		},
		{
			icon: '👁️',
			title: 'No accountability',
			body: "Caregivers come and go with little oversight. There's no easy way to know what actually happened during a visit."
		},
		{
			icon: '🤝',
			title: 'Unclear delegation',
			body: "When roles aren't defined, the most available person ends up doing everything. Burnout follows."
		}
	];

	const medicalPoints = [
		{
			label: 'Fragmented information',
			desc: "Doctor visits, new diagnoses, and updated needs rarely makes it to everyone who needs it."
		},
		{
			label: 'Hard-to-find resources',
			desc: 'Grants, equipment, and government programs exist, but finding them is a part-time job.'
		},
		{
			label: 'No caregiver guidance',
			desc: "Aides often don't know what's expected of them, especially across language and cultural barriers."
		},
		{
			label: 'Emergency info buried',
			desc: "Contacts, conditions, and allergies are critical information that should be instantly accessible to everyone."
		}
	];
	
	const steps = [
		{
			step: '01',
			title: "Set up your loved one's profile",
			body: 'Add health information, conditions, emergency contacts, and caregivers. Salus becomes the shared source of truth for everyone involved.'
		},
		{
			step: '02',
			title: 'Assign tasks and shifts',
			body: 'Build a task list and schedule for your care team. Assign responsibilities, set recurrences, and configure reminders when things go undone.'
		},
		{
			step: '03',
			title: 'Stay informed in real time',
			body: "Caregivers check in after each visit. You get a clear picture of what happened, what was missed, and what needs attention next."
		}
	];

	const features = [
		{
			icon: '✅',
			title: 'Shared task list',
			body: 'A single checklist everyone can see and contribute to. Tasks can recur daily, weekly, or monthly.',
			badge: null
		},
		{
			icon: '📅',
			title: 'Shift scheduling',
			body: 'Assign caregivers to shifts with start and end times. Recurring schedules handled automatically.',
			badge: null
		},
		{
			icon: '🎙️',
			title: 'Voice check-in',
			body: 'Caregivers dictate what they did in plain language, even in another language. Salus parses and logs it.',
			badge: null
		},
		{
			icon: '🔔',
			title: 'Automated reminders',
			body: 'Get alerted when a task is overdue, a shift goes without a check-in, or a medication reminder is unanswered.',
			badge: null
		},
		{
			icon: '📋',
			title: 'AI shift summaries',
			body: 'After each shift, Salus surfaces what was completed, what was missed, and what needs follow-up.',
			badge: 'beta'
		}
	];

	const comingSoonFeatures = [
		{
			icon: '🏥',
			title: 'Health information hub',
			body: 'Conditions, treatments, biometrics, documents all in one place, visible to the right people.'
		},
		{
			icon: '🔍',
			title: 'AI care research',
			body: 'Ask plain questions and get answers: what equipment does your loved one need, where to find it, what insurance covers, and what programs can help.'
		}
	];
</script>

<!-- NAV -->
<nav class="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a href="/" class="flex items-center gap-2.5">
			<SalusLogo class="h-8 w-8" />
			<span class="font-display text-xl font-bold tracking-tight">Salus</span>
		</a>
		<div class="flex items-center gap-3">
			<Button variant="ghost" href="/pricing" class="text-muted-foreground hover:text-foreground">
				Pricing
			</Button>
			<Button variant="ghost" href="/login" class="text-muted-foreground hover:text-foreground">
				Log In
			</Button>
			<Button href="/login?signup=true">Sign Up</Button>
		</div>
	</div>
</nav>

<!-- HERO -->
<section class="px-6 pb-20 pt-24 text-center md:pb-28 md:pt-32">
	<div class="mx-auto max-w-4xl">
<h1
			class="mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-6xl lg:text-7xl"
		>
			Stop wondering<br />if they're okay.
		</h1>
		<p class="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
			Salus gives family coordinators a single place to manage caregivers, track tasks, and stay
			informed so your loved one gets consistent, accountable care.
		</p>
		<div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
			<Button size="lg" href="/login?signup=true" class="px-10 py-6 text-base">Get Started</Button>
			<Button size="lg" variant="outline" href="/login" class="px-10 py-6 text-base">Log In</Button>
		</div>
	</div>

	<!-- Stats -->
	<div class="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-8 border-t border-border pt-16 md:grid-cols-3">
		<div>
			<div class="font-display text-4xl font-bold text-primary">63M+</div>
			<div class="mt-1 text-sm text-muted-foreground">family caregivers in the US</div>
		</div>
		<div>
			<div class="font-display text-4xl font-bold text-primary">1 in 5</div>
			<div class="mt-1 text-sm text-muted-foreground">Americans will be over 65 by 2030</div>
		</div>
		<div class="col-span-2 md:col-span-1">
			<div class="font-display text-4xl font-bold text-primary">1</div>
			<div class="mt-1 text-sm text-muted-foreground">place for your entire care team</div>
		</div>
	</div>
</section>

<!-- WHY -->
<section class="bg-secondary/50 px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">Why it matters</div>
		<h2 class="mb-4 max-w-2xl text-4xl font-bold">Caring for someone is already hard enough.</h2>
		<p class="mb-16 max-w-2xl text-lg text-muted-foreground">
			When multiple people are involved in someone's care, coordination breaks down fast. Important
			things slip through the cracks. This is not out of negligence, but because there's no shared system
			to catch them.
		</p>
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each problems as item}
				<div class="rounded-2xl bg-card p-6 shadow-sm">
					<div class="mb-3 text-3xl">{item.icon}</div>
					<h3 class="mb-2 text-lg font-semibold">{item.title}</h3>
					<p class="text-sm text-muted-foreground">{item.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- MEDICAL SYSTEM -->
<section class="px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="grid gap-16 md:grid-cols-2">
			<div>
				<div class="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
					The bigger picture
				</div>
				<h2 class="mb-6 text-4xl font-bold">The medical system wasn't built for families.</h2>
				<p class="mb-4 text-lg text-muted-foreground">
					Navigating healthcare on behalf of a loved one means tracking conditions, sourcing
					equipment, researching grants, and relaying everything to a rotating cast of caregivers,
					in a system not designed to help you do any of it.
				</p>
				<p class="text-lg text-muted-foreground">
					Information gets lost between doctor visits. New diagnoses come with needs no one knows
					how to meet. And when you're already stretched thin, the last thing you need is another
					thing to figure out alone.
				</p>
			</div>
			<div class="flex flex-col gap-4">
				{#each medicalPoints as item}
					<div class="flex gap-4 rounded-xl border border-border bg-card p-5">
						<div class="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary"></div>
						<div>
							<div class="font-semibold">{item.label}</div>
							<div class="mt-0.5 text-sm text-muted-foreground">{item.desc}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- HOW -->
<section class="bg-secondary/50 px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">How it works</div>
		<h2 class="mb-16 text-4xl font-bold">Set it up once. Stay informed always.</h2>
		<div class="grid gap-12 md:grid-cols-3">
			{#each steps as item}
				<div>
					<div class="mb-4 font-display text-7xl font-bold text-border">{item.step}</div>
					<h3 class="mb-3 text-xl font-semibold">{item.title}</h3>
					<p class="text-muted-foreground">{item.body}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- WHAT -->
<section class="px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">What you get</div>
		<h2 class="mb-16 text-4xl font-bold">Every tool your care team needs.</h2>
		<div class="grid gap-6 md:grid-cols-4 lg:grid-cols-6">
			{#each features as item}
				<div class="relative md:col-span-2 rounded-2xl border border-border bg-card p-6 transition-shadow duration-200 hover:shadow-md">
					{#if item.badge === 'beta'}
						<span class="absolute right-4 top-4 rounded-full bg-accent/40 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
							Beta
						</span>
					{/if}
					<div class="mb-3 text-3xl">{item.icon}</div>
					<h3 class="mb-2 text-lg font-semibold">{item.title}</h3>
					<p class="text-sm text-muted-foreground">{item.body}</p>
				</div>
			{/each}
			<div class="relative md:col-span-2 lg:col-start-2 rounded-2xl border border-border bg-card p-6 opacity-70">
				<span class="absolute right-4 top-4 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
					Coming soon
				</span>
				<div class="mb-3 text-3xl">{comingSoonFeatures[0].icon}</div>
				<h3 class="mb-2 text-lg font-semibold">{comingSoonFeatures[0].title}</h3>
				<p class="text-sm text-muted-foreground">{comingSoonFeatures[0].body}</p>
			</div>
			<div class="relative md:col-span-2 rounded-2xl border border-border bg-card p-6 opacity-70">
				<span class="absolute right-4 top-4 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
					Coming soon
				</span>
				<div class="mb-3 text-3xl">{comingSoonFeatures[1].icon}</div>
				<h3 class="mb-2 text-lg font-semibold">{comingSoonFeatures[1].title}</h3>
				<p class="text-sm text-muted-foreground">{comingSoonFeatures[1].body}</p>
			</div>
		</div>
	</div>
</section>

<!-- TESTIMONIALS -->
<section class="bg-primary px-6 py-24 text-primary-foreground">
	<div class="mx-auto max-w-3xl text-center">
		<div class="mb-4 text-sm font-semibold uppercase tracking-widest opacity-60">From real families</div>
		<h2 class="mb-16 text-4xl font-bold">Why Salus exists.</h2>

		<div
			class="relative min-h-[160px]"
			role="region"
			aria-label="Testimonials"
			onmouseenter={() => (autoplay = false)}
			onmouseleave={() => (autoplay = true)}
		>
			<blockquote class="mb-6 text-xl font-medium leading-relaxed md:text-2xl">
				"{testimonials[current].quote}"
			</blockquote>
			<p class="mb-12 text-sm opacity-60">— {testimonials[current].source}</p>
		</div>

		<div class="flex items-center justify-center gap-6">
			<button
				onclick={prev}
				aria-label="Previous testimonial"
				class="rounded-full border border-primary-foreground/30 p-2.5 transition-colors hover:bg-primary-foreground/10"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</button>

			<div class="flex gap-2">
				{#each testimonials as _, i}
					<button
						onclick={() => { current = i; autoplay = false; }}
						aria-label="Go to testimonial {i + 1}"
						class="h-2 rounded-full transition-all duration-300 {i === current
							? 'w-6 bg-primary-foreground'
							: 'w-2 bg-primary-foreground/30'}"
					></button>
				{/each}
			</div>

			<button
				onclick={next}
				aria-label="Next testimonial"
				class="rounded-full border border-primary-foreground/30 p-2.5 transition-colors hover:bg-primary-foreground/10"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5l7 7-7 7"
					/>
				</svg>
			</button>
		</div>
	</div>
</section>

<!-- FOOTER CTA -->
<section class="px-6 py-32 text-center">
	<div class="mx-auto max-w-2xl">
		<h2 class="mb-4 text-4xl font-bold leading-tight">
			Your loved one deserves<br />consistent care.
		</h2>
		<p class="mb-10 text-lg text-muted-foreground">
			Get started in minutes. Invite your first caregiver today.
		</p>
		<Button size="lg" href="/login?signup=true" class="px-12 py-6 text-base">Get Started</Button>
	</div>
</section>

<!-- FOOTER -->
<footer class="border-t border-border px-6 py-8">
	<div
		class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row"
	>
		<div class="flex items-center gap-2">
			<SalusLogo class="h-5 w-5" />
			<span class="font-display font-semibold text-foreground">Salus</span>
		</div>
		<div>© 2025 Salus. Care coordination for families.</div>
		<div class="flex gap-4">
			<a href="/pricing" class="transition-colors hover:text-foreground">Pricing</a>
			<a href="/login" class="transition-colors hover:text-foreground">Log In</a>
			<a href="/login?signup=true" class="transition-colors hover:text-foreground">Sign Up</a>
		</div>
	</div>
</footer>
