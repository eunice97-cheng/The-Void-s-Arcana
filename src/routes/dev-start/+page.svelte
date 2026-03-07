<script>
	// @ts-nocheck
	import { goto } from '$app/navigation';
	import { gameState, personalityTraits } from '$lib/stores/gameState';
	import { traitHistory } from '$lib/stores/traitHistory';
	import { sceneManager } from '$lib/stores/sceneManager';
	import { saveSlotsManager } from '$lib/stores/saveSlotsManager';
	import MonsterBook from '$lib/components/MonsterBook.svelte';
	import { simulateFight as simulateFightBrowser } from '$lib/utils/combatSimulator.browser.js';
	import { monsterBook } from '$lib/data/monsters';

	let logs = [];

	let name = 'DevTest';
	let gender = 'male';
	let dobYear = 1995;
	let dobMonth = 5;
	let dobDay = 15;
	let playerClass = 'warrior';

	// Personality traits (Big Five: E, O, A, C, N)
	let extraversion = 3;
	let openness = 3;
	let agreeableness = 3;
	let conscientiousness = 3;
	let neuroticism = 3;

	const classes = [
		{ id: 'warrior', name: 'Warrior' },
		{ id: 'rogue', name: 'Rogue' },
		{ id: 'archer', name: 'Archer' },
		{ id: 'mage', name: 'Mage' },
		{ id: 'acolyte', name: 'Acolyte' },
		{ id: 'tinkerer', name: 'Tinkerer' }
	];

	function startFreeMode() {
		// Unlock all save slots for dev testing
		saveSlotsManager.unlockAllSlots();

		// Update game state with character data
		gameState.update((state) => ({
			...state,
			character: {
				...state.character,
				name,
				gender,
				class: playerClass,
				stats: {
					STR: 10,
					DEX: 10,
					INT: 10,
					CON: 10,
					WIS: 10,
					CHA: 10
				},
				rank: 'E',
				questsCompleted: 0,
				questStats: {
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
				},
				achievements: [],
				unallocatedStatPoints: 0,
				inventory: [
					// Add some test items for equipment testing
					{ id: 1124001, quantity: 2 }, // Dirk (dagger) x2 for dual wield testing
					{ id: 1113001, quantity: 1 }, // Iron Sword (one-handed)
					{ id: 1123001, quantity: 1 }, // Greatsword (two-handed)
					{ id: 1118001, quantity: 1 }, // Shield
					{ id: 1211001, quantity: 1 }, // Leather armor
					{ id: 1911001, quantity: 5 }, // Health potion
					// Test box item
					{
						id: 'random-e-rank-equipment-box',
						name: 'Random E Rank Equipment Box',
						qty: 1,
						type: 'box',
						icon: '/Images/box-e1.png',
						rarity: 'common',
						randomRewards: [
							{ item: 'e-rank-physical-weapon', chance: 20 },
							{ item: 'e-rank-magic-weapon', chance: 20 },
							{ item: 'e-rank-heavy-armor', chance: 20 },
							{ item: 'e-rank-medium-armor', chance: 20 },
							{ item: 'e-rank-magic-armor', chance: 20 }
						]
					}
				],
				equipment: {
					head: null,
					body: null,
					legs: null,
					feet: null,
					hands: null,
					accessory1: null,
					accessory2: null,
					weapon1: null,
					weapon2: null
				}
			},
			playerData: {
				...state.playerData,
				level: 1,
				exp: 0,
				hp: 100,
				maxHp: 100,
				sp: 100,
				maxSp: 100,
				stamina: 100,
				maxStamina: 100,
				gold: 1000,
				dob: {
					year: dobYear,
					month: dobMonth,
					day: dobDay
				}
			}
		}));

		// Set personality traits
		personalityTraits.set({
			E: extraversion,
			O: openness,
			A: agreeableness,
			C: conscientiousness,
			N: neuroticism
		});

		// Initialize trait history
		traitHistory.set({
			history: [],
			current: {
				E: extraversion,
				O: openness,
				A: agreeableness,
				C: conscientiousness,
				N: neuroticism
			},
			breakdown: {
				E: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
				O: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
				A: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
				C: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 },
				N: { ritual: 0, quest: 0, choice: 0, scene: 0, other: 0 }
			}
		});

		// Load free mode scene to show the hub UI
		sceneManager
			.loadScene('free-mode')
			.then(() => {
				// Navigate to game page after scene is loaded
				goto('/game');
			})
			.catch((err) => {
				console.error('[dev-start] Failed to load free-mode scene:', err);
				// Still navigate even if scene load fails
				goto('/game');
			});
	}
