// Map quest template IDs to enemy lists used by the live combat engine.
// Each entry is an array of { id, count } objects describing enemy types and quantities.
export const questEnemyMap = {
	E101: [{ id: 'goblin-grunt', count: 5 }],
	E102: [{ id: 'feral-wolf', count: 5 }],
	E103: [{ id: 'skeleton-warrior', count: 5 }],
	E104: [{ id: 'dire-rat', count: 5 }],
	E105: [{ id: 'sprotting', count: 5 }],
	E106: [{ id: 'giant-cave-bat', count: 5 }],
	E107: [{ id: 'slime-green', count: 5 }],
	E108: [{ id: 'muck-lurker', count: 5 }],
	E109: [{ id: 'swamp-viper', count: 5 }],
	E110: [{ id: 'scuttlesnap', count: 5 }],
	// Test variants (20-count)
	E101_20: [{ id: 'goblin-grunt', count: 20 }],
	E102_20: [{ id: 'feral-wolf', count: 20 }],
	E103_20: [{ id: 'skeleton-warrior', count: 20 }],
	E104_20: [{ id: 'dire-rat', count: 20 }],
	E105_20: [{ id: 'sprotting', count: 20 }],
	E106_20: [{ id: 'giant-cave-bat', count: 20 }],
	E107_20: [{ id: 'slime-green', count: 20 }],
	E108_20: [{ id: 'muck-lurker', count: 20 }],
	E109_20: [{ id: 'swamp-viper', count: 20 }],
	E110_20: [{ id: 'scuttlesnap', count: 20 }],
	// Simple defaults for some higher-tier templates (can be expanded later)
	E201: [
		{ id: 'goblin-grunt', count: 20 },
		{ id: 'hobgoblin-enforcer', count: 1 }
	]
	,
		E202: [
			{ id: 'sprotting', count: 20 },
			{ id: 'barkblight-treant', count: 1 }
		]
		,
		E203: [
			{ id: 'giant-cave-bat', count: 20 },
			{ id: 'cave-fisher', count: 1 }
		],
		E204: [
			{ id: 'young-rocsdale-bear', count: 1 }
		],
		E205: [
			{ id: 'swamp-viper', count: 20 },
			{ id: 'giant-leech', count: 1 }
		],
		E206: [
			{ id: 'swamp-viper', count: 20 },
			{ id: 'bog-wisp', count: 1 }
		],
		E207: [
			{ id: 'skeleton-warrior', count: 20 },
			{ id: 'ghoul', count: 1 }
		],
		E208: [
			{ id: 'skeleton-warrior', count: 20 },
			{ id: 'geist', count: 1 }
		],
		E209: [
			{ id: 'peryton', count: 1 }
		],
		E210: [
			{ id: 'harpy-scout', count: 1 }
		]
};

export default questEnemyMap;
