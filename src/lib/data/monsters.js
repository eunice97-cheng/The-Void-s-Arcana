// Monster Book entries (E101 - E110)
export const monsterBook = [
	{
		id: 'goblin-grunt',
		name: 'Goblin Grunt',
		rank: 'E',
		area: 'Forest & Plains',
		element: 'Neutral',
		type: 'Humanoid',
		thumbnail: 'goblin grunt.png',
		description:
			'Scrawny, green-skinned humanoids with pointed ears and sharp teeth. They are cowardly alone but dangerous in packs. They wear ragged leather armor and wield crudely made clubs or rusty short swords.',
		stats: { hp: 100, dps: 12, acc: 0.02, eva: 0.015, phyDef: 8, magDef: 3, cr: 0 },
		loot: { baseFragments: 0, extraFragmentChance: 0.6667 }
	},
	{
		id: 'dire-rat',
		name: 'Dire Rat',
		rank: 'E',
		area: 'Forest & Plains',
		element: 'Air',
		type: 'Beast - Mammal',
		thumbnail: 'dire rat.png',
		description:
			'An unnaturally large rodent, the size of a large dog. Its fur is matted and filthy, eyes glow with a faint red menace, and its bite can carry disease.',
		stats: { hp: 80, dps: 10, acc: 0.025, eva: 0.02, phyDef: 5, magDef: 4, cr: 0.03 },
		loot: { baseFragments: 0, extraFragmentChance: 0.6667 }
	},
	{
		id: 'feral-wolf',
		name: 'Feral Wolf',
		rank: 'E',
		area: 'Forest & Plains',
		element: 'Fire',
		type: 'Beast - Mammal',
		thumbnail: 'feral wolf.png',
		description:
			'A gaunt and aggressive wolf, driven to attack by hunger or a dark influence on the land. It moves with a swift, predatory grace.',
		stats: { hp: 110, dps: 14, acc: 0.03, eva: 0.025, phyDef: 6, magDef: 5, cr: 0.04 },
		loot: { baseFragments: 0, extraFragmentChance: 0.6667 }
	},
	{
		id: 'sprotting',
		name: 'Sprotting',
		rank: 'E',
		area: 'Forest & Plains',
		element: 'Earth',
		type: 'Plant / Fungus',
		thumbnail: 'sprotting.png',
		description:
			'A slow-moving, humanoid plant creature. Its body is a tangle of roots and vines, with a single, glowing flower for a head. It lashes out with thorny limbs.',
		stats: { hp: 130, dps: 9, acc: 0.015, eva: 0.01, phyDef: 12, magDef: 10, cr: 0.01 },
		loot: { baseFragments: 0, extraFragmentChance: 0.6667 }
	},
	{
		id: 'giant-cave-bat',
		name: 'Giant Cave Bat',
		rank: 'E',
		area: 'Caves & Ruins',
		element: 'Air',
		type: 'Beast - Mammal',
		thumbnail: 'giant cave bat.png',
		description:
			'With leathery wings spanning wider than a man is tall, these bats navigate by screeching echolocation. They swoop down from cave ceilings to scratch and bite.',
		stats: { hp: 70, dps: 11, acc: 0.035, eva: 0.03, phyDef: 3, magDef: 2, cr: 0.05 },
		loot: { baseFragments: 0, extraFragmentChance: 0.6667 }
	},
	{
		id: 'skeleton-warrior',
		name: 'Skeleton Warrior',
		rank: 'E',
		area: 'Caves & Ruins',
		element: 'Dark',
		type: 'Undead',
		thumbnail: 'skeleton warrior.png',
		description:
			'A reanimated human skeleton clad in the rusted remnants of armor. It moves with a jerky, unthinking purpose, obeying the will of a necromancer or a cursed site.',
		stats: { hp: 100, dps: 12, acc: 0.018, eva: 0.008, phyDef: 15, magDef: 16, cr: 0.01 },
		loot: { baseFragments: 0, extraFragmentChance: 0.6667 }
	},
	{
		id: 'slime-green',
		name: 'Slime (Green)',
		rank: 'E',
		area: 'Caves & Ruins',
		element: 'Water',
		type: 'Ooze',
		thumbnail: 'slime green.png',
		description:
			'A pulsating, amorphous blob of green gelatinous ooze. It moves by sliding slowly, leaving a corrosive trail. It attempts to engulf its prey to dissolve it.',
		stats: { hp: 140, dps: 8, acc: 0.012, eva: 0.005, phyDef: 18, magDef: 3, cr: 0 },
		loot: { baseFragments: 0, extraFragmentChance: 0.6667 }
	},
	{
		id: 'muck-lurker',
		name: 'Muck Lurker',
		rank: 'E',
		area: 'Wetlands & Rivers',
		element: 'Water',
		type: 'Beast - Amphibious',
		thumbnail: 'muck lurker.png',
		description:
			'A foul, frog-like humanoid that hides in murky water and riverbanks. It has bulbous eyes and a long, sticky tongue it uses to pull prey into the water.',
		stats: { hp: 90, dps: 11, acc: 0.022, eva: 0.018, phyDef: 10, magDef: 7, cr: 0.02 },
		loot: { baseFragments: 0, extraFragmentChance: 0.6667 }
	},
	{
		id: 'swamp-viper',
		name: 'Swamp Viper',
		rank: 'E',
		area: 'Wetlands & Rivers',
		element: 'Fire',
		type: 'Beast - Reptile',
		thumbnail: 'swamp viper.png',
		description:
			'A thick, mud-colored serpent perfectly camouflaged in its environment. It strikes with lightning speed from the water or tall grass.',
		stats: { hp: 60, dps: 16, acc: 0.04, eva: 0.028, phyDef: 2, magDef: 8, cr: 0.08 },
		loot: { baseFragments: 0, extraFragmentChance: 0.6667 }
	},
	{
		id: 'scuttlesnap',
		name: 'Scuttlesnap',
		rank: 'E',
		area: 'Coastal & Beach',
		element: 'Earth',
		type: 'Beast - Crustacean',
		thumbnail: 'scuttlesnap.png',
		description:
			'A large, ornery hermit crab that has made its home in a cracked, old helmet or a piece of wreckage instead of a shell. Its oversized, powerful claw can deliver a painful pinch strong enough to snap a wooden spear shaft. It scuttles sideways with surprising speed.',
		stats: { hp: 160, dps: 10, acc: 0.016, eva: 0.012, phyDef: 22, magDef: 12, cr: 0.01 },
		loot: { baseFragments: 0, extraFragmentChance: 0.6667 }
	}
,
	{
		id: 'hobgoblin-enforcer',
		name: 'Hobgoblin Enforcer',
		rank: 'E',
		area: 'Forest & Hills',
		element: 'Fire',
		type: 'Humanoid',
		thumbnail: 'hobgoblin enforcer.png',
		description:
			'Larger, stronger, and more disciplined than their goblin cousins. Hobgoblins wear scavenged chainmail and wield notched but effective scimitars. They fight with crude tactics and enjoy bullying smaller creatures into serving them.',
		stats: { hp: 150, dps: 18, acc: 0.022, eva: 0.016, phyDef: 12, magDef: 4, cr: 0.025 },
		loot: { baseFragments: 1, extraFragmentChance: 0.3333 }
	},
	{
		id: 'barkblight-treant',
		name: 'Barkblight Treant',
		rank: 'E',
		area: 'Forest & Hills',
		element: 'Earth',
		type: 'Plant / Corrupted',
		thumbnail: 'barkblight treant.png',
		description:
			'A young, corrupted tree spirit whose bark is covered in weeping, black sores. It moves with a groaning slowness, but its branch-like limbs can strike with surprising reach and force.',
		stats: { hp: 196, dps: 14, acc: 0.016, eva: 0.008, phyDef: 18, magDef: 15, cr: 0.012 },
		loot: { baseFragments: 1, extraFragmentChance: 0.3333 }
	},
	{
		id: 'cave-fisher',
		name: 'Cave Fisher',
		rank: 'E',
		area: 'Caves & Mountains',
		element: 'Earth',
		type: 'Vermin / Insectoid',
		thumbnail: 'cave fisher.png',
		description:
			'A bizarre, chitinous predator that clings to cavern ceilings. It camouflages itself against the rock and uses a long, sticky filament to snag prey from the ground, reeling them in towards its razor-sharp proboscis.',
		stats: { hp: 106, dps: 17, acc: 0.03, eva: 0.022, phyDef: 5, magDef: 6, cr: 0.06 },
		loot: { baseFragments: 1, extraFragmentChance: 0.3333 }
	},
	{
		id: 'young-rocsdale-bear',
		name: 'Young Rocsdale Bear',
		rank: 'E',
		area: 'Caves & Mountains',
		element: 'Fire',
		type: 'Beast - Mammal',
		thumbnail: 'young rocsdale bear.png',
		description:
			'A massive bear that makes its home in rocky highlands. Its coat is thick and matted with pine resin, making it highly resistant to arrows. It is fiercely territorial.',
		stats: { hp: 276, dps: 35, acc: 0.028, eva: 0.018, phyDef: 25, magDef: 10, cr: 0.05 },
		loot: { baseFragments: 1, extraFragmentChance: 0.3333 }
	},
	{
		id: 'bog-wisp',
		name: 'Bog Wisp',
		rank: 'E',
		area: 'Swamps & Marshes',
		element: 'Water',
		type: 'Elemental / Spirit',
		thumbnail: 'bog wisp.png',
		description:
			'A floating ball of eerie, greenish gas and malevolent energy that forms over patches of decaying swamp matter. It lures creatures to their doom with hypnotic lights.',
		stats: { hp: 90, dps: 15, acc: 0.025, eva: 0.035, phyDef: 3, magDef: 20, cr: 0.03 },
		loot: { baseFragments: 1, extraFragmentChance: 0.3333 }
	},
	{
		id: 'giant-leech',
		name: 'Giant Leech',
		rank: 'E',
		area: 'Swamps & Marshes',
		element: 'Water',
		type: 'Vermin / Annelid',
		thumbnail: 'giant leech.png',
		description:
			'A grotesque, arm-thick leech that lies in wait in murky water. It latches onto prey, draining blood and weakening its victim.',
		stats: { hp: 136, dps: 12, acc: 0.02, eva: 0.01, phyDef: 8, magDef: 8, cr: 0.0 },
		loot: { baseFragments: 1, extraFragmentChance: 0.3333 }
	},
	{
		id: 'ghoul',
		name: 'Ghoul',
		rank: 'E',
		area: 'Undead & Corrupted',
		element: 'Dark',
		type: 'Undead',
		thumbnail: 'ghoul.png',
		description:
			'A foul, humanoid undead creature with pallid skin and long claws. They are driven by a relentless hunger for flesh and are often found in graveyards or places of mass death.',
		stats: { hp: 150, dps: 18, acc: 0.024, eva: 0.02, phyDef: 10, magDef: 12, cr: 0.04 },
		loot: { baseFragments: 1, extraFragmentChance: 0.3333 }
	},
	{
		id: 'geist',
		name: 'Geist',
		rank: 'E',
		area: 'Undead & Corrupted',
		element: 'Dark',
		type: 'Incorporeal Undead',
		thumbnail: 'geist.png',
		description:
			'A vengeful, non-corporeal spirit bound to the mortal plane. It appears as a shimmering, translucent figure filled with rage and can phase through solid objects.',
		stats: { hp: 120, dps: 20, acc: 0.026, eva: 0.04, phyDef: 5, magDef: 25, cr: 0.05 },
		loot: { baseFragments: 1, extraFragmentChance: 0.3333 }
	},
	{
		id: 'peryton',
		name: 'Peryton',
		rank: 'E',
		area: 'Beasts & Hybrids',
		element: 'Air',
		type: 'Beast - Hybrid',
		thumbnail: 'peryton.png',
		description:
			'A monstrous hybrid with the body of a large stag and the wings and head of a bird of prey. Its shadow is unnaturally that of a man, and it is said to have a taste for humanoid hearts.',
		stats: { hp: 250, dps: 40, acc: 0.035, eva: 0.03, phyDef: 15, magDef: 18, cr: 0.08 },
		loot: { baseFragments: 1, extraFragmentChance: 0.3333 }
	},
	{
		id: 'harpy-scout',
		name: 'Harpy Scout',
		rank: 'E',
		area: 'Beasts & Hybrids',
		element: 'Air',
		type: 'Beast - Hybrid',
		thumbnail: 'harpy scout.png',
		description:
			'A vile creature with the body of a woman and the wings and talons of a vulture. Their haunting songs can mesmerize the weak-willed, and they scavenge and steal from coastal cliffs.',
		stats: { hp: 200, dps: 25, acc: 0.032, eva: 0.028, phyDef: 8, magDef: 10, cr: 0.06 },
		loot: { baseFragments: 1, extraFragmentChance: 0.3333 }
	}
];

export default monsterBook;