</script>

<svelte:head>
	<title>Dev Mode - Character Creator</title>
</svelte:head>

<div class="dev-container">
	<div class="header">
		<h1>🛠️ DEV MODE</h1>
		<button class="back-btn" on:click={() => goto('/')}>← Back</button>
	</div>

	<div class="content">
		<!-- Column 1: Basic Info + Class -->
		<div class="column">
			<div class="section">
				<h2>Basic Info</h2>
				<input type="text" bind:value={name} placeholder="Character Name" class="full-input" />
				<select bind:value={gender} class="full-input">
					<option value="male">Male</option>
					<option value="female">Female</option>
					<option value="other">Other</option>
				</select>
				<div class="dob-row">
					<input type="number" bind:value={dobYear} placeholder="Year" min="1950" max="2010" />
					<input type="number" bind:value={dobMonth} placeholder="Mo" min="1" max="12" />
					<input type="number" bind:value={dobDay} placeholder="Day" min="1" max="31" />
				</div>
			</div>

			<div class="section">
				<h2>Class</h2>
				<div class="class-grid">
					{#each classes as cls (cls.id)}
						<button
							type="button"
							class="class-btn"
							class:selected={playerClass === cls.id}
							on:click={() => (playerClass = cls.id)}
						>
							{cls.name}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Column 2: Personality Traits -->
		<div class="column">
			<div class="section">
				<h2>Personality (1-5)</h2>

				<div class="trait">
					<label>Extraversion</label>
					<div class="trait-control">
						<input type="range" bind:value={extraversion} min="1" max="5" />
						<span class="value">{extraversion}</span>
					</div>
				</div>

				<div class="trait">
					<label>Openness</label>
					<div class="trait-control">
						<input type="range" bind:value={openness} min="1" max="5" />
						<span class="value">{openness}</span>
					</div>
				</div>

				<div class="trait">
					<label>Agreeableness</label>
					<div class="trait-control">
						<input type="range" bind:value={agreeableness} min="1" max="5" />
						<span class="value">{agreeableness}</span>
					</div>
				</div>

				<div class="trait">
					<label>Conscientiousness</label>
					<div class="trait-control">
						<input type="range" bind:value={conscientiousness} min="1" max="5" />
						<span class="value">{conscientiousness}</span>
					</div>
				</div>

				<div class="trait">
					<label>Neuroticism</label>
					<div class="trait-control">
						<input type="range" bind:value={neuroticism} min="1" max="5" />
						<span class="value">{neuroticism}</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<button class="start-btn" on:click={startFreeMode}> 🚀 START FREE MODE </button>

	<div class="section" style="margin-top:2rem;">
		<h2>Monster Book (Dev Viewer)</h2>
		<MonsterBook />
	</div>

	<div class="section" style="margin-top:2rem;">
		<h2>Run Quest E101 (Dev)</h2>
		<button on:click={runQuest} class="primary">Run E101 (5 goblins)</button>
		<div
			class="log"
			style="margin-top:1rem; max-height:300px; overflow:auto; background:#fff; color:#000; padding:8px; font-family:monospace; font-size:12px;"
		>
			{#each logs as l}
				<div>{l}</div>
			{/each}
		</div>
	</div>

	<script>
		async function runQuest() {
			logs = [];
			const goblin = monsterBook.find((m) => m.id === 'goblin-grunt');
			if (!goblin) {
				logs = ['Goblin not found'];
				return;
			}
			const player = {
				name: 'Warrior',
				stats: {
					hp: 270,
					dps: 104.95,
					acc: 0.01875,
					eva: 0.01,
					phyDef: 51,
					magDef: 10,
					cr: 0.01,
					sp: 100,
					attackIntervalMs: 900
				},
				skills: ['acolyte_heal', 'mage_magic_barrier']
			};
			let currentHp = player.stats.hp;
			for (let i = 1; i <= 5; i++) {
				const p = JSON.parse(JSON.stringify(player));
				p.stats.hp = currentHp;
				const res = simulateFightBrowser(p, goblin, { seed: 1000 + i, maxRounds: 500 });
				res.logs.forEach((e) => (logs = [...logs, JSON.stringify(e)]));
				logs = [...logs, `Encounter ${i} final: ${JSON.stringify(res.final)}`];
				currentHp = res.final.attackerHp;
				if (currentHp <= 0) break;
			}
		}
	</script>
</div>

<style>
	.dev-container {
		min-height: 100vh;
		background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
		padding: 2rem;
		color: #fff;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid rgba(74, 74, 255, 0.3);
	}

	h1 {
		font-size: 2rem;
		color: #4a4aff;
		text-shadow: 0 0 10px rgba(74, 74, 255, 0.5);
		margin: 0;
	}

	h2 {
		font-size: 1.3rem;
		color: #8a8aff;
		margin: 0 0 1rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(74, 74, 255, 0.2);
	}

	.content {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-bottom: 2rem;
		max-width: 1200px;
		margin-left: auto;
		margin-right: auto;
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section {
		background: rgba(20, 20, 40, 0.8);
		border: 1px solid rgba(74, 74, 255, 0.3);
		border-radius: 8px;
		padding: 1.5rem;
	}

	.full-input {
		width: 100%;
		padding: 0.75rem;
		margin-bottom: 0.75rem;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(74, 74, 255, 0.4);
		border-radius: 6px;
		color: #fff;
		font-size: 1rem;
		box-sizing: border-box;
	}

	.full-input:focus {
		outline: none;
		border-color: #4a4aff;
		box-shadow: 0 0 10px rgba(74, 74, 255, 0.3);
	}

	.dob-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		gap: 0.5rem;
	}

	.dob-row input {
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(74, 74, 255, 0.4);
		border-radius: 6px;
		color: #fff;
		font-size: 1rem;
		box-sizing: border-box;
	}

	.dob-row input:focus {
		outline: none;
		border-color: #4a4aff;
		box-shadow: 0 0 10px rgba(74, 74, 255, 0.3);
	}

	.class-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	.class-btn {
		padding: 1rem;
		background: rgba(0, 0, 0, 0.4);
		border: 2px solid rgba(74, 74, 255, 0.3);
		border-radius: 6px;
		color: #fff;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.class-btn:hover {
		background: rgba(74, 74, 255, 0.2);
		border-color: #4a4aff;
	}

	.class-btn.selected {
		background: rgba(74, 74, 255, 0.4);
		border-color: #4a4aff;
		box-shadow: 0 0 15px rgba(74, 74, 255, 0.4);
	}

	.trait {
		margin-bottom: 1rem;
	}

	.trait label {
		display: block;
		margin-bottom: 0.5rem;
		color: #aaa;
		font-size: 0.95rem;
	}

	.trait-control {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.trait-control .value {
		min-width: 2rem;
		text-align: center;
		font-weight: 600;
		color: #4a4aff;
		font-size: 1.1rem;
	}

	.trait-control input[type='range'] {
		flex: 1;
		height: 6px;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 3px;
		outline: none;
		-webkit-appearance: none;
	}

	.trait-control input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 20px;
		height: 20px;
		background: #4a4aff;
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 0 10px rgba(74, 74, 255, 0.5);
	}

	.trait-control input[type='range']::-moz-range-thumb {
		width: 20px;
		height: 20px;
		background: #4a4aff;
		border-radius: 50%;
		cursor: pointer;
		border: none;
		box-shadow: 0 0 10px rgba(74, 74, 255, 0.5);
	}

	.back-btn {
		padding: 0.5rem 1rem;
		background: rgba(100, 100, 100, 0.3);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		color: #fff;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.back-btn:hover {
		background: rgba(120, 120, 120, 0.4);
		border-color: rgba(255, 255, 255, 0.4);
	}

	.start-btn {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		display: block;
		padding: 1.25rem 2rem;
		font-size: 1.2rem;
		font-weight: 600;
		background: linear-gradient(135deg, #4a4aff 0%, #6a6aff 100%);
		border: none;
		border-radius: 8px;
		color: #fff;
		cursor: pointer;
		box-shadow: 0 4px 15px rgba(74, 74, 255, 0.4);
		transition: all 0.3s ease;
	}

	.start-btn:hover {
		background: linear-gradient(135deg, #5a5aff 0%, #7a7aff 100%);
		box-shadow: 0 6px 20px rgba(74, 74, 255, 0.6);
		transform: translateY(-2px);
	}

	@media (max-width: 768px) {
		.content {
			grid-template-columns: 1fr;
		}
	}
</style>
