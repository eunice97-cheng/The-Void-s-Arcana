// src/lib/utils/items.js
// Helper functions for the new JSON-based item database with 7-digit IDs

/**
 * Parse a 7-digit item ID (TCCSNNN) into its components
 * @param {number|string} id - The 7-digit item ID
 * @returns {{type: number, category: number, slot: number, index: number}} Parsed components
 */
export function parseItemId(id) {
	const idStr = String(id).padStart(7, '0');
	return {
		type: parseInt(idStr[0]), // 1=Equipable, 2=Consumable
		category: parseInt(idStr.slice(1, 3)), // 11=Sword, 21=Light Armor, etc.
		slot: parseInt(idStr[3]), // 1=Main, 2=Off, 3=Two, 4=Versatile
		index: parseInt(idStr.slice(4)) // 001-999
	};
}

/**
 * Get item type name from ID
 * @param {number|string} id - The item ID
 * @returns {string} Type name
 */
export function getItemType(id) {
	const { type } = parseItemId(id);
	/** @type {Record<number, string>} */
	const typeMap = {
		1: 'Equipable',
		2: 'Consumable'
	};
	return typeMap[type] || 'Unknown';
}

/**
 * Get category name from ID
 * @param {number|string} id - The item ID
 * @returns {string} Category name
 */
export function getItemCategory(id) {
	const { type, category } = parseItemId(id);

	if (type === 1) {
		// Equipable
		/** @type {Record<number, string>} */
		const categoryMap = {
			11: 'Sword',
			12: 'Dagger',
			13: 'Axe/Spear/Hammer',
			14: 'Mace',
			15: 'Bow/Crossbow',
			16: 'Rod/Wand/Staff/Scepter',
			17: 'Tinkerer Weapons',
			18: 'Shield',
			21: 'Light Armor',
			22: 'Medium Armor',
			23: 'Heavy Armor',
			24: 'Magic Armor',
			25: 'Accessories'
		};
		return categoryMap[category] || 'Unknown Equipment';
	} else if (type === 2) {
		// Consumable
		/** @type {Record<number, string>} */
		const categoryMap = {
			11: 'Potions',
			21: 'Food',
			23: 'Scrolls',
			24: 'Thrown Weapons'
		};
		return categoryMap[category] || 'Unknown Consumable';
	}

	return 'Unknown';
}

/**
 * Get slot type from ID
 * @param {number|string} id - The item ID
 * @returns {string} Slot type
 */
export function getItemSlot(id) {
	const { slot } = parseItemId(id);
	/** @type {Record<number, string>} */
	const slotMap = {
		1: 'Main Hand Only',
		2: 'Off Hand Only',
		3: 'Two Hand Only',
		4: 'Versatile',
		// For armor
		5: 'Necklace',
		6: 'Ring Slot 1',
		7: 'Ring Slot 2'
	};
	return slotMap[slot] || 'Unknown Slot';
}

/**
 * Check if an item can be equipped in a specific slot
 * @param {number|string} itemId - The item ID
 * @param {string} targetSlot - The equipment slot (weapon1, weapon2, etc.)
 * @returns {boolean} Whether the item can be equipped
 */
export function canEquipInSlot(itemId, targetSlot) {
	const { type, category, slot } = parseItemId(itemId);

	// Only equipable items can be equipped
	if (type !== 1) return false;

	// Handle weapon slots
	if (targetSlot === 'weapon1') {
		// Main hand accepts weapons (categories 11-17) with: main-hand only (0 or 1), two-hand (3), versatile (4)
		return (
			category >= 11 && category <= 17 && (slot === 0 || slot === 1 || slot === 3 || slot === 4)
		);
	}

	if (targetSlot === 'weapon2') {
		// Off-hand accepts weapons (categories 11-17) with: off-hand only (2), versatile (4), or shields (category 18)
		// Note: slot 0 (main-hand only) weapons cannot be equipped in off-hand
		return (category >= 11 && category <= 17 && (slot === 2 || slot === 4)) || category === 18;
	}

	// Handle armor slots
	/** @type {Record<string, number[]>} */
	const armorSlotMap = {
		head: [1], // Head slot
		body: [2], // Body slot
		legs: [3], // Legs/Boots slot
		belt: [4], // Belt slot
		necklace: [5], // Necklace slot
		ring1: [6], // Ring slot 1
		ring2: [6, 7] // Ring slots can accept ring items
	};

	const allowedSlots = armorSlotMap[targetSlot];
	if (allowedSlots) {
		// Check if it's armor (categories 21-25) and matches slot
		if (category >= 21 && category <= 25) {
			return allowedSlots.includes(slot);
		}
	}

	return false;
}

/**
 * Check if an item is a weapon
 * @param {number|string} id - The item ID
 * @returns {boolean} Whether the item is a weapon
 */
export function isWeapon(id) {
	const { type, category } = parseItemId(id);
	return type === 1 && category >= 11 && category <= 18;
}

/**
 * Check if an item is armor
 * @param {number|string} id - The item ID
 * @returns {boolean} Whether the item is armor
 */
