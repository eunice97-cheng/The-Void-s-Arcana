<script>
	import '$lib/styles/free-mode.css';
	import { onMount } from 'svelte';
	import { initUI } from '$lib/components/ui/freeModeLegacy.js';
	import LeftSideButtons from '$lib/components/ui/LeftSideButtons.svelte';

	// exit free mode via UI buttons in the markup

	onMount(() => {
		// initialize the lightweight legacy UI behaviors
		console.debug('[FreeModeLegacy] onMount - initializing UI');
		initUI(document);
		console.debug('[FreeModeLegacy] onMount - initUI returned');
	});

	/**
	 * Handle clicks from the legacy top-right buttons. They are lightweight
	 * placeholders: we emit a CustomEvent so the host can listen, and log it
	 * to the console for quick testing.
	 */
	/** @param {string} action */
	function handleTopRightAction(action) {
		try {
			console.log('[FreeModeLegacy] action:', action);
			const ev = new CustomEvent('freemode-action', { detail: { action } });
			// dispatch from the container so consumers can listen on the component DOM
			const container = document.getElementById('game-container');
			container && container.dispatchEvent(ev);
		} catch (e) {
			console.warn('[FreeModeLegacy] failed to dispatch action', e);
		}

		function handleLegacyLeftToggle(e) {
			const action = e && e.detail && e.detail.action;
			if (!action) return;
			try {
				const ev = new CustomEvent('freemode-action', { detail: { action } });
				const container = document.getElementById('game-container');
				container && container.dispatchEvent(ev);
			} catch (err) {
				console.warn('[FreeModeLegacy] failed to dispatch left toggle action', err);
			}
		}
	}

	// no-op: loading overlay removed from hub (see styles)
</script>

<div
	id="game-container"
	style="background: url('/Images/Mirror Repose.png') center/cover no-repeat; background-size: cover;"
>
	<div id="top-left-ui">
		<div
			id="avatar-container"
			title="Click to upload avatar"
			role="button"
			aria-label="Upload avatar"
			tabindex="0"
			on:keydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault(); /* legacy container has no upload input here */
				}
			}}
		>
			<div id="avatar-placeholder"><i class="fas fa-user" aria-hidden="true"></i></div>
			<img id="avatar" src="#" alt="Player avatar" style="display: none;" />
			<input type="file" id="avatar-upload" accept="image/*" />
			<div class="upload-progress"></div>
		</div>

		<div id="status-bars">
			<div class="status-bar">
				<div class="status-label">HP</div>
				<div class="bar-container">
					<div
						id="hp-bar"
						class="bar"
						role="progressbar"
						aria-valuenow="85"
						aria-valuemin="0"
						aria-valuemax="100"
					></div>
				</div>
				<div class="bar-value">85/100</div>
			</div>
			<div class="status-bar">
				<div class="status-label">SP</div>
				<div class="bar-container">
					<div
						id="sp-bar"
						class="bar"
						role="progressbar"
						aria-valuenow="60"
						aria-valuemin="0"
						aria-valuemax="100"
					></div>
				</div>
				<div class="bar-value">60/100</div>
			</div>
			<div class="status-bar">
				<div class="status-label">STA</div>
				<div class="bar-container">
					<div
						id="stamina-bar"
						class="bar"
						role="progressbar"
						aria-valuenow="45"
						aria-valuemin="0"
						aria-valuemax="100"
					></div>
				</div>
				<div class="bar-value">45/100</div>
			</div>
			<div class="currency-display">
				<div class="currency-item">
					<i class="fas fa-coins" style="color: gold;" aria-hidden="true"></i><span>1,250</span>
				</div>
				<div class="currency-item">
					<i class="fas fa-coins" style="color: silver;" aria-hidden="true"></i><span>5,430</span>
				</div>
				<div class="currency-item">
					<i class="fas fa-gem" style="color: var(--gem-hex);" aria-hidden="true"></i><span>25</span
					>
				</div>
			</div>
		</div>
	</div>

	<div id="top-right-ui">
		<button
			class="icon-btn"
			id="audio-toggle"
			data-tooltip="Toggle audio"
			aria-label="Toggle audio"
			on:click={() => handleTopRightAction('toggle-audio')}
			><i class="fas fa-volume-up" aria-hidden="true"></i></button
		>
		<button
			class="icon-btn"
			id="save-btn"
			data-tooltip="Save game"
			aria-label="Save game"
			on:click={() => handleTopRightAction('save')}
			><i class="fas fa-save" aria-hidden="true"></i></button
		>
		<button
			class="icon-btn"
			id="load-btn"
			data-tooltip="Load game"
			aria-label="Load game"
			on:click={() => handleTopRightAction('load')}
			><i class="fas fa-folder-open" aria-hidden="true"></i></button
		>
		<button
			class="icon-btn"
			id="reset-btn"
			data-tooltip="Reset (clears local saves)"
			aria-label="Reset game"
			on:click={() => handleTopRightAction('reset')}
			><i class="fas fa-redo" aria-hidden="true"></i></button
		>
		<button
			class="icon-btn"
			id="import-btn"
			data-tooltip="Import save from file"
			aria-label="Import game data"
			on:click={() => handleTopRightAction('import')}
			><i class="fas fa-file-import" aria-hidden="true"></i></button
		>
		<button
			class="icon-btn"
			id="export-btn"
			data-tooltip="Export save to file"
			aria-label="Export game data"
			on:click={() => handleTopRightAction('export')}
			><i class="fas fa-file-export" aria-hidden="true"></i></button
		>
		<button
			class="icon-btn"
			id="settings-btn"
			data-tooltip="Game settings"
			aria-label="Game settings"
			on:click={() => handleTopRightAction('settings')}
			><i class="fas fa-cog" aria-hidden="true"></i></button
		>
	</div>

	<LeftSideButtons on:toggle={handleLegacyLeftToggle} />

	<button class="icon-btn" id="toggle-ui" aria-label="Toggle UI">👁️</button>

	<div id="exp-bar-container">
		<div id="exp-info"><span>Level 15</span><span>1,250/2,000 XP</span></div>
		<div id="exp-bar">
			<div
				id="exp-progress"
				role="progressbar"
				aria-valuenow="1250"
				aria-valuemin="0"
				aria-valuemax="2000"
			></div>
		</div>
	</div>

	<button class="icon-btn" id="game-info-btn" aria-label="Game information">ℹ️</button>

	<div id="time-display">
		<div id="current-date"></div>
		<div id="current-time"></div>
	</div>

	<div id="game-info-panel" aria-hidden="true"></div>

	<!-- Windows (simple placeholders) -->
	<div id="adventure-card" class="window" style="display:none">
		<div class="window-header"><h2>Adventure Card</h2></div>
		<div class="window-content"></div>
	</div>
	<div id="inventory" class="window" style="display:none">
		<div class="window-header"><h2>Inventory</h2></div>
		<div class="window-content"></div>
	</div>
	<div id="quests" class="window" style="display:none">
		<div class="window-header"><h2>Quests</h2></div>
		<div class="window-content"></div>
	</div>

	<div id="custom-tooltip" aria-hidden="true"></div>
	<!-- Free mode hub should not be blocked by the global scene loading flag.
       Remove the persistent loading overlay here to avoid a stuck spinner.
       (If you need a loader for hub-specific async work, add a local indicator.) -->
</div>

<style>
	/* keep the component scoped styles minimal; main styles are in free-mode.css */
	.icon-btn {
		font-size: 18px;
	}
</style>
