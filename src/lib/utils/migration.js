import { getExpRequiredForLevel } from './leveling.js';

export class GameDataMigration {
	static LATEST_VERSION = '1.1.2';

	/** @type {{[k:string]:(data:any)=>any}} */
	static migrations = {
		'1.0.0': /** @param {any} data */ (data) => {
			// Add any missing fields that were introduced after 1.0.0
			data.settings = data.settings || {
				audioEnabled: true,
				masterVolume: 80
			};
			return data;
		},
		'1.0.1': /** @param {any} data */ (data) => {
			// Add personality traits if missing
			data.personality = data.personality || {};
			return data;
		},
		'1.0.2': /** @param {any} data */ (data) => {
			// Ensure all player stats exist
			data.playerData = {
				...data.playerData,
				stamina: data.playerData.stamina || 100,
				maxStamina: data.playerData.maxStamina || 100,
				diamonds: data.playerData.diamonds || 0
			};
			return data;
		},
		'1.0.3': /** @param {any} data */ (data) => {
			// Update leveling system to polynomial formula
			const level = data.playerData?.level || 1;
			data.playerData = {
				...data.playerData,
				maxExp: getExpRequiredForLevel(level + 1)
			};
			return data;
		},
		'1.0.4': /** @param {any} data */ (data) => {
			// Initialize stat points system
			const level = data.playerData?.level || 1;
			const statPointsFromLevels = Math.max(0, level - 1) * 6; // 6 points per level gained

			data.character = data.character || {};
			data.character = {
				...data.character,
				unallocatedStatPoints: data.character.unallocatedStatPoints ?? statPointsFromLevels
			};
			return data;
		},
		'1.0.5': /** @param {any} data */ (data) => {
			// Ensure character stats are initialized
			data.character = data.character || {};
			data.character = {
				...data.character,
				stats: data.character.stats || {
					STR: 5,
					DEX: 5,
					INT: 5,
					CON: 5,
					WIS: 5,
					CHA: 5
				}
			};
			return data;
		},
		'1.0.6': /** @param {any} data */ (data) => {
			// Initialize adventurer ranking system
			data.character = data.character || {};
			data.character = {
				...data.character,
				rank: data.character.rank || 'E',
				questsCompleted: data.character.questsCompleted || 0,
				achievements: /** @type {string[]} */ (data.character.achievements || [])
			};
			return data;
		},
		'1.0.7': /** @param {any} data */ (data) => {
			// Migrate personality traits from character object to separate personality field
			if (data.character && data.character.personalityTraits && !data.personality) {
				data.personality = data.character.personalityTraits;
				delete data.character.personalityTraits;
			}
			return data;
		},
		'1.0.8': /** @param {any} data */ (data) => {
			// Add missing icon properties to inventory items
			/** @type {{[key: string]: string}} */
			const iconMapping = {
				// Weapons
				'short-sword': '/Images/shortsword.png',
				broadsword: '/Images/broadsword.png',
				rapier: '/Images/rapier.png',
				'long-sword': '/Images/longsword.png',
				claymore: '/Images/claymore.png',
				katana: '/Images/katana.png',
				// Healing Potions
				'minor-healing-potion': '/Images/hp1.PNG',
				'light-healing-potion': '/Images/hp2.PNG',
				'healing-potion': '/Images/hp3.PNG',
				'greater-healing-potion': '/Images/hp4.PNG',
				'superior-healing-potion': '/Images/hp5.PNG',
				'ultimate-healing-potion': '/Images/hp6.PNG',
				'full-healing-potion': '/Images/hp6.PNG',
				// Spirit Potions
				'minor-spirit-potion': '/Images/sp1.PNG',
				'spirit-potion': '/Images/sp2.PNG',
				'greater-spirit-potion': '/Images/sp3.PNG',
				'superior-spirit-potion': '/Images/sp4.PNG',
				'ultimate-spirit-potion': '/Images/sp5.PNG',
				'full-spirit-potion': '/Images/sp6.PNG',
				// Antidotes
				'lesser-antidote': '/Images/antidote1.PNG',
				'normal-antidote': '/Images/antidote2.PNG',
				'greater-antidote': '/Images/antidote3.PNG',
				// Weapons
				'oakwood-mace': '/Images/woodenmace.jpg',
				'brass-mace': '/Images/brassmace.jpg',
				flail: '/Images/flail.png',
				mallet: '/Images/mallet.png',
				wrench: '/Images/wrench.png',
				spanner: '/Images/spanner.png',
				'oak-maul': '/Images/oakmaul.png',
				'executioners-axe': '/Images/executioneraxe.png',
				dirk: '/Images/dirk.png',
				dagger: '/Images/dagger.png',
				stiletto: '/Images/stiletto.png',
				spear: '/Images/spear.png',
				halberd: '/Images/halberd.png',
				'short-bow': '/Images/shortbow.jpg',
				'long-bow': '/Images/longbow.jpg',
				'composite-bow': '/Images/compositebow.jpg',
				crossbow: '/Images/crossbow.jpg',
				'wrist-bow': '/Images/wristbow.png',
				shuriken: '/Images/shuriken.PNG',
				'pocketful-of-caltrops': '/Images/caltrop.jpg',
				// Other Items
				'will-o-smoke': '/Images/smoke.PNG',
				// Magic Shop Weapons
				'old-oak-staff': '/Images/oldoakstaff.jpg',
				'crystal-core-staff': '/Images/cyrstalcorestaff.jpg',
				'bone-scepter': '/Images/bonescepter.jpg',
				'crystal-tipped-scepter': '/Images/crystaltippedscepter.jpg',
				'old-wand': '/Images/oldwand.jpg',
				'willow-wand': '/Images/willowwand.jpg',
				// Magic Shop Armor
				'silk-robe': '/Images/silkrobe.jpg',
				'novice-robe': '/Images/novicerobe.jpg',
				'embroidered-robe': '/Images/embroideredrobe.jpg',
				'novice-hood': '/Images/novicehood.jpg',
				'silk-hood': '/Images/silkhood.jpg',
				'arcane-sash': '/Images/arcanesash.jpg',
				'novice-magic-boots': '/Images/novicemagicboots.jpg',
				'arcane-boots': '/Images/arcaneboots.jpg',
				// Blacksmith Armor
				'old-chainmail': '/Images/oldchainmail.jpg',
				brigandine: '/Images/brigandine.jpg',
				cuirass: '/Images/cuirass.jpg',
				'cloth-armor': '/Images/clotharmor.jpg',
				'leather-jerkin': '/Images/leatherjerkin.jpg',
				'studded-hide-armor': '/Images/studdedleatherarmor.jpg',
				'blackend-cloth-armor': '/Images/blackendclotharmor.jpg',
				'blackend-leather-jerkin': '/Images/blackendleatherjerkin.jpg',
				'blackend-leather-robe': '/Images/blackendleatherrobe.jpg',
				'leather-bascinet': '/Images/laetherbascinet.jpg',
				barbute: '/Images/barbute.jpg',
				'old-hood': '/Images/oldhood.jpg',
				'leather-hood': '/Images/leatherhood.jpg',
				'plated-belt': '/Images/platedbelt.jpg',
				'leather-belt': '/Images/leatherbelt.jpg',
				'old-plated-boots': '/Images/oldplatedboots.jpg',
				'iron-plated-boots': '/Images/ironplatedboots.jpg',
				'old-leather-boots': '/Images/oldleatherboots.jpg',
				'studded-leather-boots': '/Images/studdedleatherboots.jpg',
				'wooden-shield': '/Images/woodenshield.jpg',
				'round-iron-shield': '/Images/roundironshield.jpg',
				'tower-shield': '/Images/towershield.jpg',
				// Equipment Boxes
				'random-e-rank-equipment-box': '/Images/box-e1.png'
			};

			if (data.character && data.character.inventory && Array.isArray(data.character.inventory)) {
				// @ts-ignore - Dynamic inventory item migration
				data.character.inventory = data.character.inventory.map((item) => {
					if (item && !item.icon && item.id && iconMapping[item.id]) {
						return { ...item, icon: iconMapping[item.id] };
					}
					// Also add icons to box items that don't have them
					if (item && !item.icon && item.type === 'box') {
						return { ...item, icon: `/Images/box-e${Math.floor(Math.random() * 6) + 1}.png` };
					}
					return item;
				});
			}
			return data;
		},
		'1.0.9': /** @param {any} data */ (data) => {
			// Add icons to box items that don't have them
			if (data.character && data.character.inventory && Array.isArray(data.character.inventory)) {
				let boxCount = 0;
				data.character.inventory = data.character.inventory.map((item) => {
					if (item && !item.icon && item.type === 'box') {
						boxCount++;
						console.log('Migration 1.0.9: Adding icon to box item:', item.name);
						return { ...item, icon: `/Images/box-e1.png` };
					}
					return item;
				});
				if (boxCount > 0) {
					console.log(`Migration 1.0.9: Added icons to ${boxCount} box items`);
				}
			}
			return data;
		},
		'1.1.0': /** @param {any} data */ (data) => {
			// Convert questsCompleted from array to object with timestamps for cooldown system
			if (data.character && Array.isArray(data.character.questsCompleted)) {
				const pastTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago, ensuring quests are available
				data.character.questsCompleted = data.character.questsCompleted.reduce(
					(/** @type {Record<string, number>} */ acc, /** @type {string} */ id) => {
						acc[id] = pastTime;
						return acc;
					},
					{}
				);
			}
			return data;
		},
		'1.1.1': /** @param {any} data */ (data) => {
			// Initialize quest statistics tracking
			data.character = data.character || {};
			data.character.questStats = data.character.questStats || {
				totalTaken: 0,
				totalCompleted: 0,
				totalFailed: 0,
				byRank: {
					daily: { taken: 0, completed: 0, failed: 0 },
					beginner: { taken: 0, completed: 0, failed: 0 },
					E: { taken: 0, completed: 0, failed: 0 },
					D: { taken: 0, completed: 0, failed: 0 },
					C: { taken: 0, completed: 0, failed: 0 },
					B: { taken: 0, completed: 0, failed: 0 },
					A: { taken: 0, completed: 0, failed: 0 },
					S: { taken: 0, completed: 0, failed: 0 },
					SS: { taken: 0, completed: 0, failed: 0 },
					SSS: { taken: 0, completed: 0, failed: 0 }
				}
			};
			return data;
		},
		'1.1.2': /** @param {any} data */ (data) => {
			// Initialize story flags
			data.character = data.character || {};
			data.character.storyFlags = data.character.storyFlags || {};
			return data;
		}
	};

	/** @param {any} data */
	static migrate(data) {
		if (!data.version) {
			data.version = '1.0.0';
		} else if (typeof data.version === 'number') {
			// Convert numeric versions to string format
			data.version = data.version.toString() + '.0.0';
		}

		const versions = Object.keys(this.migrations).sort((a, b) => this.compareVersions(a, b));

		for (const version of versions) {
			if (this.compareVersions(data.version, version) < 0) {
				data = this.migrations[version](data);
				data.version = version;
			}
		}

		return data;
	}

	/** @param {string} a @param {string} b */
	static compareVersions(a, b) {
		const partsA = a.split('.').map(Number);
		const partsB = b.split('.').map(Number);

		for (let i = 0; i < 3; i++) {
			if (partsA[i] !== partsB[i]) {
				return partsA[i] - partsB[i];
			}
		}

		return 0;
	}
}
