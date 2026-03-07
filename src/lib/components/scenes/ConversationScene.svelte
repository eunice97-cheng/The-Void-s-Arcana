<!-- src/lib/components/scenes/ConversationScene.svelte -->
<script>
	import { sceneManager } from '$lib/stores/sceneManager';
	import { fade } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';
	import { assetLoader } from '$lib/services/assetLoader';
	import { gameState, audioSettings } from '$lib/stores/gameState';
	import { loadAudioBlob } from '$lib/utils/audioLoader';
	// free mode store removed; transitions now use scenes and sceneManager
	import MusicToggle from '$lib/components/ui/MusicToggle.svelte';

	/** @type {any} */
	export let scene;

	/** @type {boolean} */
	let isAnimating = false;
	/** @type {boolean} */
	let isLoading = true;
	/** @type {string|null} */
	let error = null;
	// resolved player name for placeholder replacement
	/** @type {string} */
	let playerName = '';
	$: playerName = $gameState.character?.name || '';
	
	$: sfxMultiplier = ($audioSettings?.sfxVolume ?? 50) / 100;

	$: renderedNpcText =
		scene && scene.npcText ? scene.npcText.replace(/\[player ?name\]/gi, playerName) : '';
	$: renderedPlayerText =
		scene && scene.playerText ? scene.playerText.replace(/\[player ?name\]/gi, playerName) : '';

	/** @type {HTMLVideoElement} */
	let videoElement;

	$: if (videoElement) {
		const enabled = $gameState.audioEnabled;
		const vol = enabled ? ($audioSettings?.sfxVolume ?? 50) / 100 : 0;
		videoElement.volume = vol;
	}

	/** @type {HTMLAudioElement} */
	let audioPlayer;
	let currentAudioIndex = 0;

	$: if (videoElement && scene) {
		if (scene.videoStaticEnd) {
			videoElement.pause();
			if (videoElement.readyState >= 1) {
				videoElement.currentTime = videoElement.duration;
			}
		}
	}

	// Handle scene audio
	$: if (scene) {
		currentAudioIndex = 0;
		playSceneAudio();
	}

	async function playSceneAudio() {
		if (!audioPlayer || !scene) return;

		let src = '';
		if (scene.audio) {
			if (Array.isArray(scene.audio)) {
				if (currentAudioIndex < scene.audio.length) {
					src = scene.audio[currentAudioIndex];
				}
			} else {
				src = scene.audio;
			}
		}

		if (src) {
			// Load blob
			const blobUrl = await loadAudioBlob(src);

			// Only update src if it has changed to prevent aborting pending requests
			if (audioPlayer.getAttribute('src') !== blobUrl) {
				audioPlayer.src = blobUrl;
				audioPlayer.volume = 1.0 * sfxMultiplier;
				if ($audioSettings.enabled) {
					audioPlayer.play().catch((e) => console.warn('Audio play failed', e));
				}
			} else if ($audioSettings.enabled && audioPlayer.paused) {
				// If src is same but paused (and enabled), resume
				audioPlayer.volume = 1.0 * sfxMultiplier;
				audioPlayer.play().catch((e) => console.warn('Audio play failed', e));
			}
		} else {
			audioPlayer.pause();
			audioPlayer.removeAttribute('src');
			audioPlayer.load();
		}
	}

	function onAudioEnded() {
		if (scene && Array.isArray(scene.audio)) {
			if (currentAudioIndex < scene.audio.length - 1) {
				currentAudioIndex++;
				playSceneAudio();
			}
		}
	}

	// Handle audio toggle
	$: if (audioPlayer && scene && scene.audio) {
		audioPlayer.volume = 1.0 * sfxMultiplier;
		if ($audioSettings.enabled) {
			// If paused but should be playing (and src is set correctly)
			if (audioPlayer.paused && audioPlayer.src && !audioPlayer.ended) {
				audioPlayer.play().catch((e) => console.warn('Audio play failed', e));
			}
		} else {
			audioPlayer.pause();
		}
	}

	onMount(async () => {
		try {
			console.debug('[ConversationScene] onMount - preload for', scene && scene.title);
			isLoading = true;
			await assetLoader.preloadSceneAssets(scene);
			isLoading = false;
			console.debug('[ConversationScene] onMount - preload complete for', scene && scene.title);
		} catch (e) {
			console.error('Asset loading error:', e);
			// Try to continue without the portrait if that's what failed
			if (scene.npcPortrait) {
				console.warn('Continuing without NPC portrait');
				scene.npcPortrait = null;
			}
			isLoading = false;
			error = null;
		}
	});

	onDestroy(() => {
		try {
			console.debug('[ConversationScene] onDestroy - unmounting', scene && scene.title);
		} catch (e) {
			/* ignore */
		}
	});

	/** Advance to the next scene */
	async function nextScene() {
		if (isAnimating) return;
		isAnimating = true;

		try {
			const nextTitle = sceneManager.getNextScene(scene.title);
			console.debug(
				'[ConversationScene] nextScene called for',
				scene && scene.title,
				'resolved nextTitle ->',
				nextTitle
			);

			if (nextTitle) {
				if (nextTitle === 'free-mode') {
					// For the special free-mode transition, kick off the transition but
					// do not await it here to avoid blocking the UI in case navigation
					// decides not to perform a route change.
					console.debug('[ConversationScene] initiating non-blocking transition to free-mode');
					sceneManager
						.loadScene('free-mode')
						.then(() =>
							console.debug('[ConversationScene] sceneManager.loadScene completed for free-mode')
						)
						.catch((e) => {
							console.error('[ConversationScene] failed to load next scene free-mode', e);
						});
				} else {
					try {
						await sceneManager.loadScene(nextTitle);
						console.debug('[ConversationScene] sceneManager.loadScene completed for', nextTitle);
					} catch (e) {
						console.error('[ConversationScene] failed to load next scene', nextTitle, e);
					}
				}
			} else if (scene && scene.title === 'free-mode') {
				// No-op: hub will render when the sceneManager sets currentScene to free-mode
				console.debug('[ConversationScene] Continue pressed on free-mode scene');
			} else {
				console.debug('[ConversationScene] No next scene defined for', scene && scene.title);
			}
		} finally {
			isAnimating = false;
		}
	}

	/** Navigate to the previous scene */
	async function previousScene() {
		if (isAnimating) return;

		// Prevent going back when disabled by UI rules (e.g. Scene017 or name-input)
		if (!canGoBack) {
			console.debug('[ConversationScene] Back navigation blocked for', scene.title);
			return;
		}

		isAnimating = true;
		try {
			await sceneManager.back();
		} catch (e) {
			console.error('[ConversationScene] failed to navigate back', e);
		} finally {
			isAnimating = false;
		}
	}

	// Disable back when there is no previous scene or when previousScene is the name-input
	// Also explicitly disable back on Scene017 so player cannot return to the name-input page
	/** @type {boolean} */
	let canGoBack = false;
	$: canGoBack =
		!!(scene && scene.previousScene) &&
		scene.previousScene !== 'name-input' &&
		scene.title !== 'Scene017';

	// Guard previousScene navigation in code as well
