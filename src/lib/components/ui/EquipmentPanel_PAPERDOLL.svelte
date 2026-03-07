<script>
	import { gameState } from '$lib/stores/gameState';
	import { get } from 'svelte/store';

	// weapon items
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
		equipment[slot] = value;

		const w1 = weaponOptions.find((w) => w.id === equipment.weapon1);
		const w2 = weaponOptions.find((w) => w.id === equipment.weapon2);

		if (w1 && w1.twoHanded) {
			equipment.weapon2 = w1.id;
		} else if (w2 && w2.twoHanded) {
			equipment.weapon1 = w2.id;
		} else {
			const cls = (character.class || '').toString().toLowerCase();
			if (equipment.weapon1 && equipment.weapon2) {
				const w1cat = weaponOptions.find((w) => w.id === equipment.weapon1)?.category;
				const w2cat = weaponOptions.find((w) => w.id === equipment.weapon2)?.category;
				if (w1cat === 'weapon' && w2cat === 'weapon') {
					if (cls === 'rogue') {
						if (!(equipment.weapon1 === 'dagger' && equipment.weapon2 === 'dagger')) {
							equipment.weapon2 = 'none';
						}
					} else if (cls === 'warrior') {
						equipment.weapon2 =
							weaponOptions.find((w) => w.id === equipment.weapon2)?.category === 'shield'
								? equipment.weapon2
								: 'none';
					} else {
						equipment.weapon2 = 'none';
					}
				}
			}
		}

		saveEquipment();
	}

	function getEquippedItemName(slotId) {
		const value = equipment[slotId];
		if (!value || value === 'none') return null;

		const weapon = weaponOptions.find((w) => w.id === value);
		if (weapon) return weapon.name;

		const invItem = getInventory().find((i) => i.id === value);
		return invItem ? invItem.name : value;
	}

	let showChangeModal = false;
	let activeSlot = null;

	function openChangeModal(slotId) {
		activeSlot = slotId;
		showChangeModal = true;
	}

	function selectItem(slotId, itemId) {
		if (slotId.startsWith('weapon')) {
			onWeaponChange(slotId, itemId);
		} else {
			equipment[slotId] = itemId || null;
			saveEquipment();
		}
		showChangeModal = false;
		activeSlot = null;
	}

	function getAvailableItemsForSlot(slotId) {
		if (slotId === 'weapon1' || slotId === 'weapon2') {
			const allowed = getAllowedWeaponsForClass(character.class);
			const invWeapons = getInventory().filter((i) => (i.category || i.type) === 'weapon');
			return [...allowed, ...invWeapons];
		}
		return [{ id: '', name: 'None' }, ...getInventory()];
	}

	function getSlotDisplayName(slotId) {
		const names = {
			head: 'Head',
			body: 'Body',
			legs: 'Legs',
			weapon1: 'Main Hand',
			weapon2: 'Off Hand',
			belt: 'Belt',
			necklace: 'Necklace',
			ring1: 'Ring 1',
			ring2: 'Ring 2'
		};
		return names[slotId] || slotId;
	}
</script>

