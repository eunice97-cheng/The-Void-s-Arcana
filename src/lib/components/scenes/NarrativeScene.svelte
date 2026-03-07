<!-- src/lib/components/scenes/NarrativeScene.svelte -->
<script>
	import { sceneManager } from '$lib/stores/sceneManager';
	import { gameState, audioSettings } from '$lib/stores/gameState';
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { assetLoader } from '$lib/services/assetLoader';
	import NavigationScene from '$lib/components/scenes/NavigationScene.svelte';
	import MusicToggle from '$lib/components/ui/MusicToggle.svelte';

	/** @type {any} */
	export let scene;

	/** @type {boolean} */
	let isAnimating = false;
	/** @type {boolean} */
	let isLoading = true;
	/** @type {string|null} */
	let error = null;

	/** @type {string} */
	let playerName = '';
	$: playerName = $gameState.character?.name || '';

	/** @type {string} */
	let renderedDescription = '';
	$: renderedDescription =
		scene && scene.description ? scene.description.replace(/\[player ?name\]/gi, playerName) : '';

	/** @type {HTMLVideoElement} */
	let videoElement;

	$: if (videoElement) {
		const enabled = $gameState.audioEnabled;
		const vol = enabled ? ($audioSettings?.sfxVolume ?? 50) / 100 : 0;
		videoElement.volume = vol;
	}

	$: if (videoElement && scene) {
		if (scene.videoStaticEnd) {
			videoElement.pause();
			if (videoElement.readyState >= 1) {
				videoElement.currentTime = videoElement.duration;
			}
		} else {
			// Attempt to play if not static end
			if (videoElement.paused) {
				videoElement.play().catch(e => {
					console.warn('Video autoplay prevented:', e);
				});
			}
		}
	}

	onMount(async () => {
		try {
			await assetLoader.preloadSceneAssets(scene);
			isLoading = false;
		} catch (e) {
			error = 'Failed to load scene assets';
			console.error(e);
			// Ensure the loading spinner is removed so the error UI can be shown
			isLoading = false;
		}
	});

	async function nextScene() {
		if (isAnimating) return;
		isAnimating = true;

		try {
			const nextTitle = sceneManager.getNextScene(scene.title);
			if (nextTitle) {
				try {
					await sceneManager.loadScene(nextTitle);
				} catch (e) {
					console.error('[NarrativeScene] failed to load next scene', nextTitle, e);
				}
			}
		} finally {
			isAnimating = false;
		}
	}

	async function previousScene() {
		if (isAnimating) return;

		// Prevent going back when disabled by UI rules
		if (!canGoBack) {
			console.debug('[NarrativeScene] Back navigation blocked for', scene.title);
			return;
		}

		isAnimating = true;
		try {
			await sceneManager.back();
		} catch (e) {
			console.error('[NarrativeScene] failed to navigate back', e);
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

	/** @type {boolean} */
	let isVideoPlaying = false;

	$: if (scene) {
		// Reset video playing state when scene changes
		if (scene.video && !scene.videoStaticEnd) {
			isVideoPlaying = true;
		} else {
			isVideoPlaying = false;
		}
	}
</script>

<div class="narrative-container active" style:background={scene.background}>
	{#if scene.video}
		<video
			bind:this={videoElement}
			src={scene.video}
			autoplay={!scene.videoStaticEnd}
			playsinline
			controlsList="nodownload"
			on:contextmenu|preventDefault
			class="background-video"
			on:ended={() => (isVideoPlaying = false)}
			on:loadedmetadata={() => {
				if (scene.videoStaticEnd && videoElement) {
					videoElement.currentTime = videoElement.duration;
					videoElement.pause();
					isVideoPlaying = false;
				}
			}}
		>
			<track kind="captions" />
		</video>
	{/if}
	<MusicToggle />
	{#if isLoading}
		<div class="loading-overlay">
			<div class="loading-spinner"></div>
			<p>Loading scene...</p>
		</div>
	{:else if error}
		<div class="error-overlay">
			<p>{error}</p>
			<button class="narrative-btn" on:click={() => window.location.reload()}> Retry </button>
		</div>
	{:else if scene && scene.meta && scene.meta.temporary && String(scene.title).startsWith('Navigation:')}
		<NavigationScene
			{scene}
			on:navigate={(e) => {
				try {
					const target = e.detail && e.detail.scene;
					if (target && typeof target === 'string') {
						sceneManager.loadScene(target);
					}
				} catch (err) {
					console.warn('NavigationScene navigate failed', err);
				}
			}}
		/>
	{:else if !isVideoPlaying}
		<div class="narrative-content">
			{#if renderedDescription}
				<div
					class="narrative-text fade-in"
					class:center={scene && scene.title === 'Scene058'}
					style:color={scene.textColor || '#e6e6fa'}
					in:fade={{ duration: 500 }}
				>
					{renderedDescription}
				</div>
			{/if}

			<div class="narrative-controls">
				{#if canGoBack}
					<button class="narrative-btn back-btn" on:click={previousScene}> Back </button>
				{/if}
				<button class="narrative-btn" on:click={nextScene}> Continue </button>
			</div>
		</div>
	{/if}
</div>

<style>
	.narrative-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background-color: rgba(0, 0, 0, 0.9);
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 10000;
	}

	.narrative-content {
		background: rgba(30, 30, 46, 0.85);
		border: 2px solid rgba(138, 43, 226, 0.5);
		border-radius: 15px;
		padding: 40px;
		width: 80%;
		max-width: 800px;
		text-align: center;
	}

	.narrative-text {
		font-family: 'MedievalSharp', cursive;
		font-size: 1.4rem;
		line-height: 1.8;
		margin-bottom: 30px;
		text-align: justify;
	}

	/* center description for map / special scenes (e.g. Scene058) */
	.narrative-text.center {
		text-align: center;
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

	.narrative-controls {
		display: flex;
		justify-content: center;
		gap: 20px;
	}

	.narrative-btn {
		background: rgba(138, 43, 226, 0.6);
		border: 1px solid rgba(138, 43, 226, 0.8);
		color: white;
		padding: 12px 30px;
		border-radius: 8px;
		font-family: 'Cinzel', serif;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.narrative-btn:hover {
		background: rgba(138, 43, 226, 0.8);
		transform: translateY(-2px);
	}

	.fade-in {
		animation: fadeIn 0.5s ease-in-out forwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

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
		border: 5px solid rgba(138, 43, 226, 0.3);
		border-top: 5px solid rgba(138, 43, 226, 0.8);
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
