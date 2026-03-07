<script>
	import { sceneManager } from '$lib/stores/sceneManager';
	import { onMount } from 'svelte';

	let activeTab = 'status';

	function openTab(t) {
		activeTab = t;
	}

	async function exitFreeMode() {
		// Navigate back to previous scene if available
		const current = null; // this UI is legacy; prefer to use the new hub
		try {
			// Attempt to load a default scene (landing) as fallback
			await sceneManager.loadScene('Scene001');
		} catch (e) {
			console.warn('[FreeModeHub] exit failed', e);
		}
	}

	// Helper to jump to a scene from the hub (placeholder, safe-call)
	async function jumpToScene(title) {
		try {
			await sceneManager.loadScene(title);
		} catch (e) {
			console.warn('[FreeModeHub] failed to jump to scene', title, e);
		}
	}

	onMount(() => {
		// focus first tab for keyboard users
		const el = document.querySelector('.freehub .tabs button');
		if (el) el.focus();
	});
</script>

<div class="freehub-overlay" role="dialog" aria-modal="true">
	<div class="freehub">
		<header class="freehub-header">
			<h2>Free Mode</h2>
			<button class="icon-btn" aria-label="Exit free mode" on:click={exitFreeMode}>✕</button>
		</header>

		<nav class="tabs">
			<button class:active={activeTab === 'status'} on:click={() => openTab('status')}
				>Status</button
			>
			<button class:active={activeTab === 'skills'} on:click={() => openTab('skills')}
				>Skills</button
			>
			<button class:active={activeTab === 'quests'} on:click={() => openTab('quests')}
				>Quests</button
			>
			<button class:active={activeTab === 'map'} on:click={() => openTab('map')}>Map</button>
		</nav>

		<section class="freehub-body">
			{#if activeTab === 'status'}
				<div class="panel">
					<h3>Player Status</h3>
					<p>HP, SP, Stamina, Level and other details will appear here.</p>
				</div>
			{:else if activeTab === 'skills'}
				<div class="panel">
					<h3>Skills</h3>
					<p>Skill list and progress (placeholder).</p>
				</div>
			{:else if activeTab === 'quests'}
				<div class="panel">
					<h3>Quests</h3>
					<p>Active and available quests will be listed here.</p>
				</div>
			{:else}
				<div class="panel">
					<h3>Map</h3>
					<p>Click a place to visit (placeholder).</p>
					<div class="map-placeholder">
						<button on:click={() => jumpToScene('Scene010')}>Go to Scene010 (example)</button>
					</div>
				</div>
			{/if}
		</section>

		<footer class="freehub-footer">
			<button class="icon-btn" on:click={exitFreeMode}>Exit Free Mode</button>
		</footer>
	</div>
</div>

<style>
	.freehub-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 11000;
		background: rgba(0, 0, 0, 0.6);
	}
	.freehub {
		width: min(1100px, 95%);
		background: rgba(20, 20, 30, 0.96);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 12px;
		padding: 18px;
		color: #fff;
	}
	.freehub-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.freehub .tabs {
		display: flex;
		gap: 8px;
		margin: 12px 0;
	}
	.freehub .tabs button {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.03);
		color: #ddd;
		padding: 8px 12px;
		border-radius: 8px;
		cursor: pointer;
	}
	.freehub .tabs button.active {
		background: rgba(138, 43, 226, 0.8);
		color: white;
	}
	.freehub-body {
		min-height: 180px;
		padding: 10px 0;
	}
	.freehub .panel {
		background: rgba(0, 0, 0, 0.25);
		padding: 14px;
		border-radius: 8px;
	}
	.freehub-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: 12px;
	}
</style>
