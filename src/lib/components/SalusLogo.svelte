<script lang="ts">
	let { class: className = 'h-20 w-20' }: { class?: string } = $props();
</script>

<svg
	viewBox="0 0 80 80"
	class="{className} drop-shadow-sm"
	xmlns="http://www.w3.org/2000/svg"
	aria-hidden="true"
>
	<defs>
		<linearGradient id="salus-bg" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="#3d6e58" />
			<stop offset="100%" stop-color="#27483a" />
		</linearGradient>
		<linearGradient id="salus-cross" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color="#fbf7eb" />
			<stop offset="100%" stop-color="#ece4cd" />
		</linearGradient>
	</defs>
	<rect x="2" y="2" width="76" height="76" rx="18" fill="url(#salus-bg)" />
	<rect
		x="4.5"
		y="4.5"
		width="71"
		height="71"
		rx="15.5"
		fill="none"
		stroke="#e8c697"
		stroke-opacity="0.55"
		stroke-width="1"
	/>
	<path
		d="M33 16 h14 a3 3 0 0 1 3 3 v11 h11 a3 3 0 0 1 3 3 v14 a3 3 0 0 1 -3 3 h-11 v11 a3 3 0 0 1 -3 3 h-14 a3 3 0 0 1 -3 -3 v-11 h-11 a3 3 0 0 1 -3 -3 v-14 a3 3 0 0 1 3 -3 h11 v-11 a3 3 0 0 1 3 -3 z"
		fill="url(#salus-cross)"
	/>
	<path
		d="M33 16 h14 a3 3 0 0 1 3 3 v11 h11 a3 3 0 0 1 3 3 v3"
		fill="none"
		stroke="#ffffff"
		stroke-opacity="0.7"
		stroke-width="1.2"
		stroke-linecap="round"
	/>
</svg>
