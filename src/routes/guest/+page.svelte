<script>
	import { onMount, tick } from 'svelte';
	import { goto } from '$app/navigation';
	import { gameState, initialGameState, audioSettings } from '$lib/stores/gameState';
	import MusicToggle from '$lib/components/ui/MusicToggle.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	import SaveSlotsModal from '$lib/components/ui/SaveSlotsModal.svelte';
	import { saveSlotsManager } from '$lib/stores/saveSlotsManager';
	import { parseMaybeEncrypted, stringifyPreferEncrypted } from '$lib/utils/encryption';

	let saveInfo = 'No saved game detected';
	let showSlotsModal = false;
	let showImportModal = false;
	/** @type {File|null} */
	let selectedFile = null;
	let importResult = '';
	/** @type {HTMLElement|null} */
	let modalRef = null;
	/** @type {HTMLButtonElement|null} */
	let closeButtonRef = null;

	$: sfxMultiplier = ($audioSettings?.sfxVolume ?? 50) / 100;
	/** @type {boolean} */
	let showSpinner = true;

	onMount(() => {
		checkForSave();
	});

	onMount(() => {
		setTimeout(() => (showSpinner = false), 900);
	});

	async function checkForSave() {
		const saveData = localStorage.getItem('game_save_data');

		if (saveData) {
			let parsedData = null;
			try {
				const parsedRes = parseMaybeEncrypted(saveData, 'game_save_data');
				parsedData = parsedRes.data;
			} catch {
				parsedData = null;
			}

			if (parsedData && parsedData.timestamp) {
				const saveDate = new Date(parsedData.timestamp).toLocaleDateString();
				saveInfo = `Saved game detected (Last saved: ${saveDate})`;
			} else {
				saveInfo = 'Corrupted save file detected';
			}
		}
	}

	async function openImportModal() {
		playClickSound();
		showImportModal = true;
		await tick();

		if (closeButtonRef) {
			closeButtonRef.focus();
		}

		document.body.style.overflow = 'hidden';
	}

	function closeImportModal() {
		showImportModal = false;
		selectedFile = null;
		importResult = '';
		document.body.style.overflow = '';
	}

	/** @param {KeyboardEvent} e */
	function handleModalKeydown(e) {
		if (e.key === 'Escape') {
			closeImportModal();
			return;
		}

		if (e.key === 'Tab' && modalRef) {
			/** @type {NodeListOf<HTMLElement>} */
			const focusableElements = modalRef.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);

			if (focusableElements.length === 0) return;

			const firstElement = focusableElements[0];
			const lastElement = focusableElements[focusableElements.length - 1];

			if (e.shiftKey) {
				if (document.activeElement === firstElement) {
					e.preventDefault();
					if (lastElement instanceof HTMLElement) lastElement.focus();
				}
			} else {
				if (document.activeElement === lastElement) {
					e.preventDefault();
					if (firstElement instanceof HTMLElement) firstElement.focus();
				}
			}
		}
	}

	/** @param {MouseEvent} e */
	function handleBackdropClick(e) {
		if (e.target === modalRef) {
			closeImportModal();
		}
	}

	function playClickSound() {
		const audio = new Audio('/Audio/clicking.mp3');
		audio.volume = 1.0 * sfxMultiplier;
		audio.play().catch(() => {});
	}

	function loadSave() {
		playClickSound();
		// Show the slot chooser modal
		showSlotsModal = true;
	}

	/**
	 * Handle a save slot being selected/loaded from the modal.
	 * @param {CustomEvent<{slotId: string, save: any}>} event
	 */
	function handleSlotLoaded(event) {
		const { slotId, save } = event.detail;
		console.log('[guest] handleSlotLoaded called', { slotId, save });
		showSlotsModal = false;

		// Navigate to game - if no currentScene, saveSlotsManager already defaulted to Scene001
		console.log('[guest] navigating to /game with currentScene:', save?.currentScene || 'Scene001');
		// Small delay to ensure store updates propagate
		setTimeout(() => {
			goto('/game');
		}, 50);
	}

	/** @param {Event} event */
	function handleFileSelect(event) {
		// event.target may be EventTarget; narrow to HTMLInputElement
		const input = /** @type {HTMLInputElement|null} */ (event && event.target);
		selectedFile = input && input.files ? input.files[0] : null;
		importResult = selectedFile ? `File selected: ${selectedFile.name}` : '';
	}

	function confirmImport() {
		if (!selectedFile) return;

		const reader = new FileReader();

		reader.onload = (ev) => {
			try {
				const result = ev && ev.target && ev.target.result;
				if (typeof result === 'string') {
					const saveData = JSON.parse(result);
					if (saveData && saveData.playerData && saveData.timestamp) {
						try {
							localStorage.setItem('game_save_data', stringifyPreferEncrypted(saveData));
						} catch (e) {
							localStorage.setItem('game_save_data', JSON.stringify(saveData));
						}
						importResult = 'Save imported successfully!';

						setTimeout(() => {
							closeImportModal();
							alert('Save imported! Loading your game...');
							goto('/game');
						}, 1000);
					} else {
						importResult = 'Invalid save file format';
					}
				} else {
					importResult = 'Invalid file contents (not text)';
				}
			} catch (err) {
				const error = /** @type {any} */ (err);
				importResult = `Error reading file: ${error?.message ?? String(error)}`;
			}
		};

		reader.onerror = () => {
			importResult = 'Error reading file';
		};

		reader.readAsText(selectedFile);
	}
