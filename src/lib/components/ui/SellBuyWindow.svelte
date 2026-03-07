<script>
	// @ts-nocheck
	import { SvelteSet } from 'svelte/reactivity';
	import { createEventDispatcher, onMount } from 'svelte';
	import { gameState } from '$lib/stores/gameState';
	import { saveManager } from '$lib/stores/saveManager';
	import { get } from 'svelte/store';
	import itemDatabase from '$lib/data/items.json';
	import {
		parseItemId,
		getItemCategory,
		isWeapon,
		isArmor,
		isConsumable,
		isShield
	} from '$lib/utils/items';

	export let vendorName = 'Merchant';
	/** @type {Array<any>} */
	export let vendorStock = null; // optional array of { id, name, price, qty, icon }

	const dispatch = createEventDispatcher();

	// Item detail modal
	let showItemDetail = false;
	/** @type {any} */
	let selectedItem = null;
	let isSelling = false;

	// local reactive copies
	let gs = get(gameState) || {};
	const unsub = gameState.subscribe((v) => (gs = v || {}));

	$: player = gs.character || {};
	$: pd = gs.playerData || { gold: 0, silver: 0 };

	// present a normalized vendor name for known shop aliases (handle variations like 'Zerg')
	$: displayVendorName = (function () {
		const raw = (vendorName || '').toString();
		const key = raw
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '');
		const map = {
			zerg: 'The Love and Hammered',
			'zerg-shop': 'The Love and Hammered',
			'zerg--shop': 'The Love and Hammered',
			'the-love-and-hammered': 'The Love and Hammered',
			issac: 'The Love and Hammered',
			holly: "Swill n' Swing",
			maple: "Swill n' Swing",
			caspian: "Familiar's Folly",
			alexi: "Familiar's Folly",
			diana: 'The Hush Hustler',
			russel: 'The Hush Hustler'
		};
		return map[key] || raw;
	})();

	/**
	 * Get items from database by ID list
	 * @param {number[]} itemIds - Array of item IDs
	 * @returns {Array} Array of item objects with qty property
	 */
	function getShopItems(itemIds) {
		return itemIds
			.map((id) => {
				const item = itemDatabase[String(id)];
				if (!item) {
					console.warn(`[SellBuyWindow] Item ${id} not found in database`);
					return null;
				}
				return {
					...item,
					qty: 999 // Infinite stock for common items
				};
			})
			.filter(Boolean);
	}

	// shop-specific stock based on vendor name
	$: stock = Array.isArray(vendorStock)
		? vendorStock.map((it) => {
				const fullItem = itemDatabase[String(it.id)];
				return fullItem ? { ...fullItem, qty: it.qty || 1 } : it;
			})
		: (function () {
				const vendorKey = displayVendorName
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/(^-|-$)/g, '');
				console.log(
					'SellBuyWindow: vendorName =',
					vendorName,
					'displayVendorName =',
					displayVendorName,
					'vendorKey =',
					vendorKey
				);

				if (
					vendorKey === 'holly' ||
					vendorKey === 'maple' ||
					vendorKey.includes('swill') ||
					vendorKey.includes('swing') ||
					vendorKey.includes('apothecary')
				) {
					console.log("SellBuyWindow: Loading Swill n' Swing inventory");
					// Swill n' Swing - Apothecary Shop
					// Using new database IDs for consumables
					return getShopItems([
						// Healing Potions (by potency: Minor → Light → Greater → Superior → Ultimate → Full)
						2110004, 2110005, 2110006, 2110007, 2110008, 2110009,
						// Spirit Potions (by potency: Minor → Light → Greater → Superior → Ultimate → Full)
						2110010, 2110011, 2110012, 2110013, 2110014, 2110015,
						// Antidotes (by potency: Lesser → Normal → Greater)
						2120001, 2120002, 2120003,
						// Alchemical Items
						2240001
					]);
				} else if (
					vendorKey.includes('love') ||
					vendorKey.includes('hammered') ||
					vendorKey.includes('zerg')
				) {
					console.log('SellBuyWindow: Loading The Love and Hammered inventory');
					// The Love and Hammered - Blacksmith
					// Using new database IDs for weapons and armor
					return getShopItems([
						// Swords - One Handed
						1110001, 1110002, 1110003,
						// Swords - Two Handed
						1113001, 1113002, 1113003,
						// Blunt Weapons - One Handed
						1141001, 1141002, 1141003, 1171001, 1171002, 1171003,
						// Blunt Weapons - Two Handed
						1143001,
						// Axes & Polearms
						1133001, 1133002, 1133003,
						// Daggers
						1124001, 1124002, 1124003,
						// Bows & Crossbows
						1153001, 1153002, 1153003, 1153004, 1171004,
						// Consumable Weapons
						2240002, 2240003,
						// Heavy Armor - Body
						1232001, 1232002, 1232003,
						// Medium Armor - Body
						1222001, 1222002, 1222003, 1222004, 1222005, 1222006,
						// Head Armor
						1231001, 1231002, 1221001, 1221002,
						// Belt Armor
						1234001, 1224001,
						// Boots Armor
						1233001, 1233002, 1223001, 1223002,
						// Shields
						1182001, 1182002, 1182003
					]);
				} else if (
					vendorKey.includes('familiar') ||
					vendorKey.includes('folly') ||
					vendorKey.includes('caspian') ||
					vendorKey.includes('alexi')
				) {
					console.log("SellBuyWindow: Loading Familiar's Folly inventory");
					// Familiar's Folly - Magic Shop
					return getShopItems([
						// Magical Focus Weapons
						1163001, 1163002, 1161001, 1161002, 1161003, 1161004,
						// Magic Armor - Body (novice, embroidered, silk)
						1242002, 1242003, 1242001,
						// Magic Armor - Head
						1241001, 1241002,
						// Magic Armor - Belt & Boots
						1244001, 1243001, 1243002
					]);
				} else if (
					vendorKey.includes('hush') ||
					vendorKey.includes('hustler') ||
					vendorKey.includes('diana') ||
					vendorKey.includes('russel')
				) {
					console.log('SellBuyWindow: Loading The Hush Hustler inventory');
					// The Hush Hustler - Black Market (keeping as legacy for now)
					return [
						{
							id: 'poison-vial',
							name: 'Poison Vial',
							price: 200,
							qty: 6,
							icon: '/Images/poison-vial.png'
						},
						{
							id: 'stolen-goods',
							name: 'Stolen Goods',
							price: 350,
							qty: 4,
							icon: '/Images/stolen-goods.png'
						},
						{
							id: 'forbidden-tome',
							name: 'Forbidden Tome',
							price: 800,
							qty: 2,
							icon: '/Images/forbidden-tome.png'
						},
						{
							id: 'shadow-cloak',
							name: 'Shadow Cloak',
							price: 500,
							qty: 3,
							icon: '/Images/shadow-cloak.png'
						}
					];
				} else {
					console.log('SellBuyWindow: Loading default inventory');
					// Default demo stock
					return [];
				}
			})();

	// ensure each shop item has an explicit quantity state (start at 1 so UI shows 1 by default)
	$: if (Array.isArray(stock)) {
		for (const it of stock) {
			if (typeof stockQty[it.id] === 'undefined') stockQty[it.id] = 1;
		}
	}

	// ensure each inventory item has an explicit quantity input state (start at 1)
	$: if (Array.isArray(inventoryList)) {
		for (const it of inventoryList) {
			if (typeof invQty[it.id] === 'undefined') invQty[it.id] = 1;
		}
	}

	// Group stock items by equipment type for organized display
	$: groupedStock = Array.isArray(stock)
		? stock.reduce((groups, item) => {
				let groupKey = 'Others'; // Default group

				// Prefer explicit armor slot classification first so armor pieces
				// with auxiliary `effect` metadata (like HP bonuses) are still
				// shown under their proper equipment slot instead of Consumables.
				if (item.armorSlot === 'Body') {
					groupKey = 'Body';
				} else if (item.armorSlot === 'Shield') {
					groupKey = 'Shield';
				} else if (item.armorSlot === 'Boots') {
					groupKey = 'Boots';
				} else if (item.armorSlot === 'Head') {
					groupKey = 'Head';
				} else if (item.armorSlot === 'Belt') {
					groupKey = 'Belt';
				} else if (item.category === 'Weapon') {
					groupKey = 'Weapon';
				} else {
					// Treat items with an effect or potion/consumable categories as consumables
					if (
						item.effect ||
						(item.category && /potion|consumable|food/i.test(item.category)) ||
						item.category === 'Weapon - Consumable'
					) {
						groupKey = 'Consumables';
					}
				}

				if (!groups[groupKey]) groups[groupKey] = [];
				groups[groupKey].push(item);
				return groups;
			}, {})
		: {};

	// Group inventory items by type for organized display
	$: groupedInventory = Array.isArray(inventoryList)
		? inventoryList.reduce((groups, item) => {
				let groupKey = 'Others'; // Default group

				// Prefer explicit armor slot classification first so armor pieces
				// with auxiliary `effect` metadata (like HP bonuses) are still
				// shown under their proper equipment slot instead of Consumables.
				if (item.armorSlot === 'Body') {
					groupKey = 'Body';
				} else if (item.armorSlot === 'Shield') {
					groupKey = 'Shield';
				} else if (item.armorSlot === 'Boots') {
					groupKey = 'Boots';
				} else if (item.armorSlot === 'Head') {
					groupKey = 'Head';
				} else if (item.armorSlot === 'Belt') {
					groupKey = 'Belt';
				} else if (item.category === 'Weapon') {
					groupKey = 'Weapon';
				} else {
					// Treat items with an effect or potion/consumable categories as consumables
					if (
						item.effect ||
						(item.category && /potion|consumable|food/i.test(item.category)) ||
						item.category === 'Weapon - Consumable'
					) {
						groupKey = 'Consumables';
					}
				}

				if (!groups[groupKey]) groups[groupKey] = [];
				groups[groupKey].push(item);
				return groups;
			}, {})
		: {};

	// Check if an item is currently equipped
	function isItemEquipped(item) {
		if (!item) return false;
		const equipment = player.equipment || {};

		// Check all equipment slots
		for (const slot of [
			'weapon1',
			'weapon2',
			'head',
			'body',
			'legs',
			'belt',
			'necklace',
			'ring1',
			'ring2'
		]) {
			const equippedItem = equipment[slot];
			if (equippedItem && equippedItem !== 'none' && equippedItem.id === item.id) {
				return true;
			}
		}
		return false;
	}

	// inventory helper - reactive to player changes, filter out equipped items
	// Enrich saved inventory entries with full item metadata from items.json
		$: inventoryList = Array.isArray(player.inventory)
			? player.inventory
				  .map((invItem) => {
					  // invItem may be { id, qty } or full item object
					  const db = itemDatabase[String(invItem.id)];
					  if (db) {
						  return {
							  ...db,
							  // preserve qty stored on inventory entry
							  qty: invItem.qty || invItem.count || db.qty || 1
						  };
					  }
					  // fallback: return invItem as-is
					  return invItem;
				  })
				  .filter((item) => !isItemEquipped(item))
			: [];

	function close() {
		dispatch('close');
	}

	function openItemDetail(item, selling = false) {
		if (showItemDetail) return; // prevent multiple opens
		selectedItem = { ...item };
		isSelling = selling;
		showItemDetail = true;
	}

	function closeItemDetail() {
		showItemDetail = false;
		selectedItem = null;
	}

	// simple currency helper: convert gold+silver to cents
	function currencyToCents(g, s) {
		// use 1000 silver = 1 gold as requested
		return (Number(g) || 0) * 1000 + (Number(s) || 0);
	}

	function centsToCurrency(cents) {
		const g = Math.floor(cents / 1000);
		const s = cents % 1000;
		return { gold: g, silver: s };
	}

	function formatCurrency(cents) {
		const c = centsToCurrency(Number(cents) || 0);
		if (c.gold) return `${c.gold}g ${c.silver}s`;
		return `${c.silver}s`;
	}

	// Check if player can buy an item
	function canBuyItem(item) {
		if (!item.requirements) return true;

		const req = item.requirements;
		const char = gs.character || {};
		const playerData = gs.playerData || {};

		// Level requirement
		if (req.level && (playerData.level || 1) < req.level) {
			return false;
		}

		// Class requirement
		if (req.class) {
			const playerClass = String(char.class || char.job || '').toLowerCase();
			if (Array.isArray(req.class)) {
				const allowedClasses = req.class.map((c) => c.toLowerCase());
				if (!allowedClasses.includes(playerClass)) {
					return false;
				}
			} else {
				if (playerClass !== req.class.toLowerCase()) {
					return false;
				}
			}
		}

		// Stats requirement
		if (req.stats) {
			const playerStats = char.stats || {};

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

				// Check OR conditions
				for (const [statGroup, logic] of Object.entries(req.statLogic)) {
					if (logic === 'or') {
						const stats = statGroup.split(',');
						const meetsAny = stats.some(
							(stat) => (playerStats[stat.trim()] || 0) >= req.stats[stat.trim()]
						);
						if (!meetsAny) {
							return false; // Must meet at least one stat in the OR group
						}
					}
				}

				// Check remaining stats with AND logic (stats NOT in OR groups)
				for (const [stat, required] of Object.entries(req.stats)) {
					if (!orStats.has(stat)) {
						if ((playerStats[stat] || 0) < required) return false;
					}
				}
			} else {
				// Default AND logic - all stats must be met
				for (const [stat, min] of Object.entries(req.stats)) {
					const current = playerStats[stat] || 0;
					if (current < min) {
						return false;
					}
				}
			}
		}

		// Craft points requirement
		if (req.craftPoints) {
			const playerClass = String(char.class || char.job || '').toLowerCase();
			if (playerClass !== 'tinkerer') {
				return false;
			}

			const cp = char.craftPoints || {};
			for (const [type, min] of Object.entries(req.craftPoints)) {
				const current = cp[type] || 0;
				if (current < min) {
					return false;
				}
			}
		}

		// Check if player has enough money
		const cost = item.price || 0;
		const playerCents = currencyToCents(playerData.gold, playerData.silver);
		if (playerCents < cost) {
			return false;
		}

		return true;
	}

	// Buy item from vendor
	async function buyItem(item, qty = 1) {
		try {
			qty = Math.max(1, Number(qty) || 1);

			// Check requirements
			if (item.requirements) {
				const req = item.requirements;
				const char = gs.character || {};

				// Level requirement
				if (req.level && (gs.playerData?.level || 1) < req.level) {
					alert(`You need to be at least level ${req.level} to buy this item.`);
					return false;
				}

				// Class requirement
				if (req.class) {
					const playerClass = String(char.class || char.job || '').toLowerCase();
					if (Array.isArray(req.class)) {
						// Multiple classes allowed
						const allowedClasses = req.class.map((c) => c.toLowerCase());
						if (!allowedClasses.includes(playerClass)) {
							alert(`You need to be one of: ${req.class.join(', ')} to buy this item.`);
							return false;
						}
					} else {
						// Single class required
						if (playerClass !== req.class.toLowerCase()) {
							alert(`You need to be a ${req.class} to buy this item.`);
							return false;
						}
					}
				}

				// Stats requirement
				if (req.stats) {
					const playerStats = char.stats || {};

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

						// Check OR conditions
						for (const [statGroup, logic] of Object.entries(req.statLogic)) {
							if (logic === 'or') {
								const stats = statGroup.split(',');
								const meetsAny = stats.some(
									(stat) => (playerStats[stat.trim()] || 0) >= req.stats[stat.trim()]
								);
								if (!meetsAny) {
									const statsList = stats
										.map((s) => `${req.stats[s.trim()]} ${s.trim()}`)
										.join(' OR ');
									alert(`You need at least ${statsList} to buy this item.`);
									return false;
								}
							}
						}

						// Check remaining stats with AND logic (stats NOT in OR groups)
						for (const [stat, min] of Object.entries(req.stats)) {
							if (!orStats.has(stat)) {
								const current = playerStats[stat] || 0;
								if (current < min) {
									alert(`You need at least ${min} ${stat} to buy this item.`);
									return false;
								}
							}
						}
					} else {
						// Default AND logic - all stats must be met
						for (const [stat, min] of Object.entries(req.stats)) {
							const current = playerStats[stat] || 0;
							if (current < min) {
								alert(`You need at least ${min} ${stat} to buy this item.`);
								return false;
							}
						}
					}
				}

				// Craft points requirement - only Tinkerers can buy craft-requiring items
				if (req.craftPoints) {
					const playerClass = String(char.class || char.job || '').toLowerCase();
					if (playerClass !== 'tinkerer') {
						alert(`Only Tinkerers can purchase items that require craft points.`);
						return false;
					}

					const cp = char.craftPoints || {};
					for (const [type, min] of Object.entries(req.craftPoints)) {
						const current = cp[type] || 0;
						if (current < min) {
							alert(`You need at least ${min} ${type} craft points to buy this item.`);
							return false;
						}
					}
				}
			}

			const cost = Math.floor((item.price || 0) * qty);
			const totalCents = cost; // price treated as 'cents' for simplicity
			const playerCents = currencyToCents(pd.gold, pd.silver);
			if (playerCents < totalCents) {
				alert('Not enough money.');
				return false;
			}
			// apply purchase
			console.log('[BUY] Before purchase - Gold:', pd.gold, 'Silver:', pd.silver, 'Cost:', cost);
			gameState.update((s) => {
				const next = { ...(s || {}) };
				next.playerData = { ...(s.playerData || {}) };
				const remaining = playerCents - totalCents;
				const c = centsToCurrency(remaining);
				console.log('[BUY] After purchase - Gold:', c.gold, 'Silver:', c.silver);
				next.playerData.gold = c.gold;
				next.playerData.silver = c.silver;

				// add to inventory
				const char = { ...(s.character || {}) };
				const inv = Array.isArray(char.inventory) ? char.inventory.slice() : [];
				const idx = inv.findIndex((i) => i.id === item.id);
				if (idx === -1) inv.push({ ...(item || {}), qty });
				else inv[idx].qty = (inv[idx].qty || 0) + qty;
				next.character = { ...(s.character || {}), inventory: inv };
				return next;
			});

			// Autosave after purchase
			saveManager.saveGame({ auto: true, silent: true });
			return true;
		} catch (e) {
			console.warn('buy failed', e);
			return false;
		}
	}

	// Sell item from player inventory at same price as vendor
	async function sell(item, qty = 1) {
		try {
			console.log('[SELL FUNCTION] Called - This function should NOT be used');
			qty = Math.max(1, Number(qty) || 1);
			const inv = inventoryList().map((i) => ({ ...i }));
			const idx = inv.findIndex((i) => i.id === item.id);
			if (idx === -1 || (inv[idx].qty || 0) < qty) {
				alert("You don't have enough to sell.");
				return false;
			}
			const sellPrice = Math.floor((item.price || 0) * 0.5 * qty);
			const sellCents = sellPrice;
			console.log(
				'[SELL] Before sell - Gold:',
				pd.gold,
				'Silver:',
				pd.silver,
				'Sell price:',
				sellPrice
			);
			gameState.update((s) => {
				const next = { ...(s || {}) };
				next.playerData = { ...(s.playerData || {}) };
				const curr = currencyToCents(next.playerData.gold, next.playerData.silver || 0);
				const added = curr + sellCents;
				const newc = centsToCurrency(added);
				console.log('[SELL] After sell - Gold:', newc.gold, 'Silver:', newc.silver);
				next.playerData.gold = newc.gold;
				next.playerData.silver = newc.silver;

				// remove from inventory
				const char = { ...(s.character || {}) };
				const inv2 = Array.isArray(char.inventory) ? char.inventory.slice() : [];
				const i2 = inv2.findIndex((i) => i.id === item.id);
				inv2[i2].qty = (inv2[i2].qty || 0) - qty;
				if (inv2[i2].qty <= 0) inv2.splice(i2, 1);
				next.character = { ...(s.character || {}), inventory: inv2 };
				return next;
			});

			// Autosave after sell
			saveManager.saveGame({ auto: true, silent: true });
			return true;
		} catch (e) {
			console.warn('sell failed', e);
			return false;
		}
	}

	// Local quantity state per item id for UI controls
	let stockQty = {};
	let invQty = {};

	// Sell item immediately (not add to cart)
	async function sellItem(item, qty = 1) {
		try {
			qty = Math.max(1, Number(qty) || 1);
			const inv = inventoryList.map((i) => ({ ...i }));
			const idx = inv.findIndex((i) => i.id === item.id);
			if (idx === -1 || (inv[idx].qty || 0) < qty) {
				alert("You don't have enough to sell.");
				return false;
			}
			const sellPrice = Math.floor((item.price || 0) * 0.5 * qty);
			const sellCents = sellPrice;
			console.log(
				'[SELLITEM] Before sell - Gold:',
				pd.gold,
				'Silver:',
				pd.silver,
				'Sell price:',
				sellPrice
			);
			gameState.update((s) => {
				const next = { ...(s || {}) };
				next.playerData = { ...(s.playerData || {}) };
				const curr = currencyToCents(next.playerData.gold, next.playerData.silver || 0);
				const added = curr + sellCents;
				const newc = centsToCurrency(added);
				console.log('[SELLITEM] After sell - Gold:', newc.gold, 'Silver:', newc.silver);
				next.playerData.gold = newc.gold;
				next.playerData.silver = newc.silver;

				// remove from inventory
				const char = { ...(s.character || {}) };
				const charInv = Array.isArray(char.inventory) ? char.inventory.slice() : [];
				const charIdx = charInv.findIndex((i) => i.id === item.id);
				if (charIdx !== -1) {
					charInv[charIdx].qty = (charInv[charIdx].qty || 0) - qty;
					if (charInv[charIdx].qty <= 0) charInv.splice(charIdx, 1);
				}
				next.character = { ...(s.character || {}), inventory: charInv };

				// Unequip if equipped
				const equip = { ...(s.character?.equipment || {}) };
				for (const slot in equip) {
					const eqItem = equip[slot];
					if (eqItem && eqItem !== 'none') {
						const eqId = typeof eqItem === 'object' ? eqItem.id : eqItem;
						if (eqId === item.id) {
							equip[slot] = 'none';
						}
					}
				}
				next.character.equipment = equip;
				return next;
			});

			// Reset quantity input after selling
			invQty[item.id] = 1;

			// Auto-save after transaction
			try {
				saveManager.saveGame({ auto: true });
			} catch (e) {
				console.warn('Auto-save after sell failed:', e);
			}

			return true;
		} catch (e) {
			console.warn('sell failed', e);
			return false;
		}
	}

	async function useItem(item, qty = 1) {
		try {
			qty = Math.max(1, Number(qty) || 1);
			const inv = inventoryList.map((i) => ({ ...i }));
			const idx = inv.findIndex((i) => i.id === item.id);
			if (idx === -1 || (inv[idx].qty || 0) < qty) {
				alert("You don't have enough to use.");
				return false;
			}
			if (!item.effect) {
				alert("This item has no effect.");
				return false;
			}
			gameState.update((s) => {
				const next = { ...(s || {}) };
				next.character = { ...(s.character || {}) };
				const char = next.character;
				// Apply effect
				if (item.effect.hp) {
					const amount = item.effect.hp === 'full' ? char.maxHp : Number(item.effect.hp) || 0;
					char.hp = Math.min(char.maxHp, char.hp + amount);
				} else if (item.effect.sp) {
					const amount = item.effect.sp === 'full' ? char.maxSp : Number(item.effect.sp) || 0;
					char.sp = Math.min(char.maxSp, char.sp + amount);
				} else if (item.effect.type === 'antidote') {
					alert("Antidote used, poison cured!");
				}
				// Remove from inventory
				const charInv = Array.isArray(char.inventory) ? char.inventory.slice() : [];
				const charIdx = charInv.findIndex((i) => i.id === item.id);
				if (charIdx !== -1) {
					charInv[charIdx].qty = (charInv[charIdx].qty || 0) - qty;
					if (charInv[charIdx].qty <= 0) charInv.splice(charIdx, 1);
				}
				next.character.inventory = charInv;
				return next;
			});
			// Reset quantity input after using
			invQty[item.id] = 1;
			// Auto-save
			try {
				saveManager.saveGame({ auto: true });
			} catch (e) {
				console.warn('Auto-save after use failed:', e);
			}
			return true;
		} catch (e) {
			console.warn('use failed', e);
			return false;
		}
	}

	function getStockQty(id) {
		// default to 1 so the input shows 1 until the player changes it
		return Number(stockQty[id]) || 1;
	}

	function setStockQty(id, v) {
		// enforce minimum 1 for user-friendly default behavior
		const n = Number(v);
		stockQty[id] = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
	}

	function getInvQty(id) {
		return Math.max(1, Number(invQty[id]) || 1);
	}

	function setInvQty(id, v) {
		const max = (inventoryList.find((s) => s.id === id) || {}).qty || 1;
		invQty[id] = Math.max(1, Math.min(max, Number(v) || 1));
	}

	function incInvQty(id, delta) {
		setInvQty(id, getInvQty(id) + delta);
	}

	// Generate detailed tooltip text for items
	function getItemTooltip(item, isSelling = false) {
		let tooltip = `${item.name}\n`;

		if (isSelling) {
			tooltip += `Sell Price: ${formatCurrency(Math.floor((item.price || 0) * 0.5))}\n`;
		} else {
			tooltip += `Cost: ${formatCurrency(item.price)}\n`;
		}

		// Show requirements if present
		if (item.requirements) {
			const req = item.requirements;
			if (req.level) tooltip += `Level: ${req.level}\n`;
			if (req.class) {
				if (Array.isArray(req.class)) {
					tooltip += `Class: ${req.class.join(' or ')}\n`;
				} else {
					tooltip += `Class: ${req.class}\n`;
				}
			}
			if (req.stats) {
				const stats = Object.entries(req.stats)
					.map(([stat, val]) => `${stat} ${val}`)
					.join(', ');
				tooltip += `Stats: ${stats}\n`;
			}
			if (req.craftPoints) {
				const cp = Object.entries(req.craftPoints)
					.map(([type, val]) => `${type} ${val}`)
					.join(', ');
				tooltip += `Craft Points: ${cp} (Tinkerer only)\n`;
			}
		}

		// Equipment stats
		if (item.weaponClass) {
			tooltip += `Weapon: ${item.weaponClass} (${item.weaponType})\n`;
			tooltip += `Damage: +${item.damage}\n`;
			if (item.attackSpeed) {
				const speeds = [];
				if (item.attackSpeed.single) speeds.push(`Single: +${item.attackSpeed.single}%`);
				if (item.attackSpeed.shield) speeds.push(`Shield: +${item.attackSpeed.shield}%`);
				if (item.attackSpeed.dual) speeds.push(`Dual: +${item.attackSpeed.dual}%`);
				if (speeds.length) tooltip += `Attack Speed: ${speeds.join(', ')}\n`;
			}
		} else if (item.armorType) {
			tooltip += `Armor: ${item.armorType}`;
			if (item.armorSlot) tooltip += ` (${item.armorSlot})`;
			tooltip += `\n`;
			if (item.physicalDefense) tooltip += `Physical Defense: +${item.physicalDefense}\n`;
			if (item.magicDefense) tooltip += `Magic Defense: +${item.magicDefense}\n`;
			// NOTE: attackSpeed.base is ignored in display for armor items; specific
			// modifiers (single/dual/shield) are preferred and shown where present.
		} else if (item.consumable) {
			tooltip += `Consumable\n`;
		}

		if (item.effect) {
			if (item.effect.type === 'heal') {
				if (item.effect.amount === 'full') {
					tooltip += `Restores: Full HP\n`;
				} else {
					tooltip += `Restores: ${item.effect.amount} HP\n`;
				}
			} else if (item.effect.type === 'spirit') {
				if (item.effect.amount === 'full') {
					tooltip += `Restores: Full SP\n`;
				} else {
					tooltip += `Restores: ${item.effect.amount} SP\n`;
				}
			} else if (item.effect.type === 'antidote') {
				const levelNames = {
					minor: 'Minor',
					normal: 'Normal',
					advanced: 'Advanced'
				};
				tooltip += `Cures: ${levelNames[item.effect.level] || item.effect.level} poison\n`;
			} else if (item.effect.type === 'damage') {
				tooltip += `Effects: Deals ${item.effect.amount} damage`;
				if (item.effect.debuff) {
					const debuff = item.effect.debuff;
					if (debuff.type === 'accuracy') {
						const mins = Math.floor(debuff.duration / 60);
						tooltip += `, reduces enemy ACC by ${debuff.reduction}% for ${mins} mins`;
					}
				}
				tooltip += `\n`;
			}
		}

		// Only show stock/owned quantity for non-consumable items
		if (!item.effect && !item.consumable) {
			if (isSelling && item.qty) {
				tooltip += `Owned: ${item.qty}\n`;
			}
		}

		return tooltip.trim();
	}

	onMount(() => {
		return () => {
			if (unsub) unsub();
		};
	});
