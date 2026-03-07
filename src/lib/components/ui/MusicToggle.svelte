<script>
	import { gameState, audioSettings } from '$lib/stores/gameState';
	import { fade } from 'svelte/transition';

	// derived reactive values via the store
	$: enabled = $gameState?.audioEnabled ?? $audioSettings?.enabled;
	$: bgmVolume = $audioSettings?.bgmVolume ?? 50;
	$: sfxVolume = $audioSettings?.sfxVolume ?? 50;

	let showControls = false;

	function toggleMute() {
		// Toggle both flags so other parts of the app that read either one stay in sync
		try {
			gameState.update((s) => ({ ...s, audioEnabled: !s.audioEnabled }));
		} catch (e) {
			console.warn('Failed to toggle gameState.audioEnabled', e);
		}

		try {
			audioSettings.update((a) => ({ ...a, enabled: !a.enabled }));
		} catch (e) {
			console.warn('Failed to toggle audioSettings.enabled', e);
		}
	}

	function updateBgm(e) {
		const val = +e.target.value;
		audioSettings.update((s) => ({ ...s, bgmVolume: val }));
	}

	function updateSfx(e) {
		const val = +e.target.value;
		audioSettings.update((s) => ({ ...s, sfxVolume: val }));
	}

	function toggleControls() {
		showControls = !showControls;
	}
</script>

<div class="audio-control-container">
	<button class="audio-toggle" on:click={toggleControls} aria-label="Audio Settings">
		{#if enabled}
			<i class="fas fa-volume-up" aria-hidden="true"></i>
		{:else}
			<i class="fas fa-volume-mute" aria-hidden="true"></i>
		{/if}
	</button>

	{#if showControls}
		<div class="volume-popup" transition:fade={{ duration: 200 }}>
			<div class="control-header">Audio Settings</div>
			
			<div class="control-row">
				<label for="bgm-slider">Music ({bgmVolume}%)</label>
				<input 
					id="bgm-slider"
					type="range" 
					min="0" 
					max="100" 
					value={bgmVolume} 
					on:input={updateBgm} 
				/>
			</div>
			
			<div class="control-row">
				<label for="sfx-slider">SFX ({sfxVolume}%)</label>
				<input 
					id="sfx-slider"
					type="range" 
					min="0" 
					max="100" 
					value={sfxVolume} 
					on:input={updateSfx} 
				/>
			</div>
			
			<div class="control-row action-row">
				<button class="mute-btn" on:click={toggleMute}>
					{enabled ? 'Mute All' : 'Unmute All'}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.audio-control-container {
		position: fixed;
		top: 16px;
		right: 16px;
		z-index: 11000;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.audio-toggle {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1px solid rgba(138, 43, 226, 0.6);
		background: rgba(30, 30, 46, 0.95);
		color: #b19cd9;
		font-size: 18px;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0,0,0,0.3);
	}

	.audio-toggle:hover {
		background: rgba(138, 43, 226, 0.45);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(138, 43, 226, 0.3);
	}

	.volume-popup {
		margin-top: 12px;
		background: rgba(20, 20, 35, 0.98);
		border: 1px solid rgba(138, 43, 226, 0.4);
		padding: 16px;
		border-radius: 12px;
		width: 240px;
		color: #e0e0e0;
		box-shadow: 0 8px 24px rgba(0,0,0,0.6);
		backdrop-filter: blur(8px);
	}

	.control-header {
		font-size: 14px;
		font-weight: bold;
		color: #b19cd9;
		margin-bottom: 12px;
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 1px;
		border-bottom: 1px solid rgba(138, 43, 226, 0.2);
		padding-bottom: 8px;
	}

	.control-row {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 12px;
	}

	.control-row label {
		font-size: 12px;
		color: #a0a0c0;
		display: flex;
		justify-content: space-between;
	}

	.action-row {
		margin-bottom: 0;
		margin-top: 8px;
	}

	input[type=range] {
		width: 100%;
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		appearance: none;
		outline: none;
	}

	input[type=range]::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #8a2be2;
		cursor: pointer;
		transition: background 0.2s;
	}

	input[type=range]::-webkit-slider-thumb:hover {
		background: #a64bf4;
	}

	.mute-btn {
		width: 100%;
		padding: 8px;
		background: rgba(138, 43, 226, 0.15);
		border: 1px solid rgba(138, 43, 226, 0.4);
		color: #d0d0ff;
		cursor: pointer;
		border-radius: 6px;
		font-size: 13px;
		transition: all 0.2s;
	}

	.mute-btn:hover {
		background: rgba(138, 43, 226, 0.3);
		color: #fff;
	}
</style>
