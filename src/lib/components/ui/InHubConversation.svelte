<script>
	import { createEventDispatcher, afterUpdate } from 'svelte';
	import { gameState } from '$lib/stores/gameState';

	/** @type {any} */
	export let npc = { name: 'NPC', npcPortrait: null, snippet: '', choices: [] };

	const dispatch = createEventDispatcher();

	$: playerName = $gameState && $gameState.character ? $gameState.character.name || '' : '';
	$: renderedNpcText =
		npc && npc.snippet ? String(npc.snippet).replace(/\[player name\]/g, playerName) : '';

	/** @param {any} choice */
	function selectChoice(choice) {
		dispatch('select', { choice });
	}

	function close() {
		dispatch('close');
	}

	/** @type {any} */
	let bubbleInnerEl;

	// Typed error handler for portrait images — avoids 'src does not exist on EventTarget' editor warnings
	/** @param {Event} e */
	function onPortraitError(e) {
		try {
			/** @type {any} */
			(e.currentTarget).src = '/Images/NPC/npc-berg.PNG';
		} catch (err) {
			/* ignore */
		}
	}

	afterUpdate(() => {
		try {
			if (bubbleInnerEl) bubbleInnerEl.scrollTop = 0;
		} catch (e) {
			/* ignore */
		}
	});
</script>

<div class="inhub-convo" role="dialog" aria-modal="true">
	<div class="convo-wrapper">
		<div class="inhub-backdrop" aria-hidden="true"></div>
		<div class="convo-panel" role="document">
			<div class="convo-left">
				{#if npc.npcPortrait}
					<div class="portrait">
						<img src={npc.npcPortrait} alt={npc.name} on:error={onPortraitError} />
					</div>
				{/if}
				<div class="bubble">
					<div class="bubble-inner" bind:this={bubbleInnerEl}>{renderedNpcText}</div>
				</div>
			</div>

			<div class="convo-right">
				<div class="npc-title">{npc.name}</div>
				<div class="choices">
					{#each npc.choices || [] as c (c)}
						{#if c && c.id === 'buy-sell-repair' && (npc.name === 'Zerg' || npc.name === 'Issac' || npc.name === 'Isaac')}
							<button class="choice" on:click={() => selectChoice(c)}>Buy / Sell</button>
						{:else}
							<button class="choice" on:click={() => selectChoice(c)}>{c.text}</button>
						{/if}
					{/each}
				</div>
				<div class="convo-actions">
					<button class="close-btn" on:click={close} disabled={npc.disableClose} class:disabled={npc.disableClose}>Close</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.close-btn.disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}
	.inhub-convo {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 18vh;
		z-index: 2200;
		pointer-events: none;
		width: 100%;
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}
	.convo-wrapper {
		position: relative;
		display: inline-block;
		pointer-events: none;
	}
	/* Backdrop only behind the conversation panel (rounded darker area) */
	.inhub-backdrop {
		position: absolute;
		left: -12px;
		right: -12px;
		top: -12px;
		bottom: -12px;
		background: rgba(0, 0, 0, 0.72);
		border-radius: 16px;
		z-index: 2190;
		pointer-events: none;
	}
	.convo-panel {
		position: relative;
		z-index: 2201;
		pointer-events: auto;
		display: flex;
		gap: 18px;
		align-items: stretch;
		/* Keep the overall panel from growing with content; allow inner areas to scroll */
		max-height: 68vh;
		background: rgba(8, 12, 20, 0.995);
		border: 1px solid rgba(255, 255, 255, 0.08);
		color: #edf2ff;
		padding: 18px;
		border-radius: 12px;
		box-shadow: 0 18px 60px rgba(0, 0, 0, 0.85);
		min-width: 560px;
		/* prefer a stable width on larger viewports, stay responsive on small screens */
		width: min(880px, 94vw);
		backface-visibility: hidden;
		will-change: transform;
	}
	.convo-left {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		/* flexible left column takes remaining space */
		flex: 1 1 auto;
		min-width: 320px;
		height: 100%;
	}
	.portrait img {
		width: 180px;
		height: 180px;
		object-fit: cover;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		flex-shrink: 0;
	}
	.bubble {
		background: rgba(10, 14, 20, 1);
		padding: 14px;
		border-radius: 12px;
		font-family: 'MedievalSharp', cursive;
		font-size: 1rem;
		text-align: center;
		width: 100%;
		box-sizing: border-box;
		color: #f6f8ff;
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		overflow: hidden;
	}
	.bubble-inner {
		/* Limit inner height to keep the panel consistent; the parent .convo-panel
		   defines the overall max-height. This makes the text area scrollable. */
		max-height: calc(68vh - 220px);
		overflow: auto;
		padding-right: 8px;
		white-space: pre-wrap;
		line-height: 1.6;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.bubble-inner::-webkit-scrollbar {
		height: 8px;
		width: 8px;
	}
	.bubble-inner::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.06);
		border-radius: 8px;
	}
	.convo-right {
		/* fixed column width so choices never expand the overall dialog */
		flex: 0 0 280px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 220px;
		height: 100%;
		overflow: auto;
		padding-right: 6px;
	}
	.npc-title {
		font-family: 'Cinzel', serif;
		font-size: 1.2rem;
		color: var(--accent-secondary-hex);
		text-align: left;
	}
	.choices {
		display: flex;
		flex-direction: column;
		gap: 8px;
		/* add spacing between the container top and the first option */
		padding-top: 8px;
		/* prevent very long choice lists from expanding dialog; make them scroll */
		max-height: calc(68vh - 180px);
		overflow: auto;
	}
	.choice {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.04);
		color: inherit;
		padding: 10px 12px;
		border-radius: 8px;
		text-align: left;
		cursor: pointer;
		width: 100%;
		box-sizing: border-box;
		white-space: normal; /* allow wrapping instead of expanding */
		overflow-wrap: anywhere;
	}
	.choice:hover {
		background: rgba(255, 255, 255, 0.04);
		/* avoid moving the button upward; keep visual feedback via background */
	}
	.convo-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 6px;
	}
	.close-btn {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: inherit;
		padding: 6px 10px;
		border-radius: 6px;
		cursor: pointer;
	}
</style>
