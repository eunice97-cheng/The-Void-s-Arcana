<!-- src/routes/pick-class/+page.svelte -->
<script>
	// @ts-nocheck
	// navigation helpers not needed here
	import { onMount } from 'svelte';
	import { gameState, personalityTraits } from '$lib/stores/gameState';
	import { sceneManager } from '$lib/stores/sceneManager';
	import { saveManager } from '$lib/stores/saveManager';
	import { getBaseStats, calculateDerived } from '$lib/utils/stats';
	import MusicToggle from '$lib/components/ui/MusicToggle.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
	// encryption helpers not used in this view

	/**
	 * @typedef {{ id: string, name: string, description: string, stats: { hp: number, sp: number, stamina: number } }} ClassDef
	 */
	/** @type {ClassDef[]} */
	// Stats shown here are derived from the base attributes (all 5) and class rules:
	// base HP/SP/STA = 100; adjusted by class flat bonus + CON/WIS multipliers
	// With base CON=5 and WIS=5 the derived starting values are:
	const classes = [
		{
			id: 'warrior',
			name: 'Warrior',
			description: 'Masters of martial combat, warriors excel at both offense and defense.',
			// 100 + 50 (class) + 5*12 (CON) = 210 HP; 100 + 0 + 5*8 (WIS) = 140 SP
			stats: { hp: 210, sp: 140, stamina: 100 }
		},
		{
			id: 'mage',
			name: 'Mage',
			description: 'Wielders of arcane power, mages can devastate enemies from afar.',
			// 100 + 0 + 5*8 = 140 HP; 100 + 50 + 5*12 = 210 SP
			stats: { hp: 140, sp: 210, stamina: 100 }
		},
		{
			id: 'rogue',
			name: 'Rogue',
			description: 'Swift and cunning, rogues excel at stealth and precision strikes.',
			// 100 + 25 + 5*10 = 175 HP; 100 + 25 + 5*10 = 175 SP
			stats: { hp: 175, sp: 175, stamina: 100 }
		},
		{
			id: 'archer',
			name: 'Archer',
			description: 'Deadly with a bow, archers rely on precision and agility.',
			// same as rogue
			stats: { hp: 175, sp: 175, stamina: 100 }
		},
		{
			id: 'acolyte',
			name: 'Acolyte',
			description: 'Pious and wise, acolytes serve as spiritual guides and support.',
			// same as mage
			stats: { hp: 140, sp: 210, stamina: 100 }
		},
		{
			id: 'tinkerer',
			name: 'Tinkerer',
			description: 'Inventive craftsmen, tinkerers build gadgets and clever devices.',
			// same as mage
			stats: { hp: 140, sp: 210, stamina: 100 }
		}
	];

	/** @type {ClassDef|null} */
	let selectedClass = null;
	/** @type {boolean} */
	let showSpinner = true;
	// personalityTraits is a store with keys like N,E,O,C,A (counts)
	/** @type {Record<string, number>} */
	let traits = {};
	$: traits = /** @type {Record<string, number>} */ ($personalityTraits || {});

	// OCEAN trait to class mappings (as per user's specification)
	// O (Openness) - Pathfinder - Archer/Rogue
	// C (Conscientiousness) - Strategist - Mage/Tinkerer/Archer/Warrior
	// E (Extraversion) - Emissary - Acolyte/Rogue/Warrior
	// A (Agreeableness) - Guardian - Warrior/Acolyte
	// N (Neuroticism) - Scholar - Mage/Tinkerer/Acolyte
	/** @type {Record<string, string[]>} */
	const traitMapping = {
		archer: ['O', 'C'],
		rogue: ['O', 'E'],
		mage: ['C', 'N'],
		tinkerer: ['C', 'N'],
		warrior: ['C', 'E', 'A'],
		acolyte: ['E', 'A', 'N']
	};

	// compute class scores and rank them
	/** @type {{id: string, score: number}[]} */
	let classScores = [];

	$: classScores = (() => {
		try {
			const scores = classes.map((c) => {
				const relevantTraits = traitMapping[c.id] || [];
				let score = 0;
				for (const trait of relevantTraits) {
					score += traits[trait] || 0;
				}
				return { id: c.id, score };
			});
			scores.sort((a, b) => b.score - a.score);
			return scores;
		} catch {
			return classes.map((c) => ({ id: c.id, score: 0 }));
		}
	})();
	/** @type {string|null} */
	let bloodPath = null;
	/** @type {string|null} */
	let suggested = null;
	$: bloodPath = /** @type {string|null} */ (
		classScores.length > 0 && classScores[0].score > 0 ? classScores[0].id : null
	);
	$: suggested = /** @type {string|null} */ (
		classScores.length > 1 && classScores[1].score > 0 ? classScores[1].id : null
	);

	/** @param {ClassDef} classData */
	function selectClass(classData) {
		selectedClass = classData;
	}

	onMount(() => {
		setTimeout(() => (showSpinner = false), 900);
	});

	async function confirmClass() {
		if (!selectedClass) return;

		// Use base stats + class to calculate derived values (maxHp, maxSp, stamina)
		const baseStats = getBaseStats();
		const derived = calculateDerived(baseStats, /** @type {ClassDef} */ (selectedClass).id);

		gameState.update((state) => ({
			...state,
			character: {
				...state.character,
				class: /** @type {ClassDef} */ (selectedClass).id
			},
			playerData: {
				// keep other runtime fields if present but set canonical starting values
				...state.playerData,
				level: 1,
				exp: 0,
				maxExp: 100,
				hp: derived.maxHp,
				maxHp: derived.maxHp,
				sp: derived.maxSp,
				maxSp: derived.maxSp,
				stamina: derived.maxStamina,
				maxStamina: derived.maxStamina,
				gold: state.playerData.gold || 0,
				silver: state.playerData.silver || 0,
				diamonds: state.playerData.diamonds || 0,
				// store the underlying stats for later growth and recalculation
				stats: baseStats
			},
			currentScene: 'Scene047'
		}));

		// Save to slot system
		saveManager.saveGame();

		try {
			// prevent browser/backspace navigation back to class selection
			try {
				sessionStorage.setItem('blockBack', 'true');
			} catch {
				/* ignore */
			}
			await sceneManager.loadScene('Scene047');
		} catch (err) {
			console.error('Failed to load Scene047 after class confirm:', err);
			// fall back to a hard navigation so the app recovers
			try {
				location.assign('/game');
			} catch {
				/* ignore */
			}
		}
	}
