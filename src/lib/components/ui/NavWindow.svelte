<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { sceneHistory, gameState } from '$lib/stores/gameState';
	import { XIA_SNIPPET, CHRIS_SNIPPET } from '$lib/constants/npcSnippets.js';
	import { get } from 'svelte/store';
	import { sceneManager } from '$lib/stores/sceneManager';
	import { towns } from '$lib/data/towns';

	const dispatch = createEventDispatcher();

	let activeTab = 'local'; // 'local' or 'world'

	$: currentTownId = $gameState.currentTown || 'mirrors-repose';
	$: currentTownData = towns[currentTownId] || towns['mirrors-repose'];
	$: places = currentTownData.places || [];
	$: connectedTownIds = currentTownData.connections || [];
	$: connectedTowns = connectedTownIds.map(id => towns[id]).filter(Boolean);

	// FontAwesome icon mapping for navigation places (fallback)
	const placeIcons = {
		'pier-light': 'fa-solid fa-bed',
		'crab-and-claw': 'fa-solid fa-wine-bottle',
		'guild-hall': 'fa-solid fa-building-columns',
		'love-and-hammered': 'fa-solid fa-hammer',
		'swill-n-swing': 'fa-solid fa-leaf',
		'familiars-folly': 'fa-solid fa-cat',
		'the-hush-hustler': 'fa-solid fa-star-of-david'
	};

	let cleared = [];

	let charCleared = [];

	const unsubScene = sceneHistory.subscribe((v) => {
		cleared = Array.isArray(v) ? v : [];
	});
	const unsubState = gameState.subscribe((gs) => {
		charCleared =
			gs && gs.character && Array.isArray(gs.character.clearedScenes)
				? gs.character.clearedScenes
				: [];
	});

	onMount(() => {
		return () => {
			if (unsubScene) unsubScene();
			if (unsubState) unsubState();
		};
	});

	function isUnlocked(place) {
		try {
			// Core hub locations should always be navigable once the navigation UI is available.
			// This avoids locking basic locations behind cleared-scenes during early testing/free-mode.
			if (
				place &&
				(place.id === 'pier-light' || place.id === 'crab-and-claw' || place.id === 'guild-hall')
			)
				return true;

			// Locked locations are only available via explicit unlocks or cleared scenes.
			// (Developer testing overrides removed - locks restored.)
			// First, allow explicit per-character place unlocks (preferred over placeholder scene ids)
			const gs = get(gameState) || {};
			const char = gs.character || {};
			if (Array.isArray(char.unlockedPlaces) && char.unlockedPlaces.includes(place.id)) return true;

			// Fallback to legacy clearedScenes unlock via place.unlock id (if provided)
			if (place.unlock) {
				if (charCleared && charCleared.length) return charCleared.includes(place.unlock);
				return cleared && cleared.includes(place.unlock);
			}
			return false;
		} catch (e) {
			return false;
		}
	}

	$: navigationMode = true;

	function toggleNavigationMode() {
		// No-op, always true
	}

	async function goTo(place) {
		if (!isUnlocked(place)) return;
		try {
			// Always use navigation mode logic (set location on gameState)
			// Instead of loading old scenes, set a location on gameState so FreeModeHub
			// can remain active but update background and show local NPCs/options.
			const bgMap = {
				'pier-light': '/Images/Inn2.png',
				'crab-and-claw': '/Images/Tavern.png',
				'guild-hall': '/Images/Guild Hall.png'
			};

				// Add placeholder shop backgrounds (user-provided filenames)
				bgMap['love-and-hammered'] = '/Images/Blacksmith.png';
				bgMap['swill-n-swing'] = '/Images/Apothecary Shop.png';
				bgMap['familiars-folly'] = '/Images/Magic Shop.png';
				bgMap['the-hush-hustler'] = '/Images/Shady Shop.png';

				// Build Pier Light NPCs dynamically based on whether the player has met Carissa
				const state = get(gameState) || {};
				const char = state.character || {};
				const pierNpcs = [
					{
						name: 'Berg',
						snippet: 'Hey there [player name]! You need something?',
						conversationScene: null,
						npcPortrait: '/Images/NPC/npc-berg.PNG'
					}
				];
				if (char.metCarissa) {
					pierNpcs.push({
						name: 'Carissa',
						snippet: 'Hello — I am Carissa. Let me know if you anything, okay?',
						conversationScene: null,
						npcPortrait: '/Images/NPC/npc-carissa.png'
					});
				}
				if (char.metEsther) {
					pierNpcs.push({
						name: 'Esther the Acolyte',
						snippet:
							'Greetings. I am Esther, an acolyte in service to the Twelve Orders of The Night, dedicated to the light of Luna.',
						conversationScene: null,
						npcPortrait: '/Images/NPC/npc-esther.PNG'
					});
				}

				// Build Crab & Claw NPCs, include Kane if the character has met him
				const crabNpcs = [
					{
						name: 'Mogi',
						snippet: 'Hi there! I am Mogi. How can I help you?',
						conversationScene: null,
						npcPortrait: '/Images/NPC/npc-mogi.PNG'
					},
					{
						name: 'Jenny',
						snippet:
							'Jenny at your service! Coffe, tea or me? Just kidding, unfortunately we got none of those available here but the best brew and me',
						conversationScene: null,
						npcPortrait: '/Images/NPC/npc-jenny.PNG'
					}
				];
				if (char.metKane) {
					crabNpcs.push({
						name: 'Kane',
						snippet:
							"Hey... buddy. Pal. We're pals, right? Pals buy pals drinks. It's a... a rule...",
						conversationScene: null,
						npcPortrait: '/Images/NPC/npc-kane.PNG'
					});
				}
				if (char.metCaptainYork) {
					crabNpcs.push({
						name: 'Captain York the Warrior',
						snippet: "I am the town guards' Captain, York is the name. How can I help you?",
						conversationScene: null,
						npcPortrait: '/Images/NPC/npc-captain-york.PNG'
					});
				}
				if (char.metMatt) {
					crabNpcs.push({
						name: 'Matt the Archer',
						snippet:
							'Hello there! I am Matthew, just call me Matt. Everyone here call me that. No one really call me Matthew - in full I mean. But yeah, go ahead if you want to call me in full, as in like Matthew (and on he goes)...',
						conversationScene: null,
						npcPortrait: '/Images/NPC/npc-matt.PNG'
					});
				}
				if (char.metLiara) {
					crabNpcs.push({
						name: 'Liara the Rogue',
						snippet:
							'You had been asking all over the town for me. Who are you and what do you want exactly?',
						conversationScene: null,
						npcPortrait: '/Images/NPC/npc-liara.PNG'
					});
				}

				// Determine Guild Hall NPCs based on current town
				let guildHallNpcs = [];
				if (currentTownId === 'sandy-bay') {
					guildHallNpcs = [
						{
							name: 'Inil',
							snippet: CHRIS_SNIPPET,
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-inil.png'
						},
						{
							name: 'Kendra',
							snippet: XIA_SNIPPET,
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-kendra.png'
						}
					];
				} else if (currentTownId === 'glimmerdell') {
					guildHallNpcs = [
						{
							name: 'Ron',
							snippet: CHRIS_SNIPPET,
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-ron.png'
						},
						{
							name: 'Hana',
							snippet: XIA_SNIPPET,
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-hana.png'
						}
					];
				} else {
					// Default to Mirror's Repose
					const gs = get(gameState) || {};
					const level = gs.playerData?.level || 1;
					const isScene114Ready = level >= 6 && !charCleared.includes('Scene114');

					guildHallNpcs = [
						{
							name: 'Xia',
							snippet: XIA_SNIPPET,
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-xia.PNG'
						},
						{
							name: 'Chris',
							snippet: CHRIS_SNIPPET,
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-chris.PNG'
						},
						{
							name: 'Alexa',
							snippet: isScene114Ready ? 'I have a request for you.' : 'Greetings — the guild keeps busy. Anything I can do for you?',
							conversationScene: isScene114Ready ? 'Scene114' : null,
							npcPortrait: '/Images/NPC/npc-alexa.PNG'
						},
						{
							name: 'Alexi',
							snippet: 'Need something?',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-alexi.PNG'
						}
					];
				}

				const npcMap = {
					'pier-light': pierNpcs,
					'crab-and-claw': crabNpcs,
					'guild-hall': guildHallNpcs,
					'healing-canopy': [
						{
							name: 'Ameri',
							snippet: 'Welcome to the Healing Canopy. How can I help you?',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-ameri.jpg'
						}
					],
					'blood-and-iron': [
						{
							name: 'Duncan',
							snippet: 'Need some steel?',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-duncan.png'
						}
					],
					'glimmerdell-town-hall': [
						{
							name: 'Smith',
							snippet: 'Welcome, adventurer. Thank you for coming.',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-smith.png'
						}
					],
					'the-oak-and-ale': [
						{
							name: 'Kristy',
							snippet: 'Welcome to The Oak and Ale!',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-kristy.jpg'
						},
						{
							name: 'June',
							snippet: 'Can I get you a drink?',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-june.jpg'
						}
					],
					'smiths-house': [
						{
							name: 'Smith',
							snippet: 'This house is locked.',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-smith.png'
						}
					],
					'normans-house': [
						{
							name: 'Norman',
							snippet: 'This house is locked.',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-norman.png'
						}
					],
					'love-and-hammered': [
						{
							name: 'Zerg',
							snippet:
								"Welcome to The Love and Hammered! People often ask about the name. The 'Love' is because I opened this shop to celebrate my marriage!",
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-zerg.PNG'
						},
						{
							name: 'Issac',
							snippet:
								"Welcome! How may I assist you? You asked why 'Hammered'... Sadly, ever since my mom died, my father has been drinking himself into a stupor every night.",
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-issac.PNG'
						}
					],
					'swill-n-swing': [
						{
							name: 'Holly',
							snippet: 'Welcome! What can I get you? Do you need the Swill or the Swing?',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-holly.PNG'
						},
						{
							name: 'Maple',
							snippet: 'Welcome! What do you need for today?',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-maple.PNG'
						}
					],
					'familiars-folly': [
						{
							name: 'Caspian',
							snippet:
								'Where are you looking at? Here, this cat familiar here is the one doing the talking. What do you want?',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-caspian.png'
						},
						{
							name: 'Alexi',
							snippet:
								'I am just here to help out to pass time when I am not needed at the Guild Hall.',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-alexi.PNG'
						}
					],
					'the-hush-hustler': [
						{
							name: 'Diana',
							snippet:
								'Enter, seeker. The caravan welcomes all who come with an open heart and a curious mind',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-diana.png'
						},
						{
							name: 'Russel',
							snippet:
								"Ah, a customer! Let's not waste time with pleasantries. You need something, I have it. We just need to agree on the price.",
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-russel.png'
						}
					]
				};

				try {
					gameState.update((s) => ({
						...(s || {}),
						location: place.id,
						locationTitle: place.name,
						locationBackground: place.background || bgMap[place.id] || null,
						locationNPCs: npcMap[place.id] || []
					}));
				} catch (e) {
					console.warn('Failed to set location in gameState', e);
				}
		} catch (e) {
			console.warn('Navigation failed', e);
		}
		dispatch('close');
	}

	function isTownUnlocked(town) {
		if (!town.unlock) return true;
		if (charCleared && charCleared.includes(town.unlock)) return true;
		if (cleared && cleared.includes(town.unlock)) return true;
		return false;
	}

	function travelToTown(town) {
		if (!isTownUnlocked(town)) return;
		try {
			gameState.update(s => ({
				...s,
				currentTown: town.id,
				// Reset location within the new town to avoid stale state
				location: null,
				locationTitle: null,
				locationBackground: null,
				locationNPCs: []
			}));
			activeTab = 'local'; // Switch back to local view
		} catch (e) {
			console.warn('Travel failed', e);
		}
	}

	function close() {
		dispatch('close');
	}
