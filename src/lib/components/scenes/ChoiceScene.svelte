<!-- src/lib/components/scenes/ChoiceScene.svelte -->
<script>
	import { sceneManager } from '$lib/stores/sceneManager';
	import { saveSlotsManager } from '$lib/stores/saveSlotsManager';
	import { personalityTraits } from '$lib/stores/gameState';
	import { addTraitChange } from '$lib/stores/traitHistory';
	import { gameState } from '$lib/stores/gameState';
	import { fade } from 'svelte/transition';
	import './choice.css';
	import MusicToggle from '$lib/components/ui/MusicToggle.svelte';

	/** @type {any} */
	export let scene;

	/** @type {boolean} */
	let isAnimating = false;
	/** @type {string} */
	let renderedNpcText = '';
	$: renderedNpcText =
		scene && scene.npcText
			? scene.npcText.replace(/\[player name\]/g, $gameState.character?.name || '')
			: '';

	/** @param {string|null|undefined} nextScene @param {string|null|undefined} trait */
	function selectChoice(nextScene, trait) {
		if (isAnimating) return;
		isAnimating = true;

		if (trait) {
			console.log('[ChoiceScene] Updating trait:', trait);
			personalityTraits.update((traits) => {
				const newTraits = /** @type {Record<string, number>} */ (Object.assign({}, traits || {}));
				console.log('[ChoiceScene] Current traits before update:', newTraits);
				const key = String(trait);
				newTraits[key] = (newTraits[key] || 0) + 1;
				console.log('[ChoiceScene] Updated traits:', newTraits);

				// Also record in trait history
				addTraitChange(key, 1, 'choice', {
					sourceId: scene?.id || 'unknown',
					description: `Choice in scene: ${scene?.title || scene?.id || 'unknown'}`
				});

				// Auto-save when ritual is complete
				const totalAnswers = Object.values(newTraits).reduce(
					(sum, count) => sum + (Number(count) || 0),
					0
				);
				if (totalAnswers >= 10) {
					setTimeout(() => {
						saveSlotsManager.autoSave && saveSlotsManager.autoSave();
					}, 500);
				}

				return newTraits;
			});
		}

		if (nextScene) {
			try {
				sceneManager.loadScene(nextScene);
			} catch (e) {
				console.error('[ChoiceScene] failed to load next scene', nextScene, e);
			}
		}
		isAnimating = false;
	}

	/** Navigate to the previous scene */
	async function previousScene() {
		if (isAnimating) return;

		// Prevent going back when disabled by UI rules
		if (!canGoBack) {
			console.debug('[ChoiceScene] Back navigation blocked for', scene.title);
			return;
		}

		isAnimating = true;
		try {
			await sceneManager.back();
		} catch (e) {
			console.error('[ChoiceScene] failed to navigate back', e);
		} finally {
			isAnimating = false;
		}
	}

	// Reactive canGoBack so it updates when `scene` prop changes
	/** @type {boolean} */
	let canGoBack = false;
	$: canGoBack =
		!!(scene && scene.previousScene) &&
		scene.previousScene !== 'name-input' &&
		scene.title !== 'Scene017';
</script>

<div class="choice-overlay" style:background={scene.background}>
	<MusicToggle />
	<div class="choice-content">
		<div class="choice-main">
			<!-- NPC Section -->
			<div class="npc-section">
				<div class="npc-dialogue-box">
					<div class="npc-name">{scene.npcName}</div>
					<div class="npc-text" in:fade>{renderedNpcText}</div>
				</div>
				{#if scene.npcPortrait}
					<div class="npc-portrait-container">
						<img src={scene.npcPortrait} alt={scene.npcName} class="npc-portrait" />
					</div>
				{/if}
			</div>

			<!-- Choices Section -->
			<div class="choices-section">
				<div class="choices-container">
					{#each scene.choices as choice, index (index)}
						<button
							class="choice-btn fade-in"
							style="animation-delay: {index * 0.1}s"
							on:click={() => selectChoice(scene.nextScene, choice.trait)}
						>
							{choice.text}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Controls -->
		<div class="choice-controls">
			{#if canGoBack}
				<button class="choice-btn back-btn" on:click={previousScene}> Back </button>
			{/if}
		</div>
	</div>
</div>

<!-- styles are provided by the external choice.css file -->
