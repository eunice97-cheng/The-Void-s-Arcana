<script>
	// @ts-nocheck
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import { gameState, recalculateDerivedStats } from '$lib/stores/gameState';
	import { saveManager } from '$lib/stores/saveManager';
	import { show } from '$lib/stores/toastStore';
	import { calculateDerived } from '$lib/utils/stats';
	import { canEquipInSlot, isWeapon, parseItemId, migrateEquipmentToIds } from '$lib/utils/items';
	import itemDatabase from '$lib/data/items.json';
	import rarities from '$lib/data/rarities.json';
	import AdvancedStatsWindow from './AdvancedStatsWindow.svelte';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	// pagination / tab state
	export let openPage = null; // optional prop: parent can open Inventory on a specific page
	let currentPage = openPage || 'quest';

	// If parent updates `openPage` after mount, respond to it
	$: if (openPage && openPage !== currentPage) currentPage = openPage;

	// Item detail modal
	let showItemDetail = false;
	let selectedItem = null;

	// Advanced stats toggle
	let showAdvancedStats = false;

	// Use reactive store references directly for better reactivity
	$: character = $gameState?.character || { name: 'Adventurer', class: 'ROGUE' };
	$: inventory = $gameState?.character?.inventory || [];
	$: playerData = $gameState?.playerData || {};

	// Calculate derived stats reactively - use equipment directly
	$: equipment = migrateEquipmentToIds($gameState?.character?.equipment || {}, itemDatabase);

	// Migrate equipment on component mount
	import { onMount } from 'svelte';
	onMount(() => {
		const originalEquipment = $gameState?.character?.equipment;
		if (originalEquipment) {
			const migrated = migrateEquipmentToIds(originalEquipment, itemDatabase);
			const hasChanges = JSON.stringify(originalEquipment) !== JSON.stringify(migrated);

			if (hasChanges) {
				console.log('[INVENTORY MIGRATION] Migrating old equipment to ID-based system');
				gameState.update((s) => ({
					...(s || {}),
					character: { ...(s.character || {}), equipment: migrated }
				}));
			}
		}
	});
	$: stats = $gameState?.character?.stats;
	$: characterClass = $gameState?.character?.class;
	$: level = $gameState?.playerData?.level;

	// Force reactivity by creating a new derivedStats whenever equipment, stats, class, or level changes
	$: derivedStats = calculateDerived(stats || {}, characterClass, level || 1, equipment, {
		skills: character?.skills || []
	});

	// Calculate base stats (without equipment) for comparison
	$: baseStats = calculateDerived(
		stats || {},
		characterClass,
		level || 1,
		{},
		{ skills: character?.skills || [] }
	);

	// Create a reactive map of equipped item IDs for efficient lookup
	// Convert equipment object to array of IDs, filtering out null/none values
	// Handle both object items and string IDs for backward compatibility
	$: equippedItemIds = Object.values(equipment)
		.filter((item) => item && item !== 'none')
		.map((item) => (typeof item === 'object' ? item.id : item));

	// Check if character is dual wielding (both hands have different weapons)
	$: isDualWielding =
		equipment?.weapon1 &&
		equipment?.weapon1 !== 'none' &&
		equipment?.weapon2 &&
		equipment?.weapon2 !== 'none' &&
		equipment.weapon1.id !== equipment.weapon2.id;

	// Debug: Log when equipment changes (commented out to reduce console spam)
	// $: console.log('[INVENTORY UI] Equipment updated:', equipment);
	// $: console.log('[INVENTORY UI] Equipped IDs:', equippedItemIds);
	// $: console.log('[INVENTORY UI] Is Dual Wielding:', isDualWielding);
	// $: console.log('[INVENTORY UI] Derived stats:', derivedStats);

	function openItemDetail(item) {
		selectedItem = item;
		showItemDetail = true;
	}

	function closeItemDetail() {
		showItemDetail = false;
		selectedItem = null;
	}

	// items: expect array of { id, name, category, qty, description, type }
	function inventoryList() {
		return Array.isArray(inventory) ? inventory : [];
	}

	// Check if an item is currently equipped
	// This will automatically be reactive because it depends on equippedItemIds which is reactive
	function isItemEquipped(item) {
		if (!item) return false;
		return equippedItemIds.includes(item.id);
	}

	// Check if an item is equipped in a specific slot
	function isItemEquippedInSlot(item, slot) {
		if (!item || !equipment) return false;
		const equippedItem = equipment[slot];
		return equippedItem && equippedItem.id === item.id;
	}

	// Check if a slot is occupied (has any item equipped)
	function isSlotOccupied(slot) {
		if (!equipment) return false;
		const equippedItem = equipment[slot];
		return equippedItem && equippedItem !== 'none' && equippedItem !== null;
	}

	// Check if an item is a two-handed weapon
	function isTwoHandedWeapon(item) {
		if (!item || !item.id) return false;
		const { slot } = parseItemId(item.id);
		return slot === 3; // Slot 3 = Two-handed
	}

	// Check if character meets equipment requirements
	function canEquipItem(item) {
		if (!item || !item.requirements) return true; // No requirements means anyone can equip

		const req = item.requirements;
		const playerLevel = playerData?.level || 1;
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

				// console.log('[InventoryWindow] Checking OR requirements for', item.name);
				// console.log('[InventoryWindow] Stats required:', req.stats);
				// console.log('[InventoryWindow] Player stats:', playerStats);
				// console.log('[InventoryWindow] OR groups:', orStats);

				// Check OR conditions
				for (const [statGroup, logic] of Object.entries(req.statLogic)) {
					if (logic === 'or') {
						const stats = statGroup.split(',');
						const meetsAny = stats.some((stat) => {
							const trimmedStat = stat.trim();
							const playerVal = playerStats[trimmedStat] || 0;
							const requiredVal = req.stats[trimmedStat];
							// console.log(
							// 	`[InventoryWindow] Checking ${trimmedStat}: ${playerVal} >= ${requiredVal}?`,
							// 	playerVal >= requiredVal
							// );
							return playerVal >= requiredVal;
						});
						// console.log('[InventoryWindow] Meets any OR condition?', meetsAny);
						if (!meetsAny) {
							return false; // Must meet at least one stat in the OR group
						}
					}
				}

				// Check remaining stats with AND logic (stats NOT in OR groups)
				for (const [stat, required] of Object.entries(req.stats)) {
					if (!orStats.has(stat)) {
						// console.log(
						// 	`[InventoryWindow] Checking AND stat ${stat}: ${playerStats[stat]} >= ${required}?`
						// );
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

	// group into requested buckets
	function groupItems(items) {
		const groups = { quest: [], equipment: [], consumable: [], others: [] };
		for (const it of items) {
			// Patch for E-Rank Crystal Fragment icon (fix case sensitivity issue)
			if (String(it.id) === '2300001') {
				it.icon = '/Images/e-stone.png';
			}

			const raw = it.category || it.type || '';
			const cat = raw.toString().toLowerCase();

			// Quest items
			if (cat === 'quest' || cat === 'questitem' || cat === 'quest_item') {
				groups.quest.push(it);
				continue;
			}

			// Equipment-like categories
			if (
				cat === 'equipment' ||
				cat === 'equip' ||
				cat === 'weapon' ||
				cat === 'armor' ||
				cat === 'head' ||
				cat === 'body' ||
				cat === 'legs'
			) {
				groups.equipment.push(it);
				continue;
			}

			// Consumables: accept loose matches like "potion - consumable", "potion", "consumable"
			if (/potion|consumable|food|box/i.test(raw)) {
				groups.consumable.push(it);
				continue;
			}

			groups.others.push(it);
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
	$: groups = groupItems(inventory);

	// Expand equipment items for display - don't duplicate by quantity
	// Show each unique item once with appropriate equip/unequip buttons
	$: expandedEquipment = expandEquipmentItems(groups.equipment, equipment);

// equipment category subtabs (dynamic based on current equipment list)
let equipmentCategory = 'All';
function normalizeCategoryFor(item) {
    const raw = (item && (item.category || item.type || item.weaponClass)) || 'Other';
    const s = String(raw || 'Other').replace(/[_\-]/g, ' ').trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Small helper to format flat effect objects into a short summary string (e.g. "HP: +25, SP: +10")
function formatEffectSummary(effectData) {
	if (!effectData) return '';
	const effects = [];
	if (effectData.hp || effectData.HP) effects.push(`HP: +${effectData.hp || effectData.HP}`);
	if (effectData.sp || effectData.SP) effects.push(`SP: +${effectData.sp || effectData.SP}`);
	if (effectData.strength || effectData.STR) effects.push(`STR: +${effectData.strength || effectData.STR}`);
	if (effectData.dexterity || effectData.DEX) effects.push(`DEX: +${effectData.dexterity || effectData.DEX}`);
	if (effectData.intelligence || effectData.INT) effects.push(`INT: +${effectData.intelligence || effectData.INT}`);
	if (effectData.vitality || effectData.VIT) effects.push(`VIT: +${effectData.vitality || effectData.VIT}`);
	if (effectData.luck || effectData.LUK) effects.push(`LUK: +${effectData.luck || effectData.LUK}`);
	return effects.length ? effects.join(', ') : '';
}

// Determine a numeric potency for consumables to sort weakest -> strongest.
function consumablePotency(item) {
	const eff = item.effect || item.effects || {};
	// Prefer HP potency, then SP, then flat stat bonuses summed, then price as fallback
	if (eff.hp || eff.HP) return Number(eff.hp || eff.HP) || 0;
	if (eff.sp || eff.SP) return Number(eff.sp || eff.SP) || 0;
	// sum common flat bonuses if present
	let sum = 0;
	const keys = ['strength','STR','dexterity','DEX','intelligence','INT','vitality','VIT','luck','LUK'];
	for (const k of keys) {
		if (eff[k]) sum += Number(eff[k]) || 0;
	}
	if (sum > 0) return sum;
	// fallback to price (lower price -> weaker)
	if (item.price) return Math.floor((item.price || 0) / 1000);
	return 0;
}

// Reactive sorted consumables list: weakest -> strongest
$: sortedConsumables = Array.isArray(groups.consumable)
	? groups.consumable.slice().sort((a,b) => {
		const pa = consumablePotency(a);
		const pb = consumablePotency(b);
		if (pa !== pb) return pa - pb; // ascending: weakest first
		// tie-breaker: price then name
		const paPrice = a.price || 0;
		const pbPrice = b.price || 0;
		if (paPrice !== pbPrice) return paPrice - pbPrice;
		return String(a.name || '').localeCompare(String(b.name || ''));
	})
	: [];
$: equipmentCategories = ['All', ...Array.from(new Set((expandedEquipment || []).map(normalizeCategoryFor)))];

// filtered + sorted equipment: filter by selected category then sort by equipped first
$: filteredEquipment = equipmentCategory === 'All'
	? (expandedEquipment || [])
	: (expandedEquipment || []).filter((i) => normalizeCategoryFor(i) === equipmentCategory);

// Ensure `sortedEquipment` re-evaluates when `equipment` (the equipped slots) changes.
// We reference `equipment` here so Svelte's reactive system tracks that dependency.
$: (() => equipment)();
$: sortedEquipment = (filteredEquipment || []).slice().sort((a, b) => {
	const ae = a?.equippedCount || 0;
	const be = b?.equippedCount || 0;
	if (be !== ae) return be - ae; // equipped items first
	// then by name (case-insensitive)
	const an = (a.name || '').toString().toLowerCase();
	const bn = (b.name || '').toString().toLowerCase();
	const nameCmp = an.localeCompare(bn);
	if (nameCmp !== 0) return nameCmp;
	// finally by rarity (higher stars first). Use `rarity` or `stars` or fallback to 0
	const ar = Number(a?.rarity ?? a?.stars ?? 0) || 0;
	const br = Number(b?.rarity ?? b?.stars ?? 0) || 0;
	return br - ar;
});

	function expandEquipmentItems(equipmentItems, currentEquipment = {}) {
		// Create a map of item id to item data, counting equipped instances
		const itemMap = new SvelteMap();

		for (const item of equipmentItems) {
			const itemId = item.id;
			if (!itemMap.has(itemId)) {
				itemMap.set(itemId, {
					...item,
					availableQty: item.qty || 1,
					equippedCount: 0
				});
			}
		}

		// Count how many of each item are equipped
		Object.values(currentEquipment).forEach((equippedItem) => {
			if (equippedItem && equippedItem.id && itemMap.has(equippedItem.id)) {
				itemMap.get(equippedItem.id).equippedCount++;
			}
		});

		// Return the items with updated available quantity
		return Array.from(itemMap.values()).map((item) => ({
			...item,
			availableQty: Math.max(0, item.availableQty - item.equippedCount)
		}));
	}

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

	function useItem(item) {
		if (!item || !(item.qty > 0)) return;
		const inv = inventoryList().map((i) => ({ ...i }));
		const idx = inv.findIndex((i) => i.id === item.id);
		if (idx === -1) return;
		// decrement
		inv[idx].qty = (inv[idx].qty || 1) - 1;
		if (inv[idx].qty <= 0) inv.splice(idx, 1);

		// If this is a randomized container, handle its randomRewards first
		if (item && item.randomRewards) {
			// Select weighted random from item's randomRewards array
			const pickWeighted = (choices) => {
				const sum = (choices || []).reduce((acc, c) => acc + (c.chance || 0), 0);
				const roll = Math.random() * sum;
				let acc = 0;
				for (const c of choices) {
					acc += c.chance || 0;
					if (roll <= acc) return c;
				}
				return choices && choices[0];
			};

			// Resolve nested boxes that contain randomRewards by repeatedly picking
			const resolveChoice = (sourceItem) => {
				let current = sourceItem;
				let selection = null;
				while (current && current.randomRewards) {
					selection = pickWeighted(current.randomRewards);
					if (!selection) break;
					// if select by numeric id, treat as DB item
					const targetId = String(selection.item);
					const db = /^\d+$/.test(targetId)
						? itemDatabase[targetId]
						: Object.values(itemDatabase).find((it) => it.name === targetId);
					if (!db) {
						// Not in DB - return selection as literal
						return selection;
					}
					// If the target is another box, loop again
					if (db.randomRewards) {
						current = db;
						continue;
					}
					// Found final db item
					return { item: String(db.id), chance: selection.chance };
				}
				return selection;
			};

			const selection = resolveChoice(item);
			if (selection) {
				const reward = selection.item || selection.id || selection.name;

				// Resolve DB item by numeric ID or by name
				let dbItem = null;
				if (/^\d+$/.test(String(reward))) {
					dbItem = itemDatabase[String(reward)];
				}
				if (!dbItem)
					dbItem = Object.values(itemDatabase).find(
						(it) => it.name === reward || String(it.id) === reward
					);

				// If reward DB item exists and is E-rank, or the selection string is a known e-rank token, handle rarity
				const isERankToken = typeof reward === 'string' && /^e-rank-/i.test(reward);
				const rewardIsERank = (dbItem && dbItem.rank === 'E') || isERankToken;
				if (rewardIsERank) {
					// Determine type: weapon or armor
					// If we have a DB item, detect weapon/armor; otherwise use the e-rank token string
					const isWeapon =
						(dbItem && dbItem.category && dbItem.category.toLowerCase().includes('weapon')) ||
						(isERankToken && /physical-weapon|magic-weapon/i.test(reward));
					const isArmor =
						(dbItem && dbItem.category && dbItem.category.toLowerCase().includes('armor')) ||
						(isERankToken && /heavy-armor|medium-armor|magic-armor/i.test(reward));

					let distro = null;
					if (isWeapon) distro = rarities.rankE.weapon.starDistribution;
					else if (isArmor) distro = rarities.rankE.armor.starDistribution;

					// Choose star by distribution
					const pickByDist = (dist) => {
						const sum = dist.reduce((a, b) => a + (b.chance || 0), 0);
						const roll = Math.random() * sum;
						let cum = 0;
						for (const d of dist) {
							cum += d.chance || 0;
							if (roll <= cum) return d;
						}
						return dist[0];
					};

					const chosen = distro ? pickByDist(distro) : null;

					// Create generated item metadata: keep base name but append stars
					// For e-rank token types, map token to an actual base DB item
					let baseDbToUse = dbItem;
					if (!baseDbToUse && isERankToken) {
						// Determine category filter
						const token = (reward || '').toString().toLowerCase();

						// Helper to pick an existing DB item filtered by predicate
						const pickFromDb = (predicate) => {
							const candidates = Object.values(itemDatabase).filter(predicate);
							// Prefer items appropriate to E Rank: keep low-level items (level <= 10) when possible
							const levelFiltered = candidates.filter((it) =>
								it.requirements && it.requirements.level ? it.requirements.level <= 10 : true
							);
							const pool = levelFiltered.length ? levelFiltered : candidates;
							if (!pool.length) return null;
							return pool[Math.floor(Math.random() * pool.length)];
						};

						if (/physical-weapon/i.test(token)) {
							baseDbToUse = pickFromDb((it) => {
								try {
									const parsed = parseItemId(String(it.id));
									return (
										parsed.type === 1 &&
										parsed.category >= 11 &&
										parsed.category <= 17 &&
										parsed.category !== 16 &&
										it.rank === 'E'
									);
								} catch {
									return false;
								}
							});
						} else if (/magic-weapon/i.test(token)) {
							baseDbToUse = pickFromDb((it) => {
								try {
									const parsed = parseItemId(String(it.id));
									return parsed.type === 1 && parsed.category === 16 && it.rank === 'E';
								} catch {
									return false;
								}
							});
						} else if (/heavy-armor/i.test(token)) {
							baseDbToUse = pickFromDb((it) => {
								try {
									const parsed = parseItemId(String(it.id));
									return parsed.type === 1 && parsed.category === 23 && it.rank === 'E';
								} catch {
									return false;
								}
							});
						} else if (/medium-armor/i.test(token)) {
							baseDbToUse = pickFromDb((it) => {
								try {
									const parsed = parseItemId(String(it.id));
									return parsed.type === 1 && parsed.category === 22 && it.rank === 'E';
								} catch {
									return false;
								}
							});
						} else if (/magic-armor/i.test(token)) {
							baseDbToUse = pickFromDb((it) => {
								try {
									const parsed = parseItemId(String(it.id));
									return parsed.type === 1 && parsed.category === 24 && it.rank === 'E';
								} catch {
									return false;
								}
							});
						}
					}

					if (!baseDbToUse) {
						console.warn('[BOX] Could not find a base DB item for', reward);
					} else {
						const generatedItemBase = { ...baseDbToUse };
						const gen = { ...generatedItemBase };
						// Unique numeric-ish id (same category, unique index)
						const suffix = Math.floor(Math.random() * 900) + 100;
						gen.id = Number(String(gen.id).slice(0, -3) + String(suffix));
						gen.name = `${baseDbToUse.name}${chosen && chosen.stars ? ` ${'★'.repeat(chosen.stars)}` : ''}`;
						gen.rarity = chosen ? chosen.stars : 0;
						gen.rarityBonus = chosen ? chosen.bonus : null;

						// Apply stat modifications based on rankE table
						if (
							isWeapon &&
							chosen &&
							chosen.bonus &&
							typeof chosen.bonus.minDamage !== 'undefined'
						) {
							const baseDamage = baseDbToUse.damage || 0;
							const bonusPercentRaw =
								Math.random() * (chosen.bonus.maxDamage - chosen.bonus.minDamage) +
								chosen.bonus.minDamage;
							// Keep a readable numeric percent (two decimals)
							const bonusPercent = Math.round(bonusPercentRaw * 100) / 100;
							const bonusDamage = Math.floor((baseDamage * bonusPercent) / 100);
							// Store base + applied rarity info so UI can display the percent
							gen.baseDamage = baseDamage;
							gen.rarityApplied = { bonusPercent, bonusDamage };
							gen.damage = baseDamage + bonusDamage;
						}
						if (isArmor && chosen && chosen.bonus) {
							// pDef and mDef - percentage bonuses per rarities table (e.g. 8..12 => percent)
							const basePDef = baseDbToUse.physicalDefense || 0;
							const baseMDef = baseDbToUse.magicDefense || 0;
							// choose percent in inclusive range
							const pDefPercent =
								Math.floor(Math.random() * (chosen.bonus.pDefMax - chosen.bonus.pDefMin + 1)) +
								chosen.bonus.pDefMin;
							const mDefPercent =
								Math.floor(Math.random() * (chosen.bonus.mDefMax - chosen.bonus.mDefMin + 1)) +
								chosen.bonus.mDefMin;
							// compute effective defenses (rounded down)
							const effectivePDef = basePDef + Math.floor((basePDef * pDefPercent) / 100);
							const effectiveMDef = baseMDef + Math.floor((baseMDef * mDefPercent) / 100);
							// store both base and effective so UI can display "base + X%" while calculations use effective
							gen.basePhysicalDefense = basePDef;
							gen.baseMagicDefense = baseMDef;
							gen.physicalDefense = effectivePDef;
							gen.magicDefense = effectiveMDef;
							// HP - flat bonus. Read base HP defensively from either `effect` or `effects`, and support both key casings.
							let hpAdd = 0;
							let baseHp =
								(baseDbToUse.effect && (baseDbToUse.effect.hp || baseDbToUse.effect.HP)) ||
								(baseDbToUse.effects && (baseDbToUse.effects.hp || baseDbToUse.effects.HP)) ||
								0;
							if (chosen.bonus.hpMin !== undefined) {
								hpAdd =
									Math.floor(Math.random() * (chosen.bonus.hpMax - chosen.bonus.hpMin + 1)) +
									chosen.bonus.hpMin;
							}
							gen.baseEffectHp = baseHp;
							// Preserve both shapes so other code paths see the combined value
							gen.effect = { ...(baseDbToUse.effect || {}), hp: baseHp + hpAdd };
							gen.effects = { ...(baseDbToUse.effects || {}), HP: baseHp + hpAdd };
							// expose applied rarity values for display
							gen.rarityApplied = { pDefPercent, mDefPercent, hpAdd };
						} // Add to local inventory list (we will write final state at end)
						if (gen && gen.id) {
							inv.push({ id: gen.id, name: gen.name, qty: 1, ...gen });
							try {
								show(`You opened ${item.name} and found ${gen.name}`);
							} catch {
								// empty
							}
						} else {
							// Fallback: nothing found - add nothing and log
							console.warn('[BOX] Could not generate item for', reward);
						}
					}
				} else {
					// Otherwise treat as a normal named item - find in database and add
					let dbItem2 = null;
					if (/^\d+$/.test(String(selection.item))) dbItem2 = itemDatabase[String(selection.item)];
					if (!dbItem2)
						dbItem2 = Object.values(itemDatabase).find(
							(it) => it.name === selection.item || String(it.id) === String(selection.item)
						);
					if (dbItem2) {
						inv.push({ id: dbItem2.id, name: dbItem2.name, qty: 1 });
					}
				}
			}
		}

		// prepare player changes based on item.effect (simple schema: { hp, sp, stamina, gold })
		const eff = item.effect || {};
		// compute new playerData caps inside saveState
		gameState.update((s) => {
			const base = s || {};
			const next = { ...base };
			const pd = base.playerData || {};
			const changes = {};
			if (eff.hp) {
				changes.hp = Math.min((pd.hp || 0) + eff.hp, pd.maxHp || 100);
			}
			if (eff.sp) {
				changes.sp = Math.min((pd.sp || 0) + eff.sp, pd.maxSp || 100);
			}
			if (eff.stamina) {
				changes.stamina = Math.min((pd.stamina || 0) + eff.stamina, pd.maxStamina || 100);
			}
			if (eff.gold) {
				changes.gold = (pd.gold || 0) + eff.gold;
			}
			next.playerData = { ...pd, ...changes };
			next.character = { ...(base.character || {}), inventory: inv };
			return next;
		});
	}

	function equipItemToSlot(item, slot) {
		if (!item) return;

		try {
			// Map slot names to equipment keys first
			const slotMapping = {
				main: 'weapon1',
				off: 'weapon2',
				head: 'head',
				body: 'body',
				legs: 'legs',
				belt: 'belt',
				necklace: 'necklace',
				ring1: 'ring1',
				ring2: 'ring2'
			};

			const equipmentKey = slotMapping[slot];
			if (!equipmentKey) {
				console.warn('[EQUIP] Unknown slot:', slot, 'for item:', item.name);
				return;
			}

			// Check if player meets equipment requirements
			if (!canEquipItem(item)) {
				alert(
					`You don't meet the requirements to equip ${item.name}. Check your level, class, and stats.`
				);
				return;
			}

			// Check if item can be equipped in the target slot (use equipmentKey for validation)
			if (!canEquipInSlot(item.id, equipmentKey)) {
				alert(`${item.name} cannot be equipped in the ${slot} slot.`);
				return;
			}

			// PRE-CHECK: Prevent non-rogues from dual wielding any weapons
			const cls = (character?.class || '').toString().toLowerCase();

			if ((equipmentKey === 'weapon1' || equipmentKey === 'weapon2') && item.weaponClass) {
				const otherSlot = equipmentKey === 'weapon1' ? 'weapon2' : 'weapon1';
				const otherWeapon = equipment?.[otherSlot];

				// Check if trying to dual wield
				if (otherWeapon && otherWeapon !== 'none' && otherWeapon.weaponClass) {
					// Check if this is actually a two-handed weapon (not just same ID)
					const itemSlot = parseItemId(item.id)?.slot;
					const isTwoHanded =
						itemSlot === 3 || (item.weaponType || '').toLowerCase().includes('two');

					// Allow if same item AND it's actually a two-handed weapon
					if (otherWeapon.id === item.id && isTwoHanded) {
						// Two-handed weapon, allow it
					} else {
						// Different weapons OR same weapon but not two-handed - check if this is allowed dual wielding
						const itemCat = parseItemId(item.id)?.category;
						const otherCat = parseItemId(otherWeapon.id)?.category;

						// Both are weapons (not shields)
						if (itemCat >= 11 && itemCat <= 17 && otherCat >= 11 && otherCat <= 17) {
							const itemIsDagger = item.weaponClass === 'Daggers';
							const otherIsDagger = otherWeapon.weaponClass === 'Daggers';

							// Only rogues can dual wield, and only daggers
							if (!(cls === 'rogue' && itemIsDagger && otherIsDagger)) {
								alert(`${character?.class || 'Your class'} cannot dual wield weapons!`);
								return;
							}
						}
					}
				}
			}

			// Equip the item to specific slot
			const currentEquipment = { ...(equipment || defaultEquipment) };

			// Handle special cases for two-handed weapons
			if (equipmentKey === 'weapon1') {
				const { slot: itemSlot } = parseItemId(item.id);
				if (itemSlot === 3) {
					// Two-handed weapon - equip to both hands
					currentEquipment.weapon1 = item;
					currentEquipment.weapon2 = item;
				} else {
					// Single-handed or versatile weapon - clear weapon2 if it's the same as weapon1 (two-handed weapon equipped)
					if (
						currentEquipment.weapon1 &&
						currentEquipment.weapon2 &&
						currentEquipment.weapon1.id === currentEquipment.weapon2.id
					) {
						currentEquipment.weapon2 = null;
					}
					currentEquipment.weapon1 = item;
				}
			} else if (equipmentKey === 'weapon2') {
				const { slot: itemSlot } = parseItemId(item.id);
				if (itemSlot === 3) {
					// Two-handed weapon - equip to both hands
					currentEquipment.weapon1 = item;
					currentEquipment.weapon2 = item;
				} else {
					// Single-handed, off-hand, versatile, or shield - clear weapon1 if it's the same as weapon2 (two-handed weapon equipped)
					if (
						currentEquipment.weapon1 &&
						currentEquipment.weapon2 &&
						currentEquipment.weapon1.id === currentEquipment.weapon2.id
					) {
						currentEquipment.weapon1 = null;
					}
					currentEquipment.weapon2 = item;
				}
			} else {
				// For armor and accessories, just equip to the slot
				currentEquipment[equipmentKey] = item;
			}

			// Validate dual wielding rules based on class (reuse cls from pre-check above)
			if (
				currentEquipment.weapon1 &&
				currentEquipment.weapon2 &&
				currentEquipment.weapon1 !== 'none' &&
				currentEquipment.weapon2 !== 'none'
			) {
				const w1cat = parseItemId(currentEquipment.weapon1.id)?.category;
				const w2cat = parseItemId(currentEquipment.weapon2.id)?.category;

				// Allow two-handed weapons (both slots have the same item)
				if (currentEquipment.weapon1.id === currentEquipment.weapon2.id) {
					// This is a two-handed weapon, allow it
				} else if (w1cat >= 11 && w1cat <= 17 && w2cat >= 11 && w2cat <= 17) {
					// Both are different weapons - ONLY allow rogues to dual wield daggers
					const w1IsDagger = currentEquipment.weapon1.weaponClass === 'Daggers';
					const w2IsDagger = currentEquipment.weapon2.weaponClass === 'Daggers';

					if (!(cls === 'rogue' && w1IsDagger && w2IsDagger)) {
						// Block all dual wielding except rogues with daggers
						alert(`${character?.class || 'Your class'} cannot dual wield weapons!`);
						return;
					}
				} else if (
					(w1cat === 18 || w2cat === 18) &&
					((w1cat >= 11 && w1cat <= 17) || (w2cat >= 11 && w2cat <= 17))
				) {
					// One is a shield and one is a weapon - check if class can equip shields
					const shieldItem = w1cat === 18 ? currentEquipment.weapon1 : currentEquipment.weapon2;
					if (!canEquipItem(shieldItem)) {
						alert(`You don't meet the requirements to equip ${shieldItem.name}.`);
						return;
					}
					// If they can equip the shield, allow weapon + shield combination
				}
			}

			// Save the equipment change
			gameState.update((s) => ({
				...(s || {}),
				character: { ...(s.character || {}), equipment: currentEquipment }
			}));

			// Recalculate derived stats
			recalculateDerivedStats();

			// Autosave
			try {
				saveManager.saveGame({ auto: true });
			} catch (err) {
				console.warn('Auto-save after equip failed:', err);
			}
		} catch (error) {
			console.error('Error equipping item to slot:', error);
		}
	}

	function equipItem(item) {
		if (!item) return;

		try {
			// Check if item is already equipped - if so, unequip it
			if (isItemEquipped(item)) {
				unequipItem(item);
				return;
			}

			// Check if player meets equipment requirements
			if (!canEquipItem(item)) {
				alert(
					`You don't meet the requirements to equip ${item.name}. Check your level, class, and stats.`
				);
				return;
			}

			// Equip the item - determine appropriate slot based on item ID
			const currentEquipment = { ...(equipment || defaultEquipment) };

			// Determine target slot based on item type
			let targetSlot = null;
			if (isWeapon(item.id)) {
				const { category } = parseItemId(item.id);

				// Shields (category 18) always go to off-hand
				if (category === 18) {
					targetSlot = 'weapon2';
				} else {
					// For weapons, try main hand first, then off hand
					if (!currentEquipment.weapon1 || currentEquipment.weapon1 === 'none') {
						targetSlot = 'weapon1';
					} else if (!currentEquipment.weapon2 || currentEquipment.weapon2 === 'none') {
						targetSlot = 'weapon2';
					} else {
						// Both occupied, replace main hand
						targetSlot = 'weapon1';
					}
				}

				// PRE-CHECK: Prevent non-rogues from dual wielding any weapons
				const cls = (character?.class || '').toString().toLowerCase();

				if (targetSlot && item.weaponClass) {
					const otherSlot = targetSlot === 'weapon1' ? 'weapon2' : 'weapon1';
					const otherWeapon = currentEquipment[otherSlot];

					// Check if trying to dual wield
					if (otherWeapon && otherWeapon !== 'none' && otherWeapon.weaponClass) {
						// Check if this is actually a two-handed weapon (not just same ID)
						const itemSlot = parseItemId(item.id)?.slot;
						const isTwoHanded =
							itemSlot === 3 || (item.weaponType || '').toLowerCase().includes('two');

						// Allow if same item AND it's actually a two-handed weapon
						if (otherWeapon.id === item.id && isTwoHanded) {
							// Two-handed weapon, allow it
						} else {
							// Different weapons OR same weapon but not two-handed - check if this is allowed dual wielding
							const itemCat = parseItemId(item.id)?.category;
							const otherCat = parseItemId(otherWeapon.id)?.category;

							// Both are weapons (not shields)
							if (itemCat >= 11 && itemCat <= 17 && otherCat >= 11 && otherCat <= 17) {
								const itemIsDagger = item.weaponClass === 'Daggers';
								const otherIsDagger = otherWeapon.weaponClass === 'Daggers';

								// Only rogues can dual wield, and only daggers
								if (!(cls === 'rogue' && itemIsDagger && otherIsDagger)) {
									alert(`${character?.class || 'Your class'} cannot dual wield weapons!`);
									return;
								}
							}
						}
					}
				}
			} else {
				// For armor/accessories, determine slot from ID
				const { slot: itemSlot } = parseItemId(item.id);
				const slotMap = {
					1: 'head', // Head armor
					2: 'body', // Body armor
					3: 'legs', // Legs armor
					4: 'belt', // Belt
					5: 'necklace', // Necklace
					6: 'ring1', // Ring (try first slot)
					7: 'ring2' // Ring (second slot)
				};
				targetSlot = slotMap[itemSlot];

				// Special handling for rings - use first available
				if (itemSlot === 6 || itemSlot === 7) {
					if (!currentEquipment.ring1) {
						targetSlot = 'ring1';
					} else if (!currentEquipment.ring2) {
						targetSlot = 'ring2';
					} else {
						targetSlot = 'ring1'; // Replace first ring
					}
				}
			}

			if (!targetSlot || !canEquipInSlot(item.id, targetSlot)) {
				alert(`${item.name} cannot be equipped.`);
				return;
			}

			// Handle special cases for two-handed weapons
			if (isWeapon(item.id)) {
				const { slot: itemSlot } = parseItemId(item.id);
				if (itemSlot === 3) {
					// Two-handed weapon
					currentEquipment.weapon1 = item;
					currentEquipment.weapon2 = item;
				} else if (targetSlot === 'weapon1') {
					currentEquipment.weapon1 = item;
					// If equipping one-handed to main, unequip two-handed from off
					if (
						currentEquipment.weapon2 &&
						currentEquipment.weapon2 !== 'none' &&
						currentEquipment.weapon2 === currentEquipment.weapon1
					) {
						currentEquipment.weapon2 = 'none';
					}
				} else if (targetSlot === 'weapon2') {
					// If equipping to off-hand, clear two-handed weapon from main hand
					if (
						currentEquipment.weapon1 &&
						currentEquipment.weapon2 &&
						currentEquipment.weapon1 === currentEquipment.weapon2
					) {
						currentEquipment.weapon1 = 'none';
					}
					currentEquipment.weapon2 = item;
				}
			} else {
				// For armor and accessories
				currentEquipment[targetSlot] = item;
			}

			// Validate dual wielding rules based on class
			const cls = (character?.class || '').toString().toLowerCase();
			if (
				currentEquipment.weapon1 &&
				currentEquipment.weapon2 &&
				currentEquipment.weapon1 !== 'none' &&
				currentEquipment.weapon2 !== 'none'
			) {
				const w1cat = parseItemId(currentEquipment.weapon1.id)?.category;
				const w2cat = parseItemId(currentEquipment.weapon2.id)?.category;

				// Allow two-handed weapons (both slots have the same item)
				if (currentEquipment.weapon1.id === currentEquipment.weapon2.id) {
					// This is a two-handed weapon, allow it
				} else if (w1cat >= 11 && w1cat <= 17 && w2cat >= 11 && w2cat <= 17) {
					// Both are different weapons - ONLY allow rogues to dual wield daggers
					const w1IsDagger = currentEquipment.weapon1.weaponClass === 'Daggers';
					const w2IsDagger = currentEquipment.weapon2.weaponClass === 'Daggers';

					if (!(cls === 'rogue' && w1IsDagger && w2IsDagger)) {
						// Block all dual wielding except rogues with daggers
						alert(`${character?.class || 'Your class'} cannot dual wield weapons!`);
						return;
					}
				} else if (
					(w1cat === 18 || w2cat === 18) &&
					((w1cat >= 11 && w1cat <= 17) || (w2cat >= 11 && w2cat <= 17))
				) {
					// One is a shield and one is a weapon - check if class can equip shields
					const shieldItem = w1cat === 18 ? currentEquipment.weapon1 : currentEquipment.weapon2;
					if (!canEquipItem(shieldItem)) {
						alert(`You don't meet the requirements to equip ${shieldItem.name}.`);
						return;
					}
					// If they can equip the shield, allow weapon + shield combination
				}
			}

			// Save the equipment change
			gameState.update((s) => ({
				...(s || {}),
				character: { ...(s.character || {}), equipment: currentEquipment }
			}));

			// Recalculate derived stats
			recalculateDerivedStats();

			// Autosave
			try {
				saveManager.saveGame({ auto: true });
			} catch (err) {
				console.warn('[INVENTORY] Auto-save after equip failed:', err);
			}
		} catch (error) {
			console.error('[INVENTORY] equipItem ERROR:', error);
			alert(`Failed to equip item: ${error?.message || 'Unknown error'}`);
		}
	}

	function unequipItemFromSlot(slot) {
		if (!slot) return;

		try {
			const currentEquipment = { ...(equipment || defaultEquipment) };
			const equipmentSlot = slot === 'main' ? 'weapon1' : 'weapon2';

			// Unequip the item from the specified slot
			if (currentEquipment[equipmentSlot]) {
				const itemId = currentEquipment[equipmentSlot].id;
				currentEquipment[equipmentSlot] = null;

				// If unequipping a two-handed weapon, also unequip the other hand
				const otherSlot = slot === 'main' ? 'weapon2' : 'weapon1';
				if (currentEquipment[otherSlot] && currentEquipment[otherSlot].id === itemId) {
					currentEquipment[otherSlot] = null;
				}
			}

			// Save the equipment change
			gameState.update((s) => ({
				...(s || {}),
				character: { ...(s.character || {}), equipment: currentEquipment }
			}));

			// Recalculate derived stats
			recalculateDerivedStats();

			// Autosave
			try {
				saveManager.saveGame({ auto: true });
			} catch (err) {
				console.warn('Auto-save after unequip failed:', err);
			}
		} catch (error) {
			console.error('Error unequipping item from slot:', error);
		}
	}

	function unequipItem(item) {
		if (!item) return;

		const currentEquipment = { ...(equipment || defaultEquipment) };

		// Find and remove the item from equipment slots
		// Handle both object items and string IDs
		Object.keys(currentEquipment).forEach((slot) => {
			const equipped = currentEquipment[slot];
			const equippedId = typeof equipped === 'object' ? equipped?.id : equipped;
			if (equippedId === item.id) {
				currentEquipment[slot] = null;
			}
		});

		// Save the equipment change
		gameState.update((s) => ({
			...(s || {}),
			character: { ...(s.character || {}), equipment: currentEquipment }
		}));

		// Recalculate derived stats
		recalculateDerivedStats();

		// Autosave

		try {
			saveManager.saveGame({ auto: true });
		} catch (err) {
			console.warn('Auto-save after unequip failed:', err);
		}
	}
</script>

<div class="inventory-panel" role="dialog" aria-modal="false">
	<header>
		<h3>Inventory</h3>
		<div class="header-actions">
			<button
				class="stats-toggle-btn"
				on:click={() => (showAdvancedStats = !showAdvancedStats)}
				title="Toggle Advanced Stats"
			>
				📊 Stats
			</button>
			<button class="close" aria-label="Close" on:click={() => dispatch('close')}>✕</button>
		</div>
	</header>

	<!-- Page tabs: each type gets its own page -->
	<nav class="inventory-tabs" role="tablist">
		<button
			role="tab"
			aria-selected={currentPage === 'quest'}
			class:active={currentPage === 'quest'}
			on:click={() => (currentPage = 'quest')}
		>
			Quest(s) <span class="count">({groups.quest.length})</span>
		</button>
		<button
			role="tab"
			aria-selected={currentPage === 'equipment'}
			class:active={currentPage === 'equipment'}
			on:click={() => (currentPage = 'equipment')}
		>
			Equipment(s) <span class="count">({expandedEquipment.length})</span>
		</button>
		<button
			role="tab"
			aria-selected={currentPage === 'consumable'}
			class:active={currentPage === 'consumable'}
			on:click={() => (currentPage = 'consumable')}
		>
			Consumable(s) <span class="count">({groups.consumable.length})</span>
		</button>
		<button
			role="tab"
			aria-selected={currentPage === 'others'}
			class:active={currentPage === 'others'}
			on:click={() => (currentPage = 'others')}
		>
			Other(s) <span class="count">({groups.others.length})</span>
		</button>
	</nav>

	<div class="page-container">
		{#if currentPage === 'quest'}
			<div class="page">
				<div class="items-container">
					{#if groups.quest.length === 0}
						<div class="empty">No quest items in your inventory.</div>
					{:else}
						{#each groups.quest as item (item.id)}
							<div class="item-row">
								<img
									src={item.icon ||
										'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23444" width="64" height="64"/%3E%3C/svg%3E'}
									alt={item.name}
									class="icon clickable-icon"
									on:error={(e) => {
										e.target.src =
											'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23333" width="64" height="64"/%3E%3Ctext x="32" y="40" text-anchor="middle" fill="%23fff" font-size="24"%3E?%3C/text%3E%3C/svg%3E';
									}}
									on:click={() => openItemDetail(item)}
									title="Click to view details"
								/>
								<div class="details">
									<div class="name">{item.name}</div>
									<div class="description">{item.description || 'A quest-related item'}</div>
								</div>
								<div class="quantity">×{item.qty || 1}</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		{#if currentPage === 'equipment'}
			<div class="page">
				<div class="subtabs">
					{#if equipmentCategories && equipmentCategories.length > 0}
						{#each equipmentCategories as cat}
							<button
								type="button"
								class="subtab"
								class:active={equipmentCategory === cat}
								on:click={() => (equipmentCategory = cat)}
								aria-pressed={equipmentCategory === cat}
							>
								{cat}
								{#if cat === 'All'} <span class="count">({expandedEquipment.length})</span>{/if}
							</button>
						{/each}
					{/if}
				</div>
				<div class="items-container">
					{#if expandedEquipment.length === 0}
						<div class="empty">No equipment in your inventory.</div>
					{:else}
						{#each sortedEquipment as item (item.id)}
							<div class="item-row" class:equipped={item.equippedCount > 0}>
								<img
									src={item.icon ||
										'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23444" width="64" height="64"/%3E%3C/svg%3E'}
									alt={item.name}
									class="icon clickable-icon"
									on:error={(e) => {
										e.target.src =
											'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23333" width="64" height="64"/%3E%3Ctext x="32" y="40" text-anchor="middle" fill="%23fff" font-size="24"%3E?%3C/text%3E%3C/svg%3E';
									}}
									on:click={() => openItemDetail(item)}
									title="Click to view details"
								/>
								<div class="name-section">
									<div class="name-compact">
										{item.name}
										{#if item.equippedCount > 0 && (item.category || '').toLowerCase() === 'weapon' && item.equippedCount + item.availableQty > 1}
											<span class="equipped-status">
												[{item.equippedCount}/{item.equippedCount + item.availableQty} - {isDualWielding
													? 'Dual'
													: 'Single'} Wielding]
											</span>
										{/if}
									</div>
								</div>
								<div class="quantity-compact">
									x{item.equippedCount + item.availableQty}
								</div>
								<div class="actions">
									{#if (item.category || '').toLowerCase() === 'weapon'}
										<div class="weapon-actions">
											{#if isTwoHandedWeapon(item)}
												<!-- Two-handed weapon: show single unequip or equip button -->
												{#if isItemEquippedInSlot(item, 'weapon1')}
													<button
														class="action-btn unequip-btn"
														on:click={() => unequipItemFromSlot('main')}
														title="Unequip Two-Handed Weapon"
													>
														Unequip Two-Handed
													</button>
												{:else if item.equippedCount + item.availableQty > 0}
													<button
														class="action-btn {isSlotOccupied('weapon1') ||
														isSlotOccupied('weapon2')
															? 'replace-main-btn'
															: 'equip-main-btn'}"
														disabled={!canEquipInSlot(item.id, 'weapon1') || !canEquipItem(item)}
														on:click={() => equipItemToSlot(item, 'main')}
														title={!canEquipInSlot(item.id, 'weapon1') || !canEquipItem(item)
															? !canEquipInSlot(item.id, 'weapon1')
																? 'Cannot equip this weapon'
																: 'You do not meet the requirements to equip this item'
															: isSlotOccupied('weapon1') || isSlotOccupied('weapon2')
																? 'Replace equipped weapon(s)'
																: 'Equip Two-Handed Weapon'}
													>
														{isSlotOccupied('weapon1') || isSlotOccupied('weapon2')
															? 'Replace Weapon(s)'
															: 'Equip Two-Handed'}
													</button>
												{/if}
											{:else}
												<!-- Single-handed, versatile, or off-hand weapons: show both buttons -->
												{#if isItemEquippedInSlot(item, 'weapon1')}
													<button
														class="action-btn unequip-btn"
														on:click={() => unequipItemFromSlot('main')}
														title="Remove from Main Hand"
													>
														Remove from Main Hand
													</button>
												{:else if item.equippedCount + item.availableQty > 0}
													<button
														class="action-btn {isSlotOccupied('weapon1')
															? 'replace-main-btn'
															: 'equip-main-btn'}"
														disabled={!canEquipInSlot(item.id, 'weapon1') || !canEquipItem(item)}
														on:click={() => equipItemToSlot(item, 'main')}
														title={!canEquipInSlot(item.id, 'weapon1') || !canEquipItem(item)
															? !canEquipInSlot(item.id, 'weapon1')
																? 'Cannot equip in Main Hand'
																: 'You do not meet the requirements to equip this item'
															: isSlotOccupied('weapon1')
																? 'Replace Main Hand weapon'
																: 'Equip to Main Hand'}
													>
														{isSlotOccupied('weapon1') ? 'Replace Main Hand' : 'Equip to Main Hand'}
													</button>
												{/if}
												{#if isItemEquippedInSlot(item, 'weapon2')}
													<button
														class="action-btn unequip-btn"
														on:click={() => unequipItemFromSlot('off')}
														title="Remove from Off Hand"
													>
														Remove from Off Hand
													</button>
												{:else if item.equippedCount + item.availableQty > 0}
													<button
														class="action-btn {isSlotOccupied('weapon2')
															? 'replace-off-btn'
															: 'equip-off-btn'}"
														disabled={!canEquipInSlot(item.id, 'weapon2') || !canEquipItem(item)}
														on:click={() => equipItemToSlot(item, 'off')}
														title={!canEquipInSlot(item.id, 'weapon2') || !canEquipItem(item)
															? !canEquipInSlot(item.id, 'weapon2')
																? 'Cannot equip in Off Hand'
																: 'You do not meet the requirements to equip this item'
															: isSlotOccupied('weapon2')
																? 'Replace Off Hand weapon'
																: 'Equip to Off Hand'}
													>
														{isSlotOccupied('weapon2') ? 'Replace Off Hand' : 'Equip to Off Hand'}
													</button>
												{/if}
											{/if}
										</div>
									{:else}
										<button
											class="action-btn equip-btn"
											class:disabled={!canEquipItem(item)}
											disabled={!canEquipItem(item)}
											on:click={() =>
												item.equippedCount > 0 ? unequipItem(item) : equipItem(item)}
											title={item.equippedCount > 0
												? 'Unequip this item'
												: !canEquipItem(item)
													? 'Requirements not met'
													: 'Equip this item'}
										>
											<svg
												viewBox="0 0 24 24"
												width="16"
												height="16"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												/>
											</svg>
											{item.equippedCount > 0 ? 'Unequip' : 'Equip'}
										</button>
									{/if}
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		{#if currentPage === 'consumable'}
			<div class="page">
				<div class="items-container">
					{#if groups.consumable.length === 0}
						<div class="empty">No consumables in your inventory.</div>
					{:else}
						{#each sortedConsumables as item (item.id)}
							<div class="item-row">
								<img
									src={item.icon ||
										'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23555" width="64" height="64"/%3E%3C/svg%3E'}
									alt={item.name}
									class="icon clickable-icon"
									on:error={(e) => {
										e.target.src =
											'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23333" width="64" height="64"/%3E%3Ctext x="32" y="40" text-anchor="middle" fill="%23fff" font-size="24"%3E?%3C/text%3E%3C/svg%3E';
									}}
									on:click={() => openItemDetail(item)}
									title="Click to view details"
								/>
								<div class="details">
									<div class="name">{item.name}</div>
									<div class="description">
										{item.description || 'Consumable item'}
										{#if item.effect || item.effects}
											&nbsp;—&nbsp;{formatEffectSummary(item.effect || item.effects)}
										{/if}
									</div>
								</div>
								<div class="quantity">×{item.qty || 1}</div>
								<div class="actions">
									<button class="action-btn use-btn" on:click={() => useItem(item)}>
										<svg
											viewBox="0 0 24 24"
											width="16"
											height="16"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 9h2v5H9V9zm4 0h2v5h-2V9z"
												fill="currentColor"
											/>
										</svg>
										Use
									</button>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		{#if currentPage === 'others'}
			<div class="page">
				<div class="items-container">
					{#if groups.others.length === 0}
						<div class="empty">No other items in your inventory.</div>
					{:else}
						{#each groups.others as item (item.id)}
							<div class="item-row">
								<img
									src={item.icon || '/Images/item-placeholder.svg'}
									alt={item.name}
									class="icon clickable-icon"
									on:error={(e) => {
										e.target.src =
											'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23333" width="64" height="64"/%3E%3Ctext x="32" y="40" text-anchor="middle" fill="%23fff" font-size="24"%3E?%3C/text%3E%3C/svg%3E';
									}}
									on:click={() => openItemDetail(item)}
									title="Click to view details"
								/>
								<div class="details">
									<div class="name">{item.name}</div>
									<div class="description">{item.description || 'Miscellaneous item'}</div>
								</div>
								<div class="quantity">×{item.qty || 1}</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}
	</div>

	{#if tipVisible}
		<div class="item-tip" style="left:{tipLeft}px; top:{tipTop}px">{tipText}</div>
	{/if}
</div>

{#if showAdvancedStats}
	<AdvancedStatsWindow
		on:close={() => (showAdvancedStats = false)}
		initialCharacter={character}
		initialPlayerData={playerData}
	/>
{/if}

{#if showItemDetail && selectedItem}
	<div
		style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); display: flex; align-items: center; justify-content: center; z-index: 1500;"
		on:click={closeItemDetail}
	>
		<div
			style="position: relative; background: linear-gradient(180deg, #0f1724 0%, #071029 100%); border-radius: 12px; width: min(500px, 90%); max-height: 80vh; overflow: hidden; box-shadow: 0 22px 60px rgba(2, 8, 23, 0.75); border-left: 6px solid rgba(0, 186, 255, 0.9);"
			on:click|stopPropagation
		>
			<div
				style="display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);"
			>
				<h3 style="margin: 0; font-size: 20px; color: #00baff;">{selectedItem.name}</h3>
				<button
					on:click={closeItemDetail}
					style="background: transparent; border: none; color: rgba(255, 255, 255, 0.8); font-size: 24px; cursor: pointer;"
					>✕</button
				>
			</div>
			<div style="padding: 20px; overflow-y: auto; max-height: calc(80vh - 80px);">
				<div style="display: flex; flex-direction: column; gap: 20px;">
					<img
						src={selectedItem.icon ||
							'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23333" width="150" height="150"/%3E%3C/svg%3E'}
						alt={selectedItem.name}
						style="width: 150px; height: 150px; border-radius: 8px; border: 2px solid rgba(0, 186, 255, 0.3); object-fit: contain; background: rgba(0, 0, 0, 0.3); margin: 0 auto; display: block;"
						on:error={(e) => {
							e.target.src =
								'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23333" width="150" height="150"/%3E%3Ctext x="75" y="90" text-anchor="middle" fill="%23fff" font-size="60"%3E?%3C/text%3E%3C/svg%3E';
						}}
					/>
					<div style="display: flex; flex-direction: column; gap: 12px;">
						<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
							<strong style="color: #00baff; margin-right: 8px;">Category:</strong>
							{selectedItem.category || 'Unknown'}
						</div>
						{#if selectedItem.qty}
							<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
								<strong style="color: #00baff; margin-right: 8px;">Quantity:</strong>
								×{selectedItem.qty}
							</div>
						{/if}
						{#if selectedItem.price}
							<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
								<strong style="color: #00baff; margin-right: 8px;">Value:</strong>
								{Math.floor(selectedItem.price / 1000)}g {selectedItem.price % 1000}s
							</div>
						{/if}
						{#if selectedItem.requirements}
							<div
								style="padding: 12px; background: rgba(255, 255, 255, 0.02); border-radius: 6px; border-left: 3px solid rgba(255, 193, 7, 0.5);"
							>
								<strong style="display: block; margin-bottom: 8px; color: #ffc107;"
									>Requirements:</strong
								>
								{#if selectedItem.requirements.level}
									<div style="padding: 4px 0; font-size: 14px; opacity: 0.9;">
										Level: {selectedItem.requirements.level}
									</div>
								{/if}
								{#if selectedItem.requirements.class}
									<div style="padding: 4px 0; font-size: 14px; opacity: 0.9;">
										Class: {Array.isArray(selectedItem.requirements.class)
											? selectedItem.requirements.class.join(', ')
											: selectedItem.requirements.class}
									</div>
								{/if}
								{#if selectedItem.requirements.stats}
									<div style="padding: 4px 0; font-size: 14px; opacity: 0.9;">
										Stats: {Object.entries(selectedItem.requirements.stats)
											.map(([stat, val]) => `${stat}: ${val}`)
											.join(', ')}
									</div>
								{/if}
							</div>
						{/if}
						{#if selectedItem.damage}
							<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
								<strong style="color: #00baff; margin-right: 8px;">Damage:</strong>
								{#if selectedItem.rarityApplied && typeof selectedItem.baseDamage !== 'undefined'}
									{selectedItem.baseDamage} <small style="opacity:0.9;">(+{selectedItem.rarityApplied.bonusPercent}% → +{selectedItem.rarityApplied.bonusDamage})</small>
									<span style="margin-left:8px; color: #9ae6ff;">= {selectedItem.damage}</span>
								{:else}
									{selectedItem.damage}
								{/if}
							</div>
						{/if}
						{#if selectedItem.physicalDefense || selectedItem.magicDefense}
							<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
								<strong style="color: #00baff; margin-right: 8px;">Defense:</strong>
								{#if selectedItem.rarityApplied}
									{#if typeof selectedItem.basePhysicalDefense !== 'undefined'}
										P.DEF: {selectedItem.basePhysicalDefense} + {selectedItem.rarityApplied.pDefPercent}%
									{:else}
										P.DEF: {selectedItem.physicalDefense}
									{/if}
									{#if typeof selectedItem.baseMagicDefense !== 'undefined'}
										M.DEF: {selectedItem.baseMagicDefense} + {selectedItem.rarityApplied.mDefPercent}%
									{:else}
										M.DEF: {selectedItem.magicDefense}
									{/if}
								{:else}
									{#if selectedItem.physicalDefense}P.DEF: {selectedItem.physicalDefense}{/if}
									{#if selectedItem.magicDefense}
										M.DEF: {selectedItem.magicDefense}{/if}
								{/if}
							</div>
						{/if}
						{#if selectedItem.attackSpeed}
							<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
								<strong style="color: #00baff; margin-right: 8px;">Attack Speed:</strong>
								{(() => {
									const speeds = [];
									if (selectedItem.attackSpeed.single) {
										const percent = (selectedItem.attackSpeed.single - 1) * 100;
										speeds.push(`Single: ${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`);
									}
									if (selectedItem.attackSpeed.dual) {
										const percent = (selectedItem.attackSpeed.dual - 1) * 100;
										speeds.push(`Dual: ${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`);
									}
									if (selectedItem.attackSpeed.shield) {
										const percent = (selectedItem.attackSpeed.shield - 1) * 100;
										speeds.push(`Shield: ${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`);
									}
									// Ignore `attackSpeed.base` for display; show explicit single/dual/shield modifiers only.
									return speeds.length ? speeds.join(', ') : 'Standard speed';
								})()}
							</div>
						{/if}
						{#if selectedItem.effect || selectedItem.effects}
							<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
								<strong style="color: #00baff; margin-right: 8px;">Effects:</strong>
								{(() => {
									const effects = [];
									const effectData = selectedItem.effect || selectedItem.effects;
									if (effectData.hp || effectData.HP) {
										effects.push(`HP: +${effectData.hp || effectData.HP}`);
									}
									if (effectData.sp || effectData.SP) {
										effects.push(`SP: +${effectData.sp || effectData.SP}`);
									}
									if (effectData.strength || effectData.STR) {
										effects.push(`STR: +${effectData.strength || effectData.STR}`);
									}
									if (effectData.dexterity || effectData.DEX) {
										effects.push(`DEX: +${effectData.dexterity || effectData.DEX}`);
									}
									if (effectData.intelligence || effectData.INT) {
										effects.push(`INT: +${effectData.intelligence || effectData.INT}`);
									}
									if (effectData.vitality || effectData.VIT) {
										effects.push(`VIT: +${effectData.vitality || effectData.VIT}`);
									}
									if (effectData.luck || effectData.LUK) {
										effects.push(`LUK: +${effectData.luck || effectData.LUK}`);
									}
									return effects.length ? effects.join(', ') : 'No effects';
								})()}
							</div>
						{/if}
						<div style="padding: 12px; background: rgba(255, 255, 255, 0.02); border-radius: 6px;">
							<strong style="display: block; margin-bottom: 8px; color: #00baff;"
								>Description:</strong
							>
							<p style="margin: 0;">{selectedItem.description || 'No description available.'}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.inventory-panel {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 12vh;
		bottom: 12vh;
		width: min(920px, 96%);
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

	header h3 {
		margin: 0;
		font-size: 18px;
	}

	.header-actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.stats-toggle-btn {
		padding: 6px 12px;
		background: rgba(0, 186, 255, 0.1);
		border: 1px solid rgba(0, 186, 255, 0.3);
		border-radius: 6px;
		color: #00baff;
		cursor: pointer;
		font-size: 13px;
		transition: all 0.2s;
	}

	.stats-toggle-btn:hover {
		background: rgba(0, 186, 255, 0.2);
		border-color: rgba(0, 186, 255, 0.5);
	}

	header .close {
		background: transparent;
		border: 0;
		color: rgba(255, 255, 255, 0.85);
		font-size: 20px;
		cursor: pointer;
		transition:
			transform 140ms ease,
			opacity 140ms ease;
		line-height: 1;
	}

	header .close:hover {
		transform: scale(1.06);
		opacity: 0.95;
	}

	.inventory-tabs {
		display: flex;
		gap: 4px;
		padding: 12px 16px 0 16px;
		flex-shrink: 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.inventory-tabs button {
		background: transparent;
		color: rgba(255, 255, 255, 0.6);
		border: none;
		border-bottom: 2px solid transparent;
		padding: 10px 16px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 500;
		transition: all 0.2s;
	}

	.inventory-tabs button:hover {
		color: rgba(255, 255, 255, 0.9);
		background: rgba(255, 255, 255, 0.02);
	}

	.inventory-tabs button.active {
		color: #00baff;
		border-bottom-color: #00baff;
		background: rgba(0, 186, 255, 0.05);
	}

	.inventory-tabs button .count {
		opacity: 0.7;
		font-size: 12px;
	}

	/* subtabs for equipment categories */
	.subtabs {
		display: flex;
		gap: 6px;
		padding: 8px 16px;
		border-bottom: 1px solid rgba(255,255,255,0.04);
		background: linear-gradient(180deg, rgba(255,255,255,0.01), transparent);
	}

	.subtab {
		background: transparent;
		color: rgba(255,255,255,0.65);
		border: 1px solid transparent;
		padding: 6px 10px;
		font-size: 13px;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.14s ease;
	}

	.subtab:hover {
		background: rgba(255,255,255,0.02);
		color: rgba(255,255,255,0.95);
	}

	.subtab[aria-pressed="true"], .subtab.active {
		background: rgba(0,186,255,0.06);
		color: #00baff;
		border-color: rgba(0,186,255,0.12);
	}

	.page-container {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.page {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.items-container {
		flex: 1;
		overflow-y: auto;
		padding: 12px;
		min-height: 0;
	}

	.item-row {
		display: grid;
		grid-template-columns: 56px 1fr auto auto;
		grid-template-rows: auto auto;
		gap: 4px 12px;
		padding: 12px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		transition: background 0.2s;
	}

	/* Compact layout for equipment items */
	.item-row:has(.name-compact) {
		display: flex;
		align-items: center;
		padding: 8px 12px;
		justify-content: space-between;
	}

	.item-row:has(.name-compact) .icon {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		margin-right: 8px;
	}

	.item-row:has(.name-compact) .name-section {
		flex: 1;
		display: flex;
		align-items: center;
		min-width: 0; /* Allow text to wrap */
	}

	.item-row:has(.name-compact) .quantity-compact {
		flex-shrink: 0;
		margin: 0 12px;
		min-width: 24px;
		text-align: center;
		font-weight: 600;
	}

	.item-row:has(.name-compact) .actions {
		flex-shrink: 0;
	}

	.item-row:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	.item-row .icon {
		grid-column: 1 / 2;
		grid-row: 1 / 3;
		width: 56px;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.item-row .icon.clickable-icon:hover {
		transform: scale(1.05);
		box-shadow: 0 4px 12px rgba(0, 186, 255, 0.3);
	}

	.item-row .icon {
		width: 56px;
		height: 56px;
		border-radius: 8px;
		object-fit: cover;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.02);
	}

	.item-row .details {
		grid-column: 2 / 3;
		grid-row: 1 / 3;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 4px;
	}

	.item-row .name {
		font-weight: 600;
		font-size: 14px;
		line-height: 1.3;
		color: rgba(255, 255, 255, 0.95);
	}

	.item-row .description {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.6);
		line-height: 1.4;
	}

	.item-row .quantity {
		grid-column: 3 / 4;
		grid-row: 1 / 3;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 14px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		min-width: 48px;
	}

	.item-row .actions {
		grid-column: 4 / 5;
		grid-row: 1 / 3;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.weapon-actions {
		display: flex;
		flex-direction: column;
		gap: 4px;
		align-items: stretch;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.9);
		cursor: pointer;
		font-size: 13px;
		font-weight: 500;
		transition: all 0.2s;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.action-btn:disabled,
	.action-btn.disabled {
		opacity: 0.4;
		cursor: not-allowed;
		background: rgba(255, 255, 255, 0.02);
		border-color: rgba(255, 255, 255, 0.05);
		color: rgba(255, 255, 255, 0.5);
	}

	.action-btn:disabled:hover,
	.action-btn.disabled:hover {
		background: rgba(255, 255, 255, 0.02);
		border-color: rgba(255, 255, 255, 0.05);
	}

	.equip-btn {
		border-color: rgba(76, 175, 80, 0.3);
		background: rgba(76, 175, 80, 0.1);
		color: #4caf50;
	}

	.equip-btn:hover {
		background: rgba(76, 175, 80, 0.2);
		border-color: rgba(76, 175, 80, 0.5);
	}

	.equip-main-btn {
		border-color: rgba(255, 193, 7, 0.3);
		background: rgba(255, 193, 7, 0.1);
		color: #ffc107;
		font-size: 12px;
		padding: 6px 8px;
	}

	.equip-main-btn:hover {
		background: rgba(255, 193, 7, 0.2);
		border-color: rgba(255, 193, 7, 0.5);
	}

	.equip-off-btn {
		border-color: rgba(156, 39, 176, 0.3);
		background: rgba(156, 39, 176, 0.1);
		color: #9c27b0;
		font-size: 12px;
		padding: 6px 8px;
	}

	.equip-off-btn:hover {
		background: rgba(156, 39, 176, 0.2);
		border-color: rgba(156, 39, 176, 0.5);
	}

	.replace-main-btn {
		border-color: rgba(0, 186, 255, 0.28);
		background: rgba(0, 186, 255, 0.08);
		color: #00baff;
		font-size: 12px;
		padding: 6px 8px;
	}

	.replace-main-btn:hover {
		background: rgba(0, 186, 255, 0.14);
		border-color: rgba(0, 186, 255, 0.48);
	}

	.replace-off-btn {
		border-color: rgba(0, 186, 255, 0.28);
		background: rgba(0, 186, 255, 0.08);
		color: #00baff;
		font-size: 12px;
		padding: 6px 8px;
	}

	.replace-off-btn:hover {
		background: rgba(0, 186, 255, 0.14);
		border-color: rgba(0, 186, 255, 0.48);
	}

	.unequip-btn {
		border-color: rgba(255, 87, 34, 0.3);
		background: rgba(255, 87, 34, 0.1);
		color: #ff5722;
		font-size: 12px;
		padding: 6px 8px;
	}

	.unequip-btn:hover {
		background: rgba(255, 87, 34, 0.2);
		border-color: rgba(255, 87, 34, 0.5);
	}

	/* Equipped item styling */
	.item-row.equipped {
		background: linear-gradient(90deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
		border-left: 3px solid rgba(76, 175, 80, 0.6);
	}

	.equipped-status {
		margin-left: 8px;
		padding: 2px 6px;
		background: rgba(76, 175, 80, 0.15);
		color: #4caf50;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 600;
		border: 1px solid rgba(76, 175, 80, 0.3);
	}

	.use-btn {
		border-color: rgba(33, 150, 243, 0.3);
		background: rgba(33, 150, 243, 0.1);
		color: #2196f3;
	}

	.use-btn:hover {
		background: rgba(33, 150, 243, 0.2);
		border-color: rgba(33, 150, 243, 0.5);
	}

	.empty {
		padding: 48px 24px;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		font-size: 14px;
	}

	.item-tip {
		position: fixed;
		max-width: 320px;
		background: rgba(0, 0, 0, 0.92);
		color: #fff;
		padding: 10px 14px;
		border-radius: 8px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
		z-index: 1600;
		font-size: 13px;
		line-height: 1.5;
		pointer-events: none;
	}

	/* Custom scrollbar styling */
	.items-container::-webkit-scrollbar {
		width: 8px;
	}

	.items-container::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
	}

	.items-container::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	.items-container::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.inventory-panel {
			width: 98%;
			top: 8vh;
			bottom: 8vh;
		}

		.item-row {
			grid-template-columns: 48px 1fr auto;
			gap: 8px;
		}

		.item-row .icon {
			width: 48px;
			height: 48px;
		}

		.item-row .actions {
			grid-column: 3 / 4;
			grid-row: 2 / 3;
		}

		.item-row .quantity {
			grid-column: 3 / 4;
			grid-row: 1 / 2;
		}
	}

	@media (max-width: 640px) {
		.inventory-tabs {
			flex-wrap: wrap;
			gap: 2px;
		}

		.inventory-tabs button {
			padding: 8px 12px;
			font-size: 13px;
		}

		/* Item Detail Modal */
		:global(.modal-backdrop) {
			position: fixed;
			inset: 0;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.75);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 1500;
			pointer-events: auto;
		}

		:global(.item-detail-modal) {
			position: relative;
			background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
			border-radius: 12px;
			width: min(500px, 90%);
			max-height: 80vh;
			overflow: hidden;
			box-shadow: 0 22px 60px rgba(2, 8, 23, 0.75);
			border-left: 6px solid rgba(0, 186, 255, 0.9);
			pointer-events: auto;
		}

		:global(.item-detail-modal .modal-header) {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 16px 20px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		}

		:global(.item-detail-modal .modal-header h3) {
			margin: 0;
			font-size: 20px;
			color: #00baff;
		}

		:global(.item-detail-modal .close-btn) {
			background: transparent;
			border: none;
			color: rgba(255, 255, 255, 0.8);
			font-size: 24px;
			cursor: pointer;
			transition: color 0.2s;
		}

		:global(.item-detail-modal .close-btn:hover) {
			color: #fff;
		}

		:global(.item-detail-modal .modal-body) {
			padding: 20px;
			overflow-y: auto;
			max-height: calc(80vh - 80px);
		}

		:global(.item-detail-modal .item-detail-content) {
			display: flex;
			flex-direction: column;
			gap: 20px;
		}

		:global(.item-detail-modal .large-icon) {
			width: 150px;
			height: 150px;
			border-radius: 8px;
			border: 2px solid rgba(0, 186, 255, 0.3);
			object-fit: contain;
			background: rgba(0, 0, 0, 0.3);
			margin: 0 auto;
			display: block;
		}

		:global(.item-detail-modal .item-info) {
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		:global(.item-detail-modal .info-row) {
			padding: 8px 0;
			border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		}

		:global(.item-detail-modal .info-row strong) {
			color: #00baff;
			margin-right: 8px;
		}

		:global(.item-detail-modal .requirements-section) {
			padding: 12px;
			background: rgba(255, 255, 255, 0.02);
			border-radius: 6px;
			border-left: 3px solid rgba(255, 193, 7, 0.5);
		}

		:global(.item-detail-modal .requirements-section strong) {
			display: block;
			margin-bottom: 8px;
			color: #ffc107;
		}

		:global(.item-detail-modal .req-item) {
			padding: 4px 0;
			font-size: 14px;
			opacity: 0.9;
		}

		:global(.item-detail-modal .description-section) {
			padding: 12px;
			background: rgba(255, 255, 255, 0.02);
			border-radius: 6px;
		}

		:global(.item-detail-modal .description-section strong) {
			display: block;
			margin-bottom: 8px;
			color: #00baff;
		}

		.action-btn {
			padding: 6px 10px;
			font-size: 12px;
		}

		.action-btn svg {
			width: 14px;
			height: 14px;
		}

		/* Compact equipment layout */
		.name-compact {
			flex: 1;
			margin-left: 8px;
			font-weight: 500;
			color: #fff;
		}

		.quantity-compact {
			margin-right: 8px;
			color: rgba(255, 255, 255, 0.7);
			font-size: 12px;
			min-width: 30px;
			text-align: right;
		}
	}
</style>
