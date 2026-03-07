<script>
	// @ts-check
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { saveSlotsManager } from '$lib/stores/saveSlotsManager';
	import Auth from './Auth.svelte';

	const dispatch = createEventDispatcher();

	export let open = false;

	// Portal host element used to append modal to document.body to avoid stacking-context issues
	/** @type {HTMLElement|null} */
	let portalContainer = null;
	/** @type {HTMLElement|null} */
	let modalHost = null; // will bind to the wrapper that contains backdrop+modal

	/** @type {Array<any>} */
	let slots = [];
	/** @type {number|null} */
	let editingName = null;
	/** @type {Record<number, HTMLInputElement>} */
	let importFileInputs = {};
	/** @type {Record<number, string|null>} */
	let slotStatus = {};
	/** @type {{slotId: number|null}} */
	let deleteConfirm = { slotId: null };

	/**
	 * Title-case a string safely
	 * @param {string} str
	 * @returns {string}
	 */
	function titleCase(str) {
		if (!str) return '';
		return String(str)
			.split(/[\s_-]+/)
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
			.join(' ');
	}

	/** @param {string|null|undefined} name @param {number} id */
	function isDefaultSlotName(name, id) {
		if (!name) return true;
		return String(name).trim().toLowerCase() === `slot ${id}`;
	}

	function refresh() {
		// listSlots returns an array of slot metadata
		slots = /** @type {Array<any>} */ (saveSlotsManager.listSlots());
	}

	function close() {
		open = false;
		dispatch('close');
	}

	// ensure portal cleanup on destroy
	onDestroy(() => {
		try {
			if (modalHost && portalContainer && portalContainer.contains(modalHost)) {
				portalContainer.removeChild(modalHost);
			}
			if (portalContainer && portalContainer.parentNode) {
				portalContainer.parentNode.removeChild(portalContainer);
			}
			// restore any overwritten overflow styles
			try {
				if (typeof document !== 'undefined') {
					document.documentElement.style.overflowX = originalDocOverflowX || '';
					document.body.style.overflowX = originalBodyOverflowX || '';
				}
			} catch (_e) {
				// Ignore style restoration errors
			}
		} catch (e) {
			// ignore
		}
	});

	function onOpen() {
		refresh();
	}

	/** @param {number} slotId */
	function saveHere(slotId) {
		const res = saveSlotsManager.saveToSlot(slotId);
		if (res.ok) refresh();
		else alert('Save failed: ' + (res.reason || 'unknown'));
	}

	/** @param {number} slotId */
	function saveHereWithStatus(slotId) {
		slotStatus[slotId] = 'Saving...';
		const res = saveSlotsManager.saveToSlot(slotId);
		if (res.ok) {
			slotStatus[slotId] = 'Saved';
			refresh();
			setTimeout(() => {
				slotStatus[slotId] = null;
			}, 1800);
		} else {
			slotStatus[slotId] = 'Save failed';
			setTimeout(() => {
				slotStatus[slotId] = null;
			}, 3000);
		}
	}

	/** @param {number} slotId */
	function loadSlot(slotId) {
		const res = saveSlotsManager.loadFromSlot(slotId);
		if (res.ok) {
			// notify parent with parsed save and metadata so caller can navigate
			const slot = saveSlotsManager.getSlot(slotId);
			dispatch('loaded', { slotId, meta: slot ? slot.meta : null, save: res.save || null });
			close();
		} else {
			alert('Load failed: ' + (res.reason || 'unknown'));
		}
	}

	// Request delete shows a confirmation modal. performDelete executes.
	/** @param {number} slotId */
	function requestDelete(slotId) {
		const slot = saveSlotsManager.getSlot(slotId);
		if (!slot || !slot.payload) return;
		deleteConfirm.slotId = slotId;
	}

	function cancelDelete() {
		deleteConfirm.slotId = null;
	}

	function performDelete() {
		if (!deleteConfirm.slotId) return;
		const res = saveSlotsManager.deleteSlot(deleteConfirm.slotId);
		if (!res || !res.ok) {
			if (res && res.reason === 'active-slot') {
				alert('Cannot delete this save: it is the active character you are currently playing.');
			} else {
				alert('Delete failed: ' + (res && res.reason ? res.reason : 'unknown'));
			}
			// keep the confirmation open so user sees state; do not clear deleteConfirm.slotId
			return;
		}
		// success
		deleteConfirm.slotId = null;
		refresh();
	}

	/** @param {number} slotId */
	function doExport(slotId) {
		const res = saveSlotsManager.exportSlot(slotId);
		if (!res.ok) {
			alert('Export failed: ' + (res.reason || 'empty'));
			return;
		}
		// blob and filename may be undefined in edge cases; guard defensively
		const blob = res.blob;
		const filename = res.filename || `save-slot-${slotId}.json`;
		if (!blob) {
			alert('Export failed: no data');
			return;
		}
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	/**
	 * Handle file input change for importing a save into a slot.
	 * @param {Event} e
	 * @param {number} slotId
	 */
	function onImportChange(e, slotId) {
		const input = /** @type {HTMLInputElement|null} */ (e && /** @type {any} */ (e.target));
		const file = input && input.files && input.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const text = /** @type {string} */ (reader.result);
			const res = saveSlotsManager.importToSlot(slotId, text);
			if (!res.ok) {
				let errorMsg = 'Import failed: ';
				switch (res.reason) {
					case 'no-slot':
						errorMsg += 'Slot not found';
						break;
					case 'locked':
						errorMsg += 'Slot is locked (premium feature required)';
						break;
					case 'invalid-file':
						errorMsg +=
							'Invalid save file format. The file may be corrupted or from an incompatible version.';
						break;
					case 'mode-mismatch':
						errorMsg += 'Cannot import a free-mode save when not in free mode';
						break;
					case 'migration-failed':
						errorMsg +=
							'Failed to migrate save data to current version. ' + (res.error?.message || '');
						break;
					case 'error':
						errorMsg += res.error?.message || 'Unknown error occurred';
						break;
					default:
						errorMsg += res.reason || 'Unknown error';
				}

				// Show detailed error to user
				alert(
					errorMsg +
						'\n\nFor more details, check the browser console (F12) and look for window._lastImportError'
				);
				console.error('[SaveSlotsModal] Import failed:', res);
			} else {
				alert('Import successful! Your save has been restored to Slot ' + slotId);
				refresh();
			}
		};
		reader.onerror = () => {
			alert('Failed to read file. Please ensure the file is a valid JSON export.');
			console.error('[SaveSlotsModal] File read error');
		};
		reader.readAsText(file);
		// clear the input value so the same file can be re-selected later
		if (input) input.value = '';
	}

	$: if (open) onOpen();

	// Watch `open` to mount/unmount portal host into document.body so modal is always viewport-fixed
	$: if (typeof document !== 'undefined') {
		if (open) {
			// create portal container if needed
			if (!portalContainer) {
				portalContainer = document.createElement('div');
				portalContainer.className = 'ss-portal-container';
				document.body.appendChild(portalContainer);
				// remember and suppress horizontal overflow on the document while modal is open
				try {
					originalDocOverflowX = document.documentElement.style.overflowX || '';
					originalBodyOverflowX = document.body.style.overflowX || '';
					document.documentElement.style.overflowX = 'hidden';
					document.body.style.overflowX = 'hidden';
					portalContainer.style.overflowX = 'hidden';
				} catch (e) {
					// ignore
				}
			}
			// move modalHost into portal
			if (modalHost && portalContainer && modalHost.parentNode !== portalContainer) {
				portalContainer.appendChild(modalHost);
			}
		} else {
			// remove modalHost from portal when closed
			if (modalHost && portalContainer && portalContainer.contains(modalHost)) {
				portalContainer.removeChild(modalHost);
			}
			if (portalContainer && portalContainer.parentNode) {
				portalContainer.parentNode.removeChild(portalContainer);
			}
			portalContainer = null;
			// restore previous overflow values
			try {
				document.documentElement.style.overflowX = originalDocOverflowX || '';
				document.body.style.overflowX = originalBodyOverflowX || '';
			} catch (e) {
				/* ignore */
			}
		}
	}

	// previous overflow values so we can restore when modal closes
	let originalDocOverflowX = '';
	let originalBodyOverflowX = '';
