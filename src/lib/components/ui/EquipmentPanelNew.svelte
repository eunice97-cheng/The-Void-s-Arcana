<script>
	// @ts-nocheck
	import { gameState, recalculateDerivedStats } from '$lib/stores/gameState';
	import { saveManager } from '$lib/stores/saveManager';
	import { calculateDerived } from '$lib/utils/stats';
	import { canEquipInSlot, isWeapon, parseItemId, migrateEquipmentToIds } from '$lib/utils/items';
	import itemDatabase from '$lib/data/items.json';
	import AdvancedStatsWindow from './AdvancedStatsWindow.svelte';
	import { createEventDispatcher, tick, onMount } from 'svelte';

	// Advanced stats toggle
	let showAdvancedStats = false;

	// Item hover tooltip
	let showItemTooltip = false;
	let hoveredItem = null;
	let tooltipPosition = { x: 0, y: 0 };

	const dispatch = createEventDispatcher();

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

	// Use reactive store references directly for better reactivity
	$: character = $gameState?.character || { name: 'Adventurer', class: 'ROGUE' };
	$: equipment = migrateEquipmentToIds(
		$gameState?.character?.equipment || { ...defaultEquipment },
		itemDatabase
	);
	$: inventory = $gameState?.character?.inventory || [];
	$: stats = $gameState?.character?.stats || {};
	$: characterClass = $gameState?.character?.class;
	$: level = $gameState?.playerData?.level || 1;
	$: playerData = $gameState?.playerData || { level: 1 };
	$: gender = $gameState?.character?.gender || 'male';

	// Check if Sierra (Mount) is unlocked
	$: isSierraUnlocked = ($gameState?.character?.clearedScenes || []).includes('Scene108');

	// Reactive check for weapon + shield combination
	$: isWeaponShield =
		equipment.weapon1 &&
		equipment.weapon1 !== 'none' &&
		equipment.weapon2 &&
		equipment.weapon2 !== 'none' &&
		!isTwoHandedSelected() &&
		(() => {
			const w1 = equipment.weapon1;
			const w2 = equipment.weapon2;
			const w1cat = parseItemId(typeof w1 === 'string' ? w1 : w1?.id)?.category;
			const w2cat = parseItemId(typeof w2 === 'string' ? w2 : w2?.id)?.category;
			return w1cat >= 11 && w1cat <= 17 && w2cat === 18;
		})();

	// Migrate equipment on component mount
	onMount(() => {
		const originalEquipment = $gameState?.character?.equipment;
		if (originalEquipment) {
			const migrated = migrateEquipmentToIds(originalEquipment, itemDatabase);
			const hasChanges = JSON.stringify(originalEquipment) !== JSON.stringify(migrated);

			if (hasChanges) {
				console.log('[EQUIPMENT MIGRATION] Migrating old equipment to ID-based system');
				gameState.update((s) => ({
					...(s || {}),
					character: { ...(s.character || {}), equipment: migrated }
				}));
			}
		}
	});

	function saveEquipment(newEquipment) {
		gameState.update((s) => ({
			...(s || {}),
			character: { ...(s.character || {}), equipment: { ...newEquipment } }
		}));
		recalculateDerivedStats();

		// Autosave after equipping
		try {
			saveManager.saveGame({ auto: true });
		} catch (e) {
			console.warn('Auto-save after equipment change failed:', e);
		}
	}

	// Calculate derived stats reactively - will update when equipment, stats, class, or level changes
	$: derivedStats = calculateDerived(stats, characterClass, level, equipment, {
		skills: character?.skills || []
	});

	// Calculate base stats (without equipment) for comparison
	$: baseStats = calculateDerived(
		stats,
		characterClass,
		level,
		{},
		{ skills: character?.skills || [] }
	);

	// Reactive available items for each slot
	// Make availableItems reactive to both inventory and equipment changes
	$: availableItems = (inventory, equipment) && {
		weapon1: getAvailableItemsForSlot('weapon1'),
		weapon2: getAvailableItemsForSlot('weapon2'),
		head: getAvailableItemsForSlot('head'),
		body: getAvailableItemsForSlot('body'),
		legs: getAvailableItemsForSlot('legs'),
		belt: getAvailableItemsForSlot('belt'),
		necklace: getAvailableItemsForSlot('necklace'),
		ring1: getAvailableItemsForSlot('ring1'),
		ring2: getAvailableItemsForSlot('ring2')
	};

	// Check if character meets equipment requirements
	function canEquipItem(item) {
		if (!item || !item.requirements) return true; // No requirements means anyone can equip
		const reqs = item.requirements;

		// Check level requirement
		if (reqs.level && level < reqs.level) return false;

		// Check stat requirements
		if (reqs.str && (stats.str || 0) < reqs.str) return false;
		if (reqs.dex && (stats.dex || 0) < reqs.dex) return false;
		if (reqs.int && (stats.int || 0) < reqs.int) return false;
		if (reqs.wis && (stats.wis || 0) < reqs.wis) return false;
		if (reqs.cha && (stats.cha || 0) < reqs.cha) return false;

		return true;
	}

	function getAvailableItemsForSlot(slotId) {
		const allItems = inventory.filter((item) => item && item.id);

		if (slotId.startsWith('weapon')) {
			const weapons = allItems.filter((item) => {
				if (!canEquipInSlot(item.id, slotId) || !canEquipItem(item)) {
					return false;
				}
				return true;
			});
			return [{ id: 'none', name: 'None', twoHanded: false, category: 'none' }, ...weapons];
		}

		// For armor slots, filter by slot compatibility
		const armorItems = allItems.filter((item) => {
			return canEquipInSlot(item.id, slotId) && canEquipItem(item);
		});

		return [{ id: '', name: 'None' }, ...armorItems];
	}

	function getEquippedItemName(slotId) {
		const item = equipment[slotId];
		if (!item || item === 'none') return 'None';

		// Handle both ID strings and full item objects
		if (typeof item === 'string') {
			const found = inventory.find((i) => i.id === item);
			return found ? found.name : 'Unknown Item';
		} else if (item.name) {
			return item.name;
		}

		return 'Unknown Item';
	}

	function getEquippedItemIcon(slotId) {
		const item = equipment[slotId];
		if (!item || item === 'none') return null;

		// Handle both ID strings and full item objects
		if (typeof item === 'string') {
			const found = inventory.find((i) => i.id === item);
			return found ? found.icon : null;
		} else if (item.icon) {
			return item.icon;
		}

		return null;
	}

	function isItemEquipped(slotId, item) {
		const equipped = equipment[slotId];
		if (!equipped || equipped === 'none') return false;

		// If equipped is an object, compare by id
		if (typeof equipped === 'object' && equipped.id) {
			return equipped.id === item.id;
		}

		// Fallback for old ID-based system
		return equipped === item.id;
	}

	function openChangeModal(slotId) {
		showChangeModal = true;
		activeSlot = slotId;
	}

	function onItemHover(event, slotId) {
		const item = equipment[slotId];
		if (item && item !== 'none') {
			hoveredItem = item;
			showItemTooltip = true;

			// Position tooltip near the hovered element
			const rect = event.currentTarget.getBoundingClientRect();
			const tooltipWidth = 300; // Approximate width
			const tooltipHeight = 200; // Approximate height

			let x = rect.left + rect.width / 2 - tooltipWidth / 2;
			let y = rect.bottom + 8;

			// Adjust if tooltip would go off screen
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			if (x + tooltipWidth > viewportWidth) {
				x = viewportWidth - tooltipWidth - 8;
			}
			if (x < 8) {
				x = 8;
			}
			if (y + tooltipHeight > viewportHeight) {
				y = rect.top - tooltipHeight - 8;
			}

			tooltipPosition = { x, y };
		}
	}

	function onItemLeave() {
		showItemTooltip = false;
		hoveredItem = null;
	}

	let showChangeModal = false;
	let activeSlot = null;
	let modalItems = [];

	// Create a reactive list of items with their equipped state baked in
	$: modalItems =
		activeSlot && availableItems[activeSlot]
			? availableItems[activeSlot].map((item) => ({
					...item,
					equipped: isItemEquipped(activeSlot, item)
				}))
			: [];

	function selectItem(slotId, itemId) {
		// Check if clicking on already equipped item to unequip it
		const currentlyEquipped = equipment[slotId];
		const isCurrentlyEquipped =
			currentlyEquipped && currentlyEquipped !== 'none' && currentlyEquipped.id === itemId;

		console.log('[selectItem]', { slotId, itemId, currentlyEquipped, isCurrentlyEquipped });

		if (isCurrentlyEquipped) {
			// Unequip the item
			console.log('[selectItem] Unequipping');
			if (slotId.startsWith('weapon')) {
				onWeaponChange(slotId, 'none');
			} else {
				const newEquipment = { ...equipment };
				newEquipment[slotId] = null;
				saveEquipment(newEquipment);
			}
		} else if (itemId && itemId !== 'none' && itemId !== '') {
			// Equip the item
			console.log('[selectItem] Equipping new item');
			const item = inventory.find((i) => i.id === itemId);
			if (item) {
				if (slotId.startsWith('weapon')) {
					onWeaponChange(slotId, item);
				} else {
					const newEquipment = { ...equipment };
					newEquipment[slotId] = item;
					saveEquipment(newEquipment);
				}
			}
		} else {
			// Unequipping (selecting "None")
			console.log('[EQUIPMENT] Unequipping (selecting None)');
			if (slotId.startsWith('weapon')) {
				onWeaponChange(slotId, 'none');
			} else {
				const newEquipment = { ...equipment };
				newEquipment[slotId] = null;
				saveEquipment(newEquipment);
			}
		}
	}

	function isTwoHandedSelected() {
		const w1 =
			equipment.weapon1 && equipment.weapon1 !== 'none'
				? typeof equipment.weapon1 === 'object'
					? equipment.weapon1
					: inventory.find((i) => i.id === equipment.weapon1)
				: null;
		const w2 =
			equipment.weapon2 && equipment.weapon2 !== 'none'
				? typeof equipment.weapon2 === 'object'
					? equipment.weapon2
					: inventory.find((i) => i.id === equipment.weapon2)
				: null;

		return (
			(w1 && (w1.weaponType || '').toLowerCase().includes('two')) ||
			(w2 && (w2.weaponType || '').toLowerCase().includes('two'))
		);
	}

	function onWeaponChange(slot, value) {
		// Check if currently a two-handed weapon is equipped in either slot
		const currentWeapon1 =
			equipment.weapon1 && equipment.weapon1 !== 'none' ? equipment.weapon1 : null;
		const currentWeapon2 =
			equipment.weapon2 && equipment.weapon2 !== 'none' ? equipment.weapon2 : null;
		const currentlyHasTwoHanded =
			(currentWeapon1 && (currentWeapon1.weaponType || '').toLowerCase().includes('two')) ||
			(currentWeapon2 && (currentWeapon2.weaponType || '').toLowerCase().includes('two'));

		// Check if we're trying to equip a two-handed weapon
		const newWeapon = value && value !== 'none' ? value : null;
		const newIsTwoHanded = newWeapon && (newWeapon.weaponType || '').toLowerCase().includes('two');

		// Check if we're unequipping (selecting "None")
		const isUnequipping = value === 'none' || value === null;

		// If unequipping and a two-handed weapon is currently equipped, clear both slots
		if (isUnequipping && currentlyHasTwoHanded) {
			const newEquipment = {
				...equipment,
				weapon1: 'none',
				weapon2: 'none'
			};
			saveEquipment(newEquipment);
			return;
		}

		// If equipping a two-handed weapon, clear both slots first, then equip to both
		if (newIsTwoHanded) {
			const newEquipment = {
				...equipment,
				weapon1: value,
				weapon2: value
			};
			saveEquipment(newEquipment);
			return;
		}

		// If equipping a single-handed weapon/shield and two-handed is equipped, clear the other slot
		// but DON'T save yet - let validation run first
		let newEquipment;
		if (currentlyHasTwoHanded && !isUnequipping) {
			// Clear the other slot when transitioning from two-handed
			newEquipment = {
				...equipment,
				weapon1: slot === 'weapon1' ? value : 'none',
				weapon2: slot === 'weapon2' ? value : 'none'
			};
		} else {
			// Normal case: equip to the specified slot
			newEquipment = {
				...equipment,
				[slot]: value
			};
		}

		const w1 =
			newEquipment.weapon1 && newEquipment.weapon1 !== 'none' ? newEquipment.weapon1 : null;
		const w2 =
			newEquipment.weapon2 && newEquipment.weapon2 !== 'none' ? newEquipment.weapon2 : null;

		// Handle dual wielding restrictions based on class
		if (w1 && w2) {
			const cls = (character?.class || '').toString().toLowerCase();
			const w1cat = parseItemId(w1.id)?.category;
			const w2cat = parseItemId(w2.id)?.category;

			// Check if this is actually a two-handed weapon (not just same ID)
			const w1Slot = parseItemId(w1.id)?.slot;
			const isTwoHanded = w1Slot === 3 || (w1.weaponType || '').toLowerCase().includes('two');

			// Allow two-handed weapons (both slots have the same item AND it's actually two-handed)
			if (isTwoHanded) {
				// Two-handed weapon - allow
			} else if (cls === 'rogue' && w1cat === 12 && w2cat === 12) {
				// Rogues can dual wield daggers
			} else if (cls === 'warrior' && w1cat >= 11 && w1cat <= 17 && w2cat === 18) {
				// Warriors can use weapon + shield
			} else {
				// Invalid combination - don't allow
				console.log(
					'[EQUIPMENT] Invalid weapon combination for class:',
					cls,
					'w1:',
					w1cat,
					'w2:',
					w2cat
				);
				alert(
					`Cannot equip this weapon combination. ${cls === 'rogue' ? 'Rogues can only dual wield daggers.' : cls === 'warrior' ? 'Warriors can use weapon + shield.' : 'Invalid combination.'}`
				);
				return;
			}
		}

		saveEquipment(newEquipment);
	}

	function getSlotDisplayName(slotId) {
		const slotNames = {
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
		return slotNames[slotId] || slotId;
	}
</script>

<div class="equipment-panel" role="dialog" aria-modal="false">
	<header>
		<div class="header-left">
			<h3>Equipment : {(character.class || '').toString().toUpperCase()}</h3>
		</div>
		<div class="header-actions">
			<button
				class="stats-toggle-btn"
				on:click={() => (showAdvancedStats = !showAdvancedStats)}
				title="Toggle Advanced Stats"
			>
				📊 Stats
			</button>
			<button class="close" aria-label="Close equipment" on:click={() => dispatch('close')}
				>✕</button
			>
		</div>
	</header>

	<div class="equipment-grid-new">
		<!-- Column 1: 3 slots (vertically centered) -->
		<div class="slot-column col-1">
			<!-- A) Locked / Sierra -->
			{#if isSierraUnlocked}
				<div
					class="slot-card sierra-slot"
					style="background-image: url('/Images/Sierra.jpg'); background-size: cover;"
				>
					<div class="slot-header">
						<span class="slot-name">Mount</span>
					</div>
					<div class="slot-content">
						<div class="equipped-item">
							<div class="item-name">Sierra</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="slot-card locked-slot">
					<div class="slot-header">
						<span class="slot-icon">🔒</span>
						<span class="slot-name">Locked</span>
					</div>
					<div class="slot-content">
						<div class="empty-slot locked">Locked</div>
					</div>
				</div>
			{/if}

			<!-- B) Main Hand -->
			<div
				class="slot-card weapon-slot {isTwoHandedSelected()
					? 'two-handed'
					: ''} {equipment.weapon1 &&
				equipment.weapon1 !== 'none' &&
				equipment.weapon2 &&
				equipment.weapon2 !== 'none' &&
				!isTwoHandedSelected()
					? 'dual-wield'
					: ''} {isWeaponShield ? 'weapon-shield' : ''} {equipment.weapon1 &&
				equipment.weapon1 !== 'none'
					? 'equipped'
					: ''}"
				style="background-image: url('{equipment.weapon1
					? getEquippedItemIcon('weapon1') || '/Images/default-equipment.png'
					: '/Images/empty-righthand.png'}');"
			>
				<div class="slot-header" class:hidden={equipment.weapon1 && equipment.weapon1 !== 'none'}>
					<span class="slot-name">{getSlotDisplayName('weapon1')}</span>
				</div>
				<div class="slot-content">
					{#key equipment.weapon1}
						{#if equipment.weapon1 && equipment.weapon1 !== 'none'}
							<div
								class="equipped-item"
								role="button"
								tabindex="-1"
								on:mouseenter={(e) => onItemHover(e, 'weapon1')}
								on:mouseleave={onItemLeave}
							>
								<div class="item-name">{getEquippedItemName('weapon1')}</div>
								{#if isTwoHandedSelected()}
									<div class="badge two-handed-badge">Two-Handed</div>
								{/if}
							</div>
						{:else}
							<div class="empty-slot">Empty</div>
						{/if}
					{/key}
				</div>
				<button
					class="change-btn"
					on:click={() => openChangeModal('weapon1')}
					aria-label="Change main hand weapon"
				>
					<i class="fa-solid fa-arrows-rotate"></i>
				</button>
			</div>

			<!-- C) Ring A -->
			<div
				class="slot-card ring-slot {equipment.ring1 && equipment.ring1 !== 'none'
					? 'equipped'
					: ''}"
				style="background-image: url('{equipment.ring1
					? getEquippedItemIcon('ring1') || '/Images/default-equipment.png'
					: '/Images/empty-ring.png'}');"
			>
				<div class="slot-header" class:hidden={equipment.ring1}>
					<span class="slot-name">{getSlotDisplayName('ring1')}</span>
				</div>
				<div class="slot-content">
					{#key equipment.ring1}
						{#if equipment.ring1}
							<div
								class="equipped-item"
								role="button"
								tabindex="-1"
								on:mouseenter={(e) => onItemHover(e, 'ring1')}
								on:mouseleave={onItemLeave}
							>
								<div class="item-name">{getEquippedItemName('ring1')}</div>
							</div>
						{:else}
							<div class="empty-slot">Empty</div>
						{/if}
					{/key}
				</div>
				<button
					class="change-btn"
					on:click={() => openChangeModal('ring1')}
					aria-label="Change ring 1"
				>
					<i class="fa-solid fa-arrows-rotate"></i>
				</button>
			</div>
		</div>

		<!-- Column 2: 4 slots (vertically centered) -->
		<div class="slot-column col-2">
			<!-- D) Head -->
			<div
				class="slot-card head-slot {equipment.head && equipment.head !== 'none' ? 'equipped' : ''}"
				style="background-image: url('{equipment.head
					? getEquippedItemIcon('head') || '/Images/default-equipment.png'
					: '/Images/empty-head.png'}');"
			>
				<div class="slot-header" class:hidden={equipment.head}>
					<span class="slot-name">{getSlotDisplayName('head')}</span>
				</div>
				<div class="slot-content">
					{#key equipment.head}
						{#if equipment.head}
							<div
								class="equipped-item"
								role="button"
								tabindex="-1"
								on:mouseenter={(e) => onItemHover(e, 'head')}
								on:mouseleave={onItemLeave}
							>
								<div class="item-name">{getEquippedItemName('head')}</div>
							</div>
						{:else}
							<div class="empty-slot">Empty</div>
						{/if}
					{/key}
				</div>
				<button
					class="change-btn"
					on:click={() => openChangeModal('head')}
					aria-label="Change head armor"
				>
					<i class="fa-solid fa-arrows-rotate"></i>
				</button>
			</div>

			<!-- E) Body -->
			<div
				class="slot-card body-slot {equipment.body && equipment.body !== 'none' ? 'equipped' : ''}"
				style="background-image: url('{equipment.body
					? getEquippedItemIcon('body') || '/Images/default-equipment.png'
					: `/Images/empty-${gender === 'female' ? 'bodyfemale' : 'bodymale'}.png`}');"
			>
				<div class="slot-header" class:hidden={equipment.body}>
					<span class="slot-name">{getSlotDisplayName('body')}</span>
				</div>
				<div class="slot-content">
					{#key equipment.body}
						{#if equipment.body}
							<div
								class="equipped-item"
								role="button"
								tabindex="-1"
								on:mouseenter={(e) => onItemHover(e, 'body')}
								on:mouseleave={onItemLeave}
							>
								<div class="item-name">{getEquippedItemName('body')}</div>
							</div>
						{:else}
							<div class="empty-slot">Empty</div>
						{/if}
					{/key}
				</div>
				<button
					class="change-btn"
					on:click={() => openChangeModal('body')}
					aria-label="Change body armor"
				>
					<i class="fa-solid fa-arrows-rotate"></i>
				</button>
			</div>

			<!-- F) Belt -->
			<div
				class="slot-card belt-slot {equipment.belt && equipment.belt !== 'none' ? 'equipped' : ''}"
				style="background-image: url('{equipment.belt
					? getEquippedItemIcon('belt') || '/Images/default-equipment.png'
					: '/Images/empty-belt.png'}');"
			>
				<div class="slot-header" class:hidden={equipment.belt}>
					<span class="slot-name">{getSlotDisplayName('belt')}</span>
				</div>
				<div class="slot-content">
					{#key equipment.belt}
						{#if equipment.belt}
							<div
								class="equipped-item"
								role="button"
								tabindex="-1"
								on:mouseenter={(e) => onItemHover(e, 'belt')}
								on:mouseleave={onItemLeave}
							>
								<div class="item-name">{getEquippedItemName('belt')}</div>
							</div>
						{:else}
							<div class="empty-slot">Empty</div>
						{/if}
					{/key}
				</div>
				<button
					class="change-btn"
					on:click={() => openChangeModal('belt')}
					aria-label="Change belt"
				>
					<i class="fa-solid fa-arrows-rotate"></i>
				</button>
			</div>

			<!-- G) Boots -->
			<div
				class="slot-card legs-slot {equipment.legs && equipment.legs !== 'none' ? 'equipped' : ''}"
				style="background-image: url('{equipment.legs
					? getEquippedItemIcon('legs') || '/Images/default-equipment.png'
					: '/Images/empty-legs.png'}');"
			>
				<div class="slot-header" class:hidden={equipment.legs}>
					<span class="slot-name">{getSlotDisplayName('legs')}</span>
				</div>
				<div class="slot-content">
					{#key equipment.legs}
						{#if equipment.legs}
							<div
								class="equipped-item"
								role="button"
								tabindex="-1"
								on:mouseenter={(e) => onItemHover(e, 'legs')}
								on:mouseleave={onItemLeave}
							>
								<div class="item-name">{getEquippedItemName('legs')}</div>
							</div>
						{:else}
							<div class="empty-slot">Empty</div>
						{/if}
					{/key}
				</div>
				<button
					class="change-btn"
					on:click={() => openChangeModal('legs')}
					aria-label="Change leg armor"
				>
					<i class="fa-solid fa-arrows-rotate"></i>
				</button>
			</div>
		</div>

		<!-- Column 3: 3 slots (vertically centered) -->
		<div class="slot-column col-3">
			<!-- H) Necklace -->
			<div
				class="slot-card necklace-slot {equipment.necklace && equipment.necklace !== 'none'
					? 'equipped'
					: ''}"
				style="background-image: url('{equipment.necklace
					? getEquippedItemIcon('necklace') || '/Images/default-equipment.png'
					: '/Images/empty-necklace.png'}');"
			>
				<div class="slot-header" class:hidden={equipment.necklace}>
					<span class="slot-name">{getSlotDisplayName('necklace')}</span>
				</div>
				<div class="slot-content">
					{#key equipment.necklace}
						{#if equipment.necklace}
							<div
								class="equipped-item"
								role="button"
								tabindex="-1"
								on:mouseenter={(e) => onItemHover(e, 'necklace')}
								on:mouseleave={onItemLeave}
							>
								<div class="item-name">{getEquippedItemName('necklace')}</div>
							</div>
						{:else}
							<div class="empty-slot">Empty</div>
						{/if}
					{/key}
				</div>
				<button
					class="change-btn"
					on:click={() => openChangeModal('necklace')}
					aria-label="Change necklace"
				>
					<i class="fa-solid fa-arrows-rotate"></i>
				</button>
			</div>

			<!-- I) Off Hand -->
			<div
				class="slot-card weapon-slot {isTwoHandedSelected() ? 'disabled' : ''} {equipment.weapon1 &&
				equipment.weapon1 !== 'none' &&
				equipment.weapon2 &&
				equipment.weapon2 !== 'none' &&
				!isTwoHandedSelected()
					? 'dual-wield'
					: ''} {isWeaponShield ? 'weapon-shield' : ''} {equipment.weapon2 &&
				equipment.weapon2 !== 'none' &&
				!isTwoHandedSelected()
					? 'equipped'
					: ''}"
				style="background-image: url('{equipment.weapon2
					? getEquippedItemIcon('weapon2') || '/Images/default-equipment.png'
					: '/Images/empty-lefthand.png'}');"
			>
				<div
					class="slot-header"
					class:hidden={equipment.weapon2 && equipment.weapon2 !== 'none' && !isTwoHandedSelected()}
				>
					<span class="slot-name">{getSlotDisplayName('weapon2')}</span>
				</div>
				<div class="slot-content">
					{#key equipment.weapon2}
						{#if isTwoHandedSelected()}
							<div class="empty-slot">Occupied by 2H weapon</div>
						{:else if equipment.weapon2 && equipment.weapon2 !== 'none'}
							<div
								class="equipped-item"
								role="button"
								tabindex="-1"
								on:mouseenter={(e) => onItemHover(e, 'weapon2')}
								on:mouseleave={onItemLeave}
							>
								<div class="item-name">{getEquippedItemName('weapon2')}</div>
							</div>
						{:else}
							<div class="empty-slot">Empty</div>
						{/if}
					{/key}
				</div>
				<button
					class="change-btn"
					on:click={() => openChangeModal('weapon2')}
					disabled={isTwoHandedSelected()}
					aria-label="Change off hand weapon"
				>
					<i class="fa-solid fa-arrows-rotate"></i>
				</button>
			</div>

			<!-- J) Ring B -->
			<div
				class="slot-card ring-slot {equipment.ring2 && equipment.ring2 !== 'none'
					? 'equipped'
					: ''}"
				style="background-image: url('{equipment.ring2
					? getEquippedItemIcon('ring2') || '/Images/default-equipment.png'
					: '/Images/empty-ring.png'}');"
			>
				<div class="slot-header" class:hidden={equipment.ring2}>
					<span class="slot-name">{getSlotDisplayName('ring2')}</span>
				</div>
				<div class="slot-content">
					{#key equipment.ring2}
						{#if equipment.ring2}
							<div
								class="equipped-item"
								role="button"
								tabindex="-1"
								on:mouseenter={(e) => onItemHover(e, 'ring2')}
								on:mouseleave={onItemLeave}
							>
								<div class="item-name">{getEquippedItemName('ring2')}</div>
							</div>
						{:else}
							<div class="empty-slot">Empty</div>
						{/if}
					{/key}
				</div>
				<button
					class="change-btn"
					on:click={() => openChangeModal('ring2')}
					aria-label="Change ring 2"
				>
					<i class="fa-solid fa-arrows-rotate"></i>
				</button>
			</div>
		</div>
	</div>

	<div class="rules-section">
		<h4>Equipment Rules</h4>
		<p>• Rogues can dual wield daggers</p>
		<p>• Certain classes can use weapon + shield</p>
		<p>• Two-handed weapons occupy both hand slots</p>
	</div>
</div>

{#if showAdvancedStats}
	<AdvancedStatsWindow
		on:close={() => (showAdvancedStats = false)}
		initialCharacter={character}
		initialPlayerData={playerData}
	/>
{/if}

{#if showItemTooltip && hoveredItem}
	<!-- Item hover tooltip -->
	<div
		class="item-tooltip"
		style="position: fixed; left: {tooltipPosition.x}px; top: {tooltipPosition.y}px; z-index: 2000; pointer-events: none;"
	>
		<div
			style="background: linear-gradient(180deg, #0f1724 0%, #071029 100%); border-radius: 8px; padding: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); min-width: 200px; max-width: 280px;"
		>
			<div style="margin-bottom: 8px;">
				<h4 style="margin: 0; font-size: 14px; color: #00baff; font-weight: 600;">
					{hoveredItem.name}
				</h4>
				<div style="font-size: 11px; color: rgba(255, 255, 255, 0.6); margin-top: 2px;">
					{hoveredItem.category || 'Equipment'} • {hoveredItem.type || 'Item'}
				</div>
			</div>
			{#if hoveredItem.description}
				<div
					style="font-size: 12px; color: rgba(255, 255, 255, 0.8); line-height: 1.3; margin-bottom: 8px;"
				>
					{hoveredItem.description}
				</div>
			{/if}
			{#if (hoveredItem.effect && Object.keys(hoveredItem.effect).length > 0) || (hoveredItem.effects && Object.keys(hoveredItem.effects).length > 0) || hoveredItem.damage || hoveredItem.physicalDefense || hoveredItem.magicDefense}
				<div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px;">
					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px; font-size: 12px;">
						{#each Object.entries(hoveredItem.effect || {}) as [stat, value] (stat)}
							{#if value !== null && value !== undefined && value !== 0 && value !== '0'}
								<div style="color: rgba(255, 255, 255, 0.7);">{stat.toUpperCase()}:</div>
								<div
									style="color: {typeof value === 'number' && value > 0
										? '#4ade80'
										: typeof value === 'number' && value < 0
											? '#ef4444'
											: 'rgba(255, 255, 255, 0.9)'}; font-weight: 600; text-align: right;"
								>
									{typeof value === 'number' && value > 0
										? '+'
										: typeof value === 'number' && value < 0
											? ''
											: ''}
									{value}
								</div>
							{/if}
						{/each}
						{#each Object.entries(hoveredItem.effects || {}) as [stat, value] (stat)}
							{#if value !== null && value !== undefined && value !== 0 && value !== '0'}
								<div style="color: rgba(255, 255, 255, 0.7);">{stat.toUpperCase()}:</div>
								<div
									style="color: {typeof value === 'number' && value > 0
										? '#4ade80'
										: typeof value === 'number' && value < 0
											? '#ef4444'
											: 'rgba(255, 255, 255, 0.9)'}; font-weight: 600; text-align: right;"
								>
									{typeof value === 'number' && value > 0
										? '+'
										: typeof value === 'number' && value < 0
											? ''
											: ''}
									{value}
								</div>
							{/if}
						{/each}
						{#if hoveredItem.damage}
							<div style="color: rgba(255, 255, 255, 0.7);">DAMAGE:</div>
							<div style="color: #4ade80; font-weight: 600; text-align: right;">
								+{hoveredItem.damage}
							</div>
						{/if}
						{#if hoveredItem.physicalDefense}
							<div style="color: rgba(255, 255, 255, 0.7);">P.DEF:</div>
							<div style="color: #4ade80; font-weight: 600; text-align: right;">
								+{hoveredItem.physicalDefense}
							</div>
						{/if}
						{#if hoveredItem.magicDefense}
							<div style="color: rgba(255, 255, 255, 0.7);">M.DEF:</div>
							<div style="color: #4ade80; font-weight: 600; text-align: right;">
								+{hoveredItem.magicDefense}
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

{#if showChangeModal && activeSlot}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		class="modal-backdrop"
		on:click={() => {
			showChangeModal = false;
			activeSlot = null;
		}}
	>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
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
					{#each modalItems as item (item.id)}
						<button
							class="item-option {item.equipped ? 'selected' : ''}"
							on:click={() => selectItem(activeSlot, item.id)}
						>
							<span class="item-name">{item.name}</span>
							{#if item.equipped}
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
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-left: 6px solid rgba(80, 0, 0, 0.9);
		border-radius: 12px;
		width: 100%;
		max-width: 600px;
		height: 100%;
		max-height: 80vh;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		z-index: 1000;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.02);
	}

	.header-left h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
		color: #fff;
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}

	.stats-toggle-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		padding: 6px 12px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 12px;
		transition: all 0.2s;
	}

	.stats-toggle-btn:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.close {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		width: 32px;
		height: 32px;
		border-radius: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		font-size: 16px;
	}

	.close:hover {
		transform: scale(1.06);
		opacity: 0.95;
	}

	.equipment-grid-new {
		flex: 1;
		overflow-y: auto;
		padding: 20px;
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0px;
		align-items: center;
		justify-items: center;
	}

	.slot-column {
		display: flex;
		flex-direction: column;
		gap: 4px;
		align-items: center;
	}

	.rules-section {
		padding: 16px 20px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.02);
		margin-top: 16px;
	}

	.rules-section h4 {
		margin: 0 0 8px 0;
		font-size: 14px;
		color: #fff;
	}

	.rules-section p {
		margin: 0 0 4px 0;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.4;
	}

	/* Modal styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background: rgba(0, 0, 0, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 12px;
		width: 90%;
		max-width: 400px;
		max-height: 80vh;
		overflow: hidden;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.modal-header h4 {
		margin: 0;
		color: #fff;
		font-size: 16px;
	}

	.modal-header .close {
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		font-size: 20px;
		padding: 0;
		width: auto;
		height: auto;
	}

	.modal-header .close:hover {
		color: #fff;
	}

	.modal-body {
		padding: 20px;
		max-height: calc(80vh - 80px);
		overflow-y: auto;
	}

	.items-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.item-option {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: #fff;
		padding: 12px 16px;
		border-radius: 6px;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.item-option:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.item-option.selected {
		background: rgba(59, 130, 246, 0.2);
		border-color: rgba(59, 130, 246, 0.5);
	}

	.checkmark {
		color: #10b981;
		font-weight: bold;
	}

	/* Scrollbar styling */
	.equipment-grid-new::-webkit-scrollbar,
	.modal-body::-webkit-scrollbar {
		width: 6px;
	}

	.equipment-grid-new::-webkit-scrollbar-track,
	.modal-body::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 3px;
	}

	.equipment-grid-new::-webkit-scrollbar-thumb,
	.modal-body::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.3);
		border-radius: 3px;
	}

	.equipment-grid-new::-webkit-scrollbar-thumb:hover,
	.modal-body::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	/* Mobile responsiveness */
	@media (max-width: 768px) {
		.equipment-panel {
			max-width: 100%;
			max-height: 100vh;
			border-radius: 0;
		}

		.equipment-grid-new {
			grid-template-columns: 1fr;
			padding: 15px;
		}

		.slot-column {
			flex-direction: row;
			justify-content: center;
			gap: 10px;
		}
	}

	/* Equipment Slot Styles */
	.slot-card {
		background: none;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		padding: 14px;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
		gap: 10px;
		width: 125px;
		height: 125px;
		position: relative;
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.slot-card:hover {
		border-color: rgba(255, 255, 255, 0.12);
	}

	.slot-card.two-handed {
		border-color: rgba(255, 193, 7, 0.3);
	}

	.slot-card.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.slot-card.locked-slot {
		border-color: #8b0000;
		background: none;
		opacity: 1;
	}

	.slot-card.equipped {
		border-color: #00ff00;
	}

	.slot-card.dual-wield {
		border-color: rgba(128, 0, 128, 0.8);
		box-shadow: inset 0 0 15px rgba(128, 0, 128, 0.6);
		animation: inner-glow 2s infinite ease-in-out;
	}

	.slot-card.weapon-shield {
		border-color: rgba(0, 255, 255, 0.8);
		box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.6);
		animation: inner-glow-cyan 2s infinite ease-in-out;
	}

	@keyframes inner-glow {
		0%,
		100% {
			box-shadow: inset 0 0 15px rgba(128, 0, 128, 0.6);
		}
		50% {
			box-shadow: inset 0 0 25px rgba(128, 0, 128, 0.9);
		}
	}

	@keyframes inner-glow-cyan {
		0%,
		100% {
			box-shadow: inset 0 0 15px rgba(0, 255, 255, 0.6);
		}
		50% {
			box-shadow: inset 0 0 25px rgba(0, 255, 255, 0.9);
		}
	}

	.slot-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		font-size: 12px;
	}

	.slot-icon {
		font-size: 16px;
	}

	.slot-name {
		font-weight: 600;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.9);
		display: none;
	}

	.slot-content {
		flex: 1;
		min-height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		font-size: 10px;
	}

	.equipped-item {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 2px;
		width: 100%;
		height: 100%;
		border-radius: 4px;
		padding: 4px;
	}

	.item-name {
		font-size: 12px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.9);
		line-height: 1.2;
		word-wrap: break-word;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
		text-align: center;
	}

	.empty-slot {
		color: rgba(255, 255, 255, 0.5);
		font-size: 10px;
		font-style: italic;
		text-align: center;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.03);
	}

	.empty-slot.locked {
		color: rgba(128, 128, 128, 0.7);
	}

	.badge {
		font-size: 8px;
		padding: 2px 4px;
		border-radius: 3px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.two-handed-badge {
		background: rgba(255, 193, 7, 0.2);
		color: #ffc107;
		align-self: flex-start;
	}

	.change-btn {
		position: absolute;
		bottom: 4px;
		right: 4px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		padding: 2px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 0;
		width: 28px;
		height: 28px;
	}

	.change-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		border-color: rgba(255, 255, 255, 0.3);
	}

	.change-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.hidden {
		display: none !important;
	}
</style>
