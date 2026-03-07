<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { gameState, audioSettings } from '$lib/stores/gameState';
	import { saveManager } from '$lib/stores/saveManager';
	import { supabase } from '$lib/supabaseClient';
	import MusicToggle from '$lib/components/ui/MusicToggle.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

	/** @type {'male'|'female'|null} */
	let selectedSex = null;
	/** @type {string|null} ISO date string (YYYY-MM-DD) */
	let selectedDOB = null;
	/** @type {boolean} */
	let showSpinner = true;

	$: sfxMultiplier = ($audioSettings?.sfxVolume ?? 50) / 100;

	function playClickSound() {
		const audio = new Audio('/Audio/clicking.mp3');
		audio.volume = 1.0 * sfxMultiplier;
		audio.play().catch(() => {});
	}

	/** @param {'male'|'female'} sex */
	function selectSex(sex) {
		playClickSound();
		selectedSex = sex;
	}

	/**
	 * Handle keyboard activation for the sex option buttons.
	 * @param {KeyboardEvent} event
	 * @param {'male'|'female'} sex
	 */
	function handleSexKeypress(event, sex) {
		const key = event && event.key;
		if (key === 'Enter' || key === ' ') {
			event.preventDefault();
			selectSex(sex);
		}
	}

	/** @param {Event} event */
	function updateDOB(event) {
		const input = /** @type {HTMLInputElement|null} */ (event && event.target);
		selectedDOB = input && input.value ? input.value : null;
	}

	/**
	 * Calculate age from an ISO date string.
	 * @param {string|null} dob
	 * @returns {number|string} age in years or '-' when dob missing
	 */
	function calculateAge(dob) {
		if (!dob) return '-';
		const birthDate = new Date(dob);
		const today = new Date();
		let age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();

		if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
			age--;
		}

		return age;
	}

	async function startGame() {
		playClickSound();
		if (selectedSex && selectedDOB) {
			// Update game state
			gameState.update(
				(state) =>
					/** @type {any} */ ({
						...state,
						character: {
							...state.character,
							sex: selectedSex,
							dob: selectedDOB,
							age: calculateAge(selectedDOB)
						},
						playerData: {
							level: 1,
							exp: 0,
							maxExp: 100,
							hp: 100,
							maxHp: 100,
							sp: 100,
							maxSp: 100,
							stamina: 100,
							maxStamina: 100,
							gold: 0,
							silver: 0,
							diamonds: 0
						},
						currentScene: 'Scene001'
					})
			);

			// Save to slot system
			saveManager.saveGame();

			// prevent browser/backspace navigation back to the creation flow
			try {
				sessionStorage.setItem('blockBack', 'true');
			} catch {
				/* ignore */
			}

			// Navigate to /game to start Scene001
			try {
				console.log('[new-game] saved, navigating to /game');
				await goto('/game');
			} catch (err) {
				console.error('Navigation to /game failed', err);
				try {
					goto('/game');
				} catch {
					/* ignore */
				}
			}
		}
	}

	onMount(() => {
		// hide after entrance animation; easy to revert if undesired
		setTimeout(() => (showSpinner = false), 900);
	});
</script>

<svelte:head>
	<title>The Void's Arcana - New Game</title>
	<link
		href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=MedievalSharp&display=swap"
		rel="stylesheet"
	/>
	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
	/>
</svelte:head>

