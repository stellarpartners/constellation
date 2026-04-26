<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		fetchCrossPlatformJournalists,
		fetchTopOutlets,
		searchJournalists,
		searchOutlets,
		type JournalistSummary,
		type OutletSummary
	} from '$lib/api';

	type Tab = 'cross-platform' | 'top-outlets' | 'search-journalists' | 'search-outlets';

	let activeTab = $state<Tab>('cross-platform');

	let crossPlatform = $state<JournalistSummary[]>([]);
	let topOutlets = $state<OutletSummary[]>([]);
	let journalistResults = $state<JournalistSummary[]>([]);
	let outletResults = $state<OutletSummary[]>([]);

	let journalistQuery = $state('');
	let outletQuery = $state('');
	let journalistSearched = $state(false);
	let outletSearched = $state(false);
	let searching = $state(false);
	let loadError = $state('');

	onMount(async () => {
		try {
			[crossPlatform, topOutlets] = await Promise.all([
				fetchCrossPlatformJournalists(),
				fetchTopOutlets()
			]);
		} catch {
			loadError = 'Could not reach the API. Make sure the Flask server is running on port 5000.';
		}
	});

	async function doJournalistSearch() {
		if (!journalistQuery.trim()) return;
		searching = true;
		try {
			journalistResults = await searchJournalists(journalistQuery.trim());
		} finally {
			journalistSearched = true;
			searching = false;
		}
	}

	async function doOutletSearch() {
		if (!outletQuery.trim()) return;
		searching = true;
		try {
			outletResults = await searchOutlets(outletQuery.trim());
		} finally {
			outletSearched = true;
			searching = false;
		}
	}
</script>

{#if loadError}
	<div class="list-container">
		<p class="empty">⚠️ {loadError}</p>
	</div>
{/if}

<section class="nav-tabs">
	<h2>🔍 Explore Database</h2>

	<div class="tab-buttons">
		<button
			class="btn"
			class:active={activeTab === 'cross-platform'}
			onclick={() => (activeTab = 'cross-platform')}
		>
			Cross-Platform Journalists
		</button>
		<button
			class="btn"
			class:active={activeTab === 'top-outlets'}
			onclick={() => (activeTab = 'top-outlets')}
		>
			Top Media Outlets
		</button>
		<button
			class="btn btn-secondary"
			class:active={activeTab === 'search-journalists'}
			onclick={() => (activeTab = 'search-journalists')}
		>
			Search Journalists
		</button>
		<button
			class="btn btn-secondary"
			class:active={activeTab === 'search-outlets'}
			onclick={() => (activeTab = 'search-outlets')}
		>
			Search Outlets
		</button>
	</div>

	<!-- Cross-Platform Journalists -->
	{#if activeTab === 'cross-platform'}
		<div class="list-container">
			<h2 class="section-title">🔄 Cross-Platform Journalists</h2>
			{#if crossPlatform.length === 0}
				<p class="loading-text">Loading...</p>
			{:else}
				{#each crossPlatform as journalist (journalist.id)}
					<button type="button" class="list-item" onclick={() => goto(`/journalists/${journalist.id}`)}>
						<span class="item-name">{journalist.name}</span>
						<span class="item-meta"
							>{journalist.outlet_count} outlet{journalist.outlet_count !== 1 ? 's' : ''} →</span
						>
					</button>
				{/each}
			{/if}
		</div>

	<!-- Top Media Outlets -->
	{:else if activeTab === 'top-outlets'}
		<div class="list-container">
			<h2 class="section-title">🏆 Top Media Outlets by Journalist Count</h2>
			{#if topOutlets.length === 0}
				<p class="loading-text">Loading...</p>
			{:else}
				{#each topOutlets as outlet (outlet.id)}
					<button type="button" class="list-item" onclick={() => goto(`/outlets/${outlet.id}`)}>
						<span class="item-name">{outlet.name}</span>
						<span class="item-meta"
							>{outlet.journalist_count} journalist{outlet.journalist_count !== 1 ? 's' : ''} →</span
						>
					</button>
				{/each}
			{/if}
		</div>

	<!-- Search Journalists -->
	{:else if activeTab === 'search-journalists'}
		<div class="list-container">
			<h2 class="section-title">🔍 Search Journalists</h2>
			<div class="search-row">
				<input
					class="search-input"
					type="text"
					placeholder="Type a journalist name and press Enter..."
					bind:value={journalistQuery}
					onkeydown={(e) => e.key === 'Enter' && doJournalistSearch()}
				/>
				<button class="btn" onclick={doJournalistSearch} disabled={searching}>Search</button>
			</div>
			{#if journalistSearched && journalistResults.length === 0}
				<p class="empty">No journalists found matching "{journalistQuery}".</p>
			{:else}
				{#each journalistResults as journalist (journalist.id)}
					<button type="button" class="list-item" onclick={() => goto(`/journalists/${journalist.id}`)}>
						<span class="item-name">{journalist.name}</span>
						<span class="item-meta"
							>{journalist.outlet_count} outlet{journalist.outlet_count !== 1 ? 's' : ''}</span
						>
					</button>
				{/each}
			{/if}
		</div>

	<!-- Search Outlets -->
	{:else if activeTab === 'search-outlets'}
		<div class="list-container">
			<h2 class="section-title">🔍 Search Media Outlets</h2>
			<div class="search-row">
				<input
					class="search-input"
					type="text"
					placeholder="Type an outlet name and press Enter..."
					bind:value={outletQuery}
					onkeydown={(e) => e.key === 'Enter' && doOutletSearch()}
				/>
				<button class="btn" onclick={doOutletSearch} disabled={searching}>Search</button>
			</div>
			{#if outletSearched && outletResults.length === 0}
				<p class="empty">No outlets found matching "{outletQuery}".</p>
			{:else}
				{#each outletResults as outlet (outlet.id)}
					<button type="button" class="list-item" onclick={() => goto(`/outlets/${outlet.id}`)}>
						<span class="item-name">{outlet.name}</span>
						<span class="item-meta"
							>{outlet.journalist_count} journalist{outlet.journalist_count !== 1
								? 's'
								: ''}</span
						>
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</section>
