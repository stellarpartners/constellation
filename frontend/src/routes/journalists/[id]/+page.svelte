<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="detail-container">
	<button class="back-btn" onclick={() => goto('/')}>← Back</button>

	<h2 class="profile-name">{data.profile.name}</h2>
	<p class="profile-type">Journalist</p>

	<div class="profile-stats">
		<div class="stat-box">
			<div class="stat-box-value">{data.profile.total_outlets}</div>
			<div class="stat-box-label">Outlets</div>
		</div>
	</div>

	<div class="nav-links-section">
		<h3 class="nav-links-title">🔗 Works at these outlets:</h3>
		{#if data.navigation_links.length === 0}
			<p class="empty">No outlet relationships found.</p>
		{:else}
			<div class="tags-container">
				{#each data.navigation_links as link (link.outlet_id)}
					<button class="tag" onclick={() => goto(`/outlets/${link.outlet_id}`)}>
						{link.outlet_name}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>
