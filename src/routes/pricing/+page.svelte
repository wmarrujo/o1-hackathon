<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import SalusLogo from '$lib/components/SalusLogo.svelte';

	function randInt(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function fmt(n: number) {
		return '$' + n.toLocaleString();
	}

	let pca        = $state(randInt(30000, 60000));
	let ils        = $state(randInt(5000, 20000));
	let doctor     = $state(randInt(3000, 15000));
	let pt         = $state(randInt(2000, 10000));
	let transport  = $state(randInt(1500, 8000));
	let medicaid   = $state(randInt(15000, 50000));

	let caregiverHrs = $state(randInt(144, 240));
	let familyHrs    = $state(randInt(96, 192));
	let researchHrs  = $state(randInt(60, 240));
	let trackingHrs  = $state(randInt(48, 144));
	let doctorHrs    = $state(randInt(24, 96));
	let hourlyRate   = $state(randInt(20, 50));

	let grossCost   = $derived(pca + ils + doctor + pt + transport);
	let netCost     = $derived(grossCost - medicaid);
	let totalHrs    = $derived(caregiverHrs + familyHrs + researchHrs + trackingHrs + doctorHrs);
	let annualSaved = $derived(totalHrs * hourlyRate);

	function randomize() {
		pca        = randInt(30000, 60000);
		ils        = randInt(5000, 20000);
		doctor     = randInt(3000, 15000);
		pt         = randInt(2000, 10000);
		transport  = randInt(1500, 8000);
		medicaid   = randInt(15000, 50000);

		caregiverHrs = randInt(144, 240);
		familyHrs    = randInt(96, 192);
		researchHrs  = randInt(60, 240);
		trackingHrs  = randInt(48, 144);
		doctorHrs    = randInt(24, 96);
		hourlyRate   = randInt(20, 50);
	}

	let detailsExpanded = $state(false);

	const features_free = [
		'1 patient profile',
		'Up to 2 team members',
		'Shared task list',
		'Basic shift scheduling',
		'Voice check-in',
	];

	const features_pro = [
		'Unlimited patient profiles',
		'Unlimited team members',
		'Everything in Free',
		'Automated reminders & alerts',
		'AI shift summaries (beta)',
		'Health information hub',
		'Priority support',
	];

	const faqs = [
		{
			q: 'Can I switch plans later?',
			a: 'Yes. You can upgrade or downgrade at any time. Changes take effect at the start of your next billing cycle.'
		},
		{
			q: 'Is there a free trial for Pro?',
			a: 'Yes — every new account gets a 14-day Pro trial, no credit card required.'
		},
		{
			q: 'Who counts as a team member?',
			a: 'Any person you invite to a patient\'s care team — family coordinators, professional caregivers, or aides — counts as one team member.'
		},
		{
			q: 'What payment methods do you accept?',
			a: 'We accept all major credit and debit cards. Annual billing is also available at a 20% discount.'
		},
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
<section class="px-6 pb-16 pt-24 text-center">
	<div class="mx-auto max-w-2xl">
		<h1 class="text-5xl font-bold leading-tight tracking-tight">Pricing</h1>
	</div>
</section>

<!-- CONTEXT -->
<section class="px-6 pb-24">
	<div class="mx-auto max-w-6xl">

		<div class="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
			<div>
				<h2 class="text-3xl font-bold">See how the numbers add up.</h2>
				<p class="mt-2 text-sm text-muted-foreground">Ranges are approximate US averages. Hit randomize to explore different scenarios.</p>
			</div>
			<button
				onclick={randomize}
				class="shrink-0 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
			>
				🎲 Randomize example
			</button>
		</div>

		<div class="grid gap-8 md:grid-cols-2">

			<!-- Left: example care costs -->
			<!-- Left: example care costs -->
			<div class="flex flex-col rounded-2xl border border-border bg-card p-6">
				<div class="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Example costs</div>
				<div class="mb-1 flex items-end justify-between gap-2">
					<div class="font-display text-4xl font-bold">{fmt(Math.max(0, netCost))}</div>
					<div class="mb-1 text-xs text-muted-foreground">net / yr</div>
				</div>

				<button
					onclick={() => detailsExpanded = !detailsExpanded}
					class="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
				>
					<span>{detailsExpanded ? '▾' : '▸'}</span>
					{detailsExpanded ? 'Hide' : 'Show'} breakdown
				</button>

				{#if detailsExpanded}
					<div class="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm font-semibold">Personal Care Attendant (PCA)</div>
							<div class="shrink-0 font-mono text-sm font-semibold">{fmt(pca)}</div>
						</div>
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm font-semibold">Independent Living Services (ILS)</div>
							<div class="shrink-0 font-mono text-sm font-semibold">{fmt(ils)}</div>
						</div>
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm font-semibold">Doctor and specialist visits</div>
							<div class="shrink-0 font-mono text-sm font-semibold">{fmt(doctor)}</div>
						</div>
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm font-semibold">Physical and occupational therapy</div>
							<div class="shrink-0 font-mono text-sm font-semibold">{fmt(pt)}</div>
						</div>
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm font-semibold">Medical transportation</div>
							<div class="shrink-0 font-mono text-sm font-semibold">{fmt(transport)}</div>
						</div>
						<div class="flex items-center justify-between gap-4 border-t border-border pt-2.5">
							<div class="text-sm font-semibold text-green-700 dark:text-green-400">Medicaid / state waiver offset</div>
							<div class="shrink-0 font-mono text-sm font-semibold text-green-700 dark:text-green-400">- {fmt(medicaid)}</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Right: time and dollar savings -->
			<div class="flex flex-col rounded-2xl border border-primary bg-card p-6">
				<div class="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">Potential savings</div>
				<div class="mb-1 flex items-end justify-between gap-2">
					<div class="font-display text-4xl font-bold text-primary">{fmt(annualSaved)}</div>
					<div class="mb-1 text-xs text-muted-foreground">recovered / yr</div>
				</div>

				<button
					onclick={() => detailsExpanded = !detailsExpanded}
					class="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
				>
					<span>{detailsExpanded ? '▾' : '▸'}</span>
					{detailsExpanded ? 'Hide' : 'Show'} breakdown
				</button>

				{#if detailsExpanded}
					<div class="mt-4 flex flex-col gap-2.5 border-t border-border pt-4">
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm font-semibold">Caregiver update calls and texts</div>
							<div class="shrink-0 text-right">
								<div class="font-mono text-sm font-semibold text-primary">{fmt(caregiverHrs * hourlyRate)}</div>
								<div class="text-xs text-muted-foreground">{caregiverHrs} hrs / yr</div>
							</div>
						</div>
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm font-semibold">Coordinating between family members</div>
							<div class="shrink-0 text-right">
								<div class="font-mono text-sm font-semibold text-primary">{fmt(familyHrs * hourlyRate)}</div>
								<div class="text-xs text-muted-foreground">{familyHrs} hrs / yr</div>
							</div>
						</div>
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm font-semibold">Researching equipment and resources</div>
							<div class="shrink-0 text-right">
								<div class="font-mono text-sm font-semibold text-primary">{fmt(researchHrs * hourlyRate)}</div>
								<div class="text-xs text-muted-foreground">{researchHrs} hrs / yr</div>
							</div>
						</div>
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm font-semibold">Tracking missed tasks and follow-ups</div>
							<div class="shrink-0 text-right">
								<div class="font-mono text-sm font-semibold text-primary">{fmt(trackingHrs * hourlyRate)}</div>
								<div class="text-xs text-muted-foreground">{trackingHrs} hrs / yr</div>
							</div>
						</div>
						<div class="flex items-center justify-between gap-4">
							<div class="text-sm font-semibold">Preparing doctors with current info</div>
							<div class="shrink-0 text-right">
								<div class="font-mono text-sm font-semibold text-primary">{fmt(doctorHrs * hourlyRate)}</div>
								<div class="text-xs text-muted-foreground">{doctorHrs} hrs / yr</div>
							</div>
						</div>
					</div>
				{/if}
			</div>

		</div>
	</div>
</section>

<!-- PLANS -->
<section class="px-6 pb-24">
	<div class="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">

		<!-- Free -->
		<div class="flex flex-col rounded-2xl border border-border bg-card p-8 shadow-sm">
			<div class="mb-1 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Free</div>
			<div class="mb-2 flex items-end gap-1">
				<span class="font-display text-5xl font-bold">$0</span>
				<span class="mb-1.5 text-muted-foreground">/ month</span>
			</div>
			<p class="mb-8 text-sm text-muted-foreground">Perfect for a single family getting started.</p>

			<ul class="mb-8 flex flex-col gap-3">
				{#each features_free as feat}
					<li class="flex items-center gap-2.5 text-sm">
						<span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">✓</span>
						{feat}
					</li>
				{/each}
			</ul>

			<div class="mt-auto">
				<Button variant="outline" href="/login?signup=true" class="w-full">Get started free</Button>
			</div>
		</div>

		<!-- Pro -->
		<div class="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-8 shadow-md">
			<div class="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
				Most popular
			</div>
			<div class="mb-1 text-sm font-semibold uppercase tracking-widest text-primary">Pro</div>
			<div class="mb-2 flex items-end gap-1">
				<span class="font-display text-5xl font-bold">$19</span>
				<span class="mb-1.5 text-muted-foreground">/ month</span>
			</div>
			<p class="mb-8 text-sm text-muted-foreground">For families with professional caregivers and complex care needs.</p>

			<ul class="mb-8 flex flex-col gap-3">
				{#each features_pro as feat}
					<li class="flex items-center gap-2.5 text-sm">
						<span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">✓</span>
						{feat}
					</li>
				{/each}
			</ul>

			<div class="mt-auto">
				<Button href="/login?signup=true" class="w-full">Start 14-day free trial</Button>
			</div>
		</div>
	</div>

	<p class="mt-6 text-center text-sm text-muted-foreground">
		No credit card required to start. Annual plans available at 20% off.
	</p>
</section>

<!-- FAQ -->
<section class="bg-secondary/50 px-6 py-24">
	<div class="mx-auto max-w-2xl">
		<div class="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">FAQ</div>
		<h2 class="mb-12 text-4xl font-bold">Common questions.</h2>
		<div class="flex flex-col gap-6">
			{#each faqs as item}
				<div class="rounded-xl border border-border bg-card p-6">
					<p class="mb-2 font-semibold">{item.q}</p>
					<p class="text-sm text-muted-foreground">{item.a}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- FOOTER CTA -->
<section class="px-6 py-24 text-center">
	<div class="mx-auto max-w-2xl">
		<h2 class="mb-4 text-4xl font-bold leading-tight">
			Your loved one deserves<br />consistent care.
		</h2>
		<p class="mb-10 text-lg text-muted-foreground">
			Get started in minutes. Invite your first caregiver today.
		</p>
		<Button size="lg" href="/login?signup=true" class="px-12 py-6 text-base">Get Started Free</Button>
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
