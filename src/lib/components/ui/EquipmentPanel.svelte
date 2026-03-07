<script>
	// @ts-nocheck
	import { SvelteSet } from 'svelte/reactivity';
	import { gameState, recalculateDerivedStats } from '$lib/stores/gameState';
	import { saveManager } from '$lib/stores/saveManager';
	import { calculateDerived } from '$lib/utils/stats';
	import { canEquipInSlot, isWeapon, parseItemId, migrateEquipmentToIds } from '$lib/utils/items';
	import itemDatabase from '$lib/data/items.json';
	import AdvancedStatsWindow from './AdvancedStatsWindow.svelte';

	// Advanced stats toggle
	let showAdvancedStats = false;

	// Slot icons mapping
	const slotIcons = {
		head: '👑',
		body: '🛡️',
		legs: '🥾',
		weapon1: '⚔️',
		weapon2: '⚔️/🗡/🛡',
		belt: '📿',
		necklace: '📿',
		ring1: '💍',
		ring2: '💍'
	};

	import { createEventDispatcher, tick } from 'svelte';
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

	// Migrate equipment on component mount
	import { onMount } from 'svelte';
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

		const req = item.requirements;
		const playerLevel = $gameState?.playerData?.level || 1;
		const playerClass = character?.class;
		const playerStats = character?.stats || {};

		// Check level requirement
		if (req.level && playerLevel < req.level) return false;

		// Check class requirement
		if (req.class) {
			const allowedClasses = Array.isArray(req.class) ? req.class : [req.class];
			const normalizedPlayerClass = (playerClass || '').toString().toLowerCase();
			const normalizedAllowedClasses = allowedClasses.map((c) =>
				(c || '').toString().toLowerCase()
			);

			if (!normalizedAllowedClasses.includes(normalizedPlayerClass)) return false;
		}

		// Check stat requirements
		if (req.stats) {
			// Check for statLogic (or conditions)
			if (req.statLogic) {
				// Build a set of stats covered by OR logic
				const orStats = new SvelteSet();
				for (const [statGroup, logic] of Object.entries(req.statLogic)) {
					if (logic === 'or') {
						const stats = statGroup.split(',');
						stats.forEach((stat) => orStats.add(stat.trim()));
					}
				}

				console.log('[EquipmentPanel] Checking OR requirements for', item.name);
				console.log('[EquipmentPanel] Stats required:', req.stats);
				console.log('[EquipmentPanel] Player stats:', playerStats);
				console.log('[EquipmentPanel] OR groups:', orStats);

				// Check OR conditions
				for (const [statGroup, logic] of Object.entries(req.statLogic)) {
					if (logic === 'or') {
						const stats = statGroup.split(',');
						const meetsAny = stats.some((stat) => {
							const trimmedStat = stat.trim();
							const playerVal = playerStats[trimmedStat] || 0;
							const requiredVal = req.stats[trimmedStat];
							console.log(
								`[EquipmentPanel] Checking ${trimmedStat}: ${playerVal} >= ${requiredVal}?`,
								playerVal >= requiredVal
							);
							return playerVal >= requiredVal;
						});
						console.log('[EquipmentPanel] Meets any OR condition?', meetsAny);
						if (!meetsAny) {
							return false; // Must meet at least one stat in the OR group
						}
					}
				}

				// Check remaining stats with AND logic (stats NOT in OR groups)
				for (const [stat, required] of Object.entries(req.stats)) {
					if (!orStats.has(stat)) {
						console.log(
							`[EquipmentPanel] Checking AND stat ${stat}: ${playerStats[stat]} >= ${required}?`
						);
						if ((playerStats[stat] || 0) < required) return false;
					}
				}
			} else {
				// Default AND logic - all stats must be met
				for (const [stat, required] of Object.entries(req.stats)) {
					if ((playerStats[stat] || 0) < required) return false;
				}
			}
		}

		// Check craft point requirements
		if (req.craftPoints) {
			// For now, assume craft points are always met (this would need more complex logic)
			// TODO: Implement craft point checking
		}

		return true;
	}

	function getAvailableItemsForSlot(slotId) {
		const allItems = inventory;

		if (slotId === 'weapon1' || slotId === 'weapon2') {
			// Check if a two-handed weapon is currently equipped
			const currentWeapon =
				equipment[slotId] && equipment[slotId] !== 'none' ? equipment[slotId] : null;
			const currentIsTwoHanded =
				currentWeapon && (currentWeapon.weaponType || '').toLowerCase().includes('two');

			// Check what's in the other weapon slot
			const otherSlot = slotId === 'weapon1' ? 'weapon2' : 'weapon1';
			const otherWeapon =
				equipment[otherSlot] && equipment[otherSlot] !== 'none' ? equipment[otherSlot] : null;
			const otherIsTwoHanded =
				otherWeapon && (otherWeapon.weaponType || '').toLowerCase().includes('two');

			// If either slot has a two-handed weapon, only allow "None" to unequip it
			if (currentIsTwoHanded || otherIsTwoHanded) {
				return [{ id: 'none', name: 'None', twoHanded: false, category: 'none' }];
			}

			// Get weapons that can be equipped in this slot
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
			if (w1.id === w2.id && isTwoHanded) {
				// This is a two-handed weapon, allow it
			} else if (w1cat >= 11 && w1cat <= 17 && w2cat >= 11 && w2cat <= 17) {
				// Both are different weapons - ONLY allow rogues to dual wield daggers
				const w1IsDagger = w1.weaponClass === 'Daggers';
				const w2IsDagger = w2.weaponClass === 'Daggers';

				if (!(cls === 'rogue' && w1IsDagger && w2IsDagger)) {
					// Block all dual wielding except rogues with daggers
					alert(`${character?.class || 'Your class'} cannot dual wield weapons!`);
					newEquipment.weapon2 = 'none';
				}
			} else if (
				(w1cat === 18 || w2cat === 18) &&
				((w1cat >= 11 && w1cat <= 17) || (w2cat >= 11 && w2cat <= 17))
			) {
				// One is a shield and one is a weapon - check if class can equip shields
				const shieldItem = w1cat === 18 ? w1 : w2;
				if (!canEquipItem(shieldItem)) {
					alert(`You don't meet the requirements to equip ${shieldItem.name}.`);
					newEquipment.weapon2 = 'none';
				}
				// If they can equip the shield, allow weapon + shield combination
			}
		}

		saveEquipment(newEquipment);
	}
	function getEquippedItemName(slotId) {
		const value = equipment[slotId];
		if (!value || value === 'none') return null;

		// If it's an item object, return its name
		if (typeof value === 'object' && value.name) {
			return value.name;
		}

		// Fallback for old ID-based system
		const invItem = inventory.find((i) => i.id === value);
		return invItem ? invItem.name : value;
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

	let showChangeModal = false;
	let activeSlot = null;

	// Create a reactive list of items with their equipped state baked in
	$: modalItems =
		activeSlot && availableItems[activeSlot]
			? availableItems[activeSlot].map((item) => ({
					...item,
					equipped: isItemEquipped(activeSlot, item)
				}))
			: [];

	function openChangeModal(slotId) {
		activeSlot = slotId;
		showChangeModal = true;
	}

	async function selectItem(slotId, itemId) {
		// Close modal first to prevent re-renders
		showChangeModal = false;
		activeSlot = null;

		// Wait for DOM to update
		await tick();

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
			<h3>Equipment</h3>
			<div class="subtitle">{(character.class || '').toString().toUpperCase()}</div>
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

	<div class="equipment-grid">
		<!-- Top Row: Head -->
		<div class="slot-card head-slot">
			<div class="slot-header">
				<span class="slot-icon">{slotIcons.head}</span>
				<span class="slot-name">{getSlotDisplayName('head')}</span>
			</div>
			<div class="slot-content">
				{#key equipment.head}
					{#if equipment.head}
						<div class="equipped-item">
							<div class="item-name">{getEquippedItemName('head')}</div>
						</div>
					{:else}
						<div class="empty-slot">Empty</div>
					{/if}
				{/key}
			</div>
			<button class="change-btn" on:click={() => openChangeModal('head')}>
				<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
						fill="currentColor"
					/>
				</svg>
				Change
			</button>
		</div>

		<!-- Second Row: Body, Necklace -->
		<div class="slot-card body-slot">
			<div class="slot-header">
				<span class="slot-icon">{slotIcons.body}</span>
				<span class="slot-name">{getSlotDisplayName('body')}</span>
			</div>
			<div class="slot-content">
				{#key equipment.body}
					{#if equipment.body}
						<div class="equipped-item">
							<div class="item-name">{getEquippedItemName('body')}</div>
						</div>
					{:else}
						<div class="empty-slot">Empty</div>
					{/if}
				{/key}
			</div>
			<button class="change-btn" on:click={() => openChangeModal('body')}>
				<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
						fill="currentColor"
					/>
				</svg>
				Change
			</button>
		</div>

		<div class="slot-card necklace-slot">
			<div class="slot-header">
				<span class="slot-icon">{slotIcons.necklace}</span>
				<span class="slot-name">{getSlotDisplayName('necklace')}</span>
			</div>
			<div class="slot-content">
				{#key equipment.necklace}
					{#if equipment.necklace}
						<div class="equipped-item">
							<div class="item-name">{getEquippedItemName('necklace')}</div>
						</div>
					{:else}
						<div class="empty-slot">Empty</div>
					{/if}
				{/key}
			</div>
			<button class="change-btn" on:click={() => openChangeModal('necklace')}>
				<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
						fill="currentColor"
					/>
				</svg>
				Change
			</button>
		</div>

		<!-- Third Row: Weapons -->
		<div class="slot-card weapon-slot {isTwoHandedSelected() ? 'two-handed' : ''}">
			<div class="slot-header">
				<span class="slot-icon">{slotIcons.weapon1}</span>
				<span class="slot-name">{getSlotDisplayName('weapon1')}</span>
			</div>
			<div class="slot-content">
				{#key equipment.weapon1}
					{#if equipment.weapon1 && equipment.weapon1 !== 'none'}
						<div class="equipped-item">
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
			<button class="change-btn" on:click={() => openChangeModal('weapon1')}>
				<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
						fill="currentColor"
					/>
				</svg>
				Change
			</button>
		</div>

		<div class="slot-card weapon-slot {isTwoHandedSelected() ? 'disabled' : ''}">
			<div class="slot-header">
				<span class="slot-icon">{slotIcons.weapon2}</span>
				<span class="slot-name">{getSlotDisplayName('weapon2')}</span>
			</div>
			<div class="slot-content">
				{#key equipment.weapon2}
					{#if isTwoHandedSelected()}
						<div class="empty-slot">Occupied by 2H weapon</div>
					{:else if equipment.weapon2 && equipment.weapon2 !== 'none'}
						<div class="equipped-item">
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
			>
				<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
						fill="currentColor"
					/>
				</svg>
				Change
			</button>
		</div>

		<!-- Fourth Row: Boots, Belt -->
		<div class="slot-card legs-slot">
			<div class="slot-header">
				<span class="slot-icon">{slotIcons.legs}</span>
				<span class="slot-name">{getSlotDisplayName('legs')}</span>
			</div>
			<div class="slot-content">
				{#key equipment.legs}
					{#if equipment.legs}
						<div class="equipped-item">
							<div class="item-name">{getEquippedItemName('legs')}</div>
						</div>
					{:else}
						<div class="empty-slot">Empty</div>
					{/if}
				{/key}
			</div>
			<button class="change-btn" on:click={() => openChangeModal('legs')}>
				<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
						fill="currentColor"
					/>
				</svg>
				Change
			</button>
		</div>

		<div class="slot-card belt-slot">
			<div class="slot-header">
				<span class="slot-icon">{slotIcons.belt}</span>
				<span class="slot-name">{getSlotDisplayName('belt')}</span>
			</div>
			<div class="slot-content">
				{#key equipment.belt}
					{#if equipment.belt}
						<div class="equipped-item">
							<div class="item-name">{getEquippedItemName('belt')}</div>
						</div>
					{:else}
						<div class="empty-slot">Empty</div>
					{/if}
				{/key}
			</div>
			<button class="change-btn" on:click={() => openChangeModal('belt')}>
				<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
						fill="currentColor"
					/>
				</svg>
				Change
			</button>
		</div>

		<!-- Fifth Row: Rings -->
		<div class="slot-card ring-slot">
			<div class="slot-header">
				<span class="slot-icon">{slotIcons.ring1}</span>
				<span class="slot-name">{getSlotDisplayName('ring1')}</span>
			</div>
			<div class="slot-content">
				{#key equipment.ring1}
					{#if equipment.ring1}
						<div class="equipped-item">
							<div class="item-name">{getEquippedItemName('ring1')}</div>
						</div>
					{:else}
						<div class="empty-slot">Empty</div>
					{/if}
				{/key}
			</div>
			<button class="change-btn" on:click={() => openChangeModal('ring1')}>
				<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
						fill="currentColor"
					/>
				</svg>
				Change
			</button>
		</div>

		<div class="slot-card ring-slot">
			<div class="slot-header">
				<span class="slot-icon">{slotIcons.ring2}</span>
				<span class="slot-name">{getSlotDisplayName('ring2')}</span>
			</div>
			<div class="slot-content">
				{#key equipment.ring2}
					{#if equipment.ring2}
						<div class="equipped-item">
							<div class="item-name">{getEquippedItemName('ring2')}</div>
						</div>
					{:else}
						<div class="empty-slot">Empty</div>
					{/if}
				{/key}
			</div>
			<button class="change-btn" on:click={() => openChangeModal('ring2')}>
				<svg viewBox="0 0 24 24" width="14" height="14" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
						fill="currentColor"
					/>
				</svg>
				Change
			</button>
		</div>
	</div>

	<div class="rules-section">
		<h4>Class Equipment Rules</h4>
		<ul>
			<li><strong>Warrior:</strong> Can use weapon + shield or two-handed weapons</li>
			<li><strong>Archer:</strong> Uses two-handed bows</li>
			<li><strong>Rogue:</strong> Can dual-wield daggers</li>
		</ul>
	</div>
</div>

{#if showAdvancedStats}
	<AdvancedStatsWindow
		on:close={() => (showAdvancedStats = false)}
		initialCharacter={character}
		initialPlayerData={playerData}
	/>
{/if}

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
		left: 50%;
		transform: translateX(-50%);
		top: 10vh;
		bottom: 10vh;
		width: min(820px, 96%);
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

	.equipment-grid {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 12px;
		align-content: start;
	}

	.slot-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 10px;
		padding: 14px;
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.slot-card:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.12);
	}

	.head-slot {
		grid-column: 1 / -1;
	}

	.slot-card.two-handed {
		grid-column: 1 / -1;
		background: rgba(255, 193, 7, 0.08);
		border-color: rgba(255, 193, 7, 0.3);
	}

	.slot-card.disabled {
		opacity: 0.5;
		pointer-events: none;
	}

	.slot-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.slot-icon {
		font-size: 20px;
	}

	.slot-name {
		font-weight: 600;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.9);
	}

	.slot-content {
		flex: 1;
		min-height: 48px;
		display: flex;
		align-items: center;
		padding: 8px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 6px;
	}

	.equipped-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
	}

	.item-name {
		font-size: 14px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.95);
	}

	.empty-slot {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	.change-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		background: rgba(58, 255, 94, 0.12);
		border: 1px solid rgba(58, 255, 94, 0.25);
		border-radius: 6px;
		color: #3aff5e;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.change-btn:hover:not(:disabled) {
		background: rgba(58, 255, 94, 0.2);
		border-color: rgba(58, 255, 94, 0.4);
	}

	.change-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.badge {
		display: inline-block;
		padding: 3px 8px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.two-handed-badge {
		background: rgba(255, 193, 7, 0.15);
		color: #ffc107;
		border: 1px solid rgba(255, 193, 7, 0.3);
	}

	.rules-section {
		flex-shrink: 0;
		padding: 16px;
		background: rgba(255, 255, 255, 0.02);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.rules-section h4 {
		margin: 0 0 10px 0;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.9);
	}

	.rules-section ul {
		margin: 0;
		padding-left: 20px;
	}

	.rules-section li {
		font-size: 13px;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 6px;
		line-height: 1.5;
	}

	.rules-section strong {
		color: rgba(255, 255, 255, 0.9);
	}

	/* Stats Toggle Button */
	.stats-toggle-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: #fff;
		font-size: 14px;
		padding: 5px 10px;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.stats-toggle-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		border-color: rgba(255, 255, 255, 0.3);
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
	.equipment-grid::-webkit-scrollbar,
	.modal-body::-webkit-scrollbar {
		width: 8px;
	}

	.equipment-grid::-webkit-scrollbar-track,
	.modal-body::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	.equipment-grid::-webkit-scrollbar-thumb,
	.modal-body::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	.equipment-grid::-webkit-scrollbar-thumb:hover,
	.modal-body::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.equipment-panel {
			width: 98%;
			top: 8vh;
			bottom: 8vh;
		}

		.equipment-grid {
			grid-template-columns: 1fr;
		}

		.slot-card.two-handed {
			grid-column: 1;
		}
	}
</style>