</script>

<div id="class-select-container">
	<MusicToggle />
	<LoadingSpinner visible={showSpinner} />
	<div id="class-select-content">
		<h1>Choose Your Path</h1>
		<p class="subtitle">The blood reveals your nature, but the choice remains yours</p>
		<p class="instruction">
			All paths are open to you—choose freely, guided by instinct or destiny.
		</p>

		<div class="class-options">
			{#each classes as classData (classData.id)}
				<button
					class="class-option {selectedClass?.id === classData.id ? 'selected' : ''}"
					on:click={() => selectClass(classData)}
				>
					{#if bloodPath === classData.id}
						<div class="blood-badge">Blood Path</div>
					{:else if suggested === classData.id}
						<div class="suggest-badge">Suggested</div>
					{/if}
					<h2>{classData.name}</h2>
					<p>{classData.description}</p>
					<div class="primary">
						Primary:
						{#if classData.id === 'archer'}Dex
						{:else if classData.id === 'rogue'}Dex
						{:else if classData.id === 'mage'}Int
						{:else if classData.id === 'warrior'}Str / Con
						{:else if classData.id === 'acolyte'}Wis
						{:else if classData.id === 'tinkerer'}Int
						{/if}
					</div>
					<!-- Render basic stats so the .stats/.stat selectors are used and visible -->
					<div class="stats" aria-hidden="true">
						<div class="stat">HP: {classData.stats.hp}</div>
						<div class="stat">SP: {classData.stats.sp}</div>
						<div class="stat">Stam: {classData.stats.stamina}</div>
					</div>
				</button>
			{/each}
		</div>

		<div class="action-buttons">
			<button class="confirm-btn" disabled={!selectedClass} on:click={confirmClass}>
				Confirm Selection
			</button>
		</div>
	</div>
</div>

<style>
	#class-select-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background:
			radial-gradient(circle at 20% 50%, rgba(40, 10, 80, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 80% 20%, rgba(10, 30, 70, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 40% 80%, rgba(70, 10, 40, 0.4) 0%, transparent 50%), #0a0a1a;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
	}

	#class-select-content {
		background: rgba(30, 30, 46, 0.85);
		border: 2px solid rgba(138, 43, 226, 0.5);
		border-radius: 15px;
		padding: 40px;
		width: 90%;
		max-width: 1200px;
	}

	h1 {
		text-align: center;
		font-size: 2.5rem;
		margin-bottom: 10px;
		color: #e6e6fa;
	}

	.subtitle {
		text-align: center;
		font-family: 'MedievalSharp', cursive;
		font-size: 1.2rem;
		color: #b19cd9;
		margin-bottom: 10px;
	}

	.instruction {
		text-align: center;
		font-family: 'Cinzel', serif;
		font-size: 0.95rem;
		color: #8a7ba8;
		margin-bottom: 30px;
		font-style: italic;
	}

	.class-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 20px;
		margin-bottom: 40px;
	}

	.class-option {
		background: rgba(0, 0, 0, 0.3);
		border: 2px solid rgba(138, 43, 226, 0.3);
		border-radius: 10px;
		padding: 20px;
		text-align: left;
		cursor: pointer;
		transition: all 0.3s ease;
		color: inherit;
		font-family: inherit;
	}

	.class-option:hover {
		transform: translateY(-3px);
		border-color: rgba(138, 43, 226, 0.6);
		background: rgba(138, 43, 226, 0.1);
	}

	.class-option.selected {
		border-color: rgba(138, 43, 226, 0.8);
		background: rgba(138, 43, 226, 0.2);
		box-shadow: 0 0 15px rgba(138, 43, 226, 0.3);
	}

	.class-option h2 {
		font-size: 1.5rem;
		margin-bottom: 10px;
	}

	.suggest-badge {
		display: inline-block;
		background: rgba(77, 195, 255, 0.15);
		border: 1px solid rgba(77, 195, 255, 0.5);
		color: var(--accent-secondary-hex);
		padding: 4px 8px;
		border-radius: 8px;
		font-size: 0.8rem;
		margin-bottom: 10px;
		float: right;
	}

	.blood-badge {
		display: inline-block;
		background: rgba(200, 50, 50, 0.2);
		border: 1px solid rgba(220, 80, 80, 0.6);
		color: #ff6b6b;
		padding: 4px 8px;
		border-radius: 8px;
		font-size: 0.8rem;
		margin-bottom: 10px;
		float: right;
		font-weight: bold;
	}

	.class-option p {
		font-family: 'MedievalSharp', cursive;
		margin-bottom: 20px;
		color: #b19cd9;
	}

	.primary {
		font-weight: bold;
		color: #e6e6fa;
		margin-top: 8px;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
		font-size: 0.9rem;
	}

	.stat {
		text-align: center;
		padding: 5px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}

	.action-buttons {
		text-align: center;
	}

	.confirm-btn {
		background: rgba(138, 43, 226, 0.6);
		border: 1px solid rgba(138, 43, 226, 0.8);
		color: white;
		padding: 12px 30px;
		border-radius: 8px;
		font-family: 'Cinzel', serif;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.confirm-btn:hover:not(:disabled) {
		background: rgba(138, 43, 226, 0.8);
		transform: translateY(-2px);
	}

	.confirm-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