</script>

<div class="nav-window" role="dialog" aria-modal="false">
	<header class="nav-header">
		<h3>Navigation</h3>
		<div class="nav-controls">
			<button class="close" aria-label="Close" on:click={close}>✕</button>
		</div>
	</header>

	<div class="nav-tabs">
		<button class:active={activeTab === 'local'} on:click={() => activeTab = 'local'}>
			{currentTownData.name}
		</button>
		<button class:active={activeTab === 'world'} on:click={() => activeTab = 'world'}>
			World Map
		</button>
	</div>

	<div class="nav-body">
		{#if activeTab === 'local'}
			<ul class="place-list">
				{#each places as p (p.id)}
					<li>
						<button
							class:locked={!isUnlocked(p)}
							on:click={() => goTo(p)}
							disabled={!isUnlocked(p)}
							aria-disabled={!isUnlocked(p)}
							aria-label={p.name}
						>
							<span class="place-meta">
								<!-- FontAwesome icon for the place -->
								<i
									class="place-icon {p.icon || placeIcons[p.id] || 'fa-solid fa-map-marker'}"
									aria-hidden="true"
								></i>
							</span>
							<!-- show visible place name for sighted users -->
							<span class="place-name">{p.name}</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<ul class="place-list">
				{#each connectedTowns as town (town.id)}
					<li>
						<button 
							class:locked={!isTownUnlocked(town)}
							disabled={!isTownUnlocked(town)}
							on:click={() => travelToTown(town)}
						>
							<span class="place-meta">
								<i class="place-icon fa-solid fa-globe" aria-hidden="true"></i>
							</span>
							<span class="place-name">
								Travel to {town.name}
								{#if !isTownUnlocked(town)}
									<i class="fa-solid fa-lock" style="margin-left: 8px; font-size: 0.8em; opacity: 0.7;" aria-label="Locked"></i>
								{/if}
							</span>
						</button>
					</li>
				{/each}
				{#if connectedTowns.length === 0}
					<li class="empty-msg">No connected towns available.</li>
				{/if}
			</ul>
		{/if}
	</div>
</div>

<style>
	.nav-window {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 16vh;
		width: min(520px, 92%);
		max-height: calc(100vh - 200px);
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		color: #e8f0ff;
		border-radius: 12px;
		box-shadow: 0 22px 60px rgba(2, 8, 23, 0.75);
		z-index: 1500;
		border-left: 6px solid rgba(124, 181, 255, 0.95);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.nav-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	.nav-tabs {
		display: flex;
		background: rgba(0, 0, 0, 0.2);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	.nav-tabs button {
		flex: 1;
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.6);
		padding: 12px;
		cursor: pointer;
		font-weight: 600;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
	}
	.nav-tabs button:hover {
		color: #fff;
		background: rgba(255, 255, 255, 0.05);
	}
	.nav-tabs button.active {
		color: #fff;
		border-bottom-color: rgba(124, 181, 255, 0.95);
		background: rgba(124, 181, 255, 0.1);
	}
	.nav-header .close {
		background: transparent;
		border: 0;
		color: rgba(255, 255, 255, 0.85);
		font-size: 18px;
		cursor: pointer;
	}
	.nav-body {
		padding: 16px;
		overflow-y: auto;
	}
	.nav-controls {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.nav-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		color: rgba(255, 255, 255, 0.9);
		font-size: 14px;
	}
	.nav-toggle input {
		width: 14px;
		height: 14px;
	}
	.place-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.place-list button {
		width: 100%;
		text-align: left;
		padding: 12px 14px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.03);
		background: rgba(255, 255, 255, 0.02);
		color: inherit;
		cursor: pointer;
		/* ensure icon and name are vertically centered */
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.place-meta {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}
	.place-icon {
		font-size: 20px;
		color: rgba(255, 255, 255, 0.8);
		flex: 0 0 28px;
		text-align: center;
	}
	.place-name {
		margin-left: 8px;
		font-weight: 600;
		color: inherit;
		display: inline-flex;
		align-items: center;
	}
	.place-list button.locked {
		opacity: 0.45;
		cursor: not-allowed;
		filter: grayscale(50%);
	}
	.place-list button:hover:not(.locked) {
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
	}
	.empty-msg {
		padding: 20px;
		text-align: center;
		color: rgba(255, 255, 255, 0.5);
		font-style: italic;
	}
	@media (max-width: 520px) {
		.nav-window {
			top: 10vh;
		}
	}
</style>
