<!-- src/routes/name-input/+page.svelte -->
<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { gameState } from '$lib/stores/gameState';
	import { sceneManager } from '$lib/stores/sceneManager';
	import { saveManager } from '$lib/stores/saveManager';
	import MusicToggle from '$lib/components/ui/MusicToggle.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

	/** @type {string} */
	let playerName = '';
	/** @type {string} */
	let error = '';
	/** @type {boolean} */
	let showSpinner = true;

	/** @param {string} name */
	function validateName(name) {
		if (name.length < 2) return 'Name must be at least 2 characters long';
		if (name.length > 20) return 'Name cannot be longer than 20 characters';
		if (!/^[a-zA-Z\s'-]+$/.test(name))
			return 'Name can only contain letters, spaces, hyphens and apostrophes';
		return '';
	}

	async function confirmName() {
		const validationError = validateName(playerName);
		if (validationError) {
			error = validationError;
			return;
		}

		// Update game state with the chosen name and target scene
		gameState.update(
			(state) =>
				/** @type {any} */ ({
					...state,
					character: {
						...state.character,
						name: playerName
					},
					currentScene: 'Scene017'
				})
		);

		// Save to slot system
		saveManager.saveGame();

		// Load Scene017 so the app navigates into the game route and renders the scene
		try {
			// prevent browser/backspace navigation back to the name-input flow
			try {
				sessionStorage.setItem('blockBack', 'true');
			} catch {
				/* ignore */
			}
			await sceneManager.loadScene('Scene017');
		} catch (e) {
			console.error('Failed to load Scene017 after name confirm:', e);
			// As a fallback, navigate to the game route
			goto('/game');
		}
	}

	onMount(() => {
		// keep spinner for the entrance animation; user can undo per-page
		setTimeout(() => (showSpinner = false), 900);
	});
</script>

<div id="name-input-container">
	<MusicToggle />
	<LoadingSpinner visible={showSpinner} />
	<div id="name-input-content">
		<h1>Choose Your Name</h1>
		<p class="subtitle">What shall we call you, brave adventurer?</p>

		<div class="input-section">
			<input
				type="text"
				bind:value={playerName}
				placeholder="Enter your name"
				on:input={() => (error = validateName(playerName))}
			/>
			{#if error}
				<p class="error-text">{error}</p>
			{/if}

			<div class="name-rules" aria-live="polite">
				<strong>Name rules</strong>
				<ul>
					<li>2–20 characters</li>
					<li>Letters, spaces, hyphens (-) and apostrophes (') only</li>
					<li>Case-sensitive: "Anna" and "anna" are different</li>
					<li>Examples: Valeria, O'Neil, Anne-Marie</li>
				</ul>
			</div>
		</div>

		<div class="action-buttons">
			<button class="confirm-btn" disabled={!playerName || !!error} on:click={confirmName}>
				Continue
			</button>
		</div>
	</div>
</div>

<style>
	#name-input-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background:
			radial-gradient(circle at 20% 50%, rgba(40, 10, 80, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 80% 20%, rgba(10, 30, 70, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 40% 80%, rgba(70, 10, 40, 0.4) 0%, transparent 50%), #0a0a1a;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
	}

	#name-input-content {
		background: rgba(30, 30, 46, 0.85);
		border: 2px solid rgba(138, 43, 226, 0.5);
		border-radius: 15px;
		padding: 40px;
		width: 90%;
		max-width: 600px;
	}

	h1 {
		text-align: center;
		font-size: 2.5rem;
		margin-bottom: 10px;
		color: #e6e6fa;
	}

	.subtitle {
		text-align: center;
		font-family: 'MedievalSharp', cursive;
		font-size: 1.2rem;
		color: #b19cd9;
		margin-bottom: 40px;
	}

	.input-section {
		margin-bottom: 30px;
	}

	input {
		width: 100%;
		padding: 15px;
		background: rgba(0, 0, 0, 0.3);
		border: 2px solid rgba(138, 43, 226, 0.3);
		border-radius: 8px;
		color: white;
		/* Use a neutral, case-friendly font for name entry */
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			Roboto,
			'Helvetica Neue',
			Arial,
			sans-serif;
		font-size: 1.2rem;
		text-transform: none;
		letter-spacing: normal;
		transition: all 0.3s ease;
	}

	input:focus {
		outline: none;
		border-color: rgba(138, 43, 226, 0.8);
		box-shadow: 0 0 10px rgba(138, 43, 226, 0.3);
	}

	.error-text {
		color: #ff6b6b;
		font-size: 0.9rem;
		margin-top: 8px;
		text-align: center;
	}

	.name-rules {
		margin-top: 14px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.04);
		padding: 12px 14px;
		border-radius: 8px;
		color: #e6e6fa;
		font-size: 0.95rem;
		text-align: left;
		/* Match the input font so the rules read the same */
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			Roboto,
			'Helvetica Neue',
			Arial,
			sans-serif;
	}

	.name-rules strong {
		display: block;
		margin-bottom: 6px;
		color: #fff;
		font-family: inherit;
		font-weight: 600;
	}

	.name-rules ul {
		margin: 0;
		padding-left: 18px;
	}

	.name-rules li {
		margin-bottom: 4px;
		color: #cfc6e8;
	}

	.action-buttons {
		text-align: center;
	}

	.confirm-btn {
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

	.confirm-btn:hover:not(:disabled) {
		background: rgba(138, 43, 226, 0.8);
		transform: translateY(-2px);
	}

	.confirm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