</script>

<div id="conversation-overlay">
	<div id="conversation-background" style:background={scene.background}>
		{#if scene.video}
			<video
				bind:this={videoElement}
				src={scene.video}
				autoplay={!scene.videoStaticEnd}
				playsinline
				controlsList="nodownload"
				on:contextmenu|preventDefault
				class="background-video"
				on:loadedmetadata={() => {
					if (scene.videoStaticEnd && videoElement) {
						videoElement.currentTime = videoElement.duration;
						videoElement.pause();
					}
				}}
			>
				<track kind="captions" />
			</video>
		{/if}
	</div>
	<MusicToggle />
	<audio bind:this={audioPlayer} on:ended={onAudioEnded} preload="none" controlsList="nodownload" on:contextmenu|preventDefault />

	{#if isLoading}
		<div class="loading-overlay">
			<div class="loading-spinner"></div>
			<p>Loading scene...</p>
		</div>
	{:else if error}
		<div class="error-overlay">
			<p>{error}</p>
			<button class="conversation-btn" on:click={() => window.location.reload()}> Retry </button>
		</div>
	{:else}
		<div id="conversation-content">
			<div id="conversation-main">
				<!-- NPC Section (Left Side) -->
				<div id="npc-section">
					<div id="npc-dialogue-box" class:arrow-right={scene.dialogueArrowRight}>
						<div id="npc-name">{scene.npcName}</div>
						<div id="npc-text" class="fade-in" in:fade>{renderedNpcText}</div>
					</div>
					{#if scene.npcPortrait}
						<div id="npc-portrait-container">
							<img src={scene.npcPortrait} alt={scene.npcName} id="npc-portrait" />
						</div>
					{/if}
				</div>

				<!-- Player Section (Right Side) -->
				<div id="player-section">
					{#if scene.foregroundImage}
						<div class="foreground-image-container">
							<img src={scene.foregroundImage} alt="Scene detail" />
						</div>
					{/if}
					<div id="player-dialogue-box">
						<div id="player-text" class="fade-in" in:fade>{renderedPlayerText}</div>
					</div>
				</div>
			</div>

			<!-- Controls -->
			<div id="conversation-controls">
				<button
					id="conversation-back"
					class="conversation-btn"
					on:click={previousScene}
					disabled={!canGoBack}
				>
					Back
				</button>
				<button id="conversation-continue" class="conversation-btn" on:click={nextScene}>
					Continue
				</button>
			</div>
		</div>
	{/if}

	<!-- Audio Toggle -->
	<MusicToggle />
</div>

<style>
	/* Conversation Mode Styles */
	#conversation-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.9);
		z-index: 10000;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		font-family: 'Cinzel', serif;
		color: #e6e6fa;
		overflow: hidden;
	}

	#conversation-background {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		z-index: 1;
	}

	.background-video {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: -1;
	}

	/* Global utilities (sr-only, conversation-meta) moved to src/lib/styles/global.css */

	/* FLEXBOX LAYOUT - FIXED */
	#conversation-content {
		position: relative;
		z-index: 2;
		width: 95%;
		height: 85%;
		max-width: 1400px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 20px;
		min-height: 0;
		overflow: visible;
	}

	#conversation-main {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 20px;
		flex: 1;
		/* Takes all available space */
	}

	/* Conversation Controls - NOW TRULY SPANS FULL WIDTH */
	#conversation-controls {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 20px;
		box-sizing: border-box;
		position: relative;
		z-index: 10;
		min-height: 80px;
	}

	/* NPC Section (Left Side) */
	#npc-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: space-between;
		height: 100%;
		position: relative;
		overflow-y: auto;
	}

	#npc-portrait-container {
		display: flex;
		justify-content: center;
		align-items: flex-end;
		flex-shrink: 0;
		min-height: 0;
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		height: 60%;
		width: 90%;
	}

	#npc-portrait {
		max-width: 90%;
		max-height: 90%;
		object-fit: contain;
	}

	#npc-dialogue-box {
		background: rgba(30, 30, 46, 0.9);
		border: 2px solid rgba(77, 195, 255, 0.6);
		border-radius: 20px;
		padding: 25px;
		width: 90%;
		min-height: 120px;
		margin-top: 10px;
		box-shadow: 0 0 25px rgba(77, 195, 255, 0.4);
		position: relative;
	}

	#npc-dialogue-box::after {
		content: '';
		position: absolute;
		bottom: -10px;
		left: 50px;
		width: 0;
		height: 0;
		border-left: 12px solid transparent;
		border-right: 12px solid transparent;
		border-top: 12px solid rgba(77, 195, 255, 0.6);
	}

	#npc-dialogue-box.arrow-right::after {
		left: auto;
		right: 50px;
	}

	#npc-name {
		font-family: 'Cinzel', serif;
		font-size: 1.4rem;
		color: var(--accent-secondary-hex);
		margin-bottom: 15px;
		font-style: italic;
		text-shadow: 0 0 8px rgba(77, 195, 255, 0.8);
		text-align: center;
	}

	#npc-text {
		font-family: 'MedievalSharp', cursive;
		font-size: 1.3rem;
		line-height: 1.7;
		color: #e6e6fa;
		text-align: center;
	}

	/* Player Section (Right Side) */
	#player-section {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		height: 100%;
		position: relative;
	}

	.foreground-image-container {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 20px;
		overflow: hidden;
	}

	.foreground-image-container img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
		border-radius: 8px;
		box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
	}

	#player-dialogue-box {
		background: rgba(30, 30, 46, 0.9);
		border: 2px solid rgba(138, 43, 226, 0.6);
		border-radius: 20px;
		padding: 25px;
		min-height: 120px;
		box-shadow: 0 0 25px rgba(138, 43, 226, 0.4);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	#player-dialogue-box::after {
		content: '';
		position: absolute;
		bottom: -10px;
		right: 50px;
		width: 0;
		height: 0;
		border-left: 12px solid transparent;
		border-right: 12px solid transparent;
		border-top: 12px solid rgba(138, 43, 226, 0.6);
	}

	#player-text {
		font-family: 'MedievalSharp', cursive;
		font-size: 1.3rem;
		line-height: 1.7;
		color: #e6e6fa;
		text-align: center;
	}

	/* Button Styles */
	#conversation-back {
		background: rgba(100, 100, 120, 0.7);
		border: 1px solid rgba(150, 150, 170, 0.9);
		color: white;
		padding: 15px 40px;
		border-radius: 10px;
		font-family: 'Cinzel', serif;
		font-size: 1.2rem;
		cursor: pointer;
		transition: all 0.3s ease;
		min-width: 180px;
		opacity: 1;
		/* Always visible */
	}

	#conversation-back:hover {
		background: rgba(120, 120, 140, 0.9);
		transform: translateY(-2px);
		box-shadow: 0 5px 20px rgba(150, 150, 170, 0.4);
	}

	#conversation-back:disabled {
		background: rgba(100, 100, 120, 0.3);
		border-color: rgba(150, 150, 170, 0.5);
		color: rgba(255, 255, 255, 0.5);
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	#conversation-continue {
		background: rgba(138, 43, 226, 0.7);
		border: 1px solid rgba(138, 43, 226, 0.9);
		color: white;
		padding: 15px 40px;
		border-radius: 10px;
		font-family: 'Cinzel', serif;
		font-size: 1.2rem;
		cursor: pointer;
		transition: all 0.3s ease;
		min-width: 180px;
	}

	#conversation-continue:hover {
		background: rgba(138, 43, 226, 0.9);
		transform: translateY(-2px);
		box-shadow: 0 5px 20px rgba(138, 43, 226, 0.4);
	}

	#conversation-continue:disabled {
		background: rgba(138, 43, 226, 0.3);
		border-color: rgba(138, 43, 226, 0.5);
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	/* Audio toggle styling moved to reusable MusicToggle component */

	/* Animation for text appearance */
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.fade-in {
		animation: fadeIn 0.5s ease forwards;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		#conversation-main {
			grid-template-columns: 1fr;
			grid-template-rows: auto auto;
			gap: 20px;
		}

		#npc-section {
			order: 1;
		}

		#player-section {
			order: 2;
		}

		#conversation-controls {
			order: 3;
			flex-direction: column;
			gap: 15px;
			padding: 0;
		}

		#npc-portrait-container {
			height: 200px;
		}

		/* Mobile button sizing */
		#conversation-back,
		#conversation-continue {
			min-width: 140px;
			padding: 12px 25px;
			font-size: 1.1rem;
			width: 100%;
			max-width: 200px;
		}
	}

	/* Ensure buttons are always accessible */
	.conversation-btn {
		position: relative;
		z-index: 11;
	}

	/* Loading and Error States */
	.loading-overlay,
	.error-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		font-family: 'Cinzel', serif;
		z-index: 10001;
	}

	.loading-spinner {
		width: 50px;
		height: 50px;
		border: 5px solid rgba(77, 195, 255, 0.3);
		border-top: 5px solid rgba(77, 195, 255, 0.8);
		border-radius: 50%;
		margin-bottom: 20px;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
