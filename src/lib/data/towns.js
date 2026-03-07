export const towns = {
	'mirrors-repose': {
		id: 'mirrors-repose',
		name: "Mirror's Repose",
		background: "/Images/Mirror Repose.png",
		places: [
			{ id: 'pier-light', name: 'The Pier Light', unlock: 'Scene025', icon: 'fa-solid fa-bed', background: '/Images/Inn2.png' },
			{ id: 'crab-and-claw', name: 'Crab and Claw', unlock: 'Scene020', icon: 'fa-solid fa-wine-bottle', background: '/Images/Tavern.png' },
			{ id: 'guild-hall', name: 'Guild Hall', unlock: 'Scene048', icon: 'fa-solid fa-building-columns', background: '/Images/Guild Hall.png' },
			{ id: 'love-and-hammered', name: 'The Love and Hammered', unlock: null, icon: 'fa-solid fa-hammer', background: '/Images/Blacksmith.png' },
			{ id: 'swill-n-swing', name: "Swill n' Swing", unlock: 'Scene101', icon: 'fa-solid fa-leaf', background: '/Images/Apothecary Shop.png' },
			{ id: 'familiars-folly', name: "Familiar's Folly", unlock: 'Scene102', icon: 'fa-solid fa-cat', background: '/Images/Magic Shop.png' },
			{ id: 'the-hush-hustler', name: 'The Hush Hustler', unlock: null, icon: 'fa-solid fa-star-of-david', background: '/Images/Shady Shop.png' }
		],
		connections: ['sandy-bay', 'glimmerdell']
	},
	'sandy-bay': {
		id: 'sandy-bay',
		name: 'Sandy Bay',
		background: "/Images/Sandy Bay.png",
		unlock: 'Scene113',
		places: [
			{ id: 'sandy-inn', name: 'Sandy Inn', unlock: null, icon: 'fa-solid fa-bed', background: '/Images/Inn.png' },
			{ id: 'market', name: 'Market', unlock: null, icon: 'fa-solid fa-store', background: '/Images/Shady Shop.png' },
			{ id: 'guild-hall', name: 'Guild Hall', unlock: null, icon: 'fa-solid fa-building-columns', background: '/Images/Sandy Bay Guild Hall.png' }
		],
		connections: ['mirrors-repose', 'glimmerdell']
	},
	'glimmerdell': {
		id: 'glimmerdell',
		name: 'Glimmerdell',
		background: "/Images/Glimmerdell.png",
		unlock: 'Scene113',
		places: [
			{ id: 'healing-canopy', name: 'Healing Canopy', unlock: null, icon: 'fa-solid fa-leaf', background: '/Images/Healing Canopy.jpg' },
			{ id: 'blood-and-iron', name: 'Blood and Iron', unlock: null, icon: 'fa-solid fa-hammer', background: '/Images/Blood and Iron.jpg' },
			{ id: 'glimmerdell-town-hall', name: 'Glimmerdell Town Hall', unlock: 'Scene116', icon: 'fa-solid fa-building', background: '/Images/Glimmerdell Town Hall.jpg' },
			{ id: 'the-oak-and-ale', name: 'The Oak and Ale', unlock: null, icon: 'fa-solid fa-wine-bottle', background: '/Images/The Oak & Ale.png' },
			{ id: 'smiths-house', name: "Smith's House", unlock: null, icon: 'fa-solid fa-house', background: '/Images/Smith House.jpg' },
			{ id: 'normans-house', name: "Norman's House", unlock: null, icon: 'fa-solid fa-house', background: '/Images/Norman House.jpg' },
			{ id: 'guild-hall', name: 'Guild Hall', unlock: null, icon: 'fa-solid fa-building-columns', background: '/Images/Glimmerdell Guild Hall.jpg' }
		],
		connections: ['mirrors-repose', 'sandy-bay']
	}
};
