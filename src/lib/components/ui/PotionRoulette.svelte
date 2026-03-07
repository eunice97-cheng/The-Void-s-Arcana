<script>
	import { onMount, onDestroy } from 'svelte';
	import { gameState, personalityTraits } from '$lib/stores/gameState';
	import { get } from 'svelte/store';
	import { show } from '$lib/stores/toastStore';
	import { saveManager } from '$lib/stores/saveManager';

	let open = false;
	let items = [];
	let questId = null;
	let resultText = '';
	let spinning = false;
	let spun = false; // prevent repeated spins for the same award
	let highlighted = -1;
	let spinInterval = null;

	function clamp(v, min, max) {
		return Math.max(min, Math.min(max, v));
	}

	const BUCKETS = [
		{ label: 'Refill 5 Stamina', type: 'stamina', delta: 5, icon: '⚡' },
		{ label: 'Refill 10 Stamina', type: 'stamina', delta: 10, icon: '⚡' },
		{ label: 'Lose 10 Stamina', type: 'stamina', delta: -10, icon: '⚡' },
		{ label: 'Lose 5 Stamina', type: 'stamina', delta: -5, icon: '⚡' },
		{ label: 'Gain 25 EXP', type: 'exp', delta: 25, icon: '⭐' },
		{ label: 'Gain 50 EXP', type: 'exp', delta: 50, icon: '⭐' },
		{ label: 'Refill 15 Stamina', type: 'stamina', delta: 15, icon: '⚡' },
		{ label: 'Lose 15 Stamina', type: 'stamina', delta: -15, icon: '⚡' },
		{ label: 'Gain 100 EXP', type: 'exp', delta: 100, icon: '⭐' },
		{ label: 'Max HP +50', type: 'maxHp', delta: 50, icon: '❤️' },
		{ label: 'Max SP +50', type: 'maxSp', delta: 50, icon: '🔵' },
		{ label: 'Max Stamina +1', type: 'maxStamina', delta: 1, icon: '🔋' },
		{ label: 'No Effects', type: 'none', delta: 0, icon: '❓' }
	];

	function handleEvent(e) {
		const d = e && e.detail ? e.detail : {};
		items = d.items || [];
		questId = d.questId || null;
		resultText = '';
		open = true;
		spun = false;
		highlighted = -1;
	}

	onMount(() => {
		if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
			window.addEventListener('potion:roulette', handleEvent);
		}
	});
	onDestroy(() => {
		try {
			window.removeEventListener('potion:roulette', handleEvent);
		} catch (_e) {
			// Ignore event listener removal errors
		}
	});

	function applyOutcome(outcome) {
		// Apply outcome to gameState
		try {
			gameState.update((s) => {
				const next = { ...(s || {}) };
				const pd = { ...(next.playerData || {}) };

				switch (outcome.type) {
					case 'stamina': {
						pd.stamina = clamp((pd.stamina || 0) + outcome.delta, 0, pd.maxStamina || 9999);
						resultText =
							outcome.delta >= 0 ? `Stamina +${outcome.delta}` : `Stamina ${outcome.delta}`;
						break;
					}
					case 'exp': {
						pd.exp = (pd.exp || 0) + outcome.delta;
						resultText = `Gained ${outcome.delta} EXP`;
						break;
					}
					case 'maxHp': {
						pd.maxHp = (pd.maxHp || 0) + outcome.delta;
						pd.hp = (pd.hp || 0) + outcome.delta; // also heal by that amount
						resultText = `Max HP +${outcome.delta}`;
						break;
					}
					case 'maxSp': {
						pd.maxSp = (pd.maxSp || 0) + outcome.delta;
						pd.sp = (pd.sp || 0) + outcome.delta;
						resultText = `Max SP +${outcome.delta}`;
						break;
					}
					case 'maxStamina': {
						pd.maxStamina = (pd.maxStamina || 0) + outcome.delta;
						pd.stamina = (pd.stamina || 0) + outcome.delta;
						resultText = `Max Stamina +${outcome.delta}`;
						break;
					}
					case 'none': {
						resultText = 'No Effects';
						break;
					}
					default:
						resultText = 'No Effects';
				}

				next.playerData = pd;
				return next;
			});

			// Show a toast and keep the modal open so user can see the result
			try {
				show(resultText, { type: 'info', duration: 6000 });
			} catch (_e) {
				// Ignore toast display errors
			}

			// Consume one potion-unknown from inventory to prevent repeated spins for the same potion
			try {
				gameState.update((s) => {
					const next = { ...(s || {}) };
					const ch = { ...(next.character || {}) };
					const inv = Array.isArray(ch.inventory) ? ch.inventory.slice() : [];
					const idx = inv.findIndex((x) => x.id === 'potion-unknown');
					if (idx !== -1) {
						inv[idx].qty = (inv[idx].qty || 1) - 1;
						if (inv[idx].qty <= 0) inv.splice(idx, 1);
					}
					ch.inventory = inv;
					next.character = ch;
					return next;
				});
				// Persist the change
				try {
					saveManager.saveGame({ auto: true });
				} catch (_e) {
					// Ignore save errors
				}
			} catch (_e) {
				// Ignore inventory update errors
			}

			spun = true;
			// dispatch a done event for other UIs
			try {
				if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function')
					window.dispatchEvent(
						new CustomEvent('potion:roulette:done', { detail: { questId, result: resultText } })
					);
			} catch (_e) {
				// Ignore event dispatch errors
			}

			// If outcome increased a personality trait earlier via hiddenTrait handling when submitting the quest,
			// that was already applied in submitQuest; we don't touch personalityTraits here.
		} catch (e) {
			console.warn('potion roulette apply failed', e);
			resultText = 'No Effects';
		}

		spinning = false;
	}

	async function spin() {
		if (spinning || spun) return;
		spinning = true;
		resultText = '';

		const buckets = BUCKETS;

		// Roll and map into buckets by probability ranges
		const roll = Math.random() * 100;
		let selectedIndex = buckets.length - 1; // default to 'No Effects'
		if (roll < 10) selectedIndex = 0;
		else if (roll < 30) selectedIndex = 1;
		else if (roll < 40) selectedIndex = 2;
		else if (roll < 60) selectedIndex = 3;
		else if (roll < 80) selectedIndex = 4;
		else if (roll < 90) selectedIndex = 5;
		else if (roll < 92) selectedIndex = 6;
		else if (roll < 94) selectedIndex = 7;
		else if (roll < 96) selectedIndex = 8;
		else if (roll < 96.5) selectedIndex = 9;
		else if (roll < 97) selectedIndex = 10;
		else if (roll < 97.1) selectedIndex = 11;
		else selectedIndex = 12;

		// Animate running lights: cycle through highlights rapidly, then slow down
		let currentIndex = 0;
		let speed = 50; // ms per highlight
		let cycles = 0;
		const maxCycles = 5; // number of full cycles before slowing

		const animate = () => {
			highlighted = currentIndex;
			currentIndex = (currentIndex + 1) % buckets.length;

			if (cycles < maxCycles) {
				cycles++;
				setTimeout(animate, speed);
			} else {
				// Slow down phase
				if (speed < 200) {
					speed += 20;
					setTimeout(animate, speed);
				} else {
					// Stop on selected
					highlighted = selectedIndex;
					setTimeout(() => {
						const outcome = buckets[selectedIndex];
						applyOutcome(outcome);
					}, 500);
				}
			}
		};

		animate();
	}

	function close() {
		if (!spun) {
			// Don't allow closing until spun
			return;
		}
		open = false;
		items = [];
		questId = null;
	}