export function isArmor(id) {
	const { type, category } = parseItemId(id);
	return type === 1 && category >= 21 && category <= 25;
}

/**
 * Check if an item is a consumable
 * @param {number|string} id - The item ID
 * @returns {boolean} Whether the item is consumable
 */
export function isConsumable(id) {
	const { type } = parseItemId(id);
	return type === 2;
}

/**
 * Check if a weapon is two-handed
 * @param {number|string} id - The item ID
 * @returns {boolean} Whether the weapon is two-handed
 */
export function isTwoHanded(id) {
	const { slot } = parseItemId(id);
	return slot === 3;
}

/**
 * Check if a weapon is versatile (can be main or off-hand)
 * @param {number|string} id - The item ID
 * @returns {boolean} Whether the weapon is versatile
 */
export function isVersatile(id) {
	const { slot } = parseItemId(id);
	return slot === 4;
}

/**
 * Check if an item is a shield
 * @param {number|string} id - The item ID
 * @returns {boolean} Whether the item is a shield
 */
export function isShield(id) {
	const { type, category } = parseItemId(id);
	return type === 1 && category === 18;
}

/**
 * Generate ID ranges for database queries
 * @param {number} type - Item type (1=Equipable, 2=Consumable)
 * @param {number} category - Category code (11=Sword, etc.)
 * @returns {{minId: number, maxId: number}} Min and max IDs for the range
 */
export function getIdRange(type, category) {
	const typeStr = String(type);
	const categoryStr = String(category).padStart(2, '0');
	const minId = parseInt(`${typeStr}${categoryStr}0000`);
	const maxId = parseInt(`${typeStr}${categoryStr}9999`);
	return { minId, maxId };
}

/**
 * Filter items by ID range
 * @param {Record<string, any>} itemDatabase - The items database object
 * @param {number} type - Item type
 * @param {number|null} category - Category code (optional)
 * @returns {Record<string, any>} Filtered items
 */
export function filterItemsByType(itemDatabase, type, category = null) {
	/** @type {Record<string, any>} */
	const filtered = {};

	Object.entries(itemDatabase).forEach(([id, item]) => {
		const parsed = parseItemId(id);
		if (parsed.type === type && (category === null || parsed.category === category)) {
			filtered[id] = item;
		}
	});

	return filtered;
}

/**
 * Get all weapons from database
 * @param {Record<string, any>} itemDatabase - The items database object
 * @returns {Record<string, any>} All weapon items
 */
export function getAllWeapons(itemDatabase) {
	/** @type {Record<string, any>} */
	const filtered = {};

	Object.entries(itemDatabase).forEach(([id, item]) => {
		const { type, category } = parseItemId(id);
		if (type === 1 && category >= 11 && category <= 18) {
			filtered[id] = item;
		}
	});

	return filtered;
}

/**
 * Get all armor from database
 * @param {Record<string, any>} itemDatabase - The items database object
 * @returns {Record<string, any>} All armor items
 */
export function getAllArmor(itemDatabase) {
	/** @type {Record<string, any>} */
	const filtered = {};

	Object.entries(itemDatabase).forEach(([id, item]) => {
		const { type, category } = parseItemId(id);
		if (type === 1 && category >= 21 && category <= 25) {
			filtered[id] = item;
		}
	});

	return filtered;
}

/**
 * Get all consumables from database
 * @param {Record<string, any>} itemDatabase - The items database object
 * @returns {Record<string, any>} All consumable items
 */
export function getAllConsumables(itemDatabase) {
	return filterItemsByType(itemDatabase, 2);
}

/**
 * Migrate old equipment items to new ID-based system
 * @param {any} equipment - The current equipment object
 * @param {Record<string, any>} itemDatabase - The items database
 * @returns {any} Updated equipment with proper IDs
 */
export function migrateEquipmentToIds(equipment, itemDatabase) {
	if (!equipment) return equipment;

	const migratedEquipment = { ...equipment };

	// Direct mapping for old dagger IDs that were changed
	const oldIdMapping = {
		1120001: 1124001, // Dirk
		1120002: 1124002, // Dagger
		1120003: 1124003 // Stiletto
	};

	// Iterate through all equipment slots
	for (const [slot, item] of Object.entries(migratedEquipment)) {
		if (item && item !== 'none' && typeof item === 'object') {
			// Check if item already has an ID
			if (!item.id) {
				// Find matching item in database by name
				const matchingItem = Object.values(itemDatabase).find(
					(dbItem) => dbItem.name === item.name
				);

				if (matchingItem) {
					// Replace the old item with the new one from database
					migratedEquipment[slot] = { ...matchingItem };
				} else {
					console.warn(`Could not find matching item for: ${item.name} in slot ${slot}`);
				}
			} else if (item.id && [1120001, 1120002, 1120003].includes(Number(item.id))) {
				// Update old dagger IDs to new versatile IDs
				const itemId = Number(item.id);
				const newId = oldIdMapping[itemId];
				const newItem = itemDatabase[newId];
				if (newItem) {
					migratedEquipment[slot] = { ...newItem };
				}
			}
		}
	}

	return migratedEquipment;
}
