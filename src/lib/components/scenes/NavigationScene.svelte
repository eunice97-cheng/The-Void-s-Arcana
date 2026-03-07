<script>
	// @ts-nocheck
	import { createEventDispatcher } from 'svelte';
	export let scene = null;
	const dispatch = createEventDispatcher();

	function talkTo(npc) {
		// If NPC defines a conversation scene, load it via sceneManager
		if (npc && npc.conversationScene) {
			// dispatch an event for parent to handle navigation
			dispatch('navigate', { scene: npc.conversationScene });
			return;
		}
		// otherwise show simple dialog (placeholder)
		alert(`${npc.name}: ${npc.snippet || 'They have nothing to say.'}`);
	}
</script>

<div class="navigation-scene">
	<h2>{scene && scene.name ? scene.name : 'Travel'}</h2>
	<p class="nav-content">
		{scene && scene.content ? scene.content : 'You arrive and look around.'}
	</p>

	{#if scene && scene.meta && scene.meta.npcs && scene.meta.npcs.length}
		<section class="npcs">
			<h3>People here</h3>
			<ul>
				{#each scene.meta.npcs as npc (npc.name)}
					<li class="npc-item">
						<div class="npc-name">{npc.name}</div>
						<div class="npc-actions">
							<button on:click={() => talkTo(npc)}>Talk</button>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.navigation-scene {
		padding: 20px;
		color: #e8f0ff;
	}
	.nav-content {
		margin-bottom: 16px;
	}
	.npcs ul {
		list-style: none;
		padding: 0;
	}
	.npc-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	.npc-name {
		font-weight: 600;
	}
	button {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		color: inherit;
		padding: 6px 10px;
		border-radius: 6px;
	}
</style>
