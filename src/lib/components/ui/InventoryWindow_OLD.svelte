<script>
	import { gameState } from '$lib/stores/gameState';
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';

	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	// pagination / tab state
	let currentPage = 'quest';

	let gs = get(gameState) || {};
	let character = gs.character || {};
	// reactive subscription to keep in sync
	const unsub = gameState.subscribe((v) => {
		gs = v || {};
		character = gs.character || {};
	});

	// items: expect array of { id, name, category, qty, description, type }
	function inventoryList() {
		return Array.isArray(character.inventory) ? character.inventory : [];
	}

	// group into requested buckets
	function groupItems(items) {
		const groups = { quest: [], equipment: [], consumable: [], others: [] };
		for (const it of items) {
			const cat = (it.category || it.type || '').toString().toLowerCase();
			if (cat === 'quest' || cat === 'questitem' || cat === 'quest_item') groups.quest.push(it);
			else if (
				cat === 'equipment' ||
				cat === 'equip' ||
				cat === 'weapon' ||
				cat === 'armor' ||
				cat === 'head' ||
				cat === 'body' ||
				cat === 'legs'
			)
				groups.equipment.push(it);
			else if (cat === 'consumable' || cat === 'potion' || cat === 'food')
				groups.consumable.push(it);
			else groups.others.push(it);
		}
		return groups;
	}

	// reactive groups will be computed below from the real inventory

	// tooltip state for item description
	let tipVisible = false;
	let tipText = '';
	let tipLeft = 0;
	let tipTop = 0;
	// reactive groups so markup can reference it
	$: groups = groupItems(character.inventory || []);

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

	function saveStateWithInventory(newInv, newEquipment, extraPlayerDataChanges) {
		gameState.update((s) => {
			const base = s || {};
			const next = { ...base };
			next.character = {
				...(base.character || {}),
				...(newEquipment ? { equipment: newEquipment } : {}),
				inventory: Array.isArray(newInv) ? newInv : base.character ? base.character.inventory : []
			};
			if (extraPlayerDataChanges) {
				next.playerData = { ...(base.playerData || {}), ...extraPlayerDataChanges };
			}
			return next;
		});
	}

	function useItem(item) {
		if (!item || !(item.qty > 0)) return;
		const inv = inventoryList().map((i) => ({ ...i }));
		const idx = inv.findIndex((i) => i.id === item.id);
		if (idx === -1) return;
		// decrement
		inv[idx].qty = (inv[idx].qty || 1) - 1;
		if (inv[idx].qty <= 0) inv.splice(idx, 1);

		// prepare player changes based on item.effect (simple schema: { hp, sp, stamina, gold })
		const eff = item.effect || {};
		// compute new playerData caps inside saveState
		gameState.update((s) => {
			const base = s || {};
			const next = { ...base };
			next.character = { ...(base.character || {}), inventory: inv };
			next.playerData = { ...(base.playerData || {}) };
			if (eff.hp) {
				next.playerData.hp = Math.min(
					next.playerData.maxHp || next.playerData.hp || 0,
					(next.playerData.hp || 0) + eff.hp
				);
			}
			if (eff.sp) {
				next.playerData.sp = Math.min(
					next.playerData.maxSp || next.playerData.sp || 0,
					(next.playerData.sp || 0) + eff.sp
				);
			}
			if (eff.stamina) {
				next.playerData.stamina = Math.min(
					next.playerData.maxStamina || next.playerData.stamina || 0,
					(next.playerData.stamina || 0) + eff.stamina
				);
			}
			if (eff.gold) {
				next.playerData.gold = (next.playerData.gold || 0) + eff.gold;
			}
			return next;
		});
	}

	function equipItem(item) {
		if (!item) return;
		const cls = (character.class || '').toString().toLowerCase();
		const invEquip = { ...(character.equipment || defaultEquipment) };

		const cat = (item.category || item.type || '').toString().toLowerCase();

		// simple mapping
		if (cat === 'weapon') {
			// try weapon1 then weapon2 (respecting two-handed naive behavior)
			if (!invEquip.weapon1 || invEquip.weapon1 === 'none') invEquip.weapon1 = item.id;
			else if (!invEquip.weapon2 || invEquip.weapon2 === 'none') {
				// allow rogue dual-wield daggers only if both daggers
				if (cls === 'rogue') invEquip.weapon2 = item.id;
				else invEquip.weapon1 = item.id; // overwrite primary
			} else invEquip.weapon1 = item.id;
		} else if (cat === 'head') invEquip.head = item.id;
		else if (cat === 'body') invEquip.body = item.id;
		else if (cat === 'legs') invEquip.legs = item.id;
		else if (cat === 'belt') invEquip.belt = item.id;
		else if (cat === 'necklace' || cat === 'amulet') invEquip.necklace = item.id;
		else if (cat === 'ring') {
			if (!invEquip.ring1) invEquip.ring1 = item.id;
			else if (!invEquip.ring2) invEquip.ring2 = item.id;
			else invEquip.ring1 = item.id;
		} else {
			// fallback: try to place into first empty non-weapon slot
			for (const s of ['head', 'body', 'legs', 'belt', 'necklace', 'ring1', 'ring2']) {
				if (!invEquip[s] || invEquip[s] === null) {
					invEquip[s] = item.id;
					break;
				}
			}
		}

		// persist equipment (do not remove from inventory when equipping)
		saveStateWithInventory(inventoryList(), invEquip, null);
	}

	function showTip(e, item) {
		tipText = item.description || item.desc || item.tooltip || '(no description)';
		// position relative to viewport for a stable tooltip
		tipLeft = e.clientX + 12;
		tipTop = e.clientY + 12;
		tipVisible = true;
	}

	function hideTip() {
		tipVisible = false;
	}

	onMount(() => {
		return () => {
			if (unsub) unsub();
		};
	});
