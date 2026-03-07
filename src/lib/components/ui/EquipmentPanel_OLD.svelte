<script>
	import { gameState } from '$lib/stores/gameState';
	import { get } from 'svelte/store';

	// weapon items (simplified choices for the UI)
	const weaponOptions = [
		{ id: 'none', name: 'None', twoHanded: false, category: 'none', allowed: ['*'] },
		{
			id: 'one_sword',
			name: 'One-handed Sword',
			twoHanded: false,
			category: 'weapon',
			allowed: ['warrior', 'rogue', 'archer', 'tinkerer']
		},
		{ id: 'shield', name: 'Shield', twoHanded: false, category: 'shield', allowed: ['warrior'] },
		{
			id: 'two_sword',
			name: 'Two-handed Sword',
			twoHanded: true,
			category: 'weapon',
			allowed: ['warrior']
		},
		{
			id: 'staff',
			name: 'Two-handed Staff',
			twoHanded: true,
			category: 'weapon',
			allowed: ['mage', 'acolyte', 'tinkerer']
		},
		{ id: 'bow', name: 'Two-handed Bow', twoHanded: true, category: 'weapon', allowed: ['archer'] },
		{
			id: 'dagger',
			name: 'Dagger (one-handed)',
			twoHanded: false,
			category: 'weapon',
			allowed: ['rogue']
		}
	];

	// Inventory helpers — if the character has an inventory array, use it to populate dropdowns.
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	let gs = get(gameState) || {};
	let character = gs.character || { name: 'Adventurer', class: 'ROGUE' };
	const defaultEquipment = {
		head: null,
		body: null,
		legs: null,
		weapon1: 'none',
		weapon2: 'none',
		belt: null,
		necklace: null,
		ring1: null,
		ring2: null
	};
	let equipment =
		character && character.equipment ? { ...character.equipment } : { ...defaultEquipment };
	let _initialized = false;

	// subscribe to gameState once and initialize local equipment from it to avoid write loops
	let _unsub;
	onMount(() => {
		_unsub = gameState.subscribe((val) => {
			gs = val || {};
			character = gs.character || { name: 'Adventurer', class: 'ROGUE' };
			if (!_initialized) {
				equipment =
					character && character.equipment ? { ...character.equipment } : { ...defaultEquipment };
				_initialized = true;
			}
		});
	});
	onDestroy(() => {
		if (_unsub) _unsub();
	});
	function saveEquipment() {
		gameState.update((s) => ({
			...(s || {}),
			character: { ...(s.character || character), equipment: { ...equipment } }
		}));
	}

	function getAllowedWeaponsForClass(cls) {
		const lower = (cls || '').toString().toLowerCase();
		return weaponOptions.filter(
			(o) => o.allowed.includes('*') || (o.allowed && o.allowed.includes(lower))
		);
	}

	// Inventory helpers — if the character has an inventory array, use it to populate dropdowns.
	function getInventory() {
		return character && Array.isArray(character.inventory) ? character.inventory : [];
	}

	function isTwoHandedSelected() {
		return (
			(equipment.weapon1 && weaponOptions.find((w) => w.id === equipment.weapon1)?.twoHanded) ||
			(equipment.weapon2 && weaponOptions.find((w) => w.id === equipment.weapon2)?.twoHanded)
		);
	}

	function onWeaponChange(slot, value) {
		// set the slot
		equipment[slot] = value;

		// enforce two-handed occupation: if a two-handed weapon was selected in either slot, occupy both
		const w1 = weaponOptions.find((w) => w.id === equipment.weapon1);
		const w2 = weaponOptions.find((w) => w.id === equipment.weapon2);

		if (w1 && w1.twoHanded) {
			equipment.weapon2 = w1.id; // occupy both
		} else if (w2 && w2.twoHanded) {
			equipment.weapon1 = w2.id;
		} else {
			// if neither two-handed, allow defaults but enforce class dual-wield rules
			const cls = (character.class || '').toString().toLowerCase();
			// rogue allowed to dual-wield daggers (both dagger)
			if (equipment.weapon1 && equipment.weapon2) {
				// if both are weapons and class is not allowed to dual-wield, prevent weapon2 being an extra weapon
				const w1cat = weaponOptions.find((w) => w.id === equipment.weapon1)?.category;
				const w2cat = weaponOptions.find((w) => w.id === equipment.weapon2)?.category;
				if (w1cat === 'weapon' && w2cat === 'weapon') {
					if (cls === 'rogue') {
						// allow only if both daggers
						if (!(equipment.weapon1 === 'dagger' && equipment.weapon2 === 'dagger')) {
							equipment.weapon2 = 'none';
						}
					} else if (cls === 'warrior') {
						// warrior may equip weapon + shield; if both are weapons, disallow
						equipment.weapon2 =
							weaponOptions.find((w) => w.id === equipment.weapon2)?.category === 'shield'
								? equipment.weapon2
								: 'none';
					} else {
						// other classes: disallow dual weapon
						equipment.weapon2 = 'none';
					}
				}
			}
		}

		saveEquipment();
	}
</script>