<div class="equipment-panel" role="dialog" aria-modal="false">
	<header>
		<div class="header-left">
			<h3>Equipment</h3>
			<div class="subtitle">{(character.class || '').toString().toUpperCase()}</div>
		</div>
		<button class="close" aria-label="Close equipment" on:click={() => dispatch('close')}>✕</button>
	</header>

	<div class="paper-doll-container">
		<!-- Character Silhouette with overlaid equipment slots -->
		<div class="doll-figure">
			<!-- Central character silhouette -->
			<div class="character-silhouette">
				<div class="character-body">🧍</div>
			</div>

			<!-- Head slot - positioned above silhouette -->
			<button class="equip-slot head-slot" on:click={() => openChangeModal('head')}>
				<div class="slot-icon">👑</div>
				<div class="slot-content">
					{#if equipment.head}
						<div class="slot-name">{getEquippedItemName('head')}</div>
					{:else}
						<div class="slot-empty">Head</div>
					{/if}
				</div>
			</button>

			<!-- Necklace slot - positioned at neck -->
			<button class="equip-slot necklace-slot" on:click={() => openChangeModal('necklace')}>
				<div class="slot-icon">📿</div>
				<div class="slot-content">
					{#if equipment.necklace}
						<div class="slot-name">{getEquippedItemName('necklace')}</div>
					{:else}
						<div class="slot-empty">Neck</div>
					{/if}
				</div>
			</button>

			<!-- Body slot - positioned at chest -->
			<button class="equip-slot body-slot" on:click={() => openChangeModal('body')}>
				<div class="slot-icon">🛡️</div>
				<div class="slot-content">
					{#if equipment.body}
						<div class="slot-name">{getEquippedItemName('body')}</div>
					{:else}
						<div class="slot-empty">Body</div>
					{/if}
				</div>
			</button>

			<!-- Left weapon (Main Hand) - positioned left side -->
			<button
				class="equip-slot weapon-left-slot {isTwoHandedSelected() ? 'two-handed' : ''}"
				on:click={() => openChangeModal('weapon1')}
			>
				<div class="slot-icon">⚔️</div>
				<div class="slot-content">
					{#if equipment.weapon1 && equipment.weapon1 !== 'none'}
						<div class="slot-name">{getEquippedItemName('weapon1')}</div>
						{#if isTwoHandedSelected()}
							<div class="badge-2h">2H</div>
						{/if}
					{:else}
						<div class="slot-empty">Main</div>
					{/if}
				</div>
			</button>

			<!-- Right weapon (Off Hand) - positioned right side -->
			<button
				class="equip-slot weapon-right-slot {isTwoHandedSelected() ? 'disabled' : ''}"
				on:click={() => openChangeModal('weapon2')}
				disabled={isTwoHandedSelected()}
			>
				<div class="slot-icon">🗡️</div>
				<div class="slot-content">
					{#if isTwoHandedSelected()}
						<div class="slot-empty">--</div>
					{:else if equipment.weapon2 && equipment.weapon2 !== 'none'}
						<div class="slot-name">{getEquippedItemName('weapon2')}</div>
					{:else}
						<div class="slot-empty">Off</div>
					{/if}
				</div>
			</button>

			<!-- Belt slot - positioned at waist -->
			<button class="equip-slot belt-slot" on:click={() => openChangeModal('belt')}>
				<div class="slot-icon">📿</div>
				<div class="slot-content">
					{#if equipment.belt}
						<div class="slot-name">{getEquippedItemName('belt')}</div>
					{:else}
						<div class="slot-empty">Belt</div>
					{/if}
				</div>
			</button>

			<!-- Legs slot - positioned at legs -->
			<button class="equip-slot legs-slot" on:click={() => openChangeModal('legs')}>
				<div class="slot-icon">👖</div>
				<div class="slot-content">
					{#if equipment.legs}
						<div class="slot-name">{getEquippedItemName('legs')}</div>
					{:else}
						<div class="slot-empty">Legs</div>
					{/if}
				</div>
			</button>

			<!-- Ring 1 - positioned left bottom -->
			<button class="equip-slot ring1-slot" on:click={() => openChangeModal('ring1')}>
				<div class="slot-icon">💍</div>
				<div class="slot-content">
					{#if equipment.ring1}
						<div class="slot-name">{getEquippedItemName('ring1')}</div>
					{:else}
						<div class="slot-empty">Ring</div>
					{/if}
				</div>
			</button>

			<!-- Ring 2 - positioned right bottom -->
			<button class="equip-slot ring2-slot" on:click={() => openChangeModal('ring2')}>
				<div class="slot-icon">💍</div>
				<div class="slot-content">
					{#if equipment.ring2}
						<div class="slot-name">{getEquippedItemName('ring2')}</div>
					{:else}
						<div class="slot-empty">Ring</div>
					{/if}
				</div>
			</button>
		</div>
	</div>
</div>

{#if showChangeModal && activeSlot}
	<div
		class="modal-backdrop"
		on:click={() => {
			showChangeModal = false;
			activeSlot = null;
		}}
	>
		<div class="modal-content" on:click|stopPropagation>
			<div class="modal-header">
				<h4>Change {getSlotDisplayName(activeSlot)}</h4>
				<button
					class="close"
					on:click={() => {
						showChangeModal = false;
						activeSlot = null;
					}}>✕</button
				>
			</div>
			<div class="modal-body">
				<div class="items-list">
					{#each getAvailableItemsForSlot(activeSlot) as item (item.id)}
						<button
							class="item-option {equipment[activeSlot] === item.id ? 'selected' : ''}"
							on:click={() => selectItem(activeSlot, item.id)}
						>
							<span class="item-name">{item.name}</span>
							{#if equipment[activeSlot] === item.id}
								<span class="checkmark">✓</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.equipment-panel {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 8vh;
		bottom: 8vh;
		width: min(700px, 96%);
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		color: #e8f0ff;
		border-radius: 12px;
		padding: 0;
		box-shadow:
			0 22px 60px rgba(2, 8, 23, 0.75),
			0 4px 12px rgba(13, 38, 76, 0.12);
		z-index: 1300;
		border-left: 6px solid rgba(58, 255, 94, 0.9);
		pointer-events: auto;
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
		flex-shrink: 0;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	header h3 {
		margin: 0;
		font-size: 18px;
	}

	.subtitle {
		color: rgba(255, 255, 255, 0.65);
		font-size: 13px;
		font-weight: 500;
		padding: 4px 10px;
		background: rgba(58, 255, 94, 0.1);
		border-radius: 4px;
		border: 1px solid rgba(58, 255, 94, 0.2);
	}

	.close {
		background: transparent;
		border: 0;
		color: rgba(255, 255, 255, 0.85);
		font-size: 20px;
		cursor: pointer;
		transition: all 0.2s;
		line-height: 1;
	}

	.close:hover {
		transform: scale(1.06);
		opacity: 0.95;
	}

	.paper-doll-container {
		flex: 1;
		overflow-y: auto;
		padding: 30px 20px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.doll-figure {
		position: relative;
		width: 420px;
		height: 520px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.character-silhouette {
		position: absolute;
		width: 180px;
		height: 340px;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: linear-gradient(180deg, rgba(58, 255, 94, 0.08) 0%, rgba(58, 255, 94, 0.03) 100%);
		border: 2px solid rgba(58, 255, 94, 0.15);
		border-radius: 90px 90px 20px 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}

	.character-body {
		font-size: 120px;
		filter: grayscale(1) brightness(0.6);
		opacity: 0.5;
	}

	/* Equipment slot positioning */
	.equip-slot {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 10px 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.12);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		z-index: 2;
		min-width: 90px;
		color: rgba(255, 255, 255, 0.9);
	}

	.equip-slot:hover:not(:disabled) {
		background: rgba(58, 255, 94, 0.12);
		border-color: rgba(58, 255, 94, 0.4);
		transform: scale(1.05);
	}

	.equip-slot.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.equip-slot.two-handed {
		background: rgba(255, 193, 7, 0.1);
		border-color: rgba(255, 193, 7, 0.4);
	}

	.slot-icon {
		font-size: 28px;
	}

	.slot-content {
		text-align: center;
	}

	.slot-name {
		font-size: 11px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.95);
		text-align: center;
		word-wrap: break-word;
		max-width: 80px;
	}

	.slot-empty {
		font-size: 10px;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	.badge-2h {
		display: inline-block;
		padding: 2px 6px;
		background: rgba(255, 193, 7, 0.2);
		border: 1px solid rgba(255, 193, 7, 0.4);
		border-radius: 3px;
		font-size: 9px;
		font-weight: 700;
		color: #ffc107;
		margin-top: 2px;
	}

	/* Specific slot positions */
	.head-slot {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	.necklace-slot {
		top: 90px;
		left: 50%;
		transform: translateX(-50%);
	}

	.body-slot {
		top: 160px;
		left: 50%;
		transform: translateX(-50%);
	}

	.weapon-left-slot {
		top: 140px;
		left: 20px;
	}

	.weapon-right-slot {
		top: 140px;
		right: 20px;
	}

	.belt-slot {
		top: 280px;
		left: 50%;
		transform: translateX(-50%);
	}

	.legs-slot {
		top: 360px;
		left: 50%;
		transform: translateX(-50%);
	}

	.ring1-slot {
		bottom: 20px;
		left: 80px;
	}

	.ring2-slot {
		bottom: 20px;
		right: 80px;
	}

	/* Modal Styles */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		z-index: 1400;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-content {
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		border-radius: 12px;
		width: min(480px, 90%);
		max-height: 70vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 22px 60px rgba(2, 8, 23, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.modal-header h4 {
		margin: 0;
		font-size: 16px;
		color: rgba(255, 255, 255, 0.95);
	}

	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
	}

	.items-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.item-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.9);
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		width: 100%;
	}

	.item-option:hover {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.15);
	}

	.item-option.selected {
		background: rgba(58, 255, 94, 0.12);
		border-color: rgba(58, 255, 94, 0.4);
		color: #3aff5e;
	}

	.checkmark {
		font-size: 18px;
		font-weight: bold;
	}

	/* Custom scrollbar */
	.paper-doll-container::-webkit-scrollbar,
	.modal-body::-webkit-scrollbar {
		width: 8px;
	}

	.paper-doll-container::-webkit-scrollbar-track,
	.modal-body::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	.paper-doll-container::-webkit-scrollbar-thumb,
	.modal-body::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	.paper-doll-container::-webkit-scrollbar-thumb:hover,
	.modal-body::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.equipment-panel {
			width: 98%;
		}

		.doll-figure {
			transform: scale(0.85);
		}
	}

	@media (max-width: 520px) {
		.doll-figure {
			transform: scale(0.7);
		}
	}
</style>