</script>

{#if open}
	<div bind:this={modalHost} class="ss-modal-host">
		<div
			class="ss-modal-backdrop"
			role="button"
			tabindex="0"
			aria-label="Close save slots"
			on:click={close}
			on:keydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') close();
			}}
		></div>
		<div class="ss-modal" role="dialog" aria-modal="true" aria-label="Save slots">
			<div class="ss-header">
				<h2>Save Slots</h2>
				<button class="ss-close" aria-label="Close save slots" on:click={close}>
					<!-- SVG close icon; styled for accessibility and consistent UI -->
					<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
						<path
							fill="currentColor"
							d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
						/>
					</svg>
				</button>
			</div>
			
			<div class="ss-auth-section">
				<Auth />
			</div>

			<div class="ss-grid">
				{#each slots as slot (slot.id)}
					<div class="ss-slot {slot.locked ? 'locked' : ''}">
						<div class="ss-slot-top">
							<div class="ss-badge">{slot.id}</div>
							{#if slot.meta && slot.meta.avatar}
								<div class="ss-avatar" aria-hidden="true">
									<img
										src={slot.meta.avatar}
										alt={'Avatar for ' + (slot.meta.playerName || 'player')}
										loading="lazy"
										decoding="async"
									/>
								</div>
							{/if}
							{#if editingName === slot.id}
								<input
									class="ss-name-input"
									type="text"
									bind:value={slot.name}
									on:blur={() => {
										saveSlotsManager.setSlotName(slot.id, slot.name);
										editingName = null;
										refresh();
									}}
								/>
							{:else}
								<button
									class="ss-name-btn"
									type="button"
									on:click={() => {
										if (!slot.locked) editingName = slot.id;
									}}
									>{slot.meta?.playerName ||
										(isDefaultSlotName(slot.name, slot.id) ? 'Empty' : slot.name)}</button
								>
							{/if}
							{#if slot.locked}
								<div class="ss-lock">🔒</div>
							{/if}
						</div>

						<div class="ss-meta">
							{#if slot.meta}
								<div class="ss-meta-row">{titleCase(slot.meta.playerClass) || '—'}</div>
								<div class="ss-meta-row">Level: {slot.meta.level ?? '—'}</div>
								{#if slot.ts}
									<div class="ss-meta-row">Saved: {new Date(slot.ts).toLocaleString()}</div>
								{/if}
							{:else}
								<div class="empty">Empty</div>
							{/if}
						</div>

						<div class="ss-actions" role="group" aria-label="Slot actions">
							<div class="row row-load">
								<div class="row-inner">
									<button
										class="btn load"
										on:click={() => loadSlot(slot.id)}
										disabled={!slot.meta}
										aria-label="Load slot">Load</button
									>
								</div>
							</div>

							<div class="row row-middle">
								<button
									class="btn export"
									on:click={() => doExport(slot.id)}
									disabled={!slot.payload}
									aria-label="Export slot">Export</button
								>
								{#if slot.locked}
									<div
										class="import-label btn import disabled"
										role="button"
										aria-disabled="true"
										tabindex="-1"
									>
										<span class="label" style="text-transform: none;">Import</span>
									</div>
								{:else}
									<label class="import-label btn import" aria-label="Import save">
										<input
											type="file"
											accept="application/json"
											on:change={(e) => onImportChange(e, slot.id)}
										/>
										<span class="label" style="text-transform: none;">Import</span>
									</label>
								{/if}
							</div>

							<div class="row row-delete">
								<div class="row-inner">
									<button
										class="btn delete small"
										on:click={() => requestDelete(slot.id)}
										disabled={!slot.payload}
										aria-label="Delete slot"
									>
										<span class="icon" aria-hidden="true">🗑️</span>
										<span class="label">Delete</span>
									</button>
								</div>
							</div>
						</div>
						{#if slotStatus[slot.id]}
							<div class="ss-status">{slotStatus[slot.id]}</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- footer removed: Close button intentionally omitted to use modal backdrop/keyboard for closing -->
		</div>
	</div>
{/if}
{#if deleteConfirm.slotId}
	<div class="ss-confirm-backdrop" role="dialog" aria-modal="true">
		<div class="ss-confirm">
			<h3>Confirm deletion</h3>
			<p>Are you sure you want to permanently delete this save slot? This cannot be undone.</p>
			<div class="ss-confirm-actions">
				<button class="btn cancel" on:click={cancelDelete}>Cancel</button>
				<button class="btn delete confirm" on:click={performDelete} aria-label="Confirm delete"
					>Confirm Delete</button
				>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Host that sits in the body and centers the modal via flexbox
	   Using a fixed host avoids issues where position:fixed is affected
	   by ancestor transforms on some pages. */
	.ss-modal-host {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 20000;
		box-sizing: border-box;
		overflow-x: hidden; /* prevent horizontal scroll from portal host */
	}

	.ss-modal-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 0;
	}
	.ss-modal {
		position: relative;
		width: 96%;
		max-width: 1100px;
		/* prevent modal from growing beyond viewport and allow inner scrolling */
		max-height: calc(100vh - 80px);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		/* Lighter modal background for better readability */
		box-sizing: border-box;
		overflow-x: hidden; /* ensure no horizontal scroll inside modal */
		background: linear-gradient(180deg, rgba(28, 22, 26, 0.92) 0%, rgba(18, 14, 18, 0.96) 60%);
		color: var(--text);
		z-index: 20001;
		border-radius: 12px;
		padding: 20px;
		border: 2px solid rgba(var(--accent-primary), 0.28);
		box-shadow: 0 18px 60px rgba(var(--accent-secondary), 0.14);
		font-family: 'Cinzel', serif;
		position: relative;
	}
	.ss-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.ss-header h2 {
		margin: 0;
		font-size: 1.35rem;
		letter-spacing: 1px;
		color: var(--text);
		text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6);
		font-family: 'Cinzel', serif;
	}

	/* header gets a subtle purple accent */
	.ss-header {
		background: linear-gradient(180deg, rgba(var(--accent-primary), 0.04), rgba(0, 0, 0, 0.02));
		padding: 10px 14px;
		border-radius: 10px;
		border: 1px solid rgba(var(--accent-primary), 0.06);
	}

	/* outer purple glow/frame for the modal */
	.ss-modal::before {
		content: '';
		position: absolute;
		inset: -12px;
		border-radius: 18px;
		pointer-events: none;
		box-shadow: 0 0 60px 12px rgba(var(--accent-primary), 0.12);
	}

	/* Styled close button for modal header */
	.ss-close {
		width: 42px;
		height: 42px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.04);
		color: #efe9ee;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition:
			transform 0.12s ease,
			background 0.12s ease;
	}

	.ss-close svg {
		width: 18px;
		height: 18px;
		display: block;
		fill: currentColor;
	}

	.ss-close:hover {
		background: rgba(255, 255, 255, 0.06);
		transform: translateY(-2px);
	}

	.ss-close:focus {
		outline: 2px solid rgba(var(--accent-primary), 0.32);
		outline-offset: 2px;
	}
	.ss-grid {
		display: grid;
		/* Force a 3-column layout on wide screens so six visible slots render as 3 top / 3 bottom.
		   Use minmax(0, 1fr) to allow items to shrink below intrinsic minimums and avoid overflow.
		   Responsive fallbacks are defined below. */
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		margin-top: 14px;
		width: 100%;
		/* framed container for slots */
		padding: 8px; /* reduce padding so grid fits comfortably inside modal */
		border: 2px solid rgba(var(--accent-secondary), 0.14);
		border-radius: 12px;
		background: linear-gradient(180deg, rgba(8, 6, 12, 0.02), rgba(0, 0, 0, 0.02));
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.02),
			0 12px 40px rgba(var(--accent-secondary), 0.12);
		position: relative;
		box-sizing: border-box; /* ensure padding/border do not expand layout beyond modal */
		max-width: 100%;
		grid-auto-rows: auto;
		grid-auto-columns: minmax(0, 1fr);
		/* avoid internal scrollbars — let modal container manage overflow; make glow not expand box */
		overflow: visible;
		/* remove internal height cap so layout won't produce its own scrollbar */
		max-height: none;
	}

	/* Responsive: reduce columns when viewport is narrower */
	@media (max-width: 980px) {
		.ss-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 600px) {
		.ss-grid {
			grid-template-columns: repeat(1, 1fr);
		}
	}

	/* purple outer glow for the slots container */
	.ss-grid::before {
		content: '';
		position: absolute;
		inset: 0; /* keep pseudo-element inside the container to avoid adding scrollable overflow */
		border-radius: 16px;
		pointer-events: none;
		/* subtle primary glow for the grid container */
		box-shadow: 0 0 40px 8px rgba(var(--accent-primary), 0.08);
	}

	/* Theme accents: layered red + purple glow on borders */
	:root {
		/* Brighter primary for better contrast on dark backgrounds */
		--accent-primary: 226, 75, 75; /* brighter crimson */
		--accent-secondary: 196, 150, 80; /* warm gold */
		--accent-border-alpha: 0.18;
		--accent-glow-alpha: 0.22;
	}

	/* apply combined border + glow across modal elements to achieve red/purple fantasy look */
	.ss-modal,
	.ss-confirm,
	.ss-close,
	.ss-grid {
		border: 2px solid rgba(var(--accent-primary), var(--accent-border-alpha));
	}
	.ss-modal,
	.ss-confirm {
		box-shadow:
			0 0 36px 8px rgba(var(--accent-primary), var(--accent-glow-alpha)),
			0 0 72px 14px rgba(var(--accent-secondary), calc(var(--accent-glow-alpha) - 0.03));
	}
	.ss-header {
		background: linear-gradient(180deg, rgba(var(--accent-primary), 0.04), rgba(0, 0, 0, 0.02));
		border: 1px solid rgba(var(--accent-primary), 0.06);
	}
	.ss-grid::before {
		/* subtle primary glow for the grid container */
		box-shadow: 0 0 40px 8px rgba(var(--accent-primary), 0.12);
	}
	.ss-slot {
		border: 1.5px solid rgba(var(--accent-primary), 0.18);
		box-shadow: inset 0 0 0 1px rgba(var(--accent-secondary), 0.06);
	}

	@media (max-width: 720px) {
		.ss-grid {
			grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		}
		.ss-actions .row-inner {
			width: 100%;
		}
		.ss-actions .row-middle {
			width: 100%;
		}
	}
	.ss-slot {
		position: relative;
		padding: 10px 10px 10px 48px; /* slightly reduced padding to help fit 3 columns */
		border-radius: 12px;
		/* Lighter card background for better text/button visibility */
		background: linear-gradient(180deg, rgba(38, 28, 32, 0.45), rgba(24, 18, 22, 0.35));
		/* brighter outer border */
		border: 1.5px solid rgba(var(--accent-primary), 0.35);
		/* stronger warm-gold inner rim */
		box-shadow:
			inset 0 0 0 1px rgba(var(--accent-secondary), 0.12),
			0 6px 18px rgba(0, 0, 0, 0.45);
		min-height: 120px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-width: 0;
		box-sizing: border-box;
		transition:
			transform 0.12s ease,
			box-shadow 0.12s ease,
			border-color 0.12s ease;
	}

	.ss-slot:hover {
		transform: translateY(-6px);
		/* stronger hover glow: crimson outer, warm-gold inner */
		box-shadow:
			0 22px 48px rgba(var(--accent-primary), 0.32),
			inset 0 0 0 1.5px rgba(var(--accent-secondary), 0.16);
		border-color: rgba(var(--accent-primary), 0.45);
	}

	/* parchment texture and ornamental accents for a fantasy look */
	.ss-slot::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 12px;
		pointer-events: none;
		background-image:
			radial-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
			linear-gradient(180deg, rgba(255, 255, 255, 0.01), rgba(0, 0, 0, 0));
		background-size:
			20px 20px,
			100% 100%;
		mix-blend-mode: overlay;
		opacity: 0.7;
	}

	/* ornate corner decorations using inline SVG data URI */
	.ss-slot::after {
		content: '';
		position: absolute;
		right: 10px;
		top: 10px;
		width: 46px;
		height: 46px;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><g fill='%23b56b3b' fill-rule='nonzero'><path d='M6 6c0 0 14 8 26 8s26-8 26-8v4c0 0-14 8-26 8S6 10 6 10V6z'/></g></svg>");
		background-size: contain;
		opacity: 0.95;
		transform: rotate(12deg);
		pointer-events: none;
	}
	.ss-slot.locked::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.45));
		border-radius: 10px;
	}
	.ss-badge {
		position: absolute;
		left: 12px;
		top: 12px;
		/* gold badge to contrast with red theme */
		background: linear-gradient(180deg, #f3c86a, #b57b2b);
		border: 1px solid rgba(255, 255, 255, 0.04);
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		font-size: 0.9rem;
		color: #fff;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.7);
	}
	.ss-slot-top {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/* Avatar thumbnail shown on slots when available */
	.ss-avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		overflow: hidden;
		flex: 0 0 44px;
		border: 1px solid rgba(var(--accent-secondary), 0.12);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
	}
	.ss-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Buttons inside each slot: make borders more visible and themed */
	.ss-actions .btn,
	.ss-actions .import-label {
		padding: 8px 10px;
		border-radius: 8px;
		background: rgba(var(--accent-primary), 0.06);
		color: var(--text);
		border: 2px solid rgba(var(--accent-primary), 0.65);
		box-shadow:
			0 4px 14px rgba(0, 0, 0, 0.45),
			0 0 8px rgba(var(--accent-primary), 0.15);
		cursor: pointer;
		transition:
			background 0.12s ease,
			border-color 0.12s ease,
			transform 0.12s ease,
			box-shadow 0.12s ease;
		font-weight: 600;
	}
	.ss-actions .btn[disabled],
	.ss-actions .import-label.disabled {
		/* Make disabled buttons explicitly grayed out and non-interactive */
		background: linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.06));
		border-color: rgba(160, 160, 160, 0.12) !important;
		color: var(--muted);
		box-shadow: none;
		pointer-events: none;
		cursor: not-allowed;
		filter: grayscale(60%) opacity(0.75);
	}
	.ss-actions .btn:hover,
	.ss-actions .import-label:hover {
		background: rgba(var(--accent-primary), 0.12);
		border-color: rgba(var(--accent-primary), 0.85);
		box-shadow:
			0 12px 30px rgba(var(--accent-primary), 0.18),
			0 0 12px rgba(var(--accent-primary), 0.25);
		transform: translateY(-2px);
	}
	.ss-name-btn {
		background: transparent;
		border: none;
		color: #efe9ee;
		font-weight: 700;
		font-size: 1.04rem;
		cursor: pointer;
		padding: 0;
		text-align: left;
		font-family: 'Cinzel', serif;
		letter-spacing: 0.6px;
	}
	.ss-name-input {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.04);
		color: #fff;
		padding: 6px 8px;
		border-radius: 6px;
	}
	.ss-lock {
		margin-left: auto;
		font-size: 1rem;
		color: #ffd6d6;
	}
	.ss-meta {
		margin-top: 8px;
		font-size: 0.95rem;
		color: #d4cacf;
	}
	.ss-meta-row {
		margin-bottom: 6px;
	}
	.empty {
		color: #8f8aa8;
		font-style: italic;
	}
	.ss-status {
		margin-top: 8px;
		font-size: 0.88rem;
		color: #b3f7c1;
	}
	.ss-actions {
		margin-top: 12px;
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.ss-actions {
		margin-top: 12px;
		display: block;
		gap: 8px;
	}
	.ss-actions .row {
		margin-bottom: 8px;
		display: flex;
		gap: 8px;
		align-items: center;
	}
	/* center each action row */
	.ss-actions .row-middle,
	.ss-actions .row-load,
	.ss-actions .row-delete {
		justify-content: center;
	}

	/* make middle row act as the width reference */
	.ss-actions .row-middle {
		width: 100%;
		max-width: 280px;
		margin-left: auto;
		margin-right: auto;
	}
	.ss-actions .row-middle .btn {
		flex: 1 1 0;
	}
	.ss-actions .row-middle .import-label {
		flex: 1 1 0;
		display: inline-flex;
		justify-content: center;
	}

	/* row-inner uses the same width as middle row so load/delete match combined width */
	.ss-actions .row-inner {
		width: 100%;
		max-width: 280px;
		display: flex;
		justify-content: center;
		box-sizing: border-box;
	}
	.ss-actions .row-inner .btn {
		width: 100%;
		box-sizing: border-box;
	}

	/* ensure row buttons center their contents (icon + label) */
	.ss-actions .row-inner .btn {
		display: flex !important;
		justify-content: center !important;
		align-items: center !important;
		gap: 8px;
	}

	/* normalize Import label styling so it's not uppercased */
	.import-label,
	.import-label .label {
		text-transform: none !important;
		font-size: 0.92rem !important;
		font-weight: 600 !important;
	}
	.ss-actions .btn {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border: 1px solid rgba(255, 255, 255, 0.04);
		color: #efe9ee;
		padding: 8px 10px;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.92rem;
		transition:
			transform 0.12s ease,
			box-shadow 0.12s ease;
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			Roboto,
			'Helvetica Neue',
			Arial;
	}
	.ss-actions .btn:hover:not([disabled]) {
		transform: translateY(-2px);
		/* subtle purple glow on hover for theme cohesion */
		box-shadow: 0 10px 28px rgba(120, 60, 200, 0.18);
	}
	.ss-actions .btn[disabled] {
		opacity: 0.45;
		cursor: not-allowed;
	}
	/* Prominent destructive button */
	.btn.delete {
		background: linear-gradient(180deg, #d9534f, #c12b2b);
		color: #fff;
		border: none;
	}
	.btn.delete .icon {
		margin-right: 6px;
	}
	.btn.delete:hover:not([disabled]) {
		box-shadow: 0 8px 22px rgba(193, 43, 43, 0.28);
		transform: translateY(-2px);
	}
	.btn.delete[disabled] {
		background: linear-gradient(180deg, #ffecec, #ffdede);
		color: #8b0000;
		border: 1px solid rgba(255, 80, 80, 0.18);
		box-shadow: none;
		transform: none;
	}
	.ss-actions .btn[disabled] {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.import-label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.import-label input {
		display: none;
	}
	.import {
		text-transform: none;
	}
	/* Footer removed; close button intentionally omitted. */

	/* Strong override to ensure delete button reads as destructive in all themes/hot-reload states */
	.ss-actions .btn.delete {
		background: linear-gradient(180deg, #8b0000, #5a0000) !important; /* gothic blood red */
		color: #fff !important;
		border: 1px solid rgba(255, 255, 255, 0.04) !important;
		padding: 8px 12px !important;
		display: inline-flex !important;
		align-items: center !important;
		gap: 8px !important;
		font-weight: 700 !important;
		font-size: 0.96rem !important;
		border-radius: 8px !important;
		text-transform: none !important;
	}

	.ss-actions .btn.delete .icon {
		font-size: 1.05rem;
		filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
	}
	.ss-actions .btn.delete .label {
		color: #fff;
	}
	.ss-actions .btn.delete:hover:not([disabled]) {
		box-shadow: 0 10px 30px rgba(90, 0, 0, 0.36);
		transform: translateY(-2px);
	}
	.ss-actions .btn.delete[disabled] {
		background: linear-gradient(180deg, #2b0b0b, #1a0505) !important;
		color: #8b0000 !important;
		border: 1px solid rgba(255, 80, 80, 0.06) !important;
		box-shadow: none !important;
		transform: none !important;
		opacity: 0.5 !important;
	}

	/* confirmation delete button lives in the confirm modal, not .ss-actions */
	.ss-confirm .btn.delete.confirm {
		background: linear-gradient(180deg, #ff2b2b, #d81b1b) !important;
		box-shadow: 0 12px 36px rgba(216, 27, 27, 0.28);
	}

	/* smaller buttons for reduced accessibility */
	.ss-actions .btn.small {
		padding: 6px 8px;
		font-size: 0.82rem;
	}

	/* Load button green variant */
	.ss-actions .btn.load {
		background: linear-gradient(180deg, #2ecc71, #20b65a);
		color: #06210b;
		border: none;
		font-weight: 800;
	}
	.ss-actions .btn.load[disabled] {
		opacity: 0.5;
		color: rgba(6, 33, 11, 0.6);
	}

	/* confirmation modal styles */
	.ss-confirm-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		z-index: 30000;
	}
	.ss-confirm {
		background: linear-gradient(180deg, #0b0810, #060305);
		color: #efe9ee;
		padding: 18px;
		border-radius: 10px;
		box-shadow: 0 18px 60px rgba(0, 0, 0, 0.8);
		width: 92%;
		max-width: 420px;
		border: 1px solid rgba(255, 255, 255, 0.04);
	}
	.ss-confirm h3 {
		margin: 0 0 8px 0;
		font-family: 'Cinzel', serif;
	}
	.ss-confirm p {
		margin: 0 0 12px 0;
		color: #d4cacf;
		font-size: 0.95rem;
	}
	.ss-confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
	.ss-confirm .btn.cancel {
		background: transparent;
		color: #efe9ee;
		border: 1px solid rgba(255, 255, 255, 0.06);
		padding: 6px 10px;
		border-radius: 6px;
	}
</style>
