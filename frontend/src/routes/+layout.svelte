<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { fetchStats, type Stats } from '$lib/api';
	import '../app.css';

	let { children }: { children: Snippet } = $props();

	let stats = $state<Stats | null>(null);

	onMount(async () => {
		try {
			stats = await fetchStats();
		} catch {
			// Flask API not reachable yet
		}
	});
</script>

<div class="app-container">
	<header>
		<h1>🌟 Constellation Studio</h1>
		<p class="subtitle">Bidirectional Navigation Between Journalists and Media Outlets</p>

		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-number">{stats?.total_journalists ?? '—'}</div>
				<div class="stat-label">Total Journalists</div>
			</div>
			<div class="stat-card">
				<div class="stat-number">{stats?.total_outlets ?? '—'}</div>
				<div class="stat-label">Media Outlets</div>
			</div>
			<div class="stat-card">
				<div class="stat-number">{stats?.total_relationships ?? '—'}</div>
				<div class="stat-label">Total Relationships</div>
			</div>
		</div>
	</header>

	{@render children()}
</div>