</script>

<svelte:head>
	<title>The Void's Arcana - Guest Menu</title>
</svelte:head>

<div id="guest-container">
	<div id="guest-background"></div>
	<MusicToggle />
	<LoadingSpinner visible={showSpinner} />

	{#if showSlotsModal}
		<SaveSlotsModal
			open={showSlotsModal}
			on:close={() => (showSlotsModal = false)}
			on:loaded={handleSlotLoaded}
		/>
	{/if}

	<div id="guest-header">
		<h1>Continue Your Journey</h1>
		<p>As a guest, your progress is saved locally to your device</p>
	</div>

	<div id="guest-options">
		<div class="option-card" id="continue-option">
			<div class="option-icon">
				<i class="fas fa-play-circle" aria-hidden="true"></i>
			</div>
			<h2>Continue</h2>
			<p>Resume your adventure from where you left off</p>
			<div class="option-actions">
				<button class="action-btn" on:click={loadSave} type="button">
					<i class="fas fa-folder-open" aria-hidden="true"></i>
					Load Save
				</button>
				<button class="action-btn" on:click={openImportModal} type="button">
					<i class="fas fa-file-import" aria-hidden="true"></i>
					Import Save
				</button>
			</div>
		</div>

		<div class="option-card" id="newgame-option">
			<div class="option-icon">
				<i class="fas fa-plus-circle" aria-hidden="true"></i>
			</div>
			<h2>New Game</h2>
			<p>Begin a new adventure in the world of Ashen Hearth</p>
			<button
				class="action-btn primary"
				on:click={() => {
					playClickSound();
					// Reset to the complete initial game state (don't replace with a partial object)
					// This prevents unintentionally removing required keys like playerData/character
					gameState.set(initialGameState);
					goto('/new-game');
				}}
				type="button"
			>
				<i class="fas fa-dice" aria-hidden="true"></i>
				Start New Game
			</button>
		</div>
	</div>

	<div id="back-container">
		<button id="back-btn" on:click={() => goto('/landing')} type="button">
			<i class="fas fa-arrow-left" aria-hidden="true"></i>
			Back to Main Menu
		</button>
	</div>

	<div id="save-status">
		<p id="save-info">{saveInfo}</p>
	</div>

	{#if showImportModal}
		<div
			id="import-modal"
			class="modal active"
			role="dialog"
			aria-labelledby="modal-title"
			aria-modal="true"
			tabindex="-1"
			on:keydown={handleModalKeydown}
			on:click={handleBackdropClick}
			bind:this={modalRef}
		>
			<div class="modal-content">
				<div class="modal-header">
					<h2 id="modal-title">Import Save File</h2>
					<button
						id="close-import"
						on:click={closeImportModal}
						aria-label="Close import modal"
						title="Close import dialog"
						type="button"
						bind:this={closeButtonRef}
					>
						<i class="fas fa-times" aria-hidden="true"></i>
						<span class="sr-only">Close import dialog</span>
					</button>
				</div>
				<div class="modal-body">
					<p id="file-instructions">Select a saved game file to import:</p>
					<input
						type="file"
						id="import-file"
						accept=".json"
						on:change={handleFileSelect}
						aria-describedby="file-instructions"
					/>
					<div id="import-result" role="status" aria-live="polite">{importResult}</div>
				</div>
				<div class="modal-footer">
					<button
						id="confirm-import"
						disabled={!selectedFile}
						on:click={confirmImport}
						type="button"
					>
						Import Save
					</button>
					<button id="cancel-import" on:click={closeImportModal} type="button"> Cancel </button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	#guest-container {
		position: relative;
		width: 100%;
		height: 100vh;
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

	#guest-background {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7));
		z-index: 1;
	}

	#guest-header {
		position: relative;
		z-index: 2;
		text-align: center;
		margin-bottom: 40px;
		opacity: 0;
		animation: fadeIn 1s forwards 0.5s;
	}

	#guest-header h1 {
		font-size: 3rem;
		margin-bottom: 10px;
		text-shadow: 0 0 10px rgba(138, 43, 226, 0.7);
	}

	#guest-header p {
		font-family: 'MedievalSharp', cursive;
		font-size: 1.2rem;
		color: #b19cd9;
	}

	#guest-options {
		position: relative;
		z-index: 2;
		display: flex;
		gap: 40px;
		margin-bottom: 40px;
		opacity: 0;
		animation: fadeIn 1s forwards 1s;
	}

	.option-card {
		background: rgba(30, 30, 46, 0.8);
		border: 2px solid rgba(138, 43, 226, 0.5);
		border-radius: 15px;
		padding: 30px;
		width: 350px;
		text-align: center;
		transition: all 0.3s ease;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
	}

	.option-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 10px 25px rgba(138, 43, 226, 0.3);
		border-color: rgba(138, 43, 226, 0.8);
	}

	.option-icon {
		font-size: 3rem;
		color: #b19cd9;
		margin-bottom: 15px;
	}

	.option-card h2 {
		font-size: 1.8rem;
		margin-bottom: 15px;
		color: #e6e6fa;
	}

	.option-card p {
		font-family: 'MedievalSharp', cursive;
		margin-bottom: 20px;
		color: #ccc;
		line-height: 1.5;
	}

	.option-actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.action-btn {
		background: rgba(138, 43, 226, 0.3);
		border: 1px solid rgba(138, 43, 226, 0.5);
		color: white;
		padding: 12px 20px;
		border-radius: 8px;
		font-family: 'Cinzel', serif;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.action-btn:hover {
		background: rgba(138, 43, 226, 0.5);
		transform: translateY(-2px);
	}

	.action-btn.primary {
		background: rgba(138, 43, 226, 0.6);
		border-color: rgba(138, 43, 226, 0.8);
	}

	.action-btn.primary:hover {
		background: rgba(138, 43, 226, 0.8);
	}

	#back-container {
		position: relative;
		z-index: 2;
		opacity: 0;
		animation: fadeIn 1s forwards 1.5s;
	}

	#back-btn {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 10px 20px;
		border-radius: 8px;
		font-family: 'Cinzel', serif;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	#back-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.5);
	}

	#save-status {
		position: relative;
		z-index: 2;
		margin-top: 20px;
		opacity: 0;
		animation: fadeIn 1s forwards 2s;
	}

	#save-info {
		font-family: 'MedievalSharp', cursive;
		color: #aaa;
		font-size: 0.9rem;
	}

	/* Modal Styles */
	.modal {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		z-index: 100;
		justify-content: center;
		align-items: center;
	}

	.modal.active {
		display: flex;
	}

	.modal-content {
		background: rgba(30, 30, 46, 0.95);
		border: 2px solid rgba(138, 43, 226, 0.5);
		border-radius: 15px;
		width: 90%;
		max-width: 500px;
		padding: 0;
		overflow: hidden;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20px 25px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
	}

	#close-import {
		background: none;
		border: none;
		color: white;
		font-size: 1.2rem;
		cursor: pointer;
		width: 30px;
		height: 30px;
		border-radius: 6px;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: background 0.2s;
	}

	#close-import:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	.modal-body {
		padding: 25px;
	}

	.modal-body p {
		margin-bottom: 15px;
		color: #ccc;
	}

	#import-file {
		width: 100%;
		padding: 10px;
		background: rgba(0, 0, 0, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		color: white;
		margin-bottom: 15px;
	}

	#import-result {
		min-height: 20px;
		margin-top: 10px;
		font-size: 0.9rem;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
		padding: 20px 25px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(0, 0, 0, 0.2);
	}

	.modal-footer button {
		padding: 10px 20px;
		border-radius: 6px;
		font-family: 'Cinzel', serif;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	#confirm-import {
		background: rgba(138, 43, 226, 0.6);
		border: 1px solid rgba(138, 43, 226, 0.8);
		color: white;
	}

	#confirm-import:hover:not(:disabled) {
		background: rgba(138, 43, 226, 0.8);
	}

	#confirm-import:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	#cancel-import {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: white;
	}

	#cancel-import:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	/* Screen reader only text */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}

	@media (max-width: 768px) {
		#guest-options {
			flex-direction: column;
			gap: 20px;
		}

		.option-card {
			width: 100%;
			max-width: 350px;
		}

		#guest-header h1 {
			font-size: 2.2rem;
		}

		#guest-header p {
			font-size: 1rem;
		}
	}

	/* Fix New Game button width to match others */
	#newgame-option {
		display: flex;
		flex-direction: column;
	}

	#newgame-option .action-btn {
		width: 100%;
		justify-content: center;
	}
</style>