<div id="newgame-container">
	<MusicToggle />
	<LoadingSpinner visible={showSpinner} />
	<div id="newgame-background"></div>

	<div id="newgame-header">
		<h1>Begin Your Journey</h1>
		<p>Create your character to start your adventure in Ashen Hearth</p>
	</div>

	<div id="character-creation">
		<div class="creation-section">
			<h2>Choose Your Sex</h2>
			<div class="sex-options">
				<button
					class="sex-option {selectedSex === 'male' ? 'selected' : ''}"
					on:click={() => selectSex('male')}
					on:keypress={(e) => handleSexKeypress(e, 'male')}
					type="button"
					aria-pressed={selectedSex === 'male'}
				>
					<div class="sex-icon">
						<i class="fas fa-mars"></i>
					</div>
					<span>Male</span>
				</button>
				<button
					class="sex-option {selectedSex === 'female' ? 'selected' : ''}"
					on:click={() => selectSex('female')}
					on:keypress={(e) => handleSexKeypress(e, 'female')}
					type="button"
					aria-pressed={selectedSex === 'female'}
				>
					<div class="sex-icon">
						<i class="fas fa-venus"></i>
					</div>
					<span>Female</span>
				</button>
			</div>
		</div>

		<div class="creation-section">
			<h2>Date of Birth</h2>
			<div class="dob-input">
				<input type="date" id="dob" min="1900-01-01" max="2023-12-31" on:change={updateDOB} />
				<div class="input-note">
					<i class="fas fa-info-circle"></i>
					<span>Your actual DOB will affect your gameplay experience</span>
				</div>
			</div>
		</div>

		<div id="character-summary">
			<h3>Character Summary</h3>
			<div id="summary-content">
				<p>
					<strong>Sex:</strong>
					<span id="summary-sex"
						>{selectedSex
							? selectedSex.charAt(0).toUpperCase() + selectedSex.slice(1)
							: 'Not selected'}</span
					>
				</p>
				<p>
					<strong>Date of Birth:</strong>
					<span id="summary-dob">
						{#if selectedDOB}
							{new Date(selectedDOB).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						{:else}
							Not selected
						{/if}
					</span>
				</p>
				<p>
					<strong>Age:</strong>
					<span id="summary-age">{calculateAge(selectedDOB)} {selectedDOB ? 'years' : ''}</span>
				</p>
			</div>
		</div>
	</div>

	<div id="newgame-actions">
		<button id="start-game-btn" disabled={!selectedSex || !selectedDOB} on:click={startGame}>
			<i class="fas fa-play"></i>
			Begin Adventure
		</button>
		<button id="back-to-guest" on:click={async () => { const { data } = await supabase.auth.getUser(); goto(data.user ? '/landing' : '/guest'); }}>
			<i class="fas fa-arrow-left"></i>
			Back
		</button>
	</div>
</div>

<style>
	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	#newgame-container {
		position: relative;
		width: 100%;
		height: 100%;
		background:
			radial-gradient(circle at 20% 50%, rgba(40, 10, 80, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 80% 20%, rgba(10, 30, 70, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 40% 80%, rgba(70, 10, 40, 0.4) 0%, transparent 50%), #0a0a1a;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		overflow: hidden;
		padding: 20px;
	}

	#newgame-background {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7));
		z-index: 1;
	}

	#newgame-header {
		position: relative;
		z-index: 2;
		text-align: center;
		margin-bottom: 40px;
		opacity: 0;
		animation: fadeIn 1s forwards 0.5s;
	}

	#newgame-header h1 {
		font-size: 3rem;
		margin-bottom: 10px;
		text-shadow: 0 0 10px rgba(138, 43, 226, 0.7);
	}

	#newgame-header p {
		font-family: 'MedievalSharp', cursive;
		font-size: 1.2rem;
		color: #b19cd9;
	}

	#character-creation {
		position: relative;
		z-index: 2;
		background: rgba(30, 30, 46, 0.8);
		border: 2px solid rgba(138, 43, 226, 0.5);
		border-radius: 15px;
		padding: 30px;
		width: 100%;
		max-width: 600px;
		margin-bottom: 30px;
		opacity: 0;
		animation: fadeIn 1s forwards 1s;
	}

	.creation-section {
		margin-bottom: 30px;
	}

	.creation-section h2 {
		font-size: 1.5rem;
		margin-bottom: 15px;
		color: #e6e6fa;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 8px;
	}

	.sex-options {
		display: flex;
		gap: 20px;
		justify-content: center;
	}

	.sex-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20px;
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.3s ease;
		width: 120px;
		background: transparent;
		color: inherit;
		font-family: inherit;
		font-size: inherit;
	}

	.sex-option:hover {
		border-color: rgba(138, 43, 226, 0.5);
		transform: translateY(-3px);
	}

	.sex-option.selected {
		border-color: rgba(138, 43, 226, 0.8);
		background: rgba(138, 43, 226, 0.2);
		box-shadow: 0 0 15px rgba(138, 43, 226, 0.3);
	}

	.sex-option:focus {
		outline: 2px solid rgba(138, 43, 226, 0.8);
		outline-offset: 2px;
	}

	.sex-icon {
		font-size: 2.5rem;
		margin-bottom: 10px;
		color: #b19cd9;
	}

	.sex-option.selected .sex-icon {
		color: #e6e6fa;
	}

	.sex-option span {
		font-size: 1.1rem;
	}

	.dob-input {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	#dob {
		padding: 12px 15px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: white;
		font-family: 'Cinzel', serif;
		font-size: 1rem;
	}

	#dob:focus {
		outline: none;
		border-color: rgba(138, 43, 226, 0.8);
		box-shadow: 0 0 5px rgba(138, 43, 226, 0.5);
	}

	.input-note {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #b19cd9;
		font-size: 0.9rem;
	}

	.input-note i {
		color: var(--accent-secondary-hex);
	}

	#character-summary {
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 20px;
	}

	#character-summary h3 {
		font-size: 1.3rem;
		margin-bottom: 15px;
		color: #e6e6fa;
	}

	#summary-content p {
		margin-bottom: 8px;
		font-family: 'MedievalSharp', cursive;
	}

	#summary-content strong {
		color: #b19cd9;
	}

	#newgame-actions {
		position: relative;
		z-index: 2;
		display: flex;
		gap: 20px;
		opacity: 0;
		animation: fadeIn 1s forwards 1.5s;
	}

	#start-game-btn,
	#back-to-guest {
		padding: 12px 30px;
		border-radius: 8px;
		font-family: 'Cinzel', serif;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 8px;
		border: none;
	}

	#start-game-btn {
		background: rgba(138, 43, 226, 0.6);
		border: 1px solid rgba(138, 43, 226, 0.8);
		color: white;
	}

	#start-game-btn:hover:not(:disabled) {
		background: rgba(138, 43, 226, 0.8);
		transform: translateY(-2px);
	}

	#start-game-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	#back-to-guest {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: white;
	}

	#back-to-guest:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.5);
	}

	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}

	@media (max-width: 768px) {
		#newgame-header h1 {
			font-size: 2.2rem;
		}

		#newgame-header p {
			font-size: 1rem;
		}

		#character-creation {
			padding: 20px;
		}

		.sex-options {
			flex-direction: column;
			align-items: center;
		}

		#newgame-actions {
			flex-direction: column;
			width: 100%;
			max-width: 300px;
		}

		#start-game-btn,
		#back-to-guest {
			justify-content: center;
		}
	}
</style>
