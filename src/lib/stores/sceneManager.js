// src/lib/stores/sceneManager.js
import { writable, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { gameState, currentScene, sceneHistory } from './gameState.js';
import { XIA_SNIPPET, CHRIS_SNIPPET } from '$lib/constants/npcSnippets.js';
import { gameScenes } from '../data/scenes.js';

export const sceneManager = (() => {
	// Add this safety check
	if (!gameScenes) {
		console.error('gameScenes is undefined - check the import path and export');
	}

	/** @type {import('svelte/store').Writable<{scenes: Map<string, any>, currentScene: any, sceneHistory: string[], isLoading: boolean}>} */
	const managerStore = writable({
		scenes: new Map((gameScenes || []).map((scene) => [scene.title, scene])),
		currentScene: null,
		sceneHistory: /** @type {string[]} */ ([]),
		isLoading: false
	});

	const { subscribe, set, update } = managerStore;

	// Keep the exported `sceneHistory` store in sync with the manager's internal sceneHistory
	// so UI components that subscribe to `sceneHistory` see updates.
	managerStore.subscribe((manager) => {
		try {
			if (Array.isArray(manager.sceneHistory)) {
				const hist = /** @type {any} */ ([...manager.sceneHistory]);
				sceneHistory.set(hist);
				// Also keep persisted character clearedScenes in sync with manager history so
				// saves record visited scenes even if individual scene code doesn't write to character.
				try {
					const gs = /** @type {any} */ (get(gameState));
					const existing =
						gs && gs.character && Array.isArray(gs.character.clearedScenes)
							? /** @type {any} */ (gs.character.clearedScenes)
							: [];
					// Only update if different to avoid noisy writes
					const same =
						Array.isArray(existing) &&
						existing.length === hist.length &&
						existing.every((v, i) => v === hist[i]);
					if (!same) {
						gameState.update(
							(s) =>
								/** @type {any} */ ({
									...(s || {}),
									character: {
										...(s && s.character ? s.character : {}),
										clearedScenes: hist.slice()
									}
								})
						);
					}
				} catch (e) {
					// non-fatal
				}
			} else {
				sceneHistory.set([]);
			}
		} catch (e) {
			// non-fatal
			console.warn('[sceneManager] failed to sync sceneHistory to exported store', e);
		}
	});

	/**
	 * Return a snapshot of the manager with light typing for tsc/JSDoc.
	 * @returns {{scenes: Map<string, any>, currentScene: any, sceneHistory: string[], isLoading: boolean}}
	 */
	function snap() {
		return /** @type {any} */ (get({ subscribe }));
	}

	return {
		subscribe,
		/**
		 * Allow external callers to set the loading flag when necessary (safe helper).
		 * @param {boolean} flag
		 */
		setLoading: (flag) =>
			update((manager) => {
				manager.isLoading = !!flag;
				return manager;
			}),
		/**
		 * Restore the manager's internal sceneHistory from an array.
		 * This is used when loading saved data so the manager and exported
		 * `sceneHistory` store stay in sync with persisted clears.
		 * @param {string[]} history
		 */
		restoreSceneHistory: (history) => {
			try {
				if (!Array.isArray(history)) history = [];
				update((manager) => {
					manager.sceneHistory = history.slice();
					return manager;
				});
			} catch (e) {
				console.warn('[sceneManager] restoreSceneHistory failed', e);
			}
		},
		/**
		 * Create a temporary navigation scene for traveling to a place.
		 * This does not require the scene to be present in the static scenes map.
		 * @param {{id:string,name:string,unlock:string}} place
		 */
		enterNavigationScene: async (place) => {
			try {
				if (!place || !place.id) throw new Error('Invalid place');
				const navTitle = `Navigation:${place.id}:${Date.now()}`;

				// (No temporary testing overrides here) Ensure navigation follows the
				// same unlocked/routing rules as the UI's NavWindow.goTo.
				// Simple NPC lookup for navigation scenes
				const npcMap = {
					'pier-light': [
						{
							name: 'Berg',
							snippet: 'Hey there [player name]! You need something?',
							conversationScene: null
						}
					],
					'crab-and-claw': [
						{
							name: 'Mogi',
							snippet: 'Hi there! I am Mogi. How can I help you?',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-mogi.PNG'
						},
						{
							name: 'Jenny',
							snippet:
								'Jenny at your service! Coffe, tea or me? Just kidding, unfortunately we got none of those available here but the best brews and me',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-jenny.PNG'
						}
					],
					'guild-hall': [
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
							snippet: 'Greetings — the guild keeps busy. Anything I can do for you?',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-alexa.PNG'
						},
						{
							name: 'Alexi',
							snippet: 'Need something?',
							conversationScene: null,
							npcPortrait: '/Images/NPC/npc-alexi.PNG'
						}
					],
					// Locked / placeholder locations
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

				// If the character has met Kane, include him in the crab-and-claw list
				try {
					const gsState = get(gameState) || {};
					// `character` may contain dynamic properties added at runtime (e.g. metKane).
					// Cast to any to avoid TypeScript complaining under checkJs/allowJs while keeping runtime safety.
					const charAny = /** @type {any} */ (gsState.character || {});
					if (charAny && charAny.metKane) {
						if (Array.isArray(npcMap['crab-and-claw'])) {
							npcMap['crab-and-claw'].push({
								name: 'Kane',
								snippet:
									"Hey... buddy. Pal. We're pals, right? Pals buy pals drinks. It's a... a rule...",
								conversationScene: null,
								npcPortrait: '/Images/NPC/npc-kane.PNG'
							});
						}
					}
				} catch (e) {
					/* ignore */
				}

				const bgMap = {
					'pier-light': "url('/Images/Inn2.png') center/cover no-repeat",
					'crab-and-claw': "url('/Images/Tavern.png') center/cover no-repeat",
					'guild-hall': "url('/Images/Guild Hall.png') center/cover no-repeat",
					// Locked locations / shops - map to the requested background image files
					'love-and-hammered': "url('/Images/Blacksmith.png') center/cover no-repeat",
					'swill-n-swing': "url('/Images/Apothecary Shop.png') center/cover no-repeat",
					'familiars-folly': "url('/Images/Magic Shop.png') center/cover no-repeat",
					'the-hush-hustler': "url('/Images/Shady Shop.png') center/cover no-repeat"
				};

				// Annotate NPCs with their source location so conversation handlers can disambiguate
				const navNpcs = /** @type {any} */ (npcMap[place.id] || []).map((/** @type {any} */ n) => ({
					.../** @type {any} */ (n || {}),
					_location: place.id
				}));

				const navScene = {
					title: navTitle,
					type: 'narrative',
					name: place.name,
					meta: { travelTo: place.unlock, temporary: true, npcs: navNpcs },
					content: `You travel to ${place.name}. The streets are familiar.`,
					background:
						/** @type {any} */ (bgMap)[place.id] ||
						"url('/Images/Scene001.png') center/cover no-repeat"
				};

				// Also mirror NavWindow.goTo behaviour: update gameState location fields so
				// the FreeModeHub UI and in-hub conversation handlers see the active location
				// and the locationNPCs when enterNavigationScene is used programmatically.
				try {
					gameState.update((s) => ({
						...(s || {}),
						location: place.id,
						locationTitle: place.name,
						locationBackground: /** @type {any} */ (bgMap)[place.id] || null,
						locationNPCs: navNpcs
					}));
				} catch (e) {
					/* non-fatal */
				}

				update((manager) => {
					// store temporary scene so manager can render it if needed
					try {
						manager.scenes.set(navTitle, navScene);
					} catch (e) {
						/* ignore */
					}
					manager.currentScene = navScene;
					if (manager.sceneHistory[manager.sceneHistory.length - 1] !== navScene.title)
						manager.sceneHistory.push(navScene.title);
					gameState.update(
						(state) => /** @type {any} */ ({ ...state, currentScene: navScene.title })
					);
					manager.isLoading = true;
					return manager;
				});

				// navigate to /game to render narrative scene via the same route
				try {
					await goto('/game');
				} catch (e) {
					/* ignore navigation errors */
				}

				update((manager) => {
					manager.isLoading = false;
					return manager;
				});
			} catch (e) {
				console.error('[sceneManager] enterNavigationScene failed', e);
				throw e;
			}
		},

		/**
		 * Open a temporary choice-based conversation for an NPC.
		 * Creates a transient scene so the ChoiceScene component can render it.
		 * @param {{name:string,snippet?:string,conversationScene?:string,npcPortrait?:string}} npc
		 */
		openNpcConversation: async (npc) => {
			try {
				if (!npc || !npc.name) throw new Error('Invalid NPC');
				const navTitle = `NPC:${npc.name.replace(/\s+/g, '-')}:${Date.now()}`;

				// Default portrait fallback - caller may pass npc.npcPortrait
				const portrait = npc.npcPortrait || '/Images/NPC/npc-berg.PNG';

				// Create choices. Use specialized conversations for certain NPCs (Zerg, Issac).
				let choices;
				let npcText = npc.snippet || `${npc.name} looks at you expectantly.`;

				if (npc.name === 'Zerg') {
					npcText =
						"Welcome to The Love and Hammered! People often ask about the name. The 'Love' is because I opened this shop to celebrate my marriage!";
					choices = [
						{ id: 'buy-sell-repair', text: 'Buy / Sell / Repair', trait: null },
						{ id: 'about-berg', text: 'About Berg', trait: null },
						{ id: 'about-issac', text: 'About Issac', trait: null },
						{ id: 'apprenticeship', text: 'Apprenticeship', trait: null },
						{ id: 'heard-rumors', text: 'Heard any rumors?', trait: null }
					];
				} else if (npc.name === 'Issac' || npc.name === 'Issac') {
					// Note: NPC spelled 'Issac' in data — handle that name specifically
					npcText =
						"Welcome! How may I assist you? You asked why 'Hammered'... Sadly, ever since my mom died, my father has been drinking himself into a stupor every night.";
					choices = [
						{ id: 'buy-sell-repair', text: 'Buy / Sell / Repair', trait: null },
						{ id: 'about-berg', text: 'About Berg', trait: null },
						{ id: 'about-zerg', text: 'About Zerg', trait: null },
						{ id: 'apprenticeship', text: 'Apprenticeship', trait: null },
						{ id: 'heard-rumors', text: 'Heard any rumors?', trait: null }
					];
				} else if (npc.name === 'Holly') {
					npcText = 'Welcome! What can I get you? Do you need the Swill or the Swing?';
					choices = [
						{ id: 'buy-sell-repair', text: 'Buy / Sell', trait: null },
						{ id: 'about-jenny', text: 'About Jenny', trait: null },
						{ id: 'about-maple', text: 'About Maple', trait: null },
						{ id: 'apprenticeship', text: 'Apprenticeship', trait: null },
						{ id: 'heard-rumors', text: 'Heard any rumors?', trait: null }
					];
				} else if (npc.name === 'Maple') {
					npcText = 'Welcome! What do you need for today?';
					choices = [
						{ id: 'buy-sell-repair', text: 'Buy / Sell', trait: null },
						{ id: 'about-mogi', text: 'About Mogi', trait: null },
						{ id: 'about-holly', text: 'About Holly', trait: null },
						{ id: 'apprenticeship', text: 'Apprenticeship', trait: null },
						{ id: 'heard-rumors', text: 'Heard any rumors?', trait: null }
					];
				} else if (npc.name === 'Alexa') {
					npcText = 'Greetings — the guild keeps busy. Anything I can do for you?';
					choices = [
						{ id: 'ask-alexi', text: 'Ask about Alexi', trait: null },
						{ id: 'ask-quests', text: 'Ask about quests', trait: null },
						{ id: 'about-town', text: 'About the town', trait: null },
						{ id: 'about-shops', text: 'About shops', trait: null },
						{ id: 'ask-about-skills', text: 'Ask about Skills', trait: null }
					];
				} else if (npc.name === 'Xia') {
					npcText = XIA_SNIPPET;
							choices = [
							// same choice set as Chris/Xia (About quests shown before looking-for-party)
							{ id: 'check-available-quests', text: 'Check for available quests', trait: null },
							{ id: 'submit-completed-quest', text: 'Submit completed quest', trait: null },
							{ id: 'give-up-quest', text: 'Give up current quest', trait: null },
							{ id: 'heard-rumors', text: 'About quests', trait: null },
							{ id: 'looking-for-party', text: 'Looking for party', trait: null }
						];
				} else if (npc.name === 'Chris') {
					npcText = CHRIS_SNIPPET;
						choices = [
							{ id: 'check-available-quests', text: 'Check for available quests', trait: null },
							{ id: 'submit-completed-quest', text: 'Submit completed quest', trait: null },
							{ id: 'give-up-quest', text: 'Give up current quest', trait: null },
							{ id: 'heard-rumors', text: 'About quests', trait: null },
							{ id: 'looking-for-party', text: 'Looking for party', trait: null }
						];
				} else if (npc.name === 'Caspian') {
					npcText =
						'Where are you looking at? Here, this cat familiar here is the one doing the talking. What do you want?';
					choices = [
						{ id: 'buy-sell', text: 'Buy / Sell', trait: null },
						{ id: 'are-you-owner', text: "You're the shop owner?", trait: null },
						{ id: 'about-alexi', text: 'About Alexi', trait: null },
						{ id: 'apprenticeship', text: 'Apprenticeship', trait: null },
						{ id: 'heard-rumors', text: 'Heard any rumors?', trait: null }
					];
				} else if (npc.name === 'Diana') {
					npcText =
						'Enter, seeker. The caravan welcomes all who come with an open heart and a curious mind';
					choices = [
						{ id: 'buy-sell-repair', text: 'Buy / Sell', trait: null },
						{ id: 'about-russel', text: 'About Russel', trait: null },
						{ id: 'about-town', text: 'About the town', trait: null },
						{ id: 'heard-rumors', text: 'Heard any rumors?', trait: null }
					];
				} else if (npc.name === 'Russel') {
					npcText =
						"Ah, a customer! Let's not waste time with pleasantries. You need something, I have it. We just need to agree on the price.";
					choices = [
						{ id: 'buy-sell-repair', text: 'Buy / Sell', trait: null },
						{ id: 'about-diana', text: 'About Diana', trait: null },
						{ id: 'about-town', text: 'About the town', trait: null },
						{ id: 'heard-rumors', text: 'Heard any rumors?', trait: null }
					];
				} else if (
					npc.name === 'Alexi' &&
					/** @type {any} */ (npc)._location === 'familiars-folly'
				) {
					npcText =
						'I am just here to help out to pass time when I am not needed at the Guild Hall.';
					choices = [
						{ id: 'buy-sell', text: 'Buy / Sell', trait: null },
						{ id: 'about-caspian', text: 'About Caspian', trait: null },
						{ id: 'about-skills', text: 'About skills', trait: null },
						{ id: 'your-skills', text: 'Her skills', trait: null },
						{ id: 'heard-rumors', text: 'Heard any rumors?', trait: null }
					];
				} else {
					// Fallback generic choices
					choices = [
						{ text: "What's new at the pier?", trait: 'curious' },
						{ text: 'Heard any rumors?', trait: 'inquisitive' },
						{ text: 'Can I help with anything?', trait: 'helpful' },
						{ text: 'Buy you a drink?', trait: 'social' },
						{ text: 'Not right now, thanks.', trait: null }
					];
				}

				const convoScene = {
					title: navTitle,
					type: 'choice',
					name: npc.name,
					npcName: npc.name,
					npcPortrait: portrait,
					npcText: npcText,
					choices: choices,
					nextScene: 'free-mode',
					meta: { temporary: true, sourceLocation: /** @type {any} */ (npc)._location || null }
				};

				update((manager) => {
					try {
						manager.scenes.set(navTitle, convoScene);
					} catch (e) {
						/* ignore */
					}
					manager.currentScene = convoScene;
					if (manager.sceneHistory[manager.sceneHistory.length - 1] !== convoScene.title)
						manager.sceneHistory.push(convoScene.title);
					gameState.update(
						(state) => /** @type {any} */ ({ ...state, currentScene: convoScene.title })
					);
					manager.isLoading = true;
					return manager;
				});

				try {
					await goto('/game');
				} catch (e) {
					/* ignore */
				}

				update((manager) => {
					manager.isLoading = false;
					return manager;
				});
			} catch (e) {
				console.error('[sceneManager] openNpcConversation failed', e);
				throw e;
			}
		},
		/** @param {string} sceneTitle */
		loadScene: async (sceneTitle) => {
			try {
				console.log('[sceneManager] loadScene requested:', sceneTitle);

				// Safety: avoid re-entrancy or duplicate loads which can cause
				// repeated navigation loops and apparent UI freezes.
				try {
					const snapshot = snap();
					if (snapshot.currentScene && snapshot.currentScene.title === sceneTitle) {
						console.log('[sceneManager] loadScene: requested scene is already current -> skipping');
						return;
					}
					if (snapshot.isLoading) {
						console.log(
							'[sceneManager] loadScene: manager is already loading -> skipping to avoid re-entrancy'
						);
						return;
					}
				} catch (e) {
					// If snap fails for any reason, continue into the normal flow but log it.
					console.warn('[sceneManager] loadScene: failed to get snapshot pre-check', e);
				}

				// (no special-case for 'free-mode' here) - treat it like any other scene

				// Special route titles that are not scenes in the scenes map
				/** @type {Record<string,string>} */
				const specialRoutes = {
					'name-input': '/name-input',
					'pick-class': '/pick-class',
					game: '/game'
				};

				// Handle synthetic navigation requests encoded as "enter:<placeId>"
				try {
					if (typeof sceneTitle === 'string' && sceneTitle.startsWith('enter:')) {
						const placeId = sceneTitle.slice('enter:'.length);
						// Lazy import towns to avoid circular deps at module load time
						let towns = {};
						try {
							towns = require('../data/towns.js').towns || {};
						} catch (e) {
							// fall back to import (ESM environments) – try default export shape
							try {
								// eslint-disable-next-line @typescript-eslint/no-var-requires
								towns = (await import('../data/towns.js')).towns || {};
							} catch (ie) {
								console.warn('[sceneManager] failed to resolve towns for enter: navigation', ie);
							}
						}
						let place = null;
						for (const tKey of Object.keys(towns || {})) {
							const p = (towns[tKey].places || []).find((pl) => pl.id === placeId);
							if (p) {
								place = p;
								break;
							}
						}
						if (place) {
							console.log('[sceneManager] loadScene: delegating enter: request to enterNavigationScene', placeId);
							await module.exports.enterNavigationScene(place);
							return;
						} else {
							console.warn('[sceneManager] enter: place not found in towns map:', placeId);
							// fall through to normal lookup which will log a not-found error
						}
					}
				} catch (e) {
					// non-fatal – continue to standard scene lookup
				}

				if (specialRoutes[sceneTitle]) {
					// Push to history and set loading state
					update((manager) => {
						if (manager.sceneHistory[manager.sceneHistory.length - 1] !== sceneTitle) {
							manager.sceneHistory.push(sceneTitle);
						}
						manager.isLoading = true;
						return manager;
					});

					// Update gameState to reflect the special route as current
					gameState.update((state) => ({
						...state,
						currentScene: /** @type {any} */ (sceneTitle)
					}));

					try {
						console.log('[sceneManager] navigating to special route', specialRoutes[sceneTitle]);
						await goto(specialRoutes[sceneTitle]);
					} catch (navError) {
						console.error('Navigation error (special route):', navError);
						update((manager) => {
							manager.isLoading = false;
							return manager;
						});
						void goto('/error');
						throw navError;
					}

					update((manager) => {
						manager.isLoading = false;
						return manager;
					});

					return;
				}

				/** @type {any} */
				let scene;
				update((manager) => {
					console.log('[sceneManager] looking for scene:', sceneTitle, 'in scenes map');
					console.log('[sceneManager] scenes map has:', Array.from(manager.scenes.keys()));
					scene = manager.scenes.get(sceneTitle);
					if (!scene) {
						console.error(`[sceneManager] Scene not found: ${sceneTitle}`);
						throw new Error(`Scene not found: ${sceneTitle}`);
					}
					console.log('[sceneManager] found scene:', scene.title, scene.type);

					// Update current scene
					manager.currentScene = scene;

					// Add to history
					if (manager.sceneHistory[manager.sceneHistory.length - 1] !== sceneTitle) {
						manager.sceneHistory.push(sceneTitle);
					}

					// Update game state and set loading
					gameState.update((state) => ({
						...state,
						currentScene: /** @type {any} */ (sceneTitle)
					}));
					manager.isLoading = true;
					return manager;
				});

				// Ensure scene is defined before navigating
				if (!scene) {
					update((manager) => {
						manager.isLoading = false;
						return manager;
					});
					throw new Error(`Scene unexpectedly undefined after lookup: ${sceneTitle}`);
				}

				// Handle navigation based on scene type (do not auto-redirect based on nextScene)
				try {
					console.log(
						'[sceneManager] resolved scene:',
						scene.title,
						scene.type,
						'next:',
						scene.nextScene
					);
					if (scene.type === 'name-input') {
						console.log('[sceneManager] navigating to /name-input');
						await goto('/name-input');
					} else if (scene.type === 'pick-class') {
						console.log('[sceneManager] navigating to /pick-class');
						await goto('/pick-class');
					} else if (
						scene.type === 'narrative' ||
						scene.type === 'conversation' ||
						scene.title === 'Scene001' ||
						scene.title === 'Scene017'
					) {
						// Narrative and conversation scenes render on the /game route
						console.log('[sceneManager] navigating to /game');
						await goto('/game');
					}
				} catch (navError) {
					console.error('Navigation error:', navError);
					update((manager) => {
						manager.isLoading = false;
						return manager;
					});
					void goto('/error');
					throw navError;
				}

				update((manager) => {
					manager.isLoading = false;
					return manager;
				});
			} catch (error) {
				console.error('Scene loading failed:', error);
				update((manager) => {
					manager.isLoading = false;
					return manager;
				});
				void goto('/error');
				throw error;
			}
		},

		/** @param {string} currentTitle */
		getNextScene: (currentTitle) => {
			const manager = snap();
			const scene = manager.scenes.get(currentTitle);
			return scene?.nextScene;
		},

		/** @param {string} currentTitle */
		getPreviousScene: (currentTitle) => {
			const manager = snap();
			const scene = manager.scenes.get(currentTitle);
			return scene?.previousScene;
		},

		back: async () => {
			try {
				/** @type {any|undefined} */
				let targetScene;
				update((manager) => {
					const previousTitle = manager.sceneHistory[manager.sceneHistory.length - 2];
					if (!previousTitle) {
						// If no previous scene, go to landing
						void goto('/landing');
						return manager;
					}

					const scene = manager.scenes.get(previousTitle);
					if (!scene) {
						throw new Error(`Previous scene not found: ${previousTitle}`);
					}

					// Handle special scene types
					if (
						scene.type === 'pick-class' ||
						scene.type === 'name-input' ||
						previousTitle === 'game'
					) {
						const route =
							scene.type === 'pick-class'
								? '/pick-class'
								: scene.type === 'name-input'
									? '/name-input'
									: '/game';
						void goto(route);
						return manager;
					}

					manager.currentScene = scene;
					manager.sceneHistory.pop();
					targetScene = scene;
					manager.isLoading = true;
					return manager;
				});

				try {
					// Handle navigation based on scene type first
					if (targetScene && targetScene.type === 'pick-class') {
						await goto('/pick-class');
					} else if (targetScene && targetScene.type === 'name-input') {
						await goto('/name-input');
					} else if (targetScene && targetScene.type === 'game') {
						await goto('/game');
					}

					// Update game state if we have a target scene
					if (targetScene) {
						gameState.update((state) => ({
							...state,
							currentScene: /** @type {any} */ (targetScene.title)
						}));
					}
				} finally {
					// Clear loading state
					update((manager) => {
						manager.isLoading = false;
						return manager;
					});
				}
			} catch (error) {
				console.error('Navigation back failed:', error);
				void goto('/landing');
				throw error;
			}
		}
	};
})();
