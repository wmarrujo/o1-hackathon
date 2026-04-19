<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import SalusLogo from '$lib/components/SalusLogo.svelte';

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
		<div class="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">Pricing</div>
		<h1 class="mb-4 text-5xl font-bold leading-tight tracking-tight">Simple, honest pricing.</h1>
		<p class="text-lg text-muted-foreground">
			Start for free. Upgrade when your care team grows.
		</p>
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