<div class="equipment-panel" role="dialog" aria-modal="false">
	<header>
		<h3>Equipment</h3>
		<div class="subtitle">Class: {(character.class || '').toString().toUpperCase()}</div>
		<button class="close" aria-label="Close equipment" on:click={() => dispatch('close')}
			>&times;</button
		>
	</header>

	<div class="grid">
		<div class="slot">
			<label>Head</label>
			<select
				bind:value={equipment.head}
				on:change={(e) => {
					equipment.head = e.target.value || null;
					saveEquipment();
				}}
			>
				<option value="">None</option>
				{#each getInventory() as item (item.id)}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</div>

		<div class="slot">
			<label>Body</label>
			<select
				bind:value={equipment.body}
				on:change={(e) => {
					equipment.body = e.target.value || null;
					saveEquipment();
				}}
			>
				<option value="">None</option>
				{#each getInventory() as item (item.id)}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</div>

		<div class="slot">
			<label>Legs</label>
			<select
				bind:value={equipment.legs}
				on:change={(e) => {
					equipment.legs = e.target.value || null;
					saveEquipment();
				}}
			>
				<option value="">None</option>
				{#each getInventory() as item (item.id)}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</div>

		<div class="slot weapon">
			<label>Weapon Slot 1</label>
			<select
				bind:value={equipment.weapon1}
				on:change={(e) => onWeaponChange('weapon1', e.target.value)}
			>
				{#each getAllowedWeaponsForClass(character.class) as opt (opt.id)}
					<option value={opt.id}>{opt.name}</option>
				{/each}
				{#each getInventory().filter((i) => (i.category || i.type) === 'weapon') as item (item.id)}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</div>

		<div class="slot weapon">
			<label>Weapon Slot 2</label>
			<select
				bind:value={equipment.weapon2}
				on:change={(e) => onWeaponChange('weapon2', e.target.value)}
				disabled={isTwoHandedSelected()}
			>
				{#each getAllowedWeaponsForClass(character.class) as opt (opt.id)}
					<option value={opt.id}>{opt.name}</option>
				{/each}
				{#each getInventory().filter((i) => (i.category || i.type) === 'weapon') as item (item.id)}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
			{#if isTwoHandedSelected()}
				<div class="hint">Two-handed weapon occupies both slots</div>
			{/if}
		</div>

		<div class="slot">
			<label>Belt</label>
			<select
				bind:value={equipment.belt}
				on:change={(e) => {
					equipment.belt = e.target.value || null;
					saveEquipment();
				}}
			>
				<option value="">None</option>
				{#each getInventory() as item (item.id)}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</div>

		<div class="slot">
			<label>Necklace</label>
			<select
				bind:value={equipment.necklace}
				on:change={(e) => {
					equipment.necklace = e.target.value || null;
					saveEquipment();
				}}
			>
				<option value="">None</option>
				{#each getInventory() as item (item.id)}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</div>

		<div class="slot">
			<label>Ring 1</label>
			<select
				bind:value={equipment.ring1}
				on:change={(e) => {
					equipment.ring1 = e.target.value || null;
					saveEquipment();
				}}
			>
				<option value="">None</option>
				{#each getInventory() as item (item.id)}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</div>

		<div class="slot">
			<label>Ring 2</label>
			<select
				bind:value={equipment.ring2}
				on:change={(e) => {
					equipment.ring2 = e.target.value || null;
					saveEquipment();
				}}
			>
				<option value="">None</option>
				{#each getInventory() as item (item.id)}
					<option value={item.id}>{item.name}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="rules">
		<strong>Weapon rules</strong>
		<ul>
			<li>Warrior: weapon + shield or two-handed weapon</li>
			<li>Mage / Acolyte: two-handed staff only</li>
			<li>Archer: two-handed bow</li>
			<li>Rogue: can dual-wield daggers</li>
			<li>Other classes cannot equip two weapons unless allowed</li>
		</ul>
	</div>
</div>

<style>
	/* Centered floating panel to avoid covering the whole screen while staying prominent */
	.equipment-panel {
		position: fixed;
		top: 12vh;
		left: 50%;
		transform: translateX(-50%);
		width: min(720px, 92%);
		max-width: 720px;
		max-height: calc(100vh - 160px);
		overflow: hidden;
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		color: #e8f0ff;
		border-radius: 12px;
		padding: 0; /* header/body paddings handled inside */
		box-shadow:
			0 22px 60px rgba(2, 8, 23, 0.75),
			0 4px 12px rgba(13, 38, 76, 0.12);
		z-index: 1300;
		border-left: 6px solid rgba(58, 255, 94, 0.9); /* green accent for equipment */
		pointer-events: auto;
	}
	header {
		display: flex;
		align-items: center;
		gap: 12px;
		justify-content: space-between;
		padding: 14px 16px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	header .close {
		background: transparent;
		border: 0;
		color: rgba(255, 255, 255, 0.85);
		font-size: 18px;
		cursor: pointer;
		transition:
			transform 140ms ease,
			opacity 140ms ease;
	}
	header .close:hover {
		transform: scale(1.06);
		opacity: 0.95;
	}
	.subtitle {
		color: rgba(255, 255, 255, 0.7);
		font-size: 13px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		margin: 12px;
	}
	.slot {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.slot label {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.9);
	}
	.slot input,
	.slot select {
		width: 100%;
		box-sizing: border-box;
		padding: 8px 10px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.06);
		background: rgba(255, 255, 255, 0.03);
		color: inherit;
	}
	.slot.weapon {
		grid-column: span 1;
	}
	.hint {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
		margin-top: 6px;
	}
	.rules {
		margin: 12px;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.82);
	}
	.rules ul {
		margin: 6px 0 0 18px;
	}

	/* Responsive: smaller screens use 2 columns, narrow screens use 1 */
	@media (max-width: 900px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (max-width: 520px) {
		.grid {
			grid-template-columns: 1fr;
		}
		.equipment-panel {
			top: 6vh;
			width: 96%;
			transform: translateX(-50%);
		}
	}
</style>