</script>

<div class="sellbuy-panel" role="dialog" aria-modal="true">
	<header>
		<h3>{displayVendorName} — Shop</h3>
		<div class="header-actions">
			<button class="close" aria-label="Close" on:click={close}>✕</button>
		</div>
	</header>

	<div class="columns">
		<section class="shop-list">
			<h4>Shop</h4>
			<div class="items-container">
				{#each Object.entries(groupedStock) as [category, items] (category)}
					<div class="category-section">
						<h5 class="category-header">
							{category === 'Others' ? 'Others (Consumed upon use)' : category}
						</h5>
						{#each items as it (it.id)}
							{@const qty = stockQty[it.id] || 1}
							{@const totalCents = (it.price || 0) * qty}
							{@const totalCurrency = centsToCurrency(totalCents)}
							<div class="item-row" title={getItemTooltip(it, false)}>
								<!-- Icon spans both rows vertically -->
								<button class="icon-btn" type="button" aria-label={`View ${it.name}`} on:click={() => openItemDetail(it, false)}>
									<img
										class="icon"
										src={it.icon || '/Images/item-placeholder.svg'}
										alt={it.name}
										on:error={(e) => {
											e.target.src = '/Images/item-placeholder.svg';
										}}
									/>
								</button>

								<!-- First row: item name -->
								<div class="name" title={it.name}>{it.name}</div>

								<!-- Second row: gold and silver prices -->
								<div class="prices">
									<span class="gold-icon" aria-hidden="true">
										<svg
											viewBox="0 0 24 24"
											width="14"
											height="14"
											xmlns="http://www.w3.org/2000/svg"
											aria-hidden="true"
											><circle
												cx="12"
												cy="12"
												r="9"
												fill="#ffd27a"
												stroke="#c69c3d"
												stroke-width="1"
											/></svg
										>
									</span>
									<span class="gold-val" aria-hidden="true">{totalCurrency.gold}</span>
									<span class="silver-icon" aria-hidden="true">
										<svg
											viewBox="0 0 24 24"
											width="14"
											height="14"
											xmlns="http://www.w3.org/2000/svg"
											aria-hidden="true"
											><circle
												cx="12"
												cy="12"
												r="9"
												fill="#d8dfe9"
												stroke="#9fb0c8"
												stroke-width="1"
											/></svg
										>
									</span>
									<span class="silver-val" aria-hidden="true">{totalCurrency.silver}</span>
								</div>

								<!-- Qty and cart button span both rows, vertically centered -->
								<div class="controls">
									<input
										id={'shop-qty-' + it.id}
										aria-label={'Quantity for ' + it.name}
										type="number"
										min="1"
										value={getStockQty(it.id)}
										on:input={(e) => setStockQty(it.id, e.target.value)}
									/>
									<button
										class="buy-btn cart"
										class:can-buy={canBuyItem(it)}
										class:cannot-buy={!canBuyItem(it)}
										aria-label={'Buy ' + qty + ' x ' + it.name}
										disabled={!canBuyItem(it)}
										on:click={() => buyItem(it, qty)}
									>
										<svg
											viewBox="0 0 24 24"
											width="18"
											height="18"
											xmlns="http://www.w3.org/2000/svg"
											aria-hidden="true"
											><path
												d="M7 4h-2l-1 2h2l3.6 7.59-1.35 2.45C8.89 16.37 9.5 17 10.25 17H19v-2H10.25l1.1-2h7.45c.75 0 1.4-.41 1.75-1.03L23 6H6.21"
												fill="currentColor"
											/></svg
										>
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</section>

		<section class="inv-list">
			<h4>Your Inventory (Sell)</h4>
			<div class="items-container">
				{#if inventoryList.length === 0}
					<div class="empty">You have no items.</div>
				{:else}
					{#each Object.entries(groupedInventory) as [category, items] (category)}
						<div class="category-section">
							<h5 class="category-header">
								{category === 'Others' ? 'Others' : category}
							</h5>
							{#each items as item (item.id)}
						{@const qty = invQty[item.id] || 1}
						{@const sellPrice = item.price || 0}
						{@const totalCents = sellPrice * qty}
						{@const totalCurrency = centsToCurrency(totalCents)}
						<div class="item-row" title={getItemTooltip(item, true)}>
							<!-- Icon spans both rows vertically -->
							<button class="icon-btn" type="button" aria-label={`View ${item.name}`} on:click={() => openItemDetail(item, true)}>
								<img
									class="icon"
									src={item.icon || '/Images/item-placeholder.svg'}
									alt={item.name}
									on:error={(e) => {
										e.target.src = '/Images/item-placeholder.svg';
									}}
								/>
							</button>

							<!-- First row: item name with owned quantity (non-clickable; image opens details) -->
							<div class="name" title={item.name}>
								{item.name} <span class="owned">x {item.qty}</span>
							</div>

							<!-- Second row: gold and silver sell prices -->
							<div class="prices">
								<span class="gold-icon" aria-hidden="true">
									<svg
										viewBox="0 0 24 24"
										width="14"
										height="14"
										xmlns="http://www.w3.org/2000/svg"
										aria-hidden="true"
										><circle
											cx="12"
											cy="12"
											r="9"
											fill="#ffd27a"
											stroke="#c69c3d"
											stroke-width="1"
										/></svg
									>
								</span>
								<span class="gold-val" aria-hidden="true">{totalCurrency.gold}</span>
								<span class="silver-icon" aria-hidden="true">
									<svg
										viewBox="0 0 24 24"
										width="14"
										height="14"
										xmlns="http://www.w3.org/2000/svg"
										aria-hidden="true"
										><circle
											cx="12"
											cy="12"
											r="9"
											fill="#d8dfe9"
											stroke="#9fb0c8"
											stroke-width="1"
										/></svg
									>
								</span>
								<span class="silver-val" aria-hidden="true">{totalCurrency.silver}</span>
							</div>

							<!-- Qty and sell button span both rows, vertically centered -->
							<div class="controls">
								<input
									id={'inv-qty-' + item.id}
									aria-label={'Quantity for ' + item.name}
									type="number"
									min="1"
									max={item.qty}
									bind:value={invQty[item.id]}
								/>
								<button
									class={item.effect ? "use-btn" : "sell-btn"}
									aria-label={item.effect ? 'Use ' + qty + ' x ' + item.name : 'Sell ' + qty + ' x ' + item.name}
									on:click={() => item.effect ? useItem(item, qty) : sellItem(item, qty)}
								>
									{#if item.consumable}
										<svg
											viewBox="0 0 24 24"
											width="18"
											height="18"
											xmlns="http://www.w3.org/2000/svg"
											aria-hidden="true"
											><path
												d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
												fill="currentColor"
											/></svg
										>
									{:else}
										<svg
											viewBox="0 0 24 24"
											width="18"
											height="18"
											xmlns="http://www.w3.org/2000/svg"
											aria-hidden="true"
											><path
												d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
												fill="currentColor"
											/><path
												d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z"
												fill="none"
												stroke="currentColor"
												stroke-width="0.5"
											/><text x="12" y="16" font-size="12" text-anchor="middle" fill="currentColor"
												>$</text
											></svg
										>
									{/if}
								</button>
							</div>
						</div>
					{/each}
					</div>
				{/each}
				{/if}
			</div>
		</section>
	</div>
</div>

{#if showItemDetail && selectedItem}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div
		style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); display: flex; align-items: center; justify-content: center; z-index: 1700;"
		on:click={closeItemDetail}
	>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
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
					<div
						style="width: 150px; height: 150px; border-radius: 8px; border: 2px solid rgba(0, 186, 255, 0.3); background: rgba(0, 0, 0, 0.3) url('{selectedItem.icon || '/Images/item-placeholder.svg'}') center/contain no-repeat; margin: 0 auto; display: block;"
					></div>
					<div style="display: flex; flex-direction: column; gap: 12px;">
						<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
							<strong style="color: #00baff; margin-right: 8px;">Category:</strong>
							{selectedItem.category || 'Unknown'}
						</div>

						<!-- Quantity: inventory shows owned qty, shop shows selected qty -->
						<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
							<strong style="color: #00baff; margin-right: 8px;">Quantity:</strong>
							{#if isSelling}
								×{selectedItem.qty || 1}
							{:else}
								×{getStockQty(selectedItem.id) || 1}
							{/if}
						</div>

						{#if selectedItem.price}
							<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
								<strong style="color: #00baff; margin-right: 8px;">Value:</strong>
								{Math.floor((isSelling ? Math.floor((selectedItem.price || 0) * 0.5) : (selectedItem.price || 0)) / 1000)}g {(isSelling ? Math.floor((selectedItem.price || 0) * 0.5) : (selectedItem.price || 0)) % 1000}s
							</div>
						{/if}

						{#if selectedItem.effect || selectedItem.effects}
							<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
								<strong style="color: #00baff; margin-right: 8px;">Effects:</strong>
								{(() => {
									const effects = [];
									const effectData = selectedItem.effect || selectedItem.effects;
									if (!effectData) return 'No effects';
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
								{#if selectedItem.requirements.stats && typeof selectedItem.requirements.stats === 'object'}
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
								{selectedItem.damage}
							</div>
						{/if}
						{#if selectedItem.physicalDefense || selectedItem.magicDefense}
							<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
								<strong style="color: #00baff; margin-right: 8px;">Defense:</strong>
								{#if selectedItem.physicalDefense}P.DEF: {selectedItem.physicalDefense}{/if}
								{#if selectedItem.magicDefense}
									M.DEF: {selectedItem.magicDefense}{/if}
							</div>
						{/if}
						{#if selectedItem.attackSpeed && typeof selectedItem.attackSpeed === 'object'}
							<div style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
								<strong style="color: #00baff; margin-right: 8px;">Attack Speed:</strong>
								{(() => {
									const speeds = [];
									if (typeof selectedItem.attackSpeed.single === 'number') {
										const percent = (selectedItem.attackSpeed.single - 1) * 100;
										speeds.push(`Single: ${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`);
									}
									if (typeof selectedItem.attackSpeed.dual === 'number') {
										const percent = (selectedItem.attackSpeed.dual - 1) * 100;
										speeds.push(`Dual: ${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`);
									}
									if (typeof selectedItem.attackSpeed.shield === 'number') {
										const percent = (selectedItem.attackSpeed.shield - 1) * 100;
										speeds.push(`Shield: ${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`);
									}
									// ignore selectedItem.attackSpeed.base in UI; prefer explicit single/dual/shield modifiers
									return speeds.length ? speeds.join(', ') : 'Standard speed';
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
	.sellbuy-panel {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 12vh;
		bottom: 12vh;
		width: min(920px, 96%);
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		color: #e8f0ff;
		z-index: 1600;
		border-radius: 12px;
		padding: 10px;
		box-shadow: 0 22px 60px rgba(2, 8, 23, 0.75);
		border-left: 6px solid rgba(76, 175, 80, 0.8);
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
	}
	header h3 {
		margin: 0;
		font-size: 18px;
	}
	.close {
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
	.close:hover {
		transform: scale(1.06);
		opacity: 0.95;
	}
	.columns {
		display: flex;
		gap: 12px;
		padding: 12px;
		flex: 1;
		min-height: 0; /* Allow flex items to shrink below their content size */
	}
	.shop-list,
	.inv-list {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0; /* Allow flex items to shrink */
	}
	.shop-list h4,
	.inv-list h4 {
		margin: 0 0 8px 0;
		font-size: 16px;
		font-weight: 600;
		flex-shrink: 0;
	}
	.shop-list .items-container,
	.inv-list .items-container {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding-right: 4px; /* Space for scrollbar */
	}

	/* Each item gets 2 rows: row1=name, row2=gold+silver. Icon spans both. Qty+cart span both (vertically centered) */
	.item-row {
		display: grid;
		grid-template-columns: 60px 1fr auto;
		grid-template-rows: auto auto;
		gap: 4px 12px;
		padding: 8px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	/* Icon: spans both rows, bigger */
	.item-row .icon {
		/* when img is direct child (buy side) */
		grid-column: 1 / 2;
		grid-row: 1 / 3;
		width: 56px;
		height: 56px;
		border-radius: 8px;
		object-fit: cover;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	/* If the icon is wrapped in a button (sell side), place the button in the same grid cell */
	.item-row .icon-btn {
		grid-column: 1 / 2;
		grid-row: 1 / 3;
		width: 56px;
		height: 56px;
		padding: 0;
		border-radius: 8px;
		background: transparent;
		border: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	/* ensure the nested image fills the button */
	.item-row .icon-btn .icon {
		width: 100%;
		height: 100%;
		border-radius: inherit;
		object-fit: cover;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	/* Name: row 1 */
	.item-row .name {
		grid-column: 2 / 3;
		grid-row: 1 / 2;
		font-weight: 600;
		font-size: 14px;
		line-height: 1.3;
		white-space: normal;
		word-break: break-word;
	}

	/* Prices: row 2 */
	.item-row .prices {
		grid-column: 2 / 3;
		grid-row: 2 / 3;
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 13px;
	}

	.item-row .gold-icon,
	.item-row .silver-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
	}

	.item-row .gold-icon svg,
	.item-row .silver-icon svg {
		display: block;
	}

	.item-row .gold-val,
	.item-row .silver-val {
		font-weight: 600;
		min-width: 32px;
		display: inline-block;
	}

	.item-row .silver-icon {
		margin-left: 8px;
	}

	/* Controls (qty + cart): span both rows, vertically centered */
	.item-row .controls {
		grid-column: 3 / 4;
		grid-row: 1 / 3;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.item-row .controls input {
		width: 56px;
		text-align: center;
		border-radius: 6px;
		padding: 6px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: inherit;
		font-size: 14px;
	}

	.item-row .buy-btn {
		padding: 8px;
		background: rgba(76, 175, 80, 0.15);
		border: 1px solid rgba(76, 175, 80, 0.3);
		border-radius: 6px;
		color: #4caf50;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.item-row .buy-btn:hover {
		background: rgba(76, 175, 80, 0.25);
		border-color: rgba(76, 175, 80, 0.5);
	}

	/* clickable-name/clickable-icon were removed in markup: image is now a button and name is non-clickable */

	.icon-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		outline: none;
		width: 56px;
		height: 56px;
		border-radius: 8px;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		transition: background 140ms ease, transform 120ms ease, box-shadow 140ms ease;
	}

	.icon-btn .icon {
		display: block;
		transition: opacity 120ms ease, transform 120ms ease;
	}

	/* subtle hover lift and tint to match interactive affordance */
	.icon-btn:hover {
		background: rgba(255, 255, 255, 0.02);
		transform: translateY(-1px);
	}

	.icon-btn:hover .icon {
		opacity: 0.92;
		transform: scale(1.01);
	}

	/* keyboard focus ring for accessibility */
	.icon-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 4px rgba(0, 186, 255, 0.12);
		background: rgba(0, 186, 255, 0.06);
	}

	.icon-btn:active {
		transform: translateY(0);
	}

	.item-row .sell-btn {
		padding: 8px;
		background: rgba(255, 152, 0, 0.15);
		border: 1px solid rgba(255, 152, 0, 0.3);
		border-radius: 6px;
		color: #ff9800;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.item-row .sell-btn:hover {
		background: rgba(255, 152, 0, 0.25);
		border-color: rgba(255, 152, 0, 0.5);
	}

	.item-row .use-btn {
		padding: 8px;
		background: rgba(76, 175, 80, 0.15);
		border: 1px solid rgba(76, 175, 80, 0.3);
		border-radius: 6px;
		color: #4caf50;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.item-row .use-btn:hover {
		background: rgba(76, 175, 80, 0.25);
		border-color: rgba(76, 175, 80, 0.5);
	}

	.item-row .owned {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 2px 8px;
		font-size: 12px;
		color: rgba(0, 186, 255, 0.95); /* cyan text */
		font-weight: 600;
		margin-left: 8px;
		background: rgba(0, 186, 255, 0.04); /* subtle cyan tint */
		border: 1px solid rgba(0, 186, 255, 0.18); /* cyan border */
		border-radius: 999px;
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
		.sellbuy-panel {
			width: 98%;
			top: 8vh;
			bottom: 8vh;
		}

		.columns {
			flex-direction: column;
			gap: 8px;
		}

		.shop-list,
		.inv-list {
			min-height: 200px;
		}
	}
	.buy-btn.cart {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 8px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: inherit;
		cursor: pointer;
	}
	.buy-btn.cart:hover {
		background: rgba(255, 255, 255, 0.1);
	}
	.buy-btn.cart svg {
		display: block;
	}
	.buy-btn.can-buy {
		color: #22c55e;
		border-color: #22c55e;
		background: rgba(34, 197, 94, 0.1);
	}
	.buy-btn.can-buy:hover {
		background: rgba(34, 197, 94, 0.2);
	}
	.buy-btn.cannot-buy {
		color: #ef4444;
		border-color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
	}
	.buy-btn.cannot-buy:hover {
		background: rgba(239, 68, 68, 0.2);
	}

	/* ensure the price/coin and total align with the row baseline */
	/* .row selector removed as unused in this component */
	.empty {
		padding: 12px;
		color: rgba(255, 255, 255, 0.6);
	}

	/* Category sections */
	.category-section {
		margin-bottom: 20px;
	}

	.category-header {
		font-size: 14px;
		font-weight: 600;
		color: #7fd1b9;
		margin: 0 0 8px 0;
		padding: 4px 8px;
		background: rgba(127, 209, 185, 0.1);
		border-radius: 4px;
		border-left: 3px solid #7fd1b9;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
</style>