</script>

<div class="inventory-panel" role="dialog" aria-modal="false">
	<header>
		<h3>Inventory</h3>
		<div class="header-actions">
			<button class="close" aria-label="Close" on:click={() => dispatch('close')}>&times;</button>
		</div>
	</header>

	<!-- Page tabs: each type gets its own page -->
	<nav class="inventory-tabs" role="tablist">
		<button
			role="tab"
			aria-selected={currentPage === 'quest'}
			class:active={currentPage === 'quest'}
			on:click={() => (currentPage = 'quest')}>Quest ({groups.quest.length})</button
		>
		<button
			role="tab"
			aria-selected={currentPage === 'equipment'}
			class:active={currentPage === 'equipment'}
			on:click={() => (currentPage = 'equipment')}>Equipments ({groups.equipment.length})</button
		>
		<button
			role="tab"
			aria-selected={currentPage === 'consumable'}
			class:active={currentPage === 'consumable'}
			on:click={() => (currentPage = 'consumable')}>Consumables ({groups.consumable.length})</button
		>
		<button
			role="tab"
			aria-selected={currentPage === 'others'}
			class:active={currentPage === 'others'}
			on:click={() => (currentPage = 'others')}>Others ({groups.others.length})</button
		>
	</nav>

	<div class="page-container">
		{#if currentPage === 'quest'}
			<div class="page">
				<h4>Quest Items</h4>
				{#if groups.quest.length === 0}
					<div class="empty-row">No quest items.</div>
				{:else}
					<div class="list">
						{#each groups.quest as item (item.id)}
							<div
								class="item"
								on:mouseenter={(e) => showTip(e, item)}
								on:mousemove={(e) => showTip(e, item)}
								on:mouseleave={hideTip}
							>
								<div class="item-name">{item.name}</div>
								<div class="item-qty">{item.qty || 1}</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		{#if currentPage === 'equipment'}
			<div class="page">
				<h4>Equipments</h4>
				{#if groups.equipment.length === 0}
					<div class="empty-row">No equipment items.</div>
				{:else}
					<div class="list">
						{#each groups.equipment as item (item.id)}
							<div
								class="item"
								on:mouseenter={(e) => showTip(e, item)}
								on:mousemove={(e) => showTip(e, item)}
								on:mouseleave={hideTip}
							>
								<div class="item-name">{item.name}</div>
								<div class="item-qty">{item.qty || 1}</div>
								<div class="item-actions">
									<button class="btn-small" on:click={() => equipItem(item)}>Equip</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		{#if currentPage === 'consumable'}
			<div class="page">
				<h4>Consumables</h4>
				{#if groups.consumable.length === 0}
					<div class="empty-row">No consumables.</div>
				{:else}
					<div class="list">
						{#each groups.consumable as item (item.id)}
							<div
								class="item"
								on:mouseenter={(e) => showTip(e, item)}
								on:mousemove={(e) => showTip(e, item)}
								on:mouseleave={hideTip}
							>
								<div class="item-name">{item.name}</div>
								<div class="item-qty">{item.qty || 1}</div>
								<div class="item-actions">
									<button class="btn-small" on:click={() => useItem(item)}>Use</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		{#if currentPage === 'others'}
			<div class="page">
				<h4>Others</h4>
				{#if groups.others.length === 0}
					<div class="empty-row">No other items.</div>
				{:else}
					<div class="list">
						{#each groups.others as item (item.id)}
							<div
								class="item"
								on:mouseenter={(e) => showTip(e, item)}
								on:mousemove={(e) => showTip(e, item)}
								on:mouseleave={hideTip}
							>
								<div class="item-name">{item.name}</div>
								<div class="item-qty">{item.qty || 1}</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if tipVisible}
		<div class="item-tip" style="left:{tipLeft}px; top:{tipTop}px">{tipText}</div>
	{/if}
</div>

<style>
	.inventory-panel {
		position: fixed;
		top: 10vh;
		left: 50%;
		transform: translateX(-50%);
		width: min(760px, 96%);
		max-height: calc(100vh - 120px);
		overflow: hidden;
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		color: #e8f0ff;
		padding: 0;
		border-radius: 12px;
		box-shadow:
			0 22px 60px rgba(2, 8, 23, 0.75),
			0 4px 12px rgba(13, 38, 76, 0.12);
		z-index: 1400;
		border-left: 6px solid rgba(0, 186, 255, 0.9); /* cyan accent for inventory */
		pointer-events: auto;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	header h3 {
		margin: 0;
	}
	.header-actions {
		display: flex;
		gap: 8px;
		align-items: center;
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
	.section {
		margin-top: 12px;
	}
	.section h4 {
		margin: 8px 0;
		color: rgba(255, 255, 255, 0.9);
	}
	.list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 8px;
	}
	.item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.02);
		cursor: default;
	}
	.item:hover {
		background: rgba(255, 255, 255, 0.04);
	}
	.item-name {
		font-size: 14px;
	}
	.item-qty {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.8);
	}
	.item-actions {
		margin-left: 8px;
	}
	.btn-small {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: inherit;
		padding: 6px 8px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 13px;
	}
	.empty {
		padding: 18px;
		color: rgba(255, 255, 255, 0.6);
	}
	.empty-row {
		padding: 8px;
		color: rgba(255, 255, 255, 0.6);
	}
	.item-tip {
		position: fixed;
		max-width: 320px;
		background: rgba(0, 0, 0, 0.88);
		color: #fff;
		padding: 8px 10px;
		border-radius: 8px;
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
		z-index: 1600;
		font-size: 13px;
	}
	/* demo-note removed (no demo items) */
	.inventory-tabs {
		display: flex;
		gap: 8px;
		margin: 12px 0;
	}
	.inventory-tabs button {
		background: rgba(255, 255, 255, 0.03);
		color: inherit;
		border: 1px solid rgba(255, 255, 255, 0.04);
		padding: 8px 12px;
		border-radius: 8px;
		cursor: pointer;
	}
	.inventory-tabs button.active {
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
		box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.02);
	}
	.page-container {
		margin-top: 8px;
	}
	.page-container {
		padding: 12px;
	}
	.page h4 {
		margin: 6px 0 12px 0;
	}

	@media (max-width: 640px) {
		.list {
			grid-template-columns: repeat(2, 1fr);
		}
		.inventory-panel {
			top: 6vh;
		}
	}
</style>