</script>

{#if open}
	<div class="pr-backdrop" on:click={spun ? close : null} class:disabled={!spun}>
		<div class="pr-modal" on:click|stopPropagation>
			<h3>Spin for Potion Effects</h3>
			<div class="pr-body">
				<div class="pr-outcomes">
					<h4>Possible Results</h4>
					<ul>
						{#each BUCKETS as b, i (b)}
							<li class:selected={highlighted === i}>{b.icon} {b.label}</li>
						{/each}
					</ul>
					{#if items && items.length}
						<div class="awarded">Items awarded:</div>
						<ul>
							{#each items as it (it)}
								<li>{it.name || it.id} x{it.qty || 1}</li>
							{/each}
						</ul>
					{/if}
				</div>

				<div class="pr-roulette">
					<div class="result-text">{resultText}</div>
					<div class="pr-actions">
						<button class="qb-btn accept" on:click={spin} disabled={spinning || spun}
							>{spinning || spun ? (spinning ? 'Spinning...' : 'Done') : 'Spin'}</button
						>
						{#if spun}
							<button class="qb-btn secondary" on:click={close}>Close</button>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.pr-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		z-index: 90000;
	}
	.pr-backdrop.disabled {
		cursor: not-allowed;
	}
	.pr-modal {
		width: min(500px, calc(100% - 48px));
		background: linear-gradient(135deg, #1a1d23 0%, #0f1113 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 16px;
		border-radius: 16px;
		color: #e6f7f0;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}
	.pr-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: center;
	}
	.pr-outcomes {
		width: 100%;
		max-width: 400px;
	}
	.pr-outcomes h4 {
		margin: 0 0 8px 0;
		text-align: center;
	}
	.pr-outcomes ul {
		list-style: none;
		padding: 0;
		margin: 0 0 8px 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.pr-outcomes li {
		padding: 8px 12px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.03);
		margin-bottom: 0;
		color: #e6f7f0;
		transition: all 0.2s ease;
		border: 2px solid transparent;
		text-align: center;
		font-size: 14px;
		font-weight: 500;
	}
	.pr-outcomes li.selected {
		background: linear-gradient(90deg, rgba(127, 209, 185, 0.3), rgba(127, 209, 185, 0.2));
		color: #05221b;
		font-weight: 700;
		border: 2px solid rgba(127, 209, 185, 0.5);
		box-shadow: 0 4px 12px rgba(127, 209, 185, 0.3);
		transform: scale(1.05);
	}
	.awarded {
		margin-top: 10px;
		color: #9aa0a6;
		text-align: center;
	}
	.pr-roulette {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}
	.result-text {
		color: #cfe1dd;
		min-height: 24px;
		font-size: 18px;
		font-weight: 600;
		text-align: center;
	}
	.pr-actions {
		display: flex;
		gap: 12px;
	}
	.qb-btn.accept {
		background: linear-gradient(90deg, #7fd1b9, #66c3a8);
		color: #05221b;
		border: none;
		padding: 10px 20px;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 2px 8px rgba(127, 209, 185, 0.3);
	}
	.qb-btn.accept:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(127, 209, 185, 0.4);
	}
	.qb-btn.secondary {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #cfe1dd;
		padding: 10px 20px;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	.qb-btn.secondary:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.2);
	}
</style>
