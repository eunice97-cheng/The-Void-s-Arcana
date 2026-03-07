<script>
	// @ts-nocheck
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { get } from 'svelte/store';
	import { gameState } from '$lib/stores/gameState';
	import { sceneManager } from '$lib/stores/sceneManager';
	import { saveSlotsManager } from '$lib/stores/saveSlotsManager';
	import { saveManager } from '$lib/stores/saveManager';
	import { stringifyPreferEncrypted } from '$lib/utils/encryption';
	import { initialGameState } from '$lib/stores/gameState';
	import SaveSlotsModal from '$lib/components/ui/SaveSlotsModal.svelte';
	import AdventureCard from '$lib/components/ui/AdventureCard.svelte';
	import EquipmentPanel from '$lib/components/ui/EquipmentPanelNew.svelte';
	import InventoryWindow from '$lib/components/ui/InventoryWindow.svelte';
	import QuestsWindow from '$lib/components/ui/QuestsWindow.svelte';
	import StatusWindow from '$lib/components/ui/StatusWindow.svelte';
	import AdvancedStatsWindow from '$lib/components/ui/AdvancedStatsWindow.svelte';
	import TraitsModal from '$lib/components/ui/TraitsModal.svelte';
	import MapWindow from '$lib/components/ui/MapWindow.svelte';
	import AchievementsWindow from '$lib/components/ui/AchievementsWindow.svelte';
	import NavWindow from '$lib/components/ui/NavWindow.svelte';
	import InHubConversation from '$lib/components/ui/InHubConversation.svelte';
	import ElementAdv from '$lib/components/ui/ElementAdv.svelte';
	import SellBuyWindow from '$lib/components/ui/SellBuyWindow.svelte';
	import QuestBoard from '$lib/components/ui/QuestBoard.svelte';
	import { getExpRequiredForLevel, getExpForNextLevel } from '$lib/utils/leveling';
	import PotionRoulette from '$lib/components/ui/PotionRoulette.svelte';
	import skillsDb from '$lib/data/skills.json';
	import LeftSideButtons from '$lib/components/ui/LeftSideButtons.svelte';
	import NotificationWindow from '$lib/components/ui/NotificationWindow.svelte';
	import questStore, { hasActiveQuest, serverNow } from '$lib/stores/questStore';
	import { personalityTraits } from '$lib/stores/gameState';
	import { addTraitChange } from '$lib/stores/traitHistory';
	import { canAcceptQuest, getQuestBlockReason } from '$lib/utils/questLogic';
	import { storyNotifications, checkStoryProgress } from '$lib/stores/storyStore';
	import MusicToggle from '$lib/components/ui/MusicToggle.svelte';
	import { towns } from '$lib/data/towns';

	// Import CSS ported from original ui
 	import '$lib/styles/ui.css';
 	import '$lib/styles/free-mode.css';

	let showNotifications = false;
	$: hasNotifications = $storyNotifications.length > 0;

	// Alexa-specific conversation handling (Guild Hall)
	let slots;
	let showLoadModal = false;
	let importInputEl = null;
	let showImportModal;
	let showSavePreview = false;
	let savePreview = null;
	let avatarFile;
	let gameInfoOpen = false;
	let bottomRightVisible = true;
	let persistentHidden = false;
	let navOpen = false;
	// tooltip / upload state
	let tooltipText = '';
	let tooltipVisible = false;
	let tooltipLeft = 0;
	let tooltipTop = 0;
	let tooltipRightSide = false;

	function showRegenTooltip(type, e) {
		try {
			const gs = get(gameState) || {};
			const pd = gs.playerData || {};
			const activeQuest = !!(
				gs.character &&
				gs.character.activeQuest &&
				gs.character.activeQuest.status === 'in_progress'
			);
			let text = '';
			if (type === 'hp') {
				if ((pd.hp || 0) >= (pd.maxHp || 0)) text = 'HP full — regeneration paused';
				else if (activeQuest) text = 'Regeneration paused during quests';
				else text = 'Regenerates 1 HP every 6 minutes';
			} else if (type === 'sp') {
				if ((pd.sp || 0) >= (pd.maxSp || 0)) text = 'SP full — regeneration paused';
				else if (activeQuest) text = 'Regeneration paused during quests';
				else text = 'Regenerates 1 SP every 6 minutes';
			} else if (type === 'stamina') {
				if ((pd.stamina || 0) >= (pd.maxStamina || 0)) text = 'Stamina full — regeneration paused';
				else if (activeQuest) text = 'Regeneration paused during quests';
				else text = 'Regenerates 1 Stamina every 3 minutes';
			}
			tooltipText = text;
			// position near mouse pointer (with small offset)
			const clientX = (e && e.clientX) || 0;
			const clientY = (e && e.clientY) || 0;
			// prefer placing tooltip above the pointer when possible
			const padding = 12;
			tooltipLeft = clientX + padding;
			tooltipTop = Math.max(8, clientY - 36);
			tooltipRightSide = tooltipLeft > window.innerWidth - 220;
			tooltipVisible = true;
		} catch (err) {
			console.warn('showRegenTooltip failed', err);
		}
	}

	function moveTooltip(e) {
		try {
			if (!tooltipVisible) return;
			const clientX = (e && e.clientX) || 0;
			const clientY = (e && e.clientY) || 0;
			tooltipLeft = clientX + 12;
			tooltipTop = Math.max(8, clientY - 36);
			tooltipRightSide = tooltipLeft > window.innerWidth - 220;
		} catch {
			// Ignore tooltip positioning errors
		}
	}

	function hideTooltip() {
		tooltipVisible = false;
	}
	let uploadProgress;
	let uploadActive;
	let avatarInputEl = null;

// Magic Barrier flash helper (set when auto-cast occurs)
let mbFlash = false;
let _mbFlashTimeout = null;
let _onCombatLog = null;

$: currentTownId = $gameState.currentTown || 'mirrors-repose';
$: townBgPath = towns[currentTownId]?.background || '/Images/Mirror Repose.png';

// reactive helpers for player's elemental badge
$: playerCharacter = $gameState && $gameState.character ? $gameState.character : null;
$: showElementBadge = !!(playerCharacter && playerCharacter.class === 'mage' && playerCharacter.alexiTaughtElement && playerCharacter.alexiChosenElement && playerCharacter.alexiChosenElement.includes('_adv'));
$: playerElementBadgeSrc = null;
$: if (showElementBadge) {
	const sid = playerCharacter && playerCharacter.alexiChosenElement;
	const def = sid ? skillsDb.find((s) => s.id === sid) : null;
	if (def && def.icon) {
		playerElementBadgeSrc = def.icon;
	} else if (sid) {
		const parts = (sid || '').split('_');
		const el = parts.length >= 2 ? parts[1] : parts[0];
		const name = (el || '').charAt(0).toUpperCase() + (el || '').slice(1);
		playerElementBadgeSrc = `/Images/${name}.png`;
	} else {
		playerElementBadgeSrc = null;
	}
		// debug: log when showElementBadge or src changes
		try {
			console.debug('[FreeModeHub] showElementBadge=', showElementBadge, 'playerElementBadgeSrc=', playerElementBadgeSrc);
		} catch (e) {}
	} else {
		playerElementBadgeSrc = null;
	}

// reactive helpers for player's elemental badge
	let showAdventureCard = false;
	let showEquipment = false;
	let showInventory = false;
	let showQuests = false;
	let questsAllowLocalActions = false;
	let showStatus = false;
	let showAdvancedStats = false;
	// optional payload passed from AdventureCard when requesting advanced stats
	let advancedStatsData = null;
	let showMap = false;
	let showAchievements = false;
	let showTraitsModal = false;
	let currentTraitsData;
	let showInHubConversation = false;
	let inHubConversationData = null;
	let showSellBuy = false;
	let sellVendorName = 'Merchant';
	// Temporary debug state removed
	let showQuestBoard = false;
	let _unsubHasActive = null;
	let _unsubActiveQuest = null;
	// Malaysia time display
	let malaysiaDate = '';
	let malaysiaTime = '';
	let _timeInterval = null;
	let _apprenticeshipInterval = null;
	let apprenticesBadgeState = [];
	let _checkApprenticeshipsAutoProcess = null;

	// Exit handler
	function exitGame() {
		try {
			if (confirm('Exit to landing? Unsaved progress may be lost.')) {
				// navigate to landing page
				try {
					location.href = '/';
				} catch (e) {
					console.warn('navigate failed', e);
				}
			}
		} catch (e) {
			console.warn('exitGame failed', e);
		}
	}

	// derive player data (hp/sp/stamina/currency) with safe defaults
	$: pd =
		$gameState && $gameState.playerData
			? $gameState.playerData
			: {
					hp: 100,
					maxHp: 100,
					sp: 100,
					maxSp: 100,
					stamina: 100,
					maxStamina: 100,
					level: 1,
					exp: 0,
					maxExp: 100,
					gold: 0,
					silver: 0,
					diamonds: 0
				};

	// Normalize currency: convert every 1000 silver to 1 gold
	$: if (pd && pd.silver >= 1000) {
		const extraGold = Math.floor(pd.silver / 1000);
		const remainingSilver = pd.silver % 1000;
		gameState.update((s) => ({
			...s,
			playerData: {
				...(s.playerData || {}),
				gold: (s.playerData?.gold || 0) + extraGold,
				silver: remainingSilver
			}
		}));
	}

	$: hpPct = pd && pd.maxHp > 0 ? Math.round((pd.hp / pd.maxHp) * 100) : 0;
	$: spPct = pd && pd.maxSp > 0 ? Math.round((pd.sp / pd.maxSp) * 100) : 0;
	$: staPct = pd && pd.maxStamina > 0 ? Math.round((pd.stamina / pd.maxStamina) * 100) : 0;
	$: currentLevelExp =
		pd && pd.level && pd.exp !== undefined ? pd.exp - getExpRequiredForLevel(pd.level) : 0;
	$: expNeededForNext = pd && pd.level ? getExpForNextLevel(pd.level) : 484;
	$: expPct = expNeededForNext > 0 ? Math.round((currentLevelExp / expNeededForNext) * 100) : 0;

	// derive whether the top-right control cluster is visible (default true)
	$: topRightVisible =
		$gameState && typeof $gameState.topRightVisible !== 'undefined'
			? $gameState.topRightVisible
			: true;

	function toggleUI() {
		try {
			gameState.update((s) => ({ ...(s || {}), uiVisible: !((s && s.uiVisible) || false) }));
		} catch (e) {
			console.warn('[FreeModeHub] toggleUI failed', e);
		}
	}

	// helper to display a reply while preserving the current menu so Close can return to it
	function showReply(snippet, choices) {
		try {
			// Determine the root previous conversation so nested replies restore to the original menu
			const prevBase = inHubConversationData
				? inHubConversationData.previous
					? { ...(inHubConversationData.previous || {}) }
					: { ...(inHubConversationData || {}) }
				: null;
			// mark acknowledgement-only choices (those without an id) so clicking them restores the previous menu
			const mapped = Array.isArray(choices)
				? choices.map((c) => ({ ...(c || {}), __restore: typeof c.id === 'undefined' }))
				: [];
			inHubConversationData = {
				...(inHubConversationData || {}),
				previous: prevBase,
				snippet: snippet,
				choices: mapped
			};
			showInHubConversation = true;
		} catch (e) {
			console.warn('showReply failed', e);
		}
	}

	function toggleBottomRight() {
		bottomRightVisible = !bottomRightVisible;
	}

	function toggleNav() {
		navOpen = !navOpen;
	}

    const dispatch = createEventDispatcher();

    function handleLeftSideToggle(e) {
		const a = e && e.detail && e.detail.action;
		if (!a) return;
		switch (a) {
			case 'adventure-card':
				showAdventureCard = !showAdventureCard;
				break;
			case 'equipment':
				showEquipment = !showEquipment;
				break;
			case 'inventory':
				showInventory = !showInventory;
				break;
			case 'quests':
				showQuests = !showQuests;
				break;
			case 'status':
				showStatus = !showStatus;
				break;
			case 'map':
				showMap = !showMap;
				break;
			case 'achievements':
				showAchievements = !showAchievements;
				break;
			case 'notifications':
				showNotifications = !showNotifications;
				break;
			case 'combat-log':
				// forward to parent (+page) so the global toggleLog() handler runs
				dispatch('combatToggle');
				break;
		}
	}

	// refresh available save slots metadata from saveSlotsManager
	function refreshSlots() {
		try {
			if (saveSlotsManager && typeof saveSlotsManager.listSlots === 'function') {
				slots = saveSlotsManager.listSlots();
			}
		} catch (e) {
			console.warn('[FreeModeHub] refreshSlots failed', e);
		}
	}

	// Ensure story notifications are up to date with current game state
	$: if ($gameState) {
		checkStoryProgress();
	}

	onMount(() => {
		console.debug('[FreeModeHub] mounted');
		refreshSlots();

		// Check for story completion (Scene 105) to clear notification and ensure map is unlocked
		const gs = get(gameState);
		const cleared = gs.character?.clearedScenes || [];
		if (cleared.includes('Scene105')) {
			const flags = gs.character?.storyFlags || {};
			const unlocks = gs.character?.unlocks || {};
			let changed = false;

			if (!flags['met_alexa_level_3']) {
				flags['met_alexa_level_3'] = true;
				changed = true;
			}

			if (!unlocks.map) {
				unlocks.map = true;
				changed = true;
			}

			if (changed) {
				gameState.update(s => ({
					...s,
					character: {
						...s.character,
						storyFlags: flags,
						unlocks: unlocks
					}
				}));
			}
		}

		checkStoryProgress();

		// start Malaysia time updater
		const fmtDate = new Intl.DateTimeFormat(undefined, {
			timeZone: 'Asia/Kuala_Lumpur',
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
		const fmtTime = new Intl.DateTimeFormat(undefined, {
			timeZone: 'Asia/Kuala_Lumpur',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		function updateTime() {
			const now = new Date(serverNow());
			try {
				malaysiaDate = fmtDate.format(now);
				malaysiaTime = fmtTime.format(now);
			} catch {
				// fallback simple formatting
				malaysiaDate = now.toLocaleDateString();
				malaysiaTime = now.toLocaleTimeString();
			}
		}
		updateTime();
		_timeInterval = setInterval(updateTime, 1000);

		// Start periodic apprenticeship checker (auto-start / auto-complete)
		function checkApprenticeshipsAutoProcess() {
			try {
				const now = serverNow();
				const gs = get(gameState) || {};
				const apprentices =
					gs.character && Array.isArray(gs.character.apprenticeships)
						? gs.character.apprenticeships
						: [];
				const quests =
					gs.character && Array.isArray(gs.character.quests) ? gs.character.quests : [];
				const activeQuest = get(hasActiveQuest) || false;
				// Do NOT early-return here: we want the apprenticeship badges to
				// be built/shown even while a quest is active. Awarding/skipping
				// behavior below will still avoid granting craft points when a
				// quest is active.
				// Build badge state once (deduplicated by mentor+slot) so we don't produce duplicate rows
				try {
					const badgeMap = new SvelteMap();
					apprentices.forEach((ap) => {
						// Only show badges for active apprentices — quit/inactive entries should not render badges
						if (!ap || !ap.active) return;
						const slotHour = typeof ap.slotStartHour === 'number' ? ap.slotStartHour : null;
						const key = `${ap.mentor || 'unknown'}|${slotHour === null ? 'na' : slotHour}`;
						if (badgeMap.has(key)) return; // already recorded
						if (slotHour === null) {
							badgeMap.set(key, { mentor: ap.mentor, label: '—' });
							return;
						}
						const d = new Date(now);
						const todaysStart = new Date(
							d.getFullYear(),
							d.getMonth(),
							d.getDate(),
							slotHour,
							0,
							0
						).getTime();
						const todaysEnd = todaysStart + (ap.dailyHours || 2) * 60 * 60 * 1000;
						// If the session hasn't started yet today
						if (now < todaysStart) {
							const mins = Math.floor((todaysStart - now) / 60000);
							badgeMap.set(key, {
								mentor: ap.mentor,
								label: `Apprenticeship [${ap.mentor}] - Start in ${mins}m`
							});
							return;
						}
						// If currently in today's session window
						if (now >= todaysStart && now <= todaysEnd) {
							const mins = Math.ceil((todaysEnd - now) / 60000);
							badgeMap.set(key, {
								mentor: ap.mentor,
								label: `Apprenticeship [${ap.mentor}] - End in ${mins}m`
							});
							return;
						}
						// Today's session has already passed — show countdown to the next day's session
						const nextStart = todaysStart + 24 * 60 * 60 * 1000;
						const mins = Math.floor((nextStart - now) / 60000);
						badgeMap.set(key, {
							mentor: ap.mentor,
							label: `Apprenticeship [${ap.mentor}] - Start in ${mins}m`
						});
					});
					apprenticesBadgeState = Array.from(badgeMap.values());
				} catch {
					/* ignore badge build errors */
				}

				// Now process each apprentice for awarding/skipping (separate from badge build)
				apprentices.forEach((ap) => {
					try {
						if (!ap || !ap.active) return;
						// If the player currently has an active quest, skip awarding
						// or marking sessions for now, but still build the badge labels
						// so the UI shows the session countdown.
						if (activeQuest) return;
						const slotHour = ap.slotStartHour;
						if (typeof slotHour !== 'number') return;
						const d = new Date(now);
						const sessionStart = new Date(
							d.getFullYear(),
							d.getMonth(),
							d.getDate(),
							slotHour,
							0,
							0
						).getTime();
						const sessionEnd = sessionStart + (ap.dailyHours || 2) * 60 * 60 * 1000;
						// if now in session window
						if (now >= sessionStart && now <= sessionEnd) {
							// ensure not already recorded for this session (compare lastSession.at to sessionStart)
							const last = ap.lastSession && ap.lastSession.at ? ap.lastSession.at : null;
							if (last && last >= sessionStart) return; // already awarded/skipped for this session
							// check skip due to overlapping quests
							const skipped = quests.some(
								(q) => (q.startTime || 0) < sessionStart && (q.endTime || 0) > sessionStart
							);
							if (skipped) {
								// mark skipped
								gameState.update((s) => {
									const list =
										s.character && Array.isArray(s.character.apprenticeships)
											? s.character.apprenticeships.map((x) =>
													x.mentor === ap.mentor
														? { ...x, lastSession: { at: now, skipped: true } }
														: x
												)
											: (s.character && s.character.apprenticeships) || [];
									return {
										...(s || {}),
										character: { ...(s.character || {}), apprenticeships: list }
									};
								});
								try {
									saveSlotsManager.autoSave && saveSlotsManager.autoSave();
								} catch {
									// Ignore auto-save errors
								}
								return;
							}

							// award craft point for mentor
							gameState.update((s) => {
								const cp =
									s.character && s.character.craftPoints
										? { ...s.character.craftPoints }
										: { mainWeapon: 0, subWeapon: 0 };
								if (ap.mentor === 'Issac' || ap.mentor === 'Isaac')
									cp.mainWeapon = (cp.mainWeapon || 0) + 1;
								if (ap.mentor === 'Maple') cp.subWeapon = (cp.subWeapon || 0) + 1;
								const list =
									s.character && Array.isArray(s.character.apprenticeships)
										? s.character.apprenticeships.map((x) =>
												x.mentor === ap.mentor
													? { ...x, lastSession: { at: now, skipped: false } }
													: x
											)
										: (s.character && s.character.apprenticeships) || [];
								return {
									...(s || {}),
									character: { ...(s.character || {}), apprenticeships: list, craftPoints: cp }
								};
							});
							try {
								saveSlotsManager.autoSave && saveSlotsManager.autoSave();
							} catch {
								// Ignore auto-save errors
							}
							// show reward toast
							try {
								window.dispatchEvent(
									new CustomEvent('toast', {
										detail: {
											message: 'Apprenticeship session complete — craft point awarded.',
											type: 'success'
										}
									})
								);
							} catch (_e) {
								// Ignore toast dispatch errors
							}
						}
					} catch {
						/* ignore per-apprentice errors */
					}
				});
			} catch (e) {
				console.warn('[FreeModeHub] apprenticeship auto-process failed', e);
			}
		}

		// combat log listener to trigger badge flash on Magic Barrier auto-cast
		_onCombatLog = function (ev) {
			try {
				const log = ev && ev.detail ? ev.detail : null;
				if (!log || typeof log !== 'object') return;
				const gs = get(gameState) || {};
				const playerName = (gs.character && gs.character.name) || 'Player';
				if (log.type === 'DEFENSE_RESULT' && log.actor === playerName && log.autoCast) {
					const ac = log.autoCast || {};
					if (ac.used || ac.applied) {
						mbFlash = true;
						if (_mbFlashTimeout) clearTimeout(_mbFlashTimeout);
						_mbFlashTimeout = setTimeout(() => (mbFlash = false), 1200);
					}
				}
			} catch (e) {}
		};
		if (typeof window !== 'undefined') window.addEventListener('combat:log', _onCombatLog);
		// expose for other handlers so they can trigger an immediate rebuild
		_checkApprenticeshipsAutoProcess = checkApprenticeshipsAutoProcess;

		// run periodically and once immediately
		_apprenticeshipInterval = setInterval(checkApprenticeshipsAutoProcess, 15 * 1000);
		try {
			checkApprenticeshipsAutoProcess();
		} catch (_e) {
			// Ignore initial apprenticeship check errors
		}

		// subscribe to quest active state so UI can react (auto-close board and open window)
		try {
			let _lastHasActive = false;
			_unsubHasActive = hasActiveQuest.subscribe((v) => {
				// Only react on the transition false -> true so the player can close the
				// Quests panel while a quest is active without it being immediately reopened.
				try {
					if (v && !_lastHasActive) {
						// when a quest becomes active, open the Quests panel (not the unstyled QuestWindow modal)
						showQuestBoard = false;
						questsAllowLocalActions = false;
						showQuests = true;
					}
				} finally {
					_lastHasActive = !!v;
				}
			});

			// If there is already a completed quest persisted (e.g., expired while offline),
			// open the Quests panel so the player can submit it without needing to talk to receptionist.
			try {
				const gs = get(gameState) || {};
				const ch = gs.character || {};
				const list = Array.isArray(ch.quests) ? ch.quests : [];
				const alreadyCompleted = list.find((q) => q && q.status === 'completed');
				if (alreadyCompleted) {
					questsAllowLocalActions = true;
					showQuests = true;
					showQuestBoard = false;
				}
			} catch (e) {
				/* ignore */
			}

			// Listen for quests that complete while the player is away and auto-open the Quests panel
			try {
				window.addEventListener('quest:completed', (ev) => {
					try {
						// Open the Quests panel and allow local actions so the player can submit immediately
						questsAllowLocalActions = true;
						showQuests = true;
						showInHubConversation = false;
						showQuestBoard = false;
					} catch (e) {
						/* ignore handler errors */
					}
				});
			} catch (e) {
				/* ignore */
			}

			// also subscribe to the active quest store to auto-close any open quest modal if the quest is cleared
			try {
				_unsubActiveQuest = questStore.subscribe((q) => {
					if (!q) {
						// QuestsWindow handles its own internal submit modal; we avoid auto-closing showQuests here
					}
				});
			} catch (e) {
				console.warn('Failed to subscribe to active quest store', e);
			}
		} catch (e) {
			console.warn('Failed to subscribe to quest state', e);
		}
	});

	onDestroy(() => {
		if (_timeInterval) {
			clearInterval(_timeInterval);
			_timeInterval = null;
		}
		if (_apprenticeshipInterval) {
			clearInterval(_apprenticeshipInterval);
			_apprenticeshipInterval = null;
		}
		// clear exposed helper
		_checkApprenticeshipsAutoProcess = null;
		if (_unsubHasActive && typeof _unsubHasActive === 'function') {
			_unsubHasActive();
			_unsubHasActive = null;
		}
		if (_unsubActiveQuest && typeof _unsubActiveQuest === 'function') {
			_unsubActiveQuest();
			_unsubActiveQuest = null;
		}
		// cleanup combat log listener
		try {
			if (_onCombatLog && typeof window !== 'undefined') window.removeEventListener('combat:log', _onCombatLog);
		} catch (e) {}
		try { if (_mbFlashTimeout) clearTimeout(_mbFlashTimeout); } catch (e) {}
	});

	function handleTopRightAction(action) {
		try {
			switch (action) {
				case 'toggle-audio':
					gameState.update((s) => ({
						...(s || {}),
						audioEnabled: !((s && s.audioEnabled) || false)
					}));
					return;
				case 'save':
					try {
						// prepare preview data and show confirmation modal instead of saving immediately
						const gs = get(gameState) || {};
						// avoid assigning the potentially-large avatar dataURL synchronously
						// so the modal/backdrop can render immediately without image decode blocking
						const avatarData = gs.character && gs.character.avatar ? gs.character.avatar : null;
						savePreview = {
							avatar: null,
							name: gs.character && gs.character.name ? gs.character.name : 'Adventurer',
							level:
								gs.playerData && gs.playerData.level
									? gs.playerData.level
									: gs.character && gs.character.level
										? gs.character.level
										: 1
						};
						showSavePreview = true;
						// ensure no element remains focused (removes focus-visible tooltips)
						requestAnimationFrame(() => {
							try {
								if (
									document &&
									document.activeElement &&
									typeof document.activeElement.blur === 'function'
								) {
									document.activeElement.blur();
								}
							} catch (e) {
								/* ignore */
							}
							// assign avatar on next frame to avoid blocking paint
							try {
								savePreview = { ...(savePreview || {}), avatar: avatarData };
							} catch (e) {
								/* ignore */
							}
						});
					} catch (e) {
						console.warn('save preview failed', e);
					}
					return;
				case 'load':
					showLoadModal = true;
					return;
				case 'reset':
					try {
						// Step 1: initial confirmation
						const ok = confirm(
							'Reset your guest data? This will wipe all local save data for the character you are currently playing. This cannot be undone. Click OK to continue to the confirmation step.'
						);
						if (!ok) return;

						// Step 2: require typing DELETE to confirm irreversible wipe
						const typed = prompt(
							'Type DELETE to permanently erase all local save data for this character.'
						);
						if (typed === 'DELETE') {
							try {
								localStorage.removeItem('game_save_data');
							} catch (_e) {
								// Ignore localStorage errors
							}
							try {
								localStorage.removeItem('game_save_slots');
							} catch (_e) {
								// Ignore localStorage errors
							}
							gameState.set(initialGameState);
							try {
								alert('Data reset. Returning to landing.');
							} catch {
								/* ignore */
							}
							location.href = '/';
						} else {
							try {
								alert('Reset cancelled — confirmation text did not match.');
							} catch {
								/* ignore */
							}
						}
					} catch (e) {
						console.warn('reset failed', e);
					}
					return;
				case 'import':
					// trigger hidden file input
					if (importInputEl) importInputEl.click();
					return;
				case 'export':
					try {
						const payload = saveSlotsManager.createSavePayload();
						const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
						const url = URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = `save-${Date.now()}.json`;
						document.body.appendChild(a);
						a.click();
						a.remove();
						URL.revokeObjectURL(url);
					} catch (e) {
						console.warn('export failed', e);
					}
					return;
				case 'toggle-top-right':
					gameState.update((s) => ({
						...(s || {}),
						topRightVisible: !((s && s.topRightVisible) || false)
					}));
					return;
			}
		} catch (err) {
			console.warn('[FreeModeHub] handleTopRightAction failed', err);
		}
	}

	function handleAvatarChange(e) {
		const file = e && e.target && e.target.files ? e.target.files[0] : null;
		if (!file) return;
		avatarFile = file;
		uploadActive = true;
		uploadProgress = 0;

		const maxDim = 512; // max width/height
		const quality = 0.8;

		const readFileAsDataURL = (f) =>
			new Promise((res, rej) => {
				const r = new FileReader();
				r.onerror = () => rej(new Error('file-read-failed'));
				r.onload = () => res(r.result);
				r.readAsDataURL(f);
			});

		const compressDataUrl = async (dataUrl) => {
			return await new Promise((resolve) => {
				const img = new Image();
				img.onload = () => {
					// compute target size
					let { width, height } = img;
					let targetW = width;
					let targetH = height;
					if (width > height) {
						if (width > maxDim) {
							targetW = maxDim;
							targetH = Math.round((height / width) * maxDim);
						}
					} else {
						if (height > maxDim) {
							targetH = maxDim;
							targetW = Math.round((width / height) * maxDim);
						}
					}
					const canvas = document.createElement('canvas');
					canvas.width = targetW;
					canvas.height = targetH;
					const ctx = canvas.getContext('2d');
					ctx.drawImage(img, 0, 0, targetW, targetH);
					// try WEBP first
					try {
						const webp = canvas.toDataURL('image/webp', quality);
						if (webp && webp.indexOf('data:image/webp') === 0) {
							resolve(webp);
							return;
						}
					} catch (e) {
						// ignore and fallback
					}
					// fallback to jpeg
					try {
						const jpeg = canvas.toDataURL('image/jpeg', quality);
						resolve(jpeg);
					} catch (e) {
						// worst-case use original
						resolve(dataUrl);
					}
				};
				img.onerror = () => resolve(dataUrl);
				img.src = dataUrl;
			});
		};

		(async () => {
			try {
				const rawData = await readFileAsDataURL(file);
				// update progress to 30% after read
				uploadProgress = 20;
				const compressed = await compressDataUrl(rawData);
				uploadProgress = 90;
				const gs = get(gameState) || {};
				const updated = {
					...gs,
					character: {
						...(gs.character || {}),
						avatar: compressed
					}
				};
				gameState.set(updated);
				uploadProgress = 100;
			} catch (err) {
				console.warn('[FreeModeHub] Avatar processing failed', err);
				// fallback: do nothing
			} finally {
				uploadActive = false;
			}
		})();
	}

	async function confirmSavePreview() {
		try {
			// perform actual save
			const res = await saveSlotsManager.autoSave();
			refreshSlots();
			// close preview
			showSavePreview = false;
			savePreview = null;
			// notify user
			try {
				const gs = get(gameState) || {};
				const slotId = gs.activeSlotId || saveSlotsManager.getLastUsed();
				const slot = slotId ? saveSlotsManager.getSlot(slotId) : null;
				// saved — no blocking prompt. Use console log for debug.
				const playerName =
					slot && slot.meta && slot.meta.playerName
						? slot.meta.playerName
						: gs.character && gs.character.name
							? gs.character.name
							: '—';
				const level =
					slot && slot.meta && slot.meta.level
						? slot.meta.level
						: gs.playerData && gs.playerData.level
							? gs.playerData.level
							: '—';
				console.debug(
					`[FreeModeHub] Saved to slot #${slotId || '—'} — ${playerName} (Level ${level})`
				);
			} catch (e) {
				/* ignore */
			}
		} catch (err) {
			console.warn('confirmSavePreview failed', err);
			// don't show blocking alert; consider showing a non-blocking toast here instead
		}
	}

	function cancelSavePreview() {
		showSavePreview = false;
		savePreview = null;
	}

	// Handle selection from the in-hub conversation

	// Helper to return a stable npc key: prefer `npcId` when available, fallback to `name`.
	function currentNpcKey() {
		try {
			if (!inHubConversationData) return null;
			return (
				inHubConversationData.npcId ||
				inHubConversationData.id ||
				inHubConversationData.name ||
				null
			);
		} catch {
			return null;
		}
	}

	function handleInHubClose() {
		// Prevent skipping the advanced element reveal video by forcing the reveal action if the user tries to close
		if (inHubConversationData && inHubConversationData.choices && inHubConversationData.choices.some(c => c.id === 'mage-element-reveal')) {
			console.debug('[FreeModeHub] Intercepting close to trigger reveal');
			// Manually execute the reveal logic to ensure it runs regardless of handleInHubSelect routing
			try {
				const detail = inHubConversationData.pendingVideo;
				const elName = inHubConversationData.pendingElName || 'Element';
				const advId = inHubConversationData.pendingAdvId;
				const baseId = inHubConversationData.pendingBaseId;
				
				if (detail) {
					window.dispatchEvent(new CustomEvent('element-adv', { detail }));
				}
				
				// UPGRADE SKILL HERE
				if (advId && baseId) {
					const gs = get(gameState) || {};
					const existing = gs.character && Array.isArray(gs.character.skills) ? gs.character.skills.slice() : [];
					// Remove base, add adv
					const filtered = existing.filter(s => (typeof s === 'string' ? s !== baseId : s.id !== baseId));
					
					const def = skillsDb.find((s) => s.id === advId);
					const skillObj = def
						? { id: def.id, name: def.name, level: def.level || 1, description: def.description, icon: def.icon }
						: { id: advId, name: elName + ' Ascendant', level: 1 };
					
					const newSkills = filtered.concat([skillObj]);
					
					gameState.update((s) => ({
						...(s || {}),
						character: { ...(s.character || {}), skills: newSkills, alexiChosenElement: advId }
					}));
					
					// dispatch toast for learning the advanced element
					try {
						window.dispatchEvent(new CustomEvent('toast', { detail: { message: `You have learned ${skillObj.name}!`, type: 'success' } }));
					} catch (e) {}
					
					try {
						saveManager.saveGame({ auto: true });
					} catch (e) {}
				}

				showReply(`It seems like ${elName} likes you. Well, you will understand soon. Good luck.`, [
					{ text: 'Thank you', trait: null }
				]);
			} catch (e) {
				console.warn('Manual reveal in handleInHubClose failed', e);
			}
			return;
		}
		showInHubConversation = false;
		inHubConversationData = null;
	}

	function handleInHubSelect(e) {
		const choice = e && e.detail && e.detail.choice ? e.detail.choice : null;
		try {
			console.debug('[FreeModeHub] in-hub select', {
				npc: inHubConversationData && inHubConversationData.name,
				choice
			});
		} catch (e) {}
		const npcKey = currentNpcKey();
		// (Removed temporary debug instrumentation)
		// helper to deduct silver (1 gold = 100 silver)
		function deductSilver(amount) {
			try {
				const gs = get(gameState) || {};
				const pd = gs.playerData || { gold: 0, silver: 0 };
				const total = Number(pd.gold || 0) * 100 + Number(pd.silver || 0);
				if (amount > total) {
					try {
						alert('You do not have enough coins to pay that amount.');
					} catch (_e) {
						// Ignore alert errors
					}
					return false;
				}
				const remaining = total - amount;
				const newGold = Math.floor(remaining / 100);
				const newSilver = remaining % 100;
				gameState.update((s) => ({
					...(s || {}),
					playerData: {
						...(s && s.playerData ? s.playerData : {}),
						gold: newGold,
						silver: newSilver
					}
				}));
				return true;
			} catch (err) {
				console.warn('deductSilver failed', err);
				return false;
			}
		}
		// If the player clicked an acknowledgement/Close choice and we have a previous menu, restore it instead of closing everything
		try {
			// Simple robust check: choices without an `id` are acknowledgement replies and should restore previous menu
			if (
				choice &&
				typeof choice.id === 'undefined' &&
				inHubConversationData &&
				inHubConversationData.previous
			) {
				inHubConversationData = inHubConversationData.previous;
				showInHubConversation = true;
				return;
			}
			// Fallback: if the emitted choice explicitly carries __restore or is a 'close' label
			if (
				choice &&
				(choice.__restore === true ||
					(choice.text && String(choice.text).toLowerCase() === 'close')) &&
				inHubConversationData &&
				inHubConversationData.previous
			) {
				inHubConversationData = inHubConversationData.previous;
				showInHubConversation = true;
				return;
			}
		} catch (e) {
			/* ignore */
		}
		try {
			if (choice && choice.trait) {
				console.log('[FreeModeHub] Updating trait:', choice.trait);
				personalityTraits.update((traits) => {
					const newTraits = Object.assign({}, traits || {});
					console.log('[FreeModeHub] Current traits before update:', newTraits);
					const key = String(choice.trait);
					newTraits[key] = (newTraits[key] || 0) + 1;
					console.log('[FreeModeHub] Updated traits:', newTraits);

					// Also record in trait history
					addTraitChange(key, 1, 'scene', {
						sourceId: inHubConversationData?.id || 'free-mode-hub',
						description: `Interaction with ${inHubConversationData?.name || 'NPC'}`
					});

					const totalAnswers = Object.values(newTraits).reduce(
						(sum, count) => sum + (Number(count) || 0),
						0
					);
					if (totalAnswers >= 10) {
						// auto-save via saveSlotsManager if appropriate
						try {
							saveSlotsManager.autoSave && saveSlotsManager.autoSave();
						} catch (err) {
							/* ignore */
						}
					}
					return newTraits;
				});
			}

			// Berg-specific question handling
			// open general buy/sell window when the choice indicates vendor actions
			try {
				if (choice && (choice.id === 'buy-sell-repair' || choice.id === 'buy-sell')) {
					// vendor name comes from current conversation, if available
					sellVendorName =
						inHubConversationData && inHubConversationData.name
							? inHubConversationData.name
							: 'Merchant';
					showSellBuy = true;
					// close the conversation panel when shop opens
					showInHubConversation = false;
					return;
				}
			} catch (e) {
				/* non-fatal */
			}

			// Berg-specific question handling
			if (npcKey === 'Berg' && choice && choice.id) {
				try {
					console.debug('[FreeModeHub] Issac handler invoked', {
						npcKey,
						choiceId: choice && choice.id,
						inHubName: inHubConversationData && inHubConversationData.name,
						inHubNpcId: inHubConversationData && inHubConversationData.npcId
					});
					const id = choice.id;
					if (id === 'who-lady') {
						showReply(
							"That's my dear wife, Carissa. She helps me out around here. Ask her if you need someting, in case I am not around.",
							[{ text: 'Sure', trait: null }]
						);
						// Mark Carissa as known/unlocked so she appears in the Pier Light NPC list
						try {
							gameState.update((s) => ({
								...(s || {}),
								character: { ...(s.character || {}), metCarissa: true }
							}));
							// If the player is currently at the Pier Light, add Carissa to the active location NPCs so she appears immediately
							try {
								const gs = get(gameState) || {};
								if (gs.location === 'pier-light') {
									const currentNpcs = Array.isArray(gs.locationNPCs) ? gs.locationNPCs.slice() : [];
									const already = currentNpcs.some((n) => n && n.name === 'Carissa');
									if (!already) {
										currentNpcs.push({
											name: 'Carissa',
											snippet:
												'Hello — I help with the harbor chores and can offer simple provisions.',
											conversationScene: null,
											npcPortrait: '/Images/NPC/npc-carissa.png'
										});
										gameState.update((s) => ({ ...(s || {}), locationNPCs: currentNpcs }));
									}
								}
							} catch (e2) {
								console.warn('Failed to add Carissa to locationNPCs', e2);
							}
						} catch (e) {
							console.warn('Failed to mark metCarissa', e);
						}
						showInHubConversation = true;
						return;
					}
					if (id === 'how-much-rent') {
						// calculate based on last payment date if available
						const gs = get(gameState) || {};
						const lastPaid =
							gs.character && gs.character.rentLastPaid
								? new Date(gs.character.rentLastPaid)
								: null;
						if (lastPaid && !isNaN(lastPaid.getTime())) {
							const now = new Date();
							const diffMs = now - lastPaid;
							const days = Math.floor(diffMs / 86400000); // full days since last paid
							if (days <= 0) {
								// no rent owing
								showReply(`You already paid on ${lastPaid.toLocaleString()}. No rent is owing.`, [
									{ text: 'Close', trait: null }
								]);
								showInHubConversation = true;
								return;
							}
							const amount = days * 5; // 5 silver per day
							showReply(`It's ${amount} silver for ${days} day(s) (5 silver/day).`, [
								{ id: 'pay-now', text: 'Pay now', trait: null },
								{ id: 'pay-later', text: 'Pay later', trait: null }
							]);
							showInHubConversation = true;
							return;
						} else {
							// No payment record — ask to start payments
							showReply(
								"I don't have a record of your last payment. If you'd like, you can pay now to start your rental payments (5 silver/day).",
								[
									{ id: 'pay-now', text: 'Pay now', trait: null },
									{ id: 'pay-later', text: 'Pay later', trait: null }
								]
							);
							showInHubConversation = true;
							return;
						}
					}
					if (id === 'about-town') {
						showReply(
							"If you haven't been to the blacksmith's, you should go. My brother and his boy run the place. The old man might always be hammered, but his work is anything but sloppy. I guarantee it!",
							[{ text: 'Thank you', trait: null }]
						);
						// Unlock the Love and Hammered via per-character unlockedPlaces (preferred over placeholder scene ids)
						try {
							const gs = get(gameState) || {};
							const ch = gs.character || {};
							const unlocked = Array.isArray(ch.unlockedPlaces) ? ch.unlockedPlaces.slice() : [];
							if (!unlocked.includes('love-and-hammered')) {
								unlocked.push('love-and-hammered');
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), unlockedPlaces: unlocked }
								}));
							}
						} catch (e) {
							console.warn('Failed to unlock The Love and Hammered via unlockedPlaces', e);
						}
						showInHubConversation = true;
						return;
					}
					if (id === 'about-alexa') {
						showReply(
							"She’s a key person in town and an absolute beauty. My wife and I watched her grow up—I can’t even remember how many years it’s been since I first knew her! Ha-ha!",
							[{ text: 'Makes sense', trait: null }]
						);
						return;
					}
					if (id === 'heard-rumors') {
						showReply(
							'Hmm... Recently, travelers have been whispering about some dark rumors from the far north. But hey, it is the far north. Why worry?',
							[{ text: 'I see what you mean', trait: null }]
						);
						return;
					}
					// payment actions
					if (id === 'pay-now') {
						// attempt to deduct a single day's rent if no lastPaid, or the full amount calculated earlier
						const gs = get(gameState) || {};
						const lastPaid =
							gs.character && gs.character.rentLastPaid
								? new Date(gs.character.rentLastPaid)
								: null;
						let amount = 5;
						if (lastPaid && !isNaN(lastPaid.getTime())) {
							const now = new Date();
							const diffMs = now - lastPaid;
							const days = Math.floor(diffMs / 86400000);
							if (days <= 0) {
								// nothing owed
								showReply(`You already paid on ${lastPaid.toLocaleString()}. No rent is owing.`, [
									{ text: 'Close', trait: null }
								]);
								return;
							}
							amount = days * 5;
						}
						const ok = deductSilver(amount);
						if (ok) {
							// update last paid timestamp
							gameState.update((s) => ({
								...(s || {}),
								character: { ...(s.character || {}), rentLastPaid: new Date().toISOString() }
							}));
							// Autosave after payment to prevent tampering
							try {
								saveManager.saveGame({ auto: true });
							} catch (e) {
								/* ignore */
							}
							showReply(`Payment received (${amount} silver). Thanks.`, [
								{ text: 'Close', trait: null }
							]);
						} else {
							showReply(`You don't have enough funds to pay ${amount} silver.`, [
								{ text: 'Close', trait: null }
							]);
						}
						return;
					}
					if (id === 'pay-later') {
						showReply("Alright, let me know when you're ready.", [{ text: 'Close', trait: null }]);
						return;
					}
				} catch (err) {
					console.warn('Berg special handling failed', err);
				}
			}

			// Carissa-specific conversation handling
			if (inHubConversationData && npcKey === 'Carissa' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'where-is-berg') {
						showReply(
							'Berg? Well, if he isn\'t here... Either he is catching up with his breaks or catching up with his drinks. Oh, you know how mens are...',
							[{ text: 'I see what you mean.', trait: null }]
						);
						return;
					}
					if (id === 'how-much-rent') {
						// mirror Berg: calculate based on last payment date and only charge when days > 0
						const gs = get(gameState) || {};
						const lastPaid =
							gs.character && gs.character.rentLastPaid
								? new Date(gs.character.rentLastPaid)
								: null;
						if (lastPaid && !isNaN(lastPaid.getTime())) {
							const now = new Date();
							const diffMs = now - lastPaid;
							const days = Math.floor(diffMs / 86400000); // full days since last paid
							if (days <= 0) {
								// no rent owing
								showReply(`You already paid on ${lastPaid.toLocaleString()}. No rent is owing.`, [
									{ text: 'Close', trait: null }
								]);
								showInHubConversation = true;
								return;
							}
							const amount = days * 5; // 5 silver per day
							showReply(`It's ${amount} silver for ${days} day(s) (5 silver/day).`, [
								{ id: 'pay-now', text: 'Pay now', trait: null },
								{ id: 'pay-later', text: 'Pay later', trait: null }
							]);
							showInHubConversation = true;
							return;
						} else {
							// No payment record — ask to start payments
							showReply(
								"I don't have a record of your last payment. If you'd like, you can pay now to start your rental payments (5 silver/day).",
								[
									{ id: 'pay-now', text: 'Pay now', trait: null },
									{ id: 'pay-later', text: 'Pay later', trait: null }
								]
							);
							showInHubConversation = true;
							return;
						}
					}
					if (id === 'about-town') {
						showReply(
							"Mirror's Repose is a small town, rumors travel fast. Find the right person and you find what you want to know.",
							[{ text: 'Makes perfect sense', trait: null }]
						);
						return;
					}
					if (id === 'about-alexa') {
						showReply(
							"She is the jewel of Mirror's Repose! But I don't think I should mention much about her than what you already knew...",
							[{ text: 'Sorry, I asked too much...', trait: null }]
						);
						return;
					}
					if (id === 'ask-about-acolyte') {
						showReply(
							'There is a traveller currently staying here. But she keeps to herself in her room most of the time. You might meet her if you are lucky.',
							[{ text: 'Thank you', trait: null }]
						);
						// Mark Esther as known/unlocked so she appears in the Pier Light NPC list
						try {
							gameState.update((s) => ({
								...(s || {}),
								character: { ...(s.character || {}), metEsther: true }
							}));
							// If the player is currently at the Pier Light, add Esther to the active location NPCs so she appears immediately
							try {
								const gs = get(gameState) || {};
								if (gs.location === 'pier-light') {
									const currentNpcs = Array.isArray(gs.locationNPCs) ? gs.locationNPCs.slice() : [];
									const already = currentNpcs.some((n) => n && n.name === 'Esther the Acolyte');
									if (!already) {
										currentNpcs.push({
											name: 'Esther the Acolyte',
											snippet:
												'Greetings. I am Esther, an acolyte in service to the Twelve Orders of The Night, dedicated to the light of Luna.',
											conversationScene: null,
											npcPortrait: '/Images/NPC/npc-esther.PNG'
										});
										gameState.update((s) => ({ ...(s || {}), locationNPCs: currentNpcs }));
									}
								}
							} catch (e2) {
								console.warn('Failed to add Esther to locationNPCs', e2);
							}
						} catch (e) {
							console.warn('Failed to mark metEsther', e);
						}
						return;
					}
					// Carissa payment actions mirror Berg's behavior
					if (id === 'pay-now') {
						const gs = get(gameState) || {};
						const lastPaid =
							gs.character && gs.character.rentLastPaid
								? new Date(gs.character.rentLastPaid)
								: null;
						let amount = 5;
						if (lastPaid && !isNaN(lastPaid.getTime())) {
							const now = new Date();
							const diffMs = now - lastPaid;
							const days = Math.floor(diffMs / 86400000);
							if (days <= 0) {
								// nothing owed
								showReply(`You already paid on ${lastPaid.toLocaleString()}. No rent is owing.`, [
									{ text: 'Close', trait: null }
								]);
								showInHubConversation = true;
								return;
							}
							amount = days * 5;
						}
						const ok = deductSilver(amount);
						if (ok) {
							gameState.update((s) => ({
								...(s || {}),
								character: { ...(s.character || {}), rentLastPaid: new Date().toISOString() }
							}));
							// Autosave after payment to prevent tampering
							try {
								saveManager.saveGame({ auto: true });
							} catch (e) {
								/* ignore */
							}
							showReply(`Payment received (${amount} silver). Thanks.`, [
								{ text: 'Close', trait: null }
							]);
						} else {
							showReply(`You don't have enough funds to pay ${amount} silver.`, [
								{ text: 'Close', trait: null }
							]);
						}
						return;
					}
					if (id === 'pay-later') {
						showReply("Alright, let me know when you're ready.", [{ text: 'Close', trait: null }]);
						return;
					}
				} catch (err) {
					console.warn('Carissa special handling failed', err);
				}
			}

			// Esther-specific conversation handling
			if (inHubConversationData && npcKey === 'Esther the Acolyte' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'ask-about-skills') {
						const gs = get(gameState) || {};
						const playerClass = gs.character && gs.character.class;

						if (playerClass === 'acolyte') {
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? { id: def.id, name: def.name, level: def.level || 1 }
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHas = normalized.some(
								(s) => s && (s.id === 'acolyte_heal' || s.name === 'Heal')
							);
							if (alreadyHas) {
								showReply('To share more knowledge now would be a curse, not a blessing.', [
									{
										text: "I accept your wisdom. I will go, master the silence you've taught me, and return when my spirit is a worthy vessel",
										trait: null
									}
								]);
							} else {
								showReply('How can I refuse a fellow Acolyte?', [
									{
										id: 'esther-teach',
										text: 'Your guidance is a light I am striving to follow',
										trait: null
									}
								]);
							}
						} else {
							showReply(
								'You look with eager eyes, but you do not see the shadows this light casts. I cannot, in good conscience, arm you with a power you do not understand.',
								[{ text: 'I get your point', trait: null }]
							);
						}
						return;
					}

					// After the player thanks her, Esther "teaches" the Heal skill to acolytes
					if (id === 'esther-teach') {
						try {
							const gs = get(gameState) || {};
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? {
												id: def.id,
												name: def.name,
												level: def.level || 1,
												description: def.description,
												icon: def.icon
											}
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHas = normalized.some(
								(s) => s && (s.id === 'acolyte_heal' || s === 'acolyte_heal' || s.name === 'Heal')
							);
							if (!alreadyHas) {
								const def = skillsDb.find((s) => s.id === 'acolyte_heal');
								const skillObj = def
									? {
											id: def.id,
											name: def.name,
											level: def.level || 1,
											description: def.description,
											icon: def.icon
										}
									: { id: 'acolyte_heal', name: 'Heal', level: 1 };
								const newSkills = normalized.concat([skillObj]);
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), skills: newSkills }
								}));
								// small toast to notify player
								try {
									window.dispatchEvent(
										new CustomEvent('toast', {
											detail: { message: 'You learned Heal!', type: 'success' }
										})
									);
								} catch (e) {}

								// Autosave after granting skill
								try {
									saveManager.saveGame({ auto: true });
								} catch (e) {
									/* ignore */
								}
							}
						} catch (grantErr) {
							console.warn('Failed to grant heal skill', grantErr);
						}
						showReply(
							'As a fellow acolyte and messenger of our order, the skill of Heal is a sacred duty. [You learned Heal]',
							[{ text: 'Blessings upon you', trait: null }]
						);
						return;
					}
				} catch (err) {
					console.warn('Esther special handling failed', err);
				}
			}

			// Caspian-specific conversation handling (Familiar's Folly)
			if (inHubConversationData && npcKey === 'Caspian' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'buy-sell') {
						showReply('Open the buy / sell window', [{ text: 'Close', trait: null }]);
						return;
					}
					if (id === 'are-you-owner') {
						showReply('Yes. You got a problem with that?', [{ text: 'No sir!', trait: null }]);
						return;
					}
					if (id === 'about-alexi') {
						showReply(
							"She comes by to help every now and then. We don't talk much but we get along just fine.",
							[{ text: 'I see', trait: null }]
						);
						return;
					}
					if (id === 'apprenticeship') {
						showReply('Are you kidding? Ask me if I need a new master!', [
							{ text: "You're doing fine!", trait: null }
						]);
						return;
					}
					if (id === 'heard-rumors') {
						showReply('Nothing one will tell a familiar.', [
							{ text: 'I am sorry for asking', trait: null }
						]);
						return;
					}
				} catch (err) {
					console.warn('Caspian special handling failed', err);
				}
			}

			// Alexi-specific conversation handling for Familiar's Folly (disambiguate by sourceLocation)
			if (
				inHubConversationData &&
				npcKey === 'Alexi' &&
				inHubConversationData.meta &&
				inHubConversationData.meta.sourceLocation === 'familiars-folly' &&
				choice &&
				choice.id
			) {
				try {
					const id = choice.id;
					if (id === 'buy-sell') {
						showReply('Open the buy / sell window', [{ text: 'Close', trait: null }]);
						return;
					}
					if (id === 'about-caspian') {
						showReply(
							'The owner went out one day and never return. So Caspian is running the show now.',
							[{ text: 'I see', trait: null }]
						);
						return;
					}
					if (id === 'about-skills') {
						showReply(
							"I'm researching how skills are connected to natural aptitude, and how personal traits affect them.",
							[{ text: 'Fascinating', trait: null }]
						);
						return;
					}
					if (id === 'your-skills') {
						showReply('You curious? It is complicated…', [
							{ text: 'Sorry to hear that', trait: null }
						]);
						return;
					}
					if (id === 'heard-rumors') {
						showReply('I am not in the mood to deal with rumors.', [
							{ text: 'Sorry', trait: null }
						]);
						return;
					}
				} catch (err) {
					console.warn('Alexi (familiars-folly) special handling failed', err);
				}
			}

			// Diana-specific conversation handling (The Hush Hustler)
			if (
				inHubConversationData &&
				npcKey === 'Diana' &&
				inHubConversationData.meta &&
				inHubConversationData.meta.sourceLocation === 'the-hush-hustler' &&
				choice &&
				choice.id
			) {
				try {
					const id = choice.id;
					if (id === 'buy-sell-repair' || id === 'buy-sell') {
						showReply('Open the buy / sell window', [{ text: 'Close', trait: null }]);
						return;
					}
					if (id === 'about-russel') {
						showReply("Me and Russel? No way, let's just say we are co-owner", [
							{ text: 'Sorry for asking', trait: null }
						]);
						return;
					}
					if (id === 'about-town') {
						showReply(
							"It is a difficult place when the people think your goods aren't good enough",
							[{ text: 'I am sure people will understand', trait: null }]
						);
						return;
					}
					if (id === 'heard-rumors') {
						showReply('Buy me a drink and I might tell you something interesting', [
							{ text: 'I will', trait: null }
						]);
						return;
					}
				} catch (err) {
					console.warn('Diana special handling failed', err);
				}
			}

			// Russel-specific conversation handling (The Hush Hustler)
			if (
				inHubConversationData &&
				npcKey === 'Russel' &&
				inHubConversationData.meta &&
				inHubConversationData.meta.sourceLocation === 'the-hush-hustler' &&
				choice &&
				choice.id
			) {
				try {
					const id = choice.id;
					if (id === 'buy-sell-repair' || id === 'buy-sell') {
						showReply('Open the buy / sell window', [{ text: 'Close', trait: null }]);
						return;
					}
					if (id === 'about-diana') {
						showReply(
							"You just can't run a decent shop like this without a decent looking woman, right?",
							[{ text: 'Makes sense', trait: null }]
						);
						return;
					}
					if (id === 'about-town') {
						showReply(
							"Let's be honest, they're just jealous of my sources. It's easier to call our products 'questionable' than to admit they're superior. Pfft...",
							[{ text: 'I see your point', trait: null }]
						);
						return;
					}
					if (id === 'heard-rumors') {
						showReply('Rumors, my friend? Even gossip has its price these days.', [
							{ text: 'I see your point', trait: null }
						]);
						return;
					}
				} catch (err) {
					console.warn('Russel special handling failed', err);
				}
			}
			// Zerg-specific conversation handling
			if (npcKey === 'Zerg' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'buy-sell-repair' || id === 'buy-sell') {
						showReply('Open the buy / sell window', [{ text: 'Close', trait: null }]);
						return;
					}
					if (id === 'about-berg') {
						showReply('Ah, so you are staying at The Pier Light!', [{ text: 'Yes', trait: null }]);
						return;
					}
					if (id === 'about-issac') {
						showReply(
							'My son is a real talent! But for some reason he dreams of making weird stuffs nowadays…',
							[{ text: 'Maybe it is a good idea', trait: null }]
						);
						return;
					}
					if (id === 'apprenticeship') {
						showReply("Sorry but no. I don't take students!", [
							{ text: 'Sorry for asking', trait: null }
						]);
						return;
					}
					if (id === 'heard-rumors') {
						showReply(
							'Come have a drink with me tonight and I can tell you all the rumors you like!',
							[{ text: 'I will', trait: null }]
						);
						return;
					}
				} catch (err) {
					console.warn('Zerg special handling failed', err);
				}
			}

			// Issac-specific conversation handling
			if (
				inHubConversationData &&
				(npcKey === 'Issac' || npcKey === 'Isaac') &&
				choice &&
				choice.id
			) {
				try {
					const id = choice.id;
					if (id === 'buy-sell-repair' || id === 'buy-sell') {
						showReply('Open the buy / sell window', [{ text: 'Close', trait: null }]);
						return;
					}
					if (id === 'about-berg') {
						showReply("Oh, Uncle Berg is my father's older brother.", [
							{ text: 'I see', trait: null }
						]);
						return;
					}
					if (id === 'about-zerg') {
						showReply(
							"My dad isn't being supportive of my creativity… I always dream of making weapon that can handle magic",
							[{ text: 'Sounds like a great idea', trait: null }]
						);
						return;
					}
					if (id === 'apprenticeship') {
						try {
							// Check if player already apprenticed to this mentor
							const gs = get(gameState) || {};
							const apprentices =
								gs.character && Array.isArray(gs.character.apprenticeships)
									? gs.character.apprenticeships
									: [];
							const existing = apprentices.find(
								(a) => (a.mentor === npcKey || a.mentor === inHubConversationData.name) && a.active
							);
							if (existing) {
								console.debug('[FreeModeHub] apprenticeship existing for mentor', {
									mentor: npcKey || (inHubConversationData && inHubConversationData.name),
									existing
								});
								// Offer attend / quit choices when already apprenticed
								showReply(
									'You are currently apprenticed here. Would you like to attend your session now or quit?',
									[
										{ id: 'attend-session', text: 'Attend session', trait: null },
										{ id: 'apprentice-quit', text: 'Quit apprenticeship', trait: null },
										{
											id: 'learn-tinkerer-skills',
											text: 'Learn about Tinkerer Skills',
											trait: null
										},
										{ text: 'Cancel', trait: null }
									]
								);
								return;
							}

							// Offer yes/no to start apprenticeship (then choose slot)
							showReply(
								"I don't think I am good enough to teach. But if you are a Tinkerer, would you mind spending some time with me daily to study about the craft of infusing magic into weapons?",
								[
									{ id: 'apprentice-yes', text: 'Yes', trait: null },
									{ id: 'apprentice-no', text: 'No', trait: null }
								]
							);
							return;
						} catch (err) {
							console.warn('Issac apprenticeship handling failed', err);
							showReply('Something went wrong.', [{ text: 'Close', trait: null }]);
							return;
						}
					}
					if (id === 'apprentice-yes') {
						// Present time slot choices for Issac
						showReply('Choose a daily time slot for apprenticeship:', [
							{ id: 'slot-issac-0', text: '00:00 - 01:59', trait: null },
							{ id: 'slot-issac-10', text: '10:00 - 11:59', trait: null }
						]);
						return;
					}

					if (id === 'apprentice-no') {
						showReply('Okay, maybe another time.', [{ text: 'Close', trait: null }]);
						return;
					}

					// Handle slot selection for Issac
					if (id === 'slot-issac-0' || id === 'slot-issac-10') {
						try {
							const gs = get(gameState) || {};
							const rawClass = gs.character && (gs.character.class || gs.character.job || '');
							if (String(rawClass).toLowerCase() !== 'tinkerer') {
								showReply('You need to be a Tinkerer to become my apprentice.', [
									{ text: 'Close', trait: null }
								]);
								return;
							}
							// Prevent changing slot if player already has an active apprenticeship with this mentor
							const existingAp =
								gs.character && Array.isArray(gs.character.apprenticeships)
									? gs.character.apprenticeships.find(
											(a) =>
												(a.mentor === npcKey || a.mentor === inHubConversationData.name) && a.active
										)
									: null;
							if (existingAp) {
								showReply(
									'You already have a scheduled apprenticeship with me — quit first if you want to change the slot.',
									[{ text: 'Close', trait: null }]
								);
								return;
							}
							const hour = id === 'slot-issac-0' ? 0 : 10;
							const apprenticeship = {
								// store mentor as npcKey (prefer id) for stability; fallback matching keeps legacy names supported
								mentor: npcKey || inHubConversationData.name,
								location:
									(inHubConversationData.meta && inHubConversationData.meta.sourceLocation) ||
									gs.location ||
									null,
								slotStartHour: hour,
								dailyHours: 2,
								active: true,
								lastSession: null
							};
							gameState.update((s) => ({
								...(s || {}),
								character: {
									...(s && s.character ? s.character : {}),
									apprenticeships: [
										...((s && s.character && s.character.apprenticeships) || []),
										apprenticeship
									]
								}
							}));
							try {
								saveSlotsManager.autoSave && saveSlotsManager.autoSave();
							} catch (e) {
								/* non-fatal */
							}
							// Rebuild badge state immediately so UI reflects the new apprenticeship without waiting for the interval
							try {
								_checkApprenticeshipsAutoProcess && _checkApprenticeshipsAutoProcess();
							} catch (e) {
								/* ignore */
							}
							showReply("You're signed up for apprenticeship. Attend daily at the chosen time.", [
								{ text: 'Close', trait: null }
							]);
							// For apprenticeship final acknowledgement, clear the saved previous menu so
							// the top Close choice does not restore the time-slot selection.
							try {
								if (inHubConversationData) inHubConversationData.previous = null;
							} catch (e) {
								/* ignore */
							}
							return;
						} catch (err) {
							console.warn('Issac slot handling failed', err);
							showReply('Something went wrong.', [{ text: 'Close', trait: null }]);
							return;
						}
					}
					if (id === 'apprentice-quit') {
						// confirmation step to avoid accidental quits
						showReply(
							'Are you sure you want to quit this apprenticeship? You will need to re-join to change slots.',
							[
								{ id: 'confirm-apprentice-quit', text: 'Yes, quit', trait: null },
								{ text: 'Cancel', trait: null }
							]
						);
						return;
					}

					if (id === 'confirm-apprentice-quit') {
						try {
							const gs = get(gameState) || {};
							const ap =
								gs.character && Array.isArray(gs.character.apprenticeships)
									? gs.character.apprenticeships.slice()
									: [];
							const updated = ap.map((a) =>
								a.mentor === npcKey || a.mentor === inHubConversationData.name
									? { ...a, active: false }
									: a
							);
							gameState.update((s) => ({
								...(s || {}),
								character: { ...(s && s.character ? s.character : {}), apprenticeships: updated }
							}));
							try {
								saveSlotsManager.autoSave && saveSlotsManager.autoSave();
							} catch (_e) {
								// Ignore auto-save errors
							}
							// Rebuild badge state immediately to remove the apprenticeship badge
							try {
								_checkApprenticeshipsAutoProcess && _checkApprenticeshipsAutoProcess();
							} catch (e) {
								/* ignore */
							}
							showReply('You have ended the apprenticeship.', [{ text: 'Close', trait: null }]);
							// Prevent restoring to the prior apprentice confirmation menu when quitting.
							try {
								if (inHubConversationData) inHubConversationData.previous = null;
							} catch (e) {
								/* ignore */
							}
							// Prevent restoring to the prior apprentice confirmation menu when quitting.
							try {
								if (inHubConversationData) inHubConversationData.previous = null;
							} catch (e) {
								/* ignore */
							}
							return;
						} catch (err) {
							console.warn('Failed to quit apprenticeship', err);
							showReply('Something went wrong.', [{ text: 'Close', trait: null }]);
							return;
						}
					}
					if (id === 'attend-session') {
						try {
							const now = serverNow();
							const gs = get(gameState) || {};
							const ap =
								gs.character && Array.isArray(gs.character.apprenticeships)
									? gs.character.apprenticeships.find(
											(a) =>
												(a.mentor === npcKey || a.mentor === inHubConversationData.name) && a.active
										)
									: null;
							if (!ap) {
								showReply('You are not apprenticed here.', [{ text: 'Close', trait: null }]);
								return;
							}
							const slotHour = ap.slotStartHour;
							if (typeof slotHour !== 'number') {
								showReply('Your apprenticeship does not have a scheduled slot.', [
									{ text: 'Close', trait: null }
								]);
								return;
							}
							const d = new Date(now);
							const sessionStart = new Date(
								d.getFullYear(),
								d.getMonth(),
								d.getDate(),
								slotHour,
								0,
								0
							).getTime();
							const sessionEnd = sessionStart + (ap.dailyHours || 2) * 60 * 60 * 1000;
							if (now < sessionStart || now > sessionEnd) {
								showReply('It is not your apprenticeship time right now.', [
									{ text: 'Close', trait: null }
								]);
								return;
							}
							// Check for skipping: if any active quest overlaps sessionStart
							const quests =
								gs.character && Array.isArray(gs.character.quests) ? gs.character.quests : [];
							const skipped = quests.some(
								(q) => (q.startTime || 0) < sessionStart && (q.endTime || 0) > sessionStart
							);
							if (skipped) {
								// mark lastSession as skipped
								gameState.update((s) => {
									const list =
										s.character && Array.isArray(s.character.apprenticeships)
											? s.character.apprenticeships.map((a) =>
													a.mentor === ap.mentor
														? { ...a, lastSession: { at: now, skipped: true } }
														: a
												)
											: (s.character && s.character.apprenticeships) || [];
									return {
										...(s || {}),
										character: { ...(s.character || {}), apprenticeships: list }
									};
								});
								showReply(
									'You skipped class due to an active quest. No apprenticeship rewards were granted for this session.',
									[{ text: 'Close', trait: null }]
								);
								try {
									saveSlotsManager.autoSave && saveSlotsManager.autoSave();
								} catch {}
								return;
							}
							// Award craft point depending on mentor (Issac -> mainWeapon)
							gameState.update((s) => {
								const cp =
									s.character && s.character.craftPoints
										? { ...s.character.craftPoints }
										: { mainWeapon: 0, subWeapon: 0 };
								if (npcKey === 'Issac') cp.mainWeapon = (cp.mainWeapon || 0) + 1;
								if (npcKey === 'Maple') cp.subWeapon = (cp.subWeapon || 0) + 1;
								const list =
									s.character && Array.isArray(s.character.apprenticeships)
										? s.character.apprenticeships.map((a) =>
												a.mentor === ap.mentor
													? { ...a, lastSession: { at: now, skipped: false } }
													: a
											)
										: (s.character && s.character.apprenticeships) || [];
								return {
									...(s || {}),
									character: { ...(s.character || {}), apprenticeships: list, craftPoints: cp }
								};
							});
							try {
								saveSlotsManager.autoSave && saveSlotsManager.autoSave();
							} catch {}
							showReply('Session complete — you gained a craft point.', [
								{ text: 'Close', trait: null }
							]);
							return;
						} catch (err) {
							console.warn('Attend session failed', err);
							showReply('Something went wrong during attendance.', [
								{ text: 'Close', trait: null }
							]);
							return;
						}
					}
					if (id === 'apprentice-no') {
						showReply('Sorry for asking', [{ text: 'Close', trait: null }]);
						return;
					}
					if (id === 'heard-rumors') {
						showReply(
							"While they aren't just rumors but I've heard Tinkerers have a hard time finding balanced weapons. This is why I'm so fascinated with magical weapon craftsmanship—it's the perfect fusion of magic and conventional arms.",
							[{ text: "That's fascinating", trait: null }]
						);
						return;
					}

					// Learn about Tinkerer Skills (from apprenticeship menu)
					// When speaking to Issac as a Tinkerer, offer to teach the starter Craft skill.
					if (id === 'learn-tinkerer-skills') {
						try {
							const gs = get(gameState) || {};
							const rawClass = gs.character && (gs.character.class || gs.character.job || '');
							// Normalize existing skills so we can check for craft
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? { id: def.id, name: def.name, level: def.level || 1 }
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHasCraft = normalized.some(
								(s) => s && (s.id === 'craft' || s.name === 'Craft')
							);
							if (alreadyHasCraft) {
								// Restore original user text: invite to apprenticeship with the usual slot-selection flow
								showReply(
									'I am sure we will figure something new together if you attend the Apprenticeship daily.',
									[{ id: 'apprentice-yes', text: 'Yes, I will', trait: null }]
								);
							} else if (String(rawClass).toLowerCase() === 'tinkerer') {
								// Offer to teach Craft with a confirm choice
								showReply('This is great, I really hope you can join me in my researches', [
									{ id: 'issac-teach-confirm', text: 'I am looking forward to it', trait: null }
								]);
							} else {
								// Non-tinkerers are redirected to Maple
								showReply(
									'If you want tinkerer-specific training, speak to Maple — she knows the craft.',
									[{ text: 'Thanks', trait: null }]
								);
							}
						} catch (err) {
							console.warn('Learn tinkerer skills (Issac) failed', err);
						}
						return;
					}

					// Handle Issac's confirm to teach Craft
					if (id === 'issac-teach-confirm') {
						try {
							const gs = get(gameState) || {};
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? {
												id: def.id,
												name: def.name,
												level: def.level || 1,
												description: def.description,
												icon: def.icon
											}
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHas = normalized.some(
								(s) => s && (s.id === 'craft' || s.name === 'Craft')
							);
							if (!alreadyHas) {
								const def = skillsDb.find((s) => s.id === 'craft' || s.name === 'Craft');
								const skillObj = def
									? {
											id: def.id,
											name: def.name,
											level: def.level || 1,
											description: def.description,
											icon: def.icon
										}
									: { id: 'craft', name: 'Craft', level: 1 };
								const newSkills = normalized.concat([skillObj]);
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), skills: newSkills }
								}));
								try {
									window.dispatchEvent(
										new CustomEvent('toast', {
											detail: { message: 'You learned Craft!', type: 'success' }
										})
									);
								} catch (e) {}
								try {
									saveManager.saveGame({ auto: true });
								} catch (e) {}
							}
						} catch (err) {
							console.warn('Failed to grant Craft skill', err);
						}
						showReply(
							'Craft is the bridge between imagination and creation, built with innovation. [You learned Craft]',
							[{ text: 'I will certainly build something great', trait: null }]
						);
						return;
					}
				} catch (err) {
					console.warn('Issac special handling failed', err);
				}
			}

			// Holly-specific conversation handling
			if (npcKey === 'Holly' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'buy-sell-repair' || id === 'buy-sell') {
						showReply('Open the buy / sell window', [{ text: 'Close', trait: null }]);
						return;
					}
					if (id === 'about-jenny') {
						showReply(
							'Yes, I know her. The pretty young girl working at the tavern. She is a regular here.',
							[{ text: 'Makes sense', trait: null }]
						);
						return;
					}
					if (id === 'about-maple') {
						showReply(
							'I am not bragging but my grand daughter is a genius when it comes to mixing potions.',
							[{ text: 'I see', trait: null }]
						);
						return;
					}
					if (id === 'apprenticeship') {
						showReply("Sorry but no. I don't take students!", [
							{ text: 'Sorry for asking', trait: null }
						]);
						return;
					}
					if (id === 'heard-rumors') {
						showReply(
							"Not going to lie, but my ears ain't as good as they used to at this day and age.",
							[{ text: 'I am sorry to hear that', trait: null }]
						);
						return;
					}
				} catch (err) {
					console.warn('Holly special handling failed', err);
				}
			}

			// Maple-specific conversation handling
			if (npcKey === 'Maple' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'buy-sell-repair') {
						showReply('Open the buy / sell window', [{ text: 'Close', trait: null }]);
						return;
					}
					if (id === 'learn-tinkerer-skills') {
						try {
							// If the player already knows Magic Exoskeleton, refuse to give it again
							const gs = get(gameState) || {};
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? { id: def.id, name: def.name, level: def.level || 1 }
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHas = normalized.some(
								(s) =>
									s && (s.id === 'tinkerer_magic_exoskeleton' || s.name === 'Magic Exoskeleton')
							);
							if (alreadyHas) {
								showReply("No, you can't take the same drug again.", [
									{ text: 'I will come back when you make a different one', trait: null }
								]);
							} else {
								// Maple: short flavour line and a single confirmation choice
								showReply(
									"Don't let the herbs fool you. I'm an apothecary by trade, but a tinkerer at heart.",
									[
										{
											id: 'maple-teach-confirm',
											text: 'I look forward to your guidance',
											trait: null
										}
									]
								);
							}
						} catch (err) {
							console.warn('Learn tinkerer skills (Maple) failed', err);
						}
						return;
					}

					// Confirm and grant Maple's Tinkerer skill when interacting with Maple
					if (id === 'maple-teach-confirm') {
						try {
							const gs = get(gameState) || {};
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? {
												id: def.id,
												name: def.name,
												level: def.level || 1,
												description: def.description,
												icon: def.icon
											}
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHas = normalized.some(
								(s) =>
									s && (s.id === 'tinkerer_magic_exoskeleton' || s.name === 'Magic Exoskeleton')
							);
							if (!alreadyHas) {
								const def = skillsDb.find((s) => s.id === 'tinkerer_magic_exoskeleton');
								const skillObj = def
									? {
											id: def.id,
											name: def.name,
											level: def.level || 1,
											description: def.description,
											icon: def.icon
										}
									: { id: 'tinkerer_magic_exoskeleton', name: 'Magic Exoskeleton', level: 1 };
								const newSkills = normalized.concat([skillObj]);
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), skills: newSkills }
								}));
								try {
									window.dispatchEvent(
										new CustomEvent('toast', {
											detail: { message: 'You learned Magic Exoskeleton!', type: 'success' }
										})
									);
								} catch (e) {}
								try {
									saveManager.saveGame({ auto: true });
								} catch (e) {}
							}
						} catch (err) {
							console.warn('Failed to grant magic exoskeleton', err);
						}
						showReply(
							"This drug's effect is permanent. It reinforced your body with magic circuit. [You learned Magic Exoskeleton]",
							[{ text: 'I feel great', trait: null }]
						);
						return;
					}
					if (id === 'about-mogi') {
						showReply('She is a good friend of mine.', [{ text: 'Makes sense', trait: null }]);
						return;
					}
					if (id === 'about-holly') {
						showReply('Granny is old, but her skills are still the best!', [
							{ text: 'I see', trait: null }
						]);
						return;
					}
					if (id === 'apprenticeship') {
						try {
							// Check if player already apprenticed to this mentor
							const gs = get(gameState) || {};
							const apprentices =
								gs.character && Array.isArray(gs.character.apprenticeships)
									? gs.character.apprenticeships
									: [];
							const existing = apprentices.find(
								(a) => (a.mentor === npcKey || a.mentor === inHubConversationData.name) && a.active
							);
							if (existing) {
								showReply(
									'You are currently apprenticed here. Would you like to attend your session now or quit?',
									[
										{ id: 'attend-session', text: 'Attend session', trait: null },
										{ id: 'apprentice-quit', text: 'Quit apprenticeship', trait: null },
										{
											id: 'learn-tinkerer-skills',
											text: 'Learn about Tinkerer Skills',
											trait: null
										},
										{ text: 'Cancel', trait: null }
									]
								);
								return;
							}
							showReply(
								"I don't think I am good enough to teach. But if you are a Tinkerer, would you mind spending some time with me daily to study about using alchemy products as weapons?",
								[
									{ id: 'apprentice-yes', text: 'Yes', trait: null },
									{ id: 'apprentice-no', text: 'No', trait: null }
								]
							);
							return;
						} catch (err) {
							console.warn('Maple apprenticeship handling failed', err);
							showReply('Something went wrong.', [{ text: 'Close', trait: null }]);
							return;
						}
					}
					if (id === 'apprentice-yes') {
						// Present time slot choices for Maple
						showReply('Choose a daily time slot for apprenticeship:', [
							{ id: 'slot-maple-12', text: '12:00 - 13:59', trait: null },
							{ id: 'slot-maple-22', text: '22:00 - 23:59', trait: null }
						]);
						return;
					}
					if (id === 'apprentice-no') {
						showReply('Okay, maybe another time.', [{ text: 'Close', trait: null }]);
						return;
					}
					if (id === 'slot-maple-12' || id === 'slot-maple-22') {
						try {
							const gs = get(gameState) || {};
							const rawClass = gs.character && (gs.character.class || gs.character.job || '');
							if (String(rawClass).toLowerCase() !== 'tinkerer') {
								showReply('You need to be a Tinkerer to become my apprentice.', [
									{ text: 'Close', trait: null }
								]);
								return;
							}
							// Prevent changing slot if player already has an active apprenticeship with this mentor
							const existingAp =
								gs.character && Array.isArray(gs.character.apprenticeships)
									? gs.character.apprenticeships.find(
											(a) =>
												(a.mentor === npcKey || a.mentor === inHubConversationData.name) && a.active
										)
									: null;
							if (existingAp) {
								showReply(
									'You already have a scheduled apprenticeship with me — quit first if you want to change the slot.',
									[{ text: 'Close', trait: null }]
								);
								return;
							}
							const hour = id === 'slot-maple-12' ? 12 : 22;
							const apprenticeship = {
								// store mentor as npcKey (prefer id) for stability; fallback matching keeps legacy names supported
								mentor: npcKey || inHubConversationData.name,
								location:
									(inHubConversationData.meta && inHubConversationData.meta.sourceLocation) ||
									gs.location ||
									null,
								slotStartHour: hour,
								dailyHours: 2,
								active: true,
								lastSession: null
							};
							gameState.update((s) => ({
								...(s || {}),
								character: {
									...(s && s.character ? s.character : {}),
									apprenticeships: [
										...((s && s.character && s.character.apprenticeships) || []),
										apprenticeship
									]
								}
							}));
							try {
								saveSlotsManager.autoSave && saveSlotsManager.autoSave();
							} catch (e) {
								/* non-fatal */
							}
							// Rebuild badge state immediately so UI reflects the new apprenticeship without waiting for the interval
							try {
								_checkApprenticeshipsAutoProcess && _checkApprenticeshipsAutoProcess();
							} catch (e) {
								/* ignore */
							}
							showReply("You're signed up for apprenticeship. Attend daily at the chosen time.", [
								{ text: 'Close', trait: null }
							]);
							// For apprenticeship final acknowledgement, clear the saved previous menu so
							// the top Close choice does not restore the time-slot selection.
							try {
								if (inHubConversationData) inHubConversationData.previous = null;
							} catch (e) {
								/* ignore */
							}
							return;
						} catch (err) {
							console.warn('Maple slot handling failed', err);
							showReply('Something went wrong.', [{ text: 'Close', trait: null }]);
							return;
						}
					}
					if (id === 'apprentice-no') {
						showReply('Sorry, you have to be a Tinkerer', [{ text: 'Close', trait: null }]);
						return;
					}

					if (id === 'apprentice-quit') {
						// confirmation before quitting
						showReply(
							'Are you sure you want to quit this apprenticeship? You will need to re-join to change slots.',
							[
								{ id: 'confirm-apprentice-quit-maple', text: 'Yes, quit', trait: null },
								{ text: 'Cancel', trait: null }
							]
						);
						return;
					}

					if (id === 'confirm-apprentice-quit-maple') {
						try {
							const gs = get(gameState) || {};
							const ap =
								gs.character && Array.isArray(gs.character.apprenticeships)
									? gs.character.apprenticeships.slice()
									: [];
							const updated = ap.map((a) =>
								a.mentor === npcKey || a.mentor === inHubConversationData.name
									? { ...a, active: false }
									: a
							);
							gameState.update((s) => ({
								...(s || {}),
								character: { ...(s && s.character ? s.character : {}), apprenticeships: updated }
							}));
							try {
								saveSlotsManager.autoSave && saveSlotsManager.autoSave();
							} catch {}
							// Rebuild badge state immediately to remove the apprenticeship badge
							try {
								_checkApprenticeshipsAutoProcess && _checkApprenticeshipsAutoProcess();
							} catch (e) {
								/* ignore */
							}
							showReply('You have ended the apprenticeship.', [{ text: 'Close', trait: null }]);
							// Prevent restoring to the prior apprentice confirmation menu when quitting.
							try {
								if (inHubConversationData) inHubConversationData.previous = null;
							} catch (e) {
								/* ignore */
							}
							return;
						} catch (err) {
							console.warn('Failed to quit apprenticeship (Maple)', err);
							showReply('Something went wrong.', [{ text: 'Close', trait: null }]);
							return;
						}
					}

					// Attend session handler for Maple (same logic as Issac)
					if (id === 'attend-session') {
						try {
							const now = serverNow();
							const gs = get(gameState) || {};
							const ap =
								gs.character && Array.isArray(gs.character.apprenticeships)
									? gs.character.apprenticeships.find(
											(a) =>
												(a.mentor === npcKey || a.mentor === inHubConversationData.name) && a.active
										)
									: null;
							if (!ap) {
								showReply('You are not apprenticed here.', [{ text: 'Close', trait: null }]);
								return;
							}
							const slotHour = ap.slotStartHour;
							if (typeof slotHour !== 'number') {
								showReply('Your apprenticeship does not have a scheduled slot.', [
									{ text: 'Close', trait: null }
								]);
								return;
							}
							const d = new Date(now);
							const sessionStart = new Date(
								d.getFullYear(),
								d.getMonth(),
								d.getDate(),
								slotHour,
								0,
								0
							).getTime();
							const sessionEnd = sessionStart + (ap.dailyHours || 2) * 60 * 60 * 1000;
							if (now < sessionStart || now > sessionEnd) {
								showReply('It is not your apprenticeship time right now.', [
									{ text: 'Close', trait: null }
								]);
								return;
							}
							// Check for skipping: if any active quest overlaps sessionStart
							const quests =
								gs.character && Array.isArray(gs.character.quests) ? gs.character.quests : [];
							const skipped = quests.some(
								(q) => (q.startTime || 0) < sessionStart && (q.endTime || 0) > sessionStart
							);
							if (skipped) {
								gameState.update((s) => {
									const list =
										s.character && Array.isArray(s.character.apprenticeships)
											? s.character.apprenticeships.map((a) =>
													a.mentor === ap.mentor
														? { ...a, lastSession: { at: now, skipped: true } }
														: a
												)
											: (s.character && s.character.apprenticeships) || [];
									return {
										...(s || {}),
										character: { ...(s.character || {}), apprenticeships: list }
									};
								});
								showReply(
									'You skipped class due to an active quest. No apprenticeship rewards were granted for this session.',
									[{ text: 'Close', trait: null }]
								);
								try {
									saveSlotsManager.autoSave && saveSlotsManager.autoSave();
								} catch {}
								return;
							}
							// Award craft point depending on mentor (Issac -> mainWeapon, Maple -> subWeapon)
							gameState.update((s) => {
								const cp =
									s.character && s.character.craftPoints
										? { ...s.character.craftPoints }
										: { mainWeapon: 0, subWeapon: 0 };
								if (npcKey === 'Issac') cp.mainWeapon = (cp.mainWeapon || 0) + 1;
								if (npcKey === 'Maple') cp.subWeapon = (cp.subWeapon || 0) + 1;
								const list =
									s.character && Array.isArray(s.character.apprenticeships)
										? s.character.apprenticeships.map((a) =>
												a.mentor === ap.mentor
													? { ...a, lastSession: { at: now, skipped: false } }
													: a
											)
										: (s.character && s.character.apprenticeships) || [];
								return {
									...(s || {}),
									character: { ...(s.character || {}), apprenticeships: list, craftPoints: cp }
								};
							});
							try {
								saveSlotsManager.autoSave && saveSlotsManager.autoSave();
							} catch {}
							showReply('Session complete — you gained a craft point.', [
								{ text: 'Close', trait: null }
							]);
							return;
						} catch (err) {
							console.warn('Maple attend-session failed', err);
							showReply('Something went wrong.', [{ text: 'Close', trait: null }]);
							return;
						}
					}
					if (id === 'heard-rumors') {
						showReply("Sorry, I don't pay much attention to rumors…", [
							{ text: "That's fascinating", trait: null }
						]);
						return;
					}
				} catch (err) {
					console.warn('Maple special handling failed', err);
				}
			}

			// Mogi-specific conversation handling
			if (npcKey === 'Mogi' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'ask-jenny') {
						showReply('I am sorry, Jenny is working on another shift.', [
							{ text: 'Makes sense', trait: null }
						]);
						return;
					}
					if (id === 'how-much-rent') {
						showReply('It cost 5 silver per day. Meals not included.', [
							{ text: 'I see', trait: null }
						]);
						return;
					}
					if (id === 'about-town') {
						showReply("Mirror's Repose is a quiet but merry town. Hope you enjoy your stay.", [
							{ text: 'Thank you', trait: null }
						]);
						return;
					}
					if (id === 'about-shops') {
						showReply(
							"Maybe you should drop by Swill n' Swing… Yes, I know the name sounds weird. But it is an apothecary shop.",
							[{ text: 'Thank you', trait: null }]
						);
						// Unlock Swill n' Swing for this character so it appears in navigation
						try {
							const gs = get(gameState) || {};
							const ch = gs.character || {};
							const unlocked = Array.isArray(ch.unlockedPlaces) ? ch.unlockedPlaces.slice() : [];
							if (!unlocked.includes('swill-n-swing')) {
								unlocked.push('swill-n-swing');
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), unlockedPlaces: unlocked }
								}));
							}
						} catch (e) {
							console.warn("Failed to unlock Swill n' Swing", e);
						}
						return;
					}
					if (id === 'heard-rumors') {
						showReply(
							"Hm… I am not sure sure what kind of rumors are you interested in. Drunkard's tales might not have much credibility. But you can try talk to Kane",
							[{ text: 'I see what you mean', trait: null }]
						);
						// unlock Kane so he can appear in Crab & Claw
						try {
							gameState.update((s) => ({
								...(s || {}),
								character: { ...(s.character || {}), metKane: true }
							}));
							const gs = get(gameState) || {};
							if (gs.location === 'crab-and-claw') {
								const currentNpcs = Array.isArray(gs.locationNPCs) ? gs.locationNPCs.slice() : [];
								const already = currentNpcs.some((n) => n && n.name === 'Kane');
								if (!already) {
									currentNpcs.push({
										name: 'Kane',
										snippet:
											"Hey... buddy. Pal. We're pals, right? Pals buy pals drinks. It's a... a rule...",
										conversationScene: null,
										npcPortrait: '/Images/NPC/npc-kane.PNG'
									});
									gameState.update((s) => ({ ...(s || {}), locationNPCs: currentNpcs }));
								}
							}
						} catch (e) {
							console.warn('Failed to unlock Kane', e);
						}
						return;
					}
				} catch (err) {
					console.warn('Mogi special handling failed', err);
				}
			}

			// Jenny-specific conversation handling
			if (npcKey === 'Jenny' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'ask-mogi') {
						showReply(
							'Oh, she is on another shift. Why looking for Mogi when I am here right in front of you?',
							[{ text: 'Sorry, I am just curious', trait: null }]
						);
						return;
					}
					if (id === 'ask-warrior-archer') {
						showReply('Yes, if you are buying me a drink', [
							{ id: 'ask-warrior', text: 'Ask about Warrior (1 silver)', trait: null },
							{ id: 'ask-archer', text: 'Ask about Archer (1 silver)', trait: null }
						]);
						showInHubConversation = true;
						return;
					}
					if (id === 'ask-warrior') {
						const ok = deductSilver(1);
						if (ok) {
							showReply(
								'Talk to Captain York, he is the captain of guard for this town. He comes here every night, sometimes even during the day.',
								[{ text: 'Thank you', trait: null }]
							);
							// Mark Captain York as known/unlocked so he appears in the Crab & Claw NPC list
							try {
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), metCaptainYork: true }
								}));
								// If the player is currently at the Crab & Claw, add Captain York to the active location NPCs so he appears immediately
								try {
									const gs = get(gameState) || {};
									if (gs.location === 'crab-and-claw') {
										const currentNpcs = Array.isArray(gs.locationNPCs)
											? gs.locationNPCs.slice()
											: [];
										const already = currentNpcs.some(
											(n) => n && n.name === 'Captain York the Warrior'
										);
										if (!already) {
											currentNpcs.push({
												name: 'Captain York the Warrior',
												snippet:
													"I am the town guards' Captain, York is the name. How can I help you?",
												conversationScene: null,
												npcPortrait: '/Images/NPC/npc-captain-york.PNG'
											});
											gameState.update((s) => ({ ...(s || {}), locationNPCs: currentNpcs }));
										}
									}
								} catch (e2) {
									console.warn('Failed to add Captain York to locationNPCs', e2);
								}
							} catch (e) {
								console.warn('Failed to mark metCaptainYork', e);
							}
						} else {
							showReply("You don't have enough silver for a drink!", [
								{ text: 'Oh well', trait: null }
							]);
						}
						return;
					}
					if (id === 'ask-archer') {
						const ok = deductSilver(1);
						if (ok) {
							showReply(
								'Talk to Matt, he is a seasoned archer in this town. Just between us, he shows up more and more during the day lately. Maybe he got a thing for Mogi.',
								[{ text: 'Thank you', trait: null }]
							);
							// Mark Matt as known/unlocked so he appears in the Crab & Claw NPC list
							try {
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), metMatt: true }
								}));
								// If the player is currently at the Crab & Claw, add Matt to the active location NPCs so he appears immediately
								try {
									const gs = get(gameState) || {};
									if (gs.location === 'crab-and-claw') {
										const currentNpcs = Array.isArray(gs.locationNPCs)
											? gs.locationNPCs.slice()
											: [];
										const already = currentNpcs.some((n) => n && n.name === 'Matt the Archer');
										if (!already) {
											currentNpcs.push({
												name: 'Matt the Archer',
												snippet:
													'Hello there! I am Matthew, just call me Matt. Everyone here call me that. No one really call me Matthew - in full I mean. But yeah, go ahead if you want to call me in full, as in like Matthew (and on he goes)...',
												conversationScene: null,
												npcPortrait: '/Images/NPC/npc-matt.PNG'
											});
											gameState.update((s) => ({ ...(s || {}), locationNPCs: currentNpcs }));
										}
									}
								} catch (e2) {
									console.warn('Failed to add Matt to locationNPCs', e2);
								}
							} catch (e) {
								console.warn('Failed to mark metMatt', e);
							}
						} else {
							showReply("You don't have enough silver for a drink!", [
								{ text: 'Oh well', trait: null }
							]);
						}
						return;
					}
					if (id === 'about-town') {
						showReply(
							"Well, it doesn't have much since it is a small town. But we got everything we need! From the best brews to beautiful ladies and handsome gents.",
							[{ text: 'I totally agree', trait: null }]
						);
						return;
					}
					if (id === 'about-shops') {
						showReply(
							"You definitely want to check out Swill n' Swing. They have the best cure for hangovers.",
							[{ text: 'Thank you', trait: null }]
						);
						// Unlock Swill n' Swing for this character so it appears in navigation
						try {
							const gs = get(gameState) || {};
							const ch = gs.character || {};
							const unlocked = Array.isArray(ch.unlockedPlaces) ? ch.unlockedPlaces.slice() : [];
							if (!unlocked.includes('swill-n-swing')) {
								unlocked.push('swill-n-swing');
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), unlockedPlaces: unlocked }
								}));
							}
						} catch (e) {
							console.warn("Failed to unlock Swill n' Swing", e);
						}
						return;
					}
					if (id === 'heard-rumors') {
						showReply('Buy me a drink sometimes, I might tell you some… and more', [
							{ text: 'I will', trait: null }
						]);
						return;
					}
				} catch (err) {
					console.warn('Jenny special handling failed', err);
				}
			}

			// Xia/Chris reception handling (quest receptionist)
			if (
				inHubConversationData &&
				(npcKey === 'Xia' || npcKey === 'Chris' || npcKey === 'Inil' || npcKey === 'Kendra' || npcKey === 'Ron' || npcKey === 'Hana') &&
				choice &&
				choice.id
			) {
				try {
					const id = choice.id;
					if (id === 'check-available-quests') {
						const has = get(hasActiveQuest);
						const canAccept = canAcceptQuest('dummy', 'dummy', has); // Check if can accept any quest
						if (!canAccept) {
							const reason = getQuestBlockReason('dummy', 'dummy', has);
							showReply(reason || 'You cannot accept quests right now.', [
								{ text: 'Thank you', trait: null }
							]);
						} else {
							showQuestBoard = true;
							showInHubConversation = false;
						}
						return;
					}
					if (id === 'submit-completed-quest') {
						const active = get(questStore);
						// If active quest exists and is completed, open the Quests panel
						if (active && active.status === 'completed' && active.result === 'success') {
							questsAllowLocalActions = true;
							showQuests = true;
							showInHubConversation = false;
							return;
						}

						// Otherwise try to find a completed quest in persisted character.quests
						try {
							const gs = get(gameState) || {};
							const ch = gs.character || {};
							const list = Array.isArray(ch.quests) ? ch.quests : [];
							const completed = list.find((q) => q && q.status === 'completed');
							if (completed) {
								questsAllowLocalActions = true;
								showQuests = true;
								showInHubConversation = false;
								return;
							}
						} catch (e) {
							console.warn('Failed to check persisted quests for completion', e);
						}

						showReply('You have no completed quests to submit.', [
							{ text: 'Thank you', trait: null }
						]);
						return;
					}
					if (id === 'give-up-quest') {
						const active = get(questStore);
						if (!active) {
							showReply('You have no active quest to give up.', [
								{ text: 'Thank you', trait: null }
							]);
						} else {
							// Open the main Quests panel with local actions enabled so the player can give up the quest
							questsAllowLocalActions = true;
							showQuests = true;
							showInHubConversation = false;
						}
						return;
					}
					if (id === 'looking-for-party') {
						showReply('Sorry, but party mode is not available yet.', [
							{ text: 'Thank you', trait: null }
						]);
						return;
					}
					if (id === 'heard-rumors') {
						// Present the quests submenu for the receptionist
						showReply('Happy to assist you. What do you want to know?', [
							{ id: 'about-daily-quests', text: 'About Daily Quests', trait: null },
							{ id: 'about-beginner-quests', text: 'About Beginner Quests', trait: null },
							{ id: 'about-guild-quests', text: 'About Guild Quests', trait: null },
							{ id: 'about-monster-drops', text: 'About Monster Drops', trait: null }
						]);
						return;
					}

					// Submenu handlers for receptionist 'About quests'
					if (id === 'about-daily-quests') {
						showReply('There are 5 daily quests, but you can only choose one. They refresh the next day.', [
							{ text: 'Thanks', trait: null }
						]);
						return;
					}
					if (id === 'about-beginner-quests') {
						showReply("Beginner quests are short, combat-free tasks perfect for new adventurers. They're a great way to learn the basics and earn starter rewards, though the payouts are smaller.", [
							{ text: 'Thanks', trait: null }
						]);
						return;
					}
					if (id === 'about-guild-quests') {
						showReply("Guild quests are typically combat-focused and offer better rewards in exchange for higher danger and difficulty. They become available once you've gained some experience, but they require at least basic equipment.", [
							{ text: 'Thanks', trait: null }
						]);
						return;
					}
					if (id === 'about-monster-drops') {
						showReply(
							"Crystallized stone fragments can be obtained from defeated monsters. More powerful monsters drop larger, more refined fragments, which are graded from E to S—mirroring the ranking system for adventurers and monsters. These fragments can be exchanged for skill improvements.",
							[{ text: 'Thanks', trait: null }]
						);
						return;
					}
				} catch (err) {
					console.warn('Reception handling failed', err);
				}
			}

			// Alexa-specific conversation handling (Guild Hall)
			if (npcKey === 'Alexa' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'ask-alexi') {
						showReply(
							"Sorry if Alexi said anything rude to you. She is still having a tough time dealing with her powers. Her powers are rather complicated. You can either find her here or she will be at Familiar's Folly.",
							[{ text: 'I might drop by there later', trait: null }]
						);
						// Unlock Familiar's Folly when asking Alexa about Alexi
						try {
							const gs = get(gameState) || {};
							const ch = gs.character || {};
							const unlocked = Array.isArray(ch.unlockedPlaces) ? ch.unlockedPlaces.slice() : [];
							if (!unlocked.includes('familiars-folly')) {
								unlocked.push('familiars-folly');
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), unlockedPlaces: unlocked }
								}));
							}
						} catch (e) {
							console.warn("Failed to unlock Familiar's Folly", e);
						}
						return;
					}
					if (id === 'ask-quests') {
						showReply('Please talk to Chris or Xia at the reception counter about them.', [
							{ text: 'Thank you', trait: null }
						]);
						return;
					}
					if (id === 'about-town') {
						showReply(
							'It is our duty as adventurers to protect and to serve our town. Take pride in that.',
							[{ text: 'Yes. I will do my best', trait: null }]
						);
						return;
					}
					if (id === 'about-shops') {
						showReply(
							"We don't have a variety of shops here but I am sure you can find what you need.",
							[{ text: 'I hope so', trait: null }]
						);
						return;
					}
					if (id === 'ask-about-skills') {
						showReply('What skills are you interested in?', [
							{ id: 'skill-warrior', text: 'Warrior skills', trait: null },
							{ id: 'skill-archer', text: 'Archer skills', trait: null },
							{ id: 'skill-rogue', text: 'Rogue skills', trait: null },
							{ id: 'skill-mage', text: 'Mage skills', trait: null },
							{ id: 'skill-acolyte', text: 'Acolyte skills', trait: null },
							{ id: 'skill-tinkerer', text: 'Tinkerer skills', trait: null }
						]);
						return;
					}
					if (id === 'skill-warrior') {
						showReply('Try asking Jenny, I think she knows someone.', [
							{ text: 'Thank you', trait: null }
						]);
						return;
					}
					if (id === 'skill-archer') {
						showReply('Try asking Jenny, I think she knows someone.', [
							{ text: 'Thank you', trait: null }
						]);
						return;
					}
					if (id === 'skill-rogue') {
						showReply(
							"Tough question. You don't find a rogue unless the rogue wants to be found.",
							[{ text: "That's true...", trait: null }]
						);
						return;
					}
					if (id === 'skill-mage') {
						showReply('You already met her.', [{ text: 'Alexi?', trait: null }]);
						return;
					}
					if (id === 'skill-acolyte') {
						showReply('Carissa might know something.', [{ text: 'Thank you', trait: null }]);
						return;
					}
					if (id === 'skill-tinkerer') {
						showReply('Talk to Issac and Maple, they are your best bet.', [
							{ text: 'Thank you', trait: null }
						]);
						return;
					}
				} catch (err) {
					console.warn('Alexa special handling failed', err);
				}
			}

			// Alexi-specific conversation handling (Guild Hall)
			if (npcKey === 'Alexi' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'ask-alexa') {
						showReply('Alexa is the older sister. Ask her yourself if you want to know more.', [
							{ text: 'Sure', trait: null }
						]);
						return;
					}
					if (id === 'ask-quests') {
						showReply("I only conduct ritual for first timers, I don't run the guild.", [
							{ text: 'Guess I was mistaken', trait: null }
						]);
						return;
					}
					if (id === 'about-town') {
						showReply(
							'The town is a nice place. You should really go walk around and greet the townfolks. No point holed yourself up in here.',
							[{ text: 'I see what you mean', trait: null }]
						);
						return;
					}
					if (id === 'about-shops') {
						showReply(
							"If you need magic related items, go and visit Familiar's Folly. I spend a lot of time there myself.",
							[{ text: 'Thank you', trait: null }]
						);
						// Unlock Familiar's Folly when Alexi mentions it
						try {
							const gs = get(gameState) || {};
							const ch = gs.character || {};
							const unlocked = Array.isArray(ch.unlockedPlaces) ? ch.unlockedPlaces.slice() : [];
							if (!unlocked.includes('familiars-folly')) {
								unlocked.push('familiars-folly');
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), unlockedPlaces: unlocked }
								}));
							}
						} catch (e) {
							console.warn("Failed to unlock Familiar's Folly", e);
						}
						return;
					}
					if (id === 'ask-mage-skill') {
						const gs = get(gameState) || {};
						const playerClass = gs.character?.class;
						// Prefer playerData.level as it is the source of truth for leveling
						const playerLevel = Number(gs.playerData?.level || gs.character?.level || 0);
						
						if (playerClass === 'mage') {
							// Normalize existing skills and check for mage_magic_barrier
							const ch = gs.character || {};
							const existing = Array.isArray(ch.skills) ? ch.skills.slice() : [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? { id: def.id, name: def.name, level: def.level || 1 }
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const hasMagicBarrier = normalized.some(
								(s) => s && (s.id === 'mage_magic_barrier' || s.name === 'Magic Barrier')
							);
							const hasSummon = normalized.some(
								(s) => s && ['mage_ifrit', 'mage_nereid', 'mage_verdure', 'mage_zephyr'].includes(s.id)
							);

							if (!hasMagicBarrier) {
								// Offer Magic Barrier first
								showReply("Your defense is weak. I'll fix that. Pay attention.", [
									{ id: 'mage-teach-confirm', text: 'Yes, teach me please', trait: null }
								]);
							} else if (gs.character && gs.character.alexiTaughtElement && hasSummon) {
								// Already taught and has skill
								showReply("I have already helped you find your element. Trust in it.", [
									{ text: 'I will', trait: null }
								]);
							} else if (playerLevel >= 5) {
								// If they have Magic Barrier AND are level 5+, offer Element
								showReply(
									"I think it's about time... It's not a skill, precisely. It's more like you getting your own element.",
									[ { id: 'element-what', text: 'My own element?', trait: null } ]
								);
							} else {
								// Otherwise, not ready
								showReply(`You aren't ready. You need to be at least level 5. (Current: ${playerLevel})`, [
									{ text: 'I will come back again when I am', trait: null }
								]);
							}
						} else {
							showReply('There is nothing I can teach you.', [
								{ text: 'Sorry for asking', trait: null }
							]);
						}
						return;
					}

					// Player asked "My own element?" - present choices
					if (id === 'element-what') {
						showReply(
							"Yes. You are ready to call upon an elemental spirit and let its power flow into your magic. Choose one of the four primordial forces. Choose wisely.",
							[
								{ id: 'choose-element-ifrit', text: 'Ifrit, the Fire', trait: null },
								{ id: 'choose-element-nereid', text: 'Nereid, the Water', trait: null },
								{ id: 'choose-element-verdure', text: 'Verdure, the Earth', trait: null },
								{ id: 'choose-element-zephyr', text: 'Zephyr, the Air', trait: null }
							]
						);
						return;
					}

					// Handle element selection and ask for confirmation
					if (id && id.indexOf && id.indexOf('choose-element-') === 0) {
						const gs = get(gameState) || {};
						const parts = id.split('-');
						const el = parts.slice(2).join('-');
						const nameMap = { ifrit: 'Ifrit', nereid: 'Nereid', verdure: 'Verdure', zephyr: 'Zephyr' };
						const elName = nameMap[el] || el;
						try {
							if (inHubConversationData) inHubConversationData.tempChosenElement = el;
						} catch (e) {}
						showReply(`Are you sure ${gs.character?.name || ''}, the ${elName}, is your choice?`, [
							{ id: 'confirm-element-yes', text: 'Yes', trait: null },
							{ id: 'confirm-element-no', text: 'No', trait: null }
						]);
						return;
					}

					// If player says No, go back to selection
					if (id === 'confirm-element-no') {
						showReply(
							'Choose again.',
							[
								{ id: 'choose-element-ifrit', text: 'Ifrit, the Fire', trait: null },
								{ id: 'choose-element-nereid', text: 'Nereid, the Water', trait: null },
								{ id: 'choose-element-verdure', text: 'Verdure, the Earth', trait: null },
								{ id: 'choose-element-zephyr', text: 'Zephyr, the Air', trait: null }
							]
						);
						return;
					}

					// Confirm and grant the element (yes)
					if (id === 'confirm-element-yes') {
						try {
							const gs = get(gameState) || {};
							const el = inHubConversationData && inHubConversationData.tempChosenElement ? inHubConversationData.tempChosenElement : null;
							const nameMap = { ifrit: 'Ifrit', nereid: 'Nereid', verdure: 'Verdure', zephyr: 'Zephyr' };
							const elName = el ? nameMap[el] || el : 'Element';
							// determine zodiac sign from dob
							const dob = gs.character && gs.character.dob ? new Date(gs.character.dob) : null;
							function getZodiac(date) {
								if (!date || isNaN(date.getTime())) return null;
								const m = date.getMonth() + 1;
								const d = date.getDate();
								if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Aries';
								if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Taurus';
								if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'Gemini';
								if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'Cancer';
								if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Leo';
								if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Virgo';
								if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'Libra';
								if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'Scorpio';
								if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Sagittarius';
								if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Capricorn';
								if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Aquarius';
								if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return 'Pisces';
								return null;
							}
							const zodiac = getZodiac(dob);
							const elementGroups = {
								fire: ['Aries', 'Leo', 'Sagittarius'],
								earth: ['Taurus', 'Virgo', 'Capricorn'],
								air: ['Gemini', 'Libra', 'Aquarius'],
								water: ['Cancer', 'Scorpio', 'Pisces']
							};
							const chosenGroup = el === 'ifrit' ? 'fire' : el === 'nereid' ? 'water' : el === 'verdure' ? 'earth' : el === 'zephyr' ? 'air' : null;
							const matches = chosenGroup && zodiac ? (elementGroups[chosenGroup] || []).includes(zodiac) : false;
							// Resolve skill ids
							const baseId = el ? `mage_${el}` : null;
							const advId = el ? `mage_${el}_adv` : null;
							
							// Grant the BEST skill immediately (Base or Advanced)
							const grantId = matches && advId ? advId : baseId;
							
							// Grant skill object (preserve existing normalization behavior)
							const existing = gs.character && Array.isArray(gs.character.skills) ? gs.character.skills.slice() : [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? { id: def.id, name: def.name, level: def.level || 1, description: def.description, icon: def.icon }
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const def = grantId ? skillsDb.find((s) => s.id === grantId) : null;
							const skillObj = def
								? { id: def.id, name: def.name, level: def.level || 1, description: def.description, icon: def.icon }
								: grantId
								? { id: grantId, name: elName, level: 1 }
								: null;
							if (skillObj) {
								// If granting advanced, remove the base skill first (if it exists)
								let filteredSkills = normalized;
								if (grantId === advId) {
									filteredSkills = normalized.filter(s => s.id !== baseId);
								}
								const newSkills = filteredSkills.concat([skillObj]);
								// persist chosen element flag and chosen skill
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), skills: newSkills, alexiTaughtElement: true, alexiChosenElement: grantId }
								}));
								// Toast will be shown after the element-adv animation completes by the UI overlay
								try {
									saveManager.saveGame({ auto: true });
								} catch (e) {}
							}

							// Trigger animation / video for both Base and Advanced cases
							try {
								const baseDef = skillsDb.find((s) => s.id === baseId);
								const baseIcon = baseDef ? baseDef.icon : `/Images/${elName}.png`;
								const advDef = advId ? skillsDb.find((s) => s.id === advId) : null;
								const advIcon = (matches && advDef && advDef.icon) ? advDef.icon : `/Images/${elName} adv.png`;
								
								// Prepare paths
								const normalVideoFile = `Summon ${elName}.mp4`;
								const advVideoFile = `Summon ${elName} Adv.mp4`;
								const normalVideoPath = `/Images/Skills/Mage/${normalVideoFile}`;
								const advVideoPath = `/Images/Skills/Mage/${advVideoFile}`;

								// 1. Play Normal Video IMMEDIATELY (Step 2)
								window.dispatchEvent(new CustomEvent('element-adv', { 
									detail: { 
										baseIcon, 
										advIcon: baseIcon, // Show base icon only for now
										name: elName,
										isAdvanced: false, // Treat as base summon
										video: normalVideoPath
									} 
								}));

								// Prepare Advanced detail for later if compatible
								if (matches && inHubConversationData) {
									inHubConversationData.pendingVideo = { 
										baseIcon, 
										advIcon, 
										name: elName,
										isAdvanced: true,
										video: advVideoPath
									};
									inHubConversationData.pendingElName = elName;
									inHubConversationData.pendingAdvId = advId;
									inHubConversationData.pendingBaseId = baseId;
								}
							} catch (e) {
								console.warn('Failed to dispatch element-adv event', e);
							}

							const lectureText = 'To cultivate a potent pact with an elemental spirit, you must engage in disciplined communion and respectful stewardship. Understand this: an elemental is not a familiar to be commanded, nor a pet to be indulged. It is a sovereign consciousness of ancient power. The quality of your spiritual connection—forged through attunement, mutual respect, and genuine understanding—forms the very foundation of the covenant. This foundation dictates not only the stability of the pact but, more critically, the magnitude of primordial force the spirit will deign to channel through you. Neglect this bond, and you will find yourself with a brittle agreement, or worse, a conduit to power that will swiftly turn against you.';

							// UI text
							if (matches) {
								// Compatible: Lecture -> Yes -> Surprise -> Huh -> Adv Video -> End
								showReply(lectureText, [
									{ id: 'mage-element-surprise', text: 'Yes, I will', trait: null }
								]);
								// Disable close button during lecture for compatible path to prevent skipping the surprise
								if (inHubConversationData) {
									inHubConversationData.disableClose = true;
								}
								// Show toast for skill immediately
								try {
									window.dispatchEvent(new CustomEvent('toast', { detail: { message: `You learned ${skillObj.name}!`, type: 'success' } }));
								} catch (e) {}
							} else {
								// Non-compatible: Lecture -> Yes -> End
								showReply(lectureText, [
									{ id: 'mage-element-end', text: 'Yes, I will', trait: null }
								]);
								// show toast immediately for non-adv grant
								try {
									window.dispatchEvent(new CustomEvent('toast', { detail: { message: `You learned ${skillObj.name}!`, type: 'success' } }));
								} catch (e) {}
							}
						} catch (err) {
							console.warn('Failed to grant elemental skill', err);
						}
						return;
					}

					if (id === 'mage-element-end') {
						showInHubConversation = false;
						return;
					}

					if (id === 'mage-element-surprise') {
						showReply('Wait... hold on. What?!', [
							{ id: 'mage-element-reveal', text: 'Huh?', trait: null }
						]);
						// Disable close button to ensure player sees the reveal
						if (inHubConversationData) {
							inHubConversationData.disableClose = true;
						}
						return;
					}

					if (id === 'mage-element-reveal') {
						try {
							const detail = inHubConversationData ? inHubConversationData.pendingVideo : null;
							const elName = inHubConversationData ? inHubConversationData.pendingElName : 'Element';
							
							if (detail) {
								window.dispatchEvent(new CustomEvent('element-adv', { detail }));
							}
							
							// Skill already granted at start. Just show toast again or skip.
							// dispatch toast for learning the advanced element
							try {
								window.dispatchEvent(new CustomEvent('toast', { detail: { message: `You have learned ${elName} Ascendant!`, type: 'success' } }));
							} catch (e) {}

							showReply(`It seems like ${elName} likes you. Well, you will understand soon. Good luck.`, [
								{ text: 'Thank you', trait: null }
							]);
							// Re-enable close button for the final screen
							if (inHubConversationData) {
								inHubConversationData.disableClose = false;
							}
						} catch (e) {
							console.warn('Error in mage-element-reveal', e);
						}
						return;
					}

					// Mage teach preface
					if (id === 'mage-teach') {
						try {
							showReply(
								'The Magic Barrier is a protective weave of mana that shields you from harm. Are you ready to learn?',
								[
									{ id: 'mage-teach-confirm', text: 'Teach me', trait: null },
									{ text: 'Not right now', trait: null }
								]
							);
							showInHubConversation = true;
						} catch (err) {
							console.warn('Mage teach preface failed', err);
						}
						return;
					}

					// Confirm and grant mage skill
					if (id === 'mage-teach-confirm') {
						try {
							const gs = get(gameState) || {};
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? {
												id: def.id,
												name: def.name,
												level: def.level || 1,
												description: def.description,
												icon: def.icon
											}
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHas = normalized.some(
								(s) => s && (s.id === 'mage_magic_barrier' || s.name === 'Magic Barrier')
							);
							if (!alreadyHas) {
								const def = skillsDb.find((s) => s.id === 'mage_magic_barrier');
								const skillObj = def
									? {
											id: def.id,
											name: def.name,
											level: def.level || 1,
											description: def.description,
											icon: def.icon
										}
									: { id: 'mage_magic_barrier', name: 'Magic Barrier', level: 1 };
								const newSkills = normalized.concat([skillObj]);
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), skills: newSkills }
								}));
								try {
									window.dispatchEvent(
										new CustomEvent('toast', {
											detail: { message: 'You learned Magic Barrier!', type: 'success' }
										})
									);
								} catch (e) {}
								try {
									saveManager.saveGame({ auto: true });
								} catch (e) {}
							}
						} catch (err) {
							console.warn('Failed to grant mage skill', err);
						}
						showReply('The is a barrier skill. [You learned Magic Barrier]', [
							{ text: 'Thank you Alexi', trait: null }
						]);
						return;
					}
				} catch (err) {
					console.warn('Alexi special handling failed', err);
				}
			}

			// Kane-specific conversation handling
			if (npcKey === 'Kane' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'buy-drink-yes') {
						// attempt to deduct 1 silver for the drink
						const ok = deductSilver(1);
						if (ok) {
							showReply('(Started snoring before he finished the drink)', [
								{ text: '...', trait: null }
							]);
							// Mark Liara as known/unlocked so she appears in the Crab & Claw NPC list
							try {
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), metLiara: true }
								}));
								// If the player is currently at the Crab & Claw, add Liara to the active location NPCs so she appears immediately
								try {
									const gs = get(gameState) || {};
									if (gs.location === 'crab-and-claw') {
										const currentNpcs = Array.isArray(gs.locationNPCs)
											? gs.locationNPCs.slice()
											: [];
										const already = currentNpcs.some((n) => n && n.name === 'Liara the Rogue');
										if (!already) {
											currentNpcs.push({
												name: 'Liara the Rogue',
												snippet:
													'You had been asking all over the town for me. Who are you and what do you want exactly?',
												conversationScene: null,
												npcPortrait: '/Images/NPC/npc-liara.PNG'
											});
											gameState.update((s) => ({ ...(s || {}), locationNPCs: currentNpcs }));
										}
									}
								} catch (e2) {
									console.warn('Failed to add Liara to locationNPCs', e2);
								}
							} catch (e) {
								console.warn('Failed to mark metLiara', e);
							}
						} else {
							showReply("You don't have enough coins to buy him a drink.", [
								{ text: 'Close', trait: null }
							]);
						}
						return;
					}
					if (id === 'buy-drink-no') {
						showReply(
							"So... that's a no? You shure? Positively sure? How about now? Is it still a no?",
							[{ text: "Let's talk when you're sober", trait: null }]
						);
						return;
					}
				} catch (err) {
					console.warn('Kane special handling failed', err);
				}
			}

			// Captain York-specific conversation handling
			if (inHubConversationData && npcKey === 'Captain York the Warrior' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'ask-warrior-skills') {
						const gs = get(gameState) || {};
						const playerClass = gs.character && gs.character.class;
						const playerLevel = (gs.playerData && gs.playerData.level) || 1;

						if (playerClass === 'warrior') {
							// If player already has the starter skill, show the 'not ready' reply
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? { id: def.id, name: def.name, level: def.level || 1 }
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHas = normalized.some(
								(s) => s && (s.id === 'warrior_eyes_of_the_eagle' || s.name === 'Eyes of The Eagle')
							);
							const hasStance = normalized.some(
								(s) =>
									s &&
									[
										'warrior_berserker',
										'warrior_fortress',
										'warrior_analysis',
										'warrior_mirror',
										'warrior_berserker_adv',
										'warrior_fortress_adv',
										'warrior_analysis_adv',
										'warrior_mirror_adv'
									].includes(s.id)
							);

							if (!alreadyHas) {
								// Offer to teach a starter Warrior skill (condensed option set)
								showReply("Sure, I can teach you a thing or two, if you're up for it.", [
									{ id: 'captain-teach', text: "Don't go easy on me", trait: null }
								]);
							} else if (gs.character && gs.character.captainTaughtStance && hasStance) {
								// Already taught and has skill
								showReply('I have already taught you the buff. Master it.', [
									{ text: 'I will', trait: null }
								]);
							} else if (playerLevel >= 5) {
								// If they have Eyes AND are level 5+, offer Stance
								showReply(
									'You have grown strong enough. It is time to learn an active buff skill.',
									[{ id: 'stance-what', text: 'Buff?', trait: null }]
								);
							} else {
								showReply('Given your current state, you are not ready for anything else.', [
									{ text: 'Then I will go and become ready', trait: null }
								]);
							}
						} else {
							showReply("I don't think you got what it takes! Ha-ha-ha!", [
								{ text: 'I see your point', trait: null }
							]);
						}
						return;
					}

					// Player asked "Combat stance?"
					if (id === 'stance-what') {
						showReply(
							"Yes, a 'buff.' It's a common term for a skill that temporarily boosts your own capabilities. Think of it as a surge of power you can control. Pick one!",
							[
								{ id: 'choose-stance-berserker', text: 'Berserker', trait: null },
								{ id: 'choose-stance-fortress', text: 'Fortress', trait: null },
								{
									id: 'choose-stance-analysis',
									text: 'Predictive Analysis',
									trait: null
								},
								{ id: 'choose-stance-mirror', text: 'Mirror of Pain', trait: null }
							]
						);
						return;
					}

					// Handle stance selection and ask for confirmation
					if (id && id.indexOf && id.indexOf('choose-stance-') === 0) {
						const gs = get(gameState) || {};
						const parts = id.split('-');
						const stance = parts.slice(2).join('-');
						const nameMap = {
							berserker: 'Berserker',
							fortress: 'Fortress',
							analysis: 'Predictive Analysis',
							mirror: 'Mirror of Pain'
						};
						const stanceName = nameMap[stance] || stance;
						try {
							if (inHubConversationData) inHubConversationData.tempChosenStance = stance;
						} catch (e) {}
						showReply(`Are you sure you want to learn ${stanceName}?`, [
							{ id: 'confirm-stance-yes', text: 'Yes', trait: null },
							{ id: 'confirm-stance-no', text: 'No', trait: null }
						]);
						return;
					}

					if (id === 'confirm-stance-no') {
						showReply('Take your time. This choice will define your path.', [
							{ id: 'stance-what', text: 'Let me choose again', trait: null }
						]);
						return;
					}

					if (id === 'confirm-stance-yes') {
						try {
							const stance = inHubConversationData.tempChosenStance;
							let skillId = `warrior_${stance}`;

							// Zodiac Compatibility Check
							const gs = get(gameState) || {};
							const dob = gs.character ? gs.character.dob : null;
							let isCompatible = false;

							if (dob) {
								const getZodiac = (dateStr) => {
									const date = new Date(dateStr);
									const day = date.getDate();
									const month = date.getMonth() + 1;
									if ((month == 1 && day <= 19) || (month == 12 && day >= 22)) return 'Capricorn';
									if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 'Aquarius';
									if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return 'Pisces';
									if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 'Aries';
									if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 'Taurus';
									if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'Gemini';
									if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'Cancer';
									if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'Leo';
									if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'Virgo';
									if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'Libra';
									if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'Scorpio';
									if ((month == 11 && day >= 22) || (month == 12 && day >= 21)) return 'Sagittarius';
									return 'Unknown';
								};

								const sign = getZodiac(dob);
								const elementGroups = {
									fire: ['Aries', 'Leo', 'Sagittarius'],
									earth: ['Taurus', 'Virgo', 'Capricorn'],
									air: ['Gemini', 'Libra', 'Aquarius'],
									water: ['Cancer', 'Scorpio', 'Pisces']
								};

								const stanceElementMap = {
									berserker: 'fire',
									fortress: 'earth',
									analysis: 'air',
									mirror: 'water'
								};

								const requiredElement = stanceElementMap[stance];
								if (requiredElement && elementGroups[requiredElement].includes(sign)) {
									isCompatible = true;
									skillId = `warrior_${stance}_adv`;
								}
							}

							const def = skillsDb.find((s) => s.id === skillId);
							if (def) {
								const existing =
									gs.character && Array.isArray(gs.character.skills)
										? gs.character.skills.slice()
										: [];
								const newSkills = existing.concat([
									{
										id: def.id,
										name: def.name,
										level: def.level || 1,
										description: def.description,
										icon: def.icon,
										effects: def.effects
									}
								]);

								gameState.update((s) => ({
									...(s || {}),
									character: {
										...(s.character || {}),
										skills: newSkills,
										captainTaughtStance: true
									}
								}));

								try {
									window.dispatchEvent(
										new CustomEvent('toast', {
											detail: { message: `You learned ${def.name}!`, type: 'success' }
										})
									);
								} catch (e) {}
								saveManager.saveGame({ auto: true });

								let replyText = 'Good. Now go and practice.';
								if (isCompatible) {
									replyText = 'Incredible! Your spirit resonates perfectly with this buff. You have learned its advanced form instantly!';

									// Trigger upgrade animation
									try {
										const baseSkillId = `warrior_${stance}`;
										const baseDef = skillsDb.find((s) => s.id === baseSkillId);
										if (baseDef) {
											window.dispatchEvent(
												new CustomEvent('element-adv', {
													detail: {
														baseIcon: baseDef.icon,
														advIcon: def.icon,
														name: baseDef.name,
														advName: def.name,
														isAdvanced: true,
														video: null
													}
												})
											);
										}
									} catch (e) {
										console.warn('Failed to dispatch element-adv for warrior', e);
									}
								}

								showReply(replyText, [
									{ text: 'Thank you, Captain', trait: null }
								]);
							} else {
								showReply('Something went wrong.', [{ text: '...', trait: null }]);
							}
						} catch (e) {
							console.warn('Failed to grant stance', e);
							showReply('Something went wrong.', [{ text: '...', trait: null }]);
						}
						return;
					}

					// Captain York teaches a basic Warrior skill when the player accepts
					if (id === 'captain-teach') {
						try {
							const gs = get(gameState) || {};
							const playerClass = gs.character && gs.character.class;
							if (playerClass === 'warrior') {
								const existing =
									gs.character && Array.isArray(gs.character.skills)
										? gs.character.skills.slice()
										: [];
								const normalized = existing.map((e) => {
									if (typeof e === 'string') {
										const def = skillsDb.find((s) => s.id === e);
										return def
											? { id: def.id, name: def.name, level: def.level || 1 }
											: { id: e, name: e, level: 1 };
									}
									return e;
								});
								const alreadyHas = normalized.some(
									(s) =>
										s && (s.id === 'warrior_eyes_of_the_eagle' || s.name === 'Eyes of The Eagle')
								);
								if (!alreadyHas) {
									const def = skillsDb.find((s) => s.id === 'warrior_eyes_of_the_eagle');
									const skillObj = def
										? {
												id: def.id,
												name: def.name,
												level: def.level || 1,
												description: def.description,
												icon: def.icon
											}
										: { id: 'warrior_eyes_of_the_eagle', name: 'Eyes of The Eagle', level: 1 };
									const newSkills = normalized.concat([skillObj]);
									gameState.update((s) => ({
										...(s || {}),
										character: { ...(s.character || {}), skills: newSkills }
									}));
									try {
										window.dispatchEvent(
											new CustomEvent('toast', {
												detail: { message: 'You learned Eyes of The Eagle!', type: 'success' }
											})
										);
									} catch (e) {}
									// Autosave after granting skill
									try {
										saveManager.saveGame({ auto: true });
									} catch (e) {
										/* ignore */
									}
								}
							}
						} catch (grantErr) {
							console.warn('Failed to grant warrior skill', grantErr);
						}
						showReply(
							'Eyes of the Eagle separates warriors from brawlers. Any fool can see a weak point; we can actually strike it. [You learned Eyes of The Eagle]',
							[{ text: 'Well reasoned. You have my gratitude', trait: null }]
						);
						return;
					}
				} catch (err) {
					console.warn('Captain York special handling failed', err);
				}
			}

			// Matt-specific conversation handling
			if (inHubConversationData && npcKey === 'Matt the Archer' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'ask-archer-skills') {
						const gs = get(gameState) || {};
						const playerClass = gs.character && gs.character.class;

						if (playerClass === 'archer') {
							// check whether player already knows Arrow Craft
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? { id: def.id, name: def.name, level: def.level || 1 }
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHas = normalized.some(
								(s) =>
									s &&
									(s.id === 'archer_arrow_craft' ||
										s.name === 'Arrow Craft' ||
										s.name === 'Arrow Crafting')
							);

							if (alreadyHas) {
								showReply(
									"There you are! Ah, it pains me to say this, but I simply cannot teach you anything new just yet. It's not that your skills aren't... charming in their own way. But true mastery? The kind that lets you thread an arrow through a dragon's scale at five hundred paces? That requires a foundation! A certain... finesse that only comes with time. Why, I remember when I was first deemed worthy of the 'Whispering Shot' technique. I had to meditate for a month just to feel the wind's secrets! You'll get there, I'm sure. In a decade or two. In the meantime, best not to rush genius, eh?",
									[{ text: 'I will come back next time... maybe', trait: null }]
								);
							} else {
								showReply(
									"You've come to the right place, the right person, and at the right time! Not to brag... well, maybe a little. But it's true, I'm the best archer in town. And a few other things, now that you mention it...",
									[{ id: 'archer-teach', text: 'Can you teach me something already?', trait: null }]
								);
							}
						} else {
							showReply(
								"I wish I can, but you don't seems like the Archer type. Of course I know, archery is a very professional career. A combination of good eyes, steady hands and clear mind... (and on he goes)...",
								[{ text: 'Sigh... This is going to be long night', trait: null }]
							);
						}
						return;
					}

					// Player asked Matt to teach them something
					if (id === 'archer-teach') {
						try {
							console.debug('[FreeModeHub] Matt -> archer-teach triggered');
							showReply(
								"A fellow archer? I could never turn you down! Listen, I have a piece of news that will change everything for you. Been to the shops? Ever wonder why you can't buy arrows? It's because true archers craft their own. The secret is Arrow Craft—the ability to turn the world around you into ammunition. Forget spending gold and lugging a quiver full around.",
								[{ id: 'archer-teach-confirm', text: 'Yes. Teach me. Now.', trait: null }]
							);
							// keep the conversation open while they decide
							showInHubConversation = true;
						} catch (err) {
							console.warn('Archer teach preface failed', err);
						}
						return;
					}

					// Confirm and grant archer skill
					if (id === 'archer-teach-confirm') {
						try {
							const gs = get(gameState) || {};
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? {
												id: def.id,
												name: def.name,
												level: def.level || 1,
												description: def.description,
												icon: def.icon
											}
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHas = normalized.some(
								(s) => s && (s.id === 'archer_arrow_craft' || s.name === 'Arrow Crafting')
							);
							if (!alreadyHas) {
								const def = skillsDb.find((s) => s.id === 'archer_arrow_craft');
								const skillObj = def
									? {
											id: def.id,
											name: def.name,
											level: def.level || 1,
											description: def.description,
											icon: def.icon
										}
									: { id: 'archer_arrow_craft', name: 'Arrow Crafting', level: 1 };
								const newSkills = normalized.concat([skillObj]);
								gameState.update((s) => ({
									...(s || {}),
									character: { ...(s.character || {}), skills: newSkills }
								}));
								try {
									window.dispatchEvent(
										new CustomEvent('toast', {
											detail: { message: 'You learned Arrow Craft!', type: 'success' }
										})
									);
								} catch (e) {}
								try {
									saveManager.saveGame({ auto: true });
								} catch (e) {}
							}
						} catch (err) {
							console.warn('Failed to grant archer skill', err);
						}
						showReply(
							"Nothing beats the arrows you crafted yourself, right? I'm sure you'll master this skill, I am, after all, the one who perfected it. Took me years, you know—years of trial and error, splintered wood, and fletching that would fly sideways. But I cracked the code. My arrows fly truer than a hawk's gaze, hit harder than a mountain troll's grumble, and are balanced so perfectly they practically sing on the wind! But don't worry, I'll pass the genius along. You're learning from the best.",
							[{ text: '[You quietly left...]', trait: null }]
						);
						return;
					}
				} catch (err) {
					console.warn('Matt special handling failed', err);
				}
			}

			// Liara-specific conversation handling
			if (inHubConversationData && npcKey === 'Liara the Rogue' && choice && choice.id) {
				try {
					const id = choice.id;
					if (id === 'ask-rogue-skills') {
						const gs = get(gameState) || {};
						const playerClass = gs.character && gs.character.class;

						if (playerClass === 'rogue') {
							// If the player already knows Stealth, respond with a different acknowledgement
							const existing =
								gs.character && Array.isArray(gs.character.skills)
									? gs.character.skills.slice()
									: [];
							const normalized = existing.map((e) => {
								if (typeof e === 'string') {
									const def = skillsDb.find((s) => s.id === e);
									return def
										? { id: def.id, name: def.name, level: def.level || 1 }
										: { id: e, name: e, level: 1 };
								}
								return e;
							});
							const alreadyHas = normalized.some(
								(s) => s && (s.id === 'rogue_stealth' || s.name === 'Stealth')
							);
							if (alreadyHas) {
								showReply(
									"You'd only get yourself killed. And I've put too much work into you to let that happen.",
									[{ text: "Then I'll make myself ready. Expect me.", trait: null }]
								);
							} else {
								// Offer to teach Stealth; acceptance is required (no decline option)
								showReply(
									"Your technique is amateurish. You hide your presence like a bull in a pottery shop. If you intend to survive, you'll need training. I can provide the fundamentals.",
									[{ id: 'liara-teach', text: "Alright, you've made your point", trait: null }]
								);
							}
						} else {
							showReply(
								'The art of assassination is not something you can learn just because you want to... (A silent pause)',
								[{ text: "(She's gone...)", trait: null }]
							);
						}
						return;
					}

					// After the player thanks her, Liara teaches the Stealth skill to rogues
					if (id === 'liara-teach') {
						try {
							const gs = get(gameState) || {};
							const playerClass = gs.character && gs.character.class;
							if (playerClass === 'rogue') {
								const existing =
									gs.character && Array.isArray(gs.character.skills)
										? gs.character.skills.slice()
										: [];
								const normalized = existing.map((e) => {
									if (typeof e === 'string') {
										const def = skillsDb.find((s) => s.id === e);
										return def
											? {
													id: def.id,
													name: def.name,
													level: def.level || 1,
													description: def.description,
													icon: def.icon
												}
											: { id: e, name: e, level: 1 };
									}
									return e;
								});
								const alreadyHas = normalized.some(
									(s) =>
										s && (s.id === 'rogue_stealth' || s === 'rogue_stealth' || s.name === 'Stealth')
								);
								if (!alreadyHas) {
									const def = skillsDb.find((s) => s.id === 'rogue_stealth');
									const skillObj = def
										? {
												id: def.id,
												name: def.name,
												level: def.level || 1,
												description: def.description,
												icon: def.icon
											}
										: { id: 'rogue_stealth', name: 'Stealth', level: 1 };
									const newSkills = normalized.concat([skillObj]);
									gameState.update((s) => ({
										...(s || {}),
										character: { ...(s.character || {}), skills: newSkills }
									}));
									try {
										window.dispatchEvent(
											new CustomEvent('toast', {
												detail: { message: 'You learned Stealth!', type: 'success' }
											})
										);
									} catch (e) {}
									// Autosave after granting skill
									try {
										saveManager.saveGame({ auto: true });
									} catch (e) {
										/* ignore */
									}
								}
							}
						} catch (grantErr) {
							console.warn('Failed to grant stealth skill', grantErr);
						}
						showReply(
							'Stealth is a fundamental. We are one with our shadow, and our shadow holds truths the light cannot reveal. [You learned Stealth]',
							[{ text: '[Gone before you can thank her...]', trait: null }]
						);
						return;
					}
				} catch (err) {
					console.warn('Liara special handling failed', err);
				}
			}

			// Special handling: if the player asked "What's new at the pier?" show a longer reply
			if (
				choice &&
				(choice.trait === 'curious' ||
					(choice.text && choice.text.toLowerCase().includes("what's new")))
			) {
				try {
					const longReply =
						"Ah, [player name] — a lot's been stirring. The merchant ship from the south lost a crate of strange glass vials last week; folks whisper they're not ordinary glass. Old Jory down by the boathouse found odd footprints near the tide line at dawn, like something with webbed fingers. The pier guard's been nervous; they've taken to posting extra watches at night after lanterns vanished from the walkways. Beyond that, a traveling peddler hawked a map that 'leads to a drowned lantern' — some say it's superstition, others say it's a real artifact and worth a coin or two. Oh, and watch the gulls — they've been acting strange, stealing shiny bits from sailors like they know more than they let on.";
					// Use showReply so the previous menu is preserved. This allows the
					// acknowledgement to restore the prior choices so specialized handlers
					// (which depend on choice ids) remain reachable after reading.
					showReply(longReply, [{ text: 'Thanks, I understand.', trait: null }]);
					return; // do not close the panel
				} catch (err) {
					console.warn('Failed to show long reply', err);
				}
			}
		} catch (err) {
			console.warn('handleInHubSelect failed', err);
		}

		// Default behavior: close the in-hub conversation
		showInHubConversation = false;
		inHubConversationData = null;
	}
</script>

<!-- Presentation-only markup copied/adapted from your original game.html layout -->
<div
	id="game-container"
	class:modal-open={showSavePreview}
	style="background-image: linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url('{$gameState.locationBackground ||
		townBgPath}'); background-size: cover; background-position: center;"
>
	<!-- Top Left UI -->
	<div id="top-left-ui">
		{#if $gameState && $gameState.uiVisible}
			<!-- Location panel: shown when a location is active (set by NavWindow in travel mode) -->
			{#if $gameState.location}
				<div id="location-panel" class="location-panel">
					<div class="location-header">
						<div class="location-title">
							{$gameState.locationTitle ||
								($gameState.location ? $gameState.location.replace('-', ' ') : '')}
						</div>
						<button
							class="location-close"
							on:click={() =>
								gameState.update((s) => ({
									...(s || {}),
									location: null,
									locationTitle: null,
									locationBackground: null,
									locationNPCs: []
								}))}>Leave</button
						>
					</div>
					<div class="location-body">
						{#if $gameState.locationNPCs && $gameState.locationNPCs.length}
							<ul class="npc-list">
								{#each $gameState.locationNPCs as npc (npc.id || npc.name)}
									<li class="npc-item">
										<div class="npc-name">{npc.name}</div>
										<div class="npc-actions">
											<button
												on:click={() => {
													if (npc.conversationScene) {
														sceneManager.loadScene(npc.conversationScene);
													} else {
														// Open an in-hub conversation panel instead of navigating away
														try {
															console.debug('[FreeModeHub] opening in-hub conversation', { npc });
															inHubConversationData = {
																npcId: npc.id || npc.name,
																name: npc.name,
																npcPortrait: npc.npcPortrait || (npc.name === 'Chris' ? '/Images/NPC/npc-chris.PNG' : '/Images/NPC/npc-berg.PNG'),
																snippet: npc.snippet || '',
																// Attach sourceLocation so centralized handlers can disambiguate same-named NPCs
																meta: { sourceLocation: $gameState.location || null },
																choices:
																	npc.name === 'Berg'
																		? [
																				{
																					id: 'who-lady',
																					text: 'Who is the lady?',
																					trait: 'social'
																				},
																				{
																					id: 'how-much-rent',
																					text: 'How much rent do I owe you?',
																					trait: 'practical'
																				},
																				{
																					id: 'about-town',
																					text: 'About the town',
																					trait: 'helpful'
																				},
																				{ id: 'about-alexa', text: 'About Alexa', trait: 'gossip' },
																				{
																					id: 'heard-rumors',
																					text: 'Heard any rumors?',
																					trait: 'inquisitive'
																				}
																			]
																		: npc.name === 'Carissa'
																			? [
																					{
																						id: 'where-is-berg',
																						text: 'Where is Berg?',
																						trait: null
																					},
																					{
																						id: 'how-much-rent',
																						text: 'How much rent do I owe you?',
																						trait: null
																					},
																					{ id: 'about-town', text: 'About the town', trait: null },
																					{ id: 'about-alexa', text: 'About Alexa', trait: null },
																					{
																						id: 'ask-about-acolyte',
																						text: 'Ask about Acolyte',
																						trait: null
																					}
																				]
																			: npc.name === 'Esther the Acolyte'
																				? [
																						{
																							id: 'ask-about-skills',
																							text: 'Ask about Skills',
																							trait: null
																						}
																					]
																				: (npc.name === 'Mogi' || npc.name === 'Kristy' || npc.name === 'June')
																					? [
																							{
																								id: 'ask-jenny',
																								text: 'Ask about Jenny',
																								trait: null
																							},
																							{
																								id: 'how-much-rent',
																								text: 'How much is the rent here?',
																								trait: null
																							},
																							{
																								id: 'about-town',
																								text: 'About the town',
																								trait: null
																							},
																							{
																								id: 'about-shops',
																								text: 'About shops',
																								trait: null
																							},
																							{
																								id: 'heard-rumors',
																								text: 'Heard any rumors?',
																								trait: null
																							}
																						]
																					: npc.name === 'Jenny'
																						? [
																								{
																									id: 'ask-mogi',
																									text: 'Ask about Mogi',
																									trait: null
																								},
																								{
																									id: 'ask-warrior-archer',
																									text: 'Ask about Warrior / Archer',
																									trait: null
																								},
																								{
																									id: 'about-town',
																									text: 'About the town',
																									trait: null
																								},
																								{
																									id: 'about-shops',
																									text: 'About shops',
																									trait: null
																								},
																								{
																									id: 'heard-rumors',
																									text: 'Heard any rumors?',
																									trait: null
																								}
																							]
																						: (npc.name === 'Xia' || npc.name === 'Hana' || npc.name === 'Kendra')
																							? [
																									{
																										id: 'check-available-quests',
																										text: 'Check for available quests',
																										trait: null
																									},
																									{
																										id: 'submit-completed-quest',
																										text: 'Submit completed quest',
																										trait: null
																									},
																									{
																										id: 'give-up-quest',
																										text: 'Give up quest',
																										trait: null
																									},
																							{
																								id: 'heard-rumors',
																								text: 'About quests',
																								trait: null
																							},
																									{
																										id: 'looking-for-party',
																										text: 'Looking for a party',
																										trait: null
																									}
																								]
																							: (npc.name === 'Chris' || npc.name === 'Ron' || npc.name === 'Inil')
																								? [
																										{
																											id: 'check-available-quests',
																											text: 'Check for available quests',
																											trait: null
																										},
																										{
																											id: 'submit-completed-quest',
																											text: 'Submit completed quest',
																											trait: null
																										},
																										{
																											id: 'give-up-quest',
																											text: 'Give up quest',
																											trait: null
																										},
																									{
																									id: 'heard-rumors',
																									text: 'About quests',
																									trait: null
																									},
																										{
																											id: 'looking-for-party',
																											text: 'Looking for a party',
																											trait: null
																										}
																									]
																								: npc.name === 'Alexa'
																									? [
																											{
																												id: 'ask-alexi',
																												text: 'Ask about Alexi',
																												trait: null
																											},
																											{
																												id: 'ask-quests',
																												text: 'Ask about quests',
																												trait: null
																											},
																											{
																												id: 'about-town',
																												text: 'About the town',
																												trait: null
																											},
																											{
																												id: 'about-shops',
																												text: 'About shops',
																												trait: null
																											},
																											{
																												id: 'ask-about-skills',
																												text: 'Ask about Skills',
																												trait: null
																											}
																										]
																									: npc.name === 'Alexi' &&
																										  $gameState.location === 'guild-hall'
																										? [
																												{
																													id: 'ask-alexa',
																													text: 'Ask about Alexa',
																													trait: null
																												},
																												{
																													id: 'ask-quests',
																													text: 'Ask about quests',
																													trait: null
																												},
																												{
																													id: 'about-town',
																													text: 'About the town',
																													trait: null
																												},
																												{
																													id: 'about-shops',
																													text: 'About shops',
																													trait: null
																												},
																												{
																													id: 'ask-mage-skill',
																													text: 'Ask about Mage Skill',
																													trait: null
																												}
																											]
																										: npc.name === 'Alexi' &&
																											  $gameState.location === 'familiars-folly'
																											? [
																													{
																														id: 'buy-sell',
																														text: 'Buy / Sell',
																														trait: null
																													},
																													{
																														id: 'about-caspian',
																														text: 'About Caspian',
																														trait: null
																													},
																													{
																														id: 'about-skills',
																														text: 'About skills',
																														trait: null
																													},
																													{
																														id: 'your-skills',
																														text: 'Her skills',
																														trait: null
																													},
																													{
																														id: 'heard-rumors',
																														text: 'Heard any rumors?',
																														trait: null
																													}
																												]
																											: (npc.name === 'Zerg' || npc.name === 'Duncan')
																												? [
																														{
																															id: 'buy-sell-repair',
																															text: 'Buy / Sell / Repair',
																															trait: null
																														},
																														{
																															id: 'about-berg',
																															text: 'About Berg',
																															trait: null
																														},
																														{
																															id: 'about-issac',
																															text: 'About Issac',
																															trait: null
																														},
																														{
																															id: 'apprenticeship',
																															text: 'Apprenticeship',
																															trait: null
																														},
																														{
																															id: 'heard-rumors',
																															text: 'Heard any rumors?',
																															trait: null
																														}
																													]
																												: npc.name === 'Issac' ||
																													  npc.name === 'Isaac'
																													? [
																															{
																																id: 'buy-sell-repair',
																																text: 'Buy / Sell / Repair',
																																trait: null
																															},
																															{
																																id: 'about-berg',
																																text: 'About Berg',
																																trait: null
																															},
																															{
																																id: 'about-zerg',
																																text: 'About Zerg',
																																trait: null
																															},
																															{
																																id: 'apprenticeship',
																																text: 'Apprenticeship',
																																trait: null
																															},
																															{
																																id: 'heard-rumors',
																																text: 'Heard any rumors?',
																																trait: null
																															}
																														]
																													: (npc.name === 'Holly' || npc.name === 'Ameri')
																														? [
																																{
																																	id: 'buy-sell-repair',
																																	text: 'Buy / Sell',
																																	trait: null
																																},
																																{
																																	id: 'about-jenny',
																																	text: 'About Jenny',
																																	trait: null
																																},
																																{
																																	id: 'about-maple',
																																	text: 'About Maple',
																																	trait: null
																																},
																																{
																																	id: 'apprenticeship',
																																	text: 'Apprenticeship',
																																	trait: null
																																},
																																{
																																	id: 'heard-rumors',
																																	text: 'Heard any rumors?',
																																	trait: null
																																}
																															]
																														: npc.name === 'Maple'
																															? [
																																	{
																																		id: 'buy-sell-repair',
																																		text: 'Buy / Sell',
																																		trait: null
																																	},
																																	{
																																		id: 'about-mogi',
																																		text: 'About Mogi',
																																		trait: null
																																	},
																																	{
																																		id: 'about-holly',
																																		text: 'About Holly',
																																		trait: null
																																	},
																																	{
																																		id: 'apprenticeship',
																																		text: 'Apprenticeship',
																																		trait: null
																																	},
																																	{
																																		id: 'heard-rumors',
																																		text: 'Heard any rumors?',
																																		trait: null
																																	}
																																]
																															: npc.name === 'Caspian'
																																? [
																																		{
																																			id: 'buy-sell',
																																			text: 'Buy / Sell',
																																			trait: null
																																		},
																																		{
																																			id: 'are-you-owner',
																																			text: "You're the shop owner?",
																																			trait: null
																																		},
																																		{
																																			id: 'about-alexi',
																																			text: 'About Alexi',
																																			trait: null
																																		},
																																		{
																																			id: 'apprenticeship',
																																			text: 'Apprenticeship',
																																			trait: null
																																		},
																																		{
																																			id: 'heard-rumors',
																																			text: 'Heard any rumors?',
																																			trait: null
																																		}
																																	]
																																: npc.name === 'Diana'
																																	? [
																																			{
																																				id: 'buy-sell-repair',
																																				text: 'Buy / Sell',
																																				trait: null
																																			},
																																			{
																																				id: 'about-russel',
																																				text: 'About Russel',
																																				trait: null
																																			},
																																			{
																																				id: 'about-town',
																																				text: 'About the town',
																																				trait: null
																																			},
																																			{
																																				id: 'heard-rumors',
																																				text: 'Heard any rumors?',
																																				trait: null
																																			}
																																		]
																																	: npc.name === 'Russel'
																																		? [
																																				{
																																					id: 'buy-sell-repair',
																																					text: 'Buy / Sell',
																																					trait: null
																																				},
																																				{
																																					id: 'about-diana',
																																					text: 'About Diana',
																																					trait: null
																																				},
																																				{
																																					id: 'about-town',
																																					text: 'About the town',
																																					trait: null
																																				},
																																				{
																																					id: 'heard-rumors',
																																					text: 'Heard any rumors?',
																																					trait: null
																																				}
																																			]
																																		: npc.name === 'Kane'
																																			? [
																																					{
																																						id: 'buy-drink-yes',
																																						text: 'Yes',
																																						trait: null
																																					},
																																					{
																																						id: 'buy-drink-no',
																																						text: 'No',
																																						trait: null
																																					}
																																				]
																																			: npc.name ===
																																				  'Captain York the Warrior'
																																				? [
																																						{
																																							id: 'ask-warrior-skills',
																																							text: 'Ask about Warrior Skills',
																																							trait: null
																																						}
																																					]
																																				: npc.name ===
																																					  'Matt the Archer'
																																					? [
																																							{
																																								id: 'ask-archer-skills',
																																								text: 'Ask about Archer Skills',
																																								trait: null
																																							}
																																						]
																																					: npc.name ===
																																						  'Liara the Rogue'
																																						? [
																																								{
																																									id: 'ask-rogue-skills',
																																									text: 'Ask about Rogue Skills',
																																									trait: null
																																								}
																																							]
																																						: [
																																								{
																																									text: "What's new at the pier?",
																																									trait: 'curious'
																																								},
																																								{
																																									text: 'Heard any rumors?',
																																									trait:
																																										'inquisitive'
																																								},
																																								{
																																									text: 'Can I help with anything?',
																																									trait: 'helpful'
																																								},
																																								{
																																									text: 'Buy you a drink?',
																																									trait: 'social'
																																								},
																																								{
																																									text: 'Not right now, thanks.',
																																									trait: null
																																								}
																																							]
															};
															showInHubConversation = true;
														} catch (e) {
															console.warn('Failed to open in-hub conversation', e);
															try {
																alert(`${npc.name}: ${npc.snippet || 'They have nothing to say.'}`);
															} catch {}
														}
													}
												}}>Talk</button
											>
										</div>
									</li>
								{/each}
							</ul>
						{:else}
							<div class="no-npcs">No one is available to talk to right now.</div>
						{/if}
					</div>
				</div>
			{/if}
				<div
					id="avatar-container"
					data-player-element-src={showElementBadge ? playerElementBadgeSrc : undefined}
				title="Click to upload avatar"
				role="button"
				aria-label="Upload avatar"
				tabindex="0"
				on:click={() => avatarInputEl && avatarInputEl.click()}
				on:keydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						avatarInputEl && avatarInputEl.click();
					}
				}}
			>
				<!-- avatar placeholder removed per user request -->
				{#if $gameState && $gameState.character && $gameState.character.avatar}
					<div class="avatar-wrap">
						<img id="avatar" src={$gameState.character.avatar} alt="Player avatar" />
					</div>
					{#if showElementBadge}
						<span
							class="avatar-badge has-element"
							aria-hidden="true"
							style={`background-image: url("${playerElementBadgeSrc}"); background-color: transparent;`} 
						></span>
					{/if}
				{:else}
					<div class="avatar-wrap">
						<div
							id="avatar-empty"
							class="avatar-placeholder"
							role="button"
							aria-label="Upload avatar"
							tabindex="0"
							on:click={() => avatarInputEl && avatarInputEl.click()}
							on:keydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									avatarInputEl && avatarInputEl.click();
								}
							}}
						>
							<div class="avatar-plus">+</div>
							<div class="avatar-text">Upload avatar</div>
						</div>
					</div>
					{#if showElementBadge}
						<span class="avatar-badge" aria-hidden="true">
							<img src={playerElementBadgeSrc} alt="Elemental spirit" />
						</span>
					{/if}
				{/if}
				<input
					bind:this={avatarInputEl}
					type="file"
					id="avatar-upload"
					accept="image/*"
					on:change={handleAvatarChange}
				/>

			</div>
			<div id="status-bars">
				<div class="status-bar">
					<div class="status-label">HP</div>
					<div class="bar-container">
						<div
							id="hp-bar"
							class="bar"
							role="progressbar"
							aria-valuenow={pd.hp}
							aria-valuemin="0"
							aria-valuemax={pd.maxHp}
							style="width:{hpPct}%"
							on:mouseenter={(e) => showRegenTooltip('hp', e)}
							on:mousemove={moveTooltip}
							on:mouseleave={hideTooltip}
						></div>
					</div>
					<div class="bar-value">{pd.hp}/{pd.maxHp}</div>
				</div>
				<div class="status-bar">
					<div class="status-label">SP</div>
					<div class="bar-container">
						<div
							id="sp-bar"
							class="bar"
							role="progressbar"
							aria-valuenow={pd.sp}
							aria-valuemin="0"
							aria-valuemax={pd.maxSp}
							style="width:{spPct}%"
							on:mouseenter={(e) => showRegenTooltip('sp', e)}
							on:mousemove={moveTooltip}
							on:mouseleave={hideTooltip}
						></div>
					</div>
					<div class="bar-value">{pd.sp}/{pd.maxSp}</div>
				</div>
				<div class="status-bar">
					<div class="status-label">STA</div>
					<div class="bar-container">
						<div
							id="stamina-bar"
							class="bar"
							role="progressbar"
							aria-valuenow={pd.stamina}
							aria-valuemin="0"
							aria-valuemax={pd.maxStamina}
							style="width:{staPct}%"
							on:mouseenter={(e) => showRegenTooltip('stamina', e)}
							on:mousemove={moveTooltip}
							on:mouseleave={hideTooltip}
						></div>
					</div>
					<div class="bar-value">{pd.stamina}/{pd.maxStamina}</div>
				</div>
				<div class="currency-display">
					<div class="currency-item">
						<i class="fas fa-coins" style="color: gold;" aria-hidden="true"></i>
						<span>{pd.gold}</span>
					</div>
					<div class="currency-item">
						<i class="fas fa-coins" style="color: silver;" aria-hidden="true"></i>
						<span>{pd.silver}</span>
					</div>
					<div class="currency-item">
						<i class="fas fa-gem" style="color: var(--gem-hex);" aria-hidden="true"></i>
						<span>{pd.diamonds}</span>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Top Right UI wrapper: cluster is conditional, toggle is persistent inside this wrapper so it appears top-right -->
	<div id="top-right-wrapper">
		{#if topRightVisible}
			<div id="top-right-ui">
				<div class="music-toggle-wrapper">
					<MusicToggle />
				</div>
				<button
					class="icon-btn"
					id="save-btn"
					data-tooltip="Save game"
					aria-label="Save game"
					on:click={() => handleTopRightAction('save')}
					><i class="fas fa-save" aria-hidden="true"></i></button
				>
				<button
					class="icon-btn"
					id="load-btn"
					data-tooltip="Load game"
					aria-label="Load game"
					on:click={() => handleTopRightAction('load')}
					><i class="fas fa-folder-open" aria-hidden="true"></i></button
				>
				<button
					class="icon-btn"
					id="reset-btn"
					data-tooltip="Reset (clears local saves)"
					aria-label="Reset game"
					on:click={() => handleTopRightAction('reset')}
					><i class="fas fa-redo" aria-hidden="true"></i></button
				>
				<button
					class="icon-btn"
					id="import-btn"
					data-tooltip="Import save from file"
					aria-label="Import game data"
					on:click={() => handleTopRightAction('import')}
					><i class="fas fa-file-import" aria-hidden="true"></i></button
				>
				<button
					class="icon-btn"
					id="export-btn"
					data-tooltip="Export save to file"
					aria-label="Export game data"
					on:click={() => handleTopRightAction('export')}
					><i class="fas fa-file-export" aria-hidden="true"></i></button
				>
			</div>
		{/if}

		{#if apprenticesBadgeState && apprenticesBadgeState.length > 0}
			<div class="apprentice-badges" aria-hidden="false">
				{#each apprenticesBadgeState as b (b.label)}
					<div class="apprentice-badge">{b.label}</div>
				{/each}
			</div>
		{/if}
		<button
			class="icon-btn"
			id="top-right-toggle"
			data-tooltip={topRightVisible ? 'Hide controls' : 'Show controls'}
			aria-label="Toggle top-right"
			on:click={() => handleTopRightAction('toggle-top-right')}
		>
			{#if topRightVisible}
				<i class="fas fa-eye-slash" aria-hidden="true"></i>
			{:else}
				<i class="fas fa-eye" aria-hidden="true"></i>
			{/if}
		</button>
	</div>

	{#if showSavePreview}
		<div class="save-preview-backdrop">
			<div class="save-preview-modal" role="dialog" aria-modal="true" aria-label="Save preview">
				<h3>Save Preview</h3>
				<div class="save-preview-body">
					<div class="avatar-area">
						{#if savePreview && savePreview.avatar}
							<!-- use non-blocking decode hints to avoid main-thread jank -->
							<img
								src={savePreview.avatar}
								alt="Avatar preview"
								width="96"
								height="96"
								loading="lazy"
								decoding="async"
							/>
						{:else}
							<div class="avatar-empty">No avatar</div>
						{/if}
					</div>
					<div class="meta-area">
						<div class="meta-row">
							<strong>Name:</strong>
							{savePreview ? savePreview.name : '—'}
						</div>
						<div class="meta-row">
							<strong>Level:</strong>
							{savePreview ? savePreview.level : '—'}
						</div>
					</div>
				</div>
				<div class="save-preview-actions">
					<button class="btn confirm" on:click={confirmSavePreview}>Confirm Save</button>
					<button class="btn cancel" on:click={cancelSavePreview}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	{#if showInHubConversation && inHubConversationData}
		<InHubConversation
			npc={inHubConversationData}
			on:select={handleInHubSelect}
			on:close={handleInHubClose}
		/>
	{/if}

	<!-- Temporary debug panel: shows the active conversation object and last selected choice. Remove when debugging is finished. -->
	<!-- debug panel removed -->

	{#if showQuestBoard}
		<QuestBoard
			showBoard={showQuestBoard}
			on:close={() => (showQuestBoard = false)}
			on:accepted={() => {
				showQuests = true;
				questsAllowLocalActions = false;
				showQuestBoard = false;
			}}
		/>
	{/if}

	<!-- Potion roulette modal: listens for `potion:roulette` events and shows a spin window -->
	<PotionRoulette />

	{#if showLoadModal}
		<SaveSlotsModal
			open={showLoadModal}
			on:close={() => (showLoadModal = false)}
			on:loaded={async (e) => {
				const d = e.detail || {};
				const slotId = d.slotId || '—';
				const name = d.meta && d.meta.playerName ? d.meta.playerName : '—';
				// ask user to confirm which slot to load
				const proceed = confirm(`Load slot #${slotId} — ${name}?`);
				showLoadModal = false;
				if (!proceed) return;
				if (d.save && d.save.currentScene) {
					try {
						await sceneManager.loadScene(d.save.currentScene);
						try {
							alert(`Loaded slot #${slotId} — ${name}`);
						} catch {}
					} catch (err) {
						console.warn('Failed to load scene from slot', err);
						try {
							alert('Failed to load that scene');
						} catch {}
					}
				} else {
					try {
						alert(`Loaded slot #${slotId} — ${name} (no scene to restore)`);
					} catch {}
				}
			}}
		/>
	{/if}

	<!-- Left Side UI (centralized component) -->
	<LeftSideButtons 
		on:toggle={handleLeftSideToggle} 
		{hasNotifications}
	/>

	{#if showNotifications}
		<NotificationWindow 
			on:close={() => showNotifications = false}
		/>
	{/if}

	{#if showAdventureCard}
		<AdventureCard
			on:close={() => (showAdventureCard = false)}
			on:start={(e) => console.debug('start adventure', e.detail)}
			on:inspect={(e) => console.debug('inspect', e.detail)}
			on:advanceStats={(e) => {
				// store the payload so AdvancedStatsWindow can use the same character/playerData snapshot
				advancedStatsData = e.detail || null;
				showAdvancedStats = true;
			}}
			on:showTraits={(e) => {
				showTraitsModal = true;
				currentTraitsData = e.detail;
			}}
		/>
	{/if}

	{#if showEquipment}
		<div class="equipment-wrapper">
			<EquipmentPanel on:close={() => (showEquipment = false)} />
		</div>
	{/if}

	{#if showInventory}
		<div class="inventory-wrapper">
			<InventoryWindow
				on:close={() => (showInventory = false)}
				on:openEquipment={() => {
					showInventory = false;
					showEquipment = true;
				}}
				on:showMessage={(event) => {
					const { type, text } = event.detail;
					try {
						window.dispatchEvent(
							new CustomEvent('toast', {
								detail: { message: text, type }
							})
						);
					} catch (e) {
						console.warn('Failed to dispatch toast event:', e);
					}
				}}
			/>
		</div>
	{/if}

	{#if showSellBuy}
		<SellBuyWindow vendorName={sellVendorName} on:close={() => (showSellBuy = false)} />
	{/if}

	{#if showQuests}
		<div class="quests-wrapper">
			<QuestsWindow
				on:close={() => {
					showQuests = false;
					questsAllowLocalActions = false;
				}}
				allowLocalActions={questsAllowLocalActions}
				on:openReception={(e) => {
					// If the QuestsWindow requested auto-submit navigation, handle that directly
					try {
						const auto = e && e.detail && e.detail.auto;
						if (auto === 'submit-completed-quest') {
							// reuse receptionist submit logic: open Quests panel with local actions if a completed quest exists
							const active = get(questStore);
							if (active && active.status === 'completed' && active.result === 'success') {
								questsAllowLocalActions = true;
								showQuests = true;
								return;
							}
							// check persisted quests
							try {
								const gs = get(gameState) || {};
								const ch = gs.character || {};
								const list = Array.isArray(ch.quests) ? ch.quests : [];
								const completed = list.find((q) => q && q.status === 'completed');
								if (completed) {
									questsAllowLocalActions = true;
									showQuests = true;
									return;
								}
							} catch (e2) {
								console.warn('Failed to check persisted quests for completion', e2);
							}
							// fallback to opening the receptionist menu if no completed quest found
						}
					} catch (e) {
						console.warn('openReception auto handler failed', e);
					}
					// open the in-hub receptionist conversation (Xia/Chris)
					inHubConversationData = {
						name: 'Xia',
						snippet: 'Greetings — the guild keeps busy. Anything I can do for you?',
						npcPortrait: '/Images/NPC/npc-xia.PNG',
						choices: [
							{ id: 'check-available-quests', text: 'Check for available quests', trait: null },
							{ id: 'submit-completed-quest', text: 'Submit completed quest', trait: null },
									{ id: 'give-up-quest', text: 'Give up quest', trait: null },
									{ id: 'looking-for-party', text: 'Looking for a party', trait: null },
									{ id: 'heard-rumors', text: 'About quests', trait: null },
									{ id: 'about-monster-drops', text: 'About Monster Drops', trait: null }
						]
					};
					showInHubConversation = true;
					showQuests = false;
				}}
			/>
		</div>
	{/if}

	{#if showMap}
		<div class="map-wrapper">
			<MapWindow on:close={() => (showMap = false)} />
		</div>
	{/if}

	{#if navOpen}
		<div class="nav-wrapper">
			<NavWindow on:close={() => (navOpen = false)} />
		</div>
	{/if}

	{#if showAchievements}
		<div class="achievements-wrapper">
			<AchievementsWindow on:close={() => (showAchievements = false)} />
		</div>
	{/if}

	{#if showStatus}
		<div class="status-wrapper">
			<StatusWindow on:close={() => (showStatus = false)} />
		</div>
	{/if}

	{#if showAdvancedStats}
		<AdvancedStatsWindow
			on:close={() => (showAdvancedStats = false)}
			initialCharacter={advancedStatsData?.character}
			initialPlayerData={advancedStatsData?.playerData}
		/>
	{/if}

	{#if showTraitsModal}
		<TraitsModal
			on:close={() => {
				showTraitsModal = false;
				currentTraitsData = null;
			}}
		/>
	{/if}

	<button
		class="icon-btn"
		id="toggle-ui"
		aria-label={$gameState && $gameState.uiVisible ? 'Hide UI' : 'Show UI'}
		on:click={toggleUI}
	>
		{#if $gameState && $gameState.uiVisible}
			<i class="fas fa-eye-slash" aria-hidden="true"></i>
		{:else}
			<i class="fas fa-eye" aria-hidden="true"></i>
		{/if}
	</button>

	<!-- Bottom Elements -->
	<div id="exp-bar-container">
		<div id="exp-info">
			<span>Level {pd?.level || 1}</span>
			<span>{currentLevelExp}/{expNeededForNext} EXP</span>
		</div>
		<div id="exp-bar">
			<div
				id="exp-progress"
				role="progressbar"
				aria-valuenow={currentLevelExp}
				aria-valuemin="0"
				aria-valuemax={expNeededForNext}
				style="width:{expPct}%"
			></div>
		</div>
	</div>

	<!-- Bottom-right grouped controls: stacked info/exit and a bottom row with date/time + visibility toggle -->
	{#if bottomRightVisible}
		<div id="bottom-right-group" aria-hidden={!bottomRightVisible}>
			<div class="bottom-left">
				<div id="time-display" aria-label="Current Malaysia time">
					<div id="current-date" aria-label="Current date">{malaysiaDate}</div>
					<div id="current-time" aria-label="Current time">{malaysiaTime}</div>
				</div>
			</div>
			<div class="vertical-buttons">
				<!-- Navigation button inserted on top of Info button -->
				<button
					class="icon-btn"
					id="nav-btn"
					data-tooltip="Navigation"
					aria-label="Navigation"
					on:click={toggleNav}
				>
					<i class="fas fa-compass" aria-hidden="true"></i>
				</button>
				<button
					class="icon-btn"
					id="game-info-btn"
					data-tooltip="Game information"
					aria-label="Game information"
					on:click={() => (gameInfoOpen = !gameInfoOpen)}
				>
					<i class="fas fa-info-circle" aria-hidden="true"></i>
				</button>
				<button
					class="icon-btn"
					id="exit-btn"
					data-tooltip="Exit game"
					aria-label="Exit game"
					on:click={() => exitGame()}
				>
					<i class="fas fa-sign-out-alt" aria-hidden="true"></i>
				</button>
				<!-- removed inner toggle so the persistent toggle remains available when the group is hidden -->
			</div>
		</div>
	{/if}

	<!-- Persistent bottom-right toggle (always visible). Render only when preview modal is closed to avoid overlay artifacts -->
	{#if !showSavePreview}
		<button
			id="bottom-right-toggle"
			class="icon-btn persistent-toggle"
			class:persistent-hidden={persistentHidden}
			data-tooltip={bottomRightVisible ? 'Hide info' : 'Show info'}
			aria-label={bottomRightVisible ? 'Hide info' : 'Show info'}
			on:click={toggleBottomRight}
		>
			{#if bottomRightVisible}
				<i class="fas fa-eye-slash" aria-hidden="true"></i>
			{:else}
				<i class="fas fa-eye" aria-hidden="true"></i>
			{/if}
		</button>
	{/if}

	<!-- Game Info Panel -->
	<div id="game-info-panel" aria-hidden={!gameInfoOpen} class:active={gameInfoOpen}>
		<h3>Game Information</h3>
		<p>Version: 1.0.2</p>
		<p>Play Time: 15h 32m</p>
		<p>Last Saved: 2 hours ago</p>
		<p>Game ID: #A7B2C9</p>
	</div>

	<!-- Hidden import input for top-right import action -->
	<input
		bind:this={importInputEl}
		type="file"
		accept="application/json"
		style="display:none"
		on:change={async (e) => {
			const input = e && e.target;
			const file = input && input.files ? input.files[0] : null;
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (ev) => {
				try {
					const result = ev && ev.target && ev.target.result;
					if (typeof result === 'string') {
						const parsed = JSON.parse(result);
						// simple validation
						if (parsed && parsed.playerData && parsed.timestamp) {
							try {
								localStorage.setItem('game_save_data', stringifyPreferEncrypted(parsed));
							} catch (e) {
								localStorage.setItem('game_save_data', JSON.stringify(parsed));
							}
							try {
								alert('Save imported. Loading...');
							} catch {}
							setTimeout(() => {
								location.href = '/game';
							}, 200);
						} else {
							try {
								alert('Invalid save file');
							} catch {}
						}
					}
				} catch (err) {
					console.warn('import failed', err);
					try {
						alert('Import failed');
					} catch {}
				}
			};
			reader.onerror = () => {
				try {
					alert('Error reading file');
				} catch {}
			};
			reader.readAsText(file);
		}}
	/>

	<!-- Windows -->
	<!-- Adventure, Inventory, Quests, Status and Map windows removed per user request; buttons remain in the left-side UI -->

	<!-- Achievements window removed per user request; left-side achievements button remains -->

	<!-- Settings Modal -->
	<div id="settings-modal" aria-hidden="true">
		<div id="settings-content">
			<div id="settings-header">
				<h2>Game Settings</h2>
				<button id="close-settings" aria-label="Close settings"
					><i class="fas fa-times" aria-hidden="true"></i></button
				>
			</div>

			<div class="setting-group">
				<h3>Audio</h3>
				<div class="setting-option">
					<label for="master-volume">Master Volume:</label>
					<input
						type="range"
						id="master-volume"
						class="volume-slider"
						min="0"
						max="100"
						value="80"
						aria-label="Master volume"
					/>
					<span id="volume-value">80%</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Custom Tooltip -->
	<div
		id="custom-tooltip"
		aria-hidden={!tooltipVisible}
		class:show={tooltipVisible}
		class:right-side={tooltipRightSide}
		style="left: {tooltipLeft}px; top: {tooltipTop}px"
	>
		{tooltipText}
	</div>

	<!-- Loading Indicator -->
	<div id="loading-indicator" class="hidden" aria-hidden="true">
		<div class="loading-spinner"></div>
		<span>Loading...</span>
	</div>
</div>

<!-- Narrative Mode Container (kept for layout parity) -->
<div id="narrative-container" class="narrative-hidden">
	<div id="narrative-text"></div>
	<div id="narrative-controls">
		<!-- Back / Continue buttons removed per user request -->
	</div>
	<ElementAdv />
</div>

<style>
	/* Tooltips for top-right icon buttons */
	.icon-btn[data-tooltip] {
		position: relative;
	}
	/* Tooltip styles moved to global ui.css to avoid conflicts */


	/* For top-right controls (near the top of the viewport) show tooltip below the button instead of above so it doesn't go off-screen */
	/* Handled by ui.css now */
	/* Tooltip positioning handled by global ui.css now */

	/* Ensure bottom-right tooltips render above fixed elements like the persistent toggle */
	#bottom-right-group [data-tooltip] {
		position: relative; /* create a positioning context */
		z-index: 40000; /* bring the button above lower elements */
	}
	#bottom-right-group [data-tooltip]::after {
		z-index: 50000; /* ensure tooltip pseudo-element sits above fixed toggle */
	}

	/* Ensure persistent toggle has tooltip positioned slightly differently */
	/* Handled by ui.css now */

	/* Bottom-right grouped controls */
	#bottom-right-group {
		position: absolute;
		/* keep original right offset but raise the group so the persistent toggle can sit at the corner below it */
		right: 12px;
		bottom: calc(10px + 56px); /* push up by toggle height+gap (44+12) */
		display: flex;
		flex-direction: row;
		align-items: flex-end; /* align date/time to the bottom of the stacked buttons (toggle) */
		gap: 12px;
		z-index: 40; /* Ensure it sits above the persistent toggle (z-index 30) so tooltips aren't covered */
		overflow: visible;
	}

	/* Apprenticeship badges shown under top-right buttons */
	.apprentice-badges {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 8px;
		align-items: flex-end;
	}
	.apprentice-badge {
		background: rgba(94, 58, 255, 0.12);
		color: #fff;
		padding: 6px 8px;
		border-radius: 8px;
		font-size: 12px;
		border: 1px solid rgba(94, 58, 255, 0.18);
		box-shadow: 0 6px 18px rgba(2, 8, 23, 0.5);
	}
	#bottom-right-group .vertical-buttons {
		display: flex;
		flex-direction: column;
		gap: 6px;
		align-items: center;
		justify-content: flex-start;
		margin: 0;
		padding: 0;
		overflow: visible; /* Ensure tooltips aren't clipped */
	}
	#bottom-right-group .bottom-left {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-right: 6px;
	}
	/* Make time display behave like a button: same height as icon buttons, auto width */
	#time-display {
		display: inline-flex;
		flex-direction: column;
		justify-content: center;
		align-items: center; /* center contents for better visual balance */
		height: 44px;
		padding: 6px 14px; /* wider so date/time fits comfortably */
		min-width: 150px;
		box-sizing: border-box;
		color: #ddd;
		background: transparent;
		border-radius: 8px;
		width: auto;
		/* nudge down so the time/date aligns with the persistent toggle beneath the group */
		transform: translateY(calc(9px + 56px));
	}
	#time-display #current-date {
		font-weight: 600;
		font-size: 12px;
		line-height: 1;
		text-align: center;
		white-space: nowrap;
		margin: 0;
	}
	#time-display #current-time {
		font-family: 'Courier New', monospace;
		font-size: 14px;
		color: #cfcfcf;
		line-height: 1;
		text-align: center;
		white-space: nowrap;
		margin: 4px 0 0 0; /* small gap between date and time */
	}
	#bottom-right-group .icon-btn {
		width: 44px;
		height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		margin: 0;
		overflow: visible; /* Ensure tooltips aren't clipped */
	}

	/* ensure the first button (info) sits directly above the exit button */
	#bottom-right-group .vertical-buttons button:first-child {
		margin-top: 0;
	}

	/* Override global absolute rule for #game-info-btn when used inside this component's bottom-right group */
	#bottom-right-group #game-info-btn {
		position: static !important;
		right: auto !important;
		bottom: auto !important;
		margin: 0 !important;
	}

	/* Responsive: on narrow screens stack vertically */
	@media (max-width: 520px) {
		#bottom-right-group {
			flex-direction: column;
			right: 8px;
			bottom: 8px;
		}
		#bottom-right-group .bottom-left {
			order: 2;
		}
		#bottom-right-group .vertical-buttons {
			order: 1;
		}
	}

	/* persistent bottom-right toggle styling */
	#bottom-right-toggle.persistent-toggle {
		/* fixed at the corner beneath the vertical group; stays visible at viewport corner */
		position: fixed;
		right: 12px;
		bottom: 10px;
		width: 44px;
		height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		z-index: 30;
		border-radius: 8px;
		background: rgba(10, 8, 14, 0.6);
		color: #fff;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.36);
	}

	/* hidden state used while showing tooltips so they are not covered */
	#bottom-right-toggle.persistent-toggle.persistent-hidden {
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition: none !important;
	}

	/* Save preview modal styles */
	.save-preview-backdrop {
		position: fixed;
		left: 0;
		top: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 60000;
		/* ensure this layer is composited and appears immediately */
		will-change: opacity, transform;
		transform: translateZ(0);
		/* ensure the backdrop captures pointer events and shows the default arrow cursor
               so the entire viewport doesn't appear as a clickable/link cursor while modal is open */
		pointer-events: auto;
		cursor: default;
		-webkit-user-select: none;
		user-select: none;
	}

	/* When modal is open, only hide elements that interfere with the modal visual
           (avoid hiding the avatar and most UI; keep rest of UI visible but inert if needed) */
	.modal-open #bottom-right-toggle,
	.modal-open #bottom-right-group {
		opacity: 0 !important;
		visibility: hidden !important;
		pointer-events: none !important;
	}

	/* ensure modal backdrop covers everything and no element shows through */
	.modal-open {
		overflow: hidden;
	}

	/* force default cursor when modal is open to avoid pointer cursor bleeding through
           from underlying interactive elements (fixes 'clickable cursor' across viewport) */
	.modal-open,
	.modal-open * {
		cursor: default !important;
	}

	/* While modal is open, hide any tooltip pseudo-elements to avoid visual glitches */
	.modal-open [data-tooltip]::after,
	.modal-open [data-tooltip]::before {
		opacity: 0 !important;
		pointer-events: none !important;
		visibility: hidden !important;
	}
	.save-preview-modal {
		background: var(--ui-bg);
		border: 1px solid var(--ui-border);
		padding: 18px;
		border-radius: 10px;
		width: 360px;
		max-width: calc(100% - 40px);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
		color: #fff;
	}
	.save-preview-modal h3 {
		margin-bottom: 12px;
	}
	.save-preview-body {
		display: flex;
		gap: 12px;
		align-items: center;
	}
	.save-preview-body .avatar-area {
		width: 96px;
		height: 96px;
		border-radius: 8px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.03);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.save-preview-body .avatar-area img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.save-preview-body .avatar-empty {
		color: #cfcfcf;
		font-size: 12px;
	}
	.save-preview-body .meta-area {
		flex: 1;
		font-size: 14px;
	}
	.save-preview-body .meta-row {
		margin-bottom: 8px;
	}
	.save-preview-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
		margin-top: 14px;
	}
	.save-preview-actions .btn {
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid var(--ui-border);
		background: transparent;
		color: #fff;
		cursor: pointer;
	}
	.save-preview-actions .btn.confirm {
		background: linear-gradient(180deg, var(--accent-primary-hex), var(--accent-secondary-hex));
		border: none;
	}
	.save-preview-actions .btn.cancel {
		background: transparent;
	}



	@media (max-width: 520px) {
		/* on narrow screens, move the persistent toggle inward so it doesn't collide with responsive stacking */
		#bottom-right-toggle.persistent-toggle {
			right: 8px;
			bottom: 8px;
		}
		/* also ensure the main group stacks nicely */
		#bottom-right-group {
			right: 8px;
		}
	}
	/* Location panel styles */
	.location-panel {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 8vh;
		bottom: auto;
		width: min(520px, 92%);
		background: rgba(10, 12, 18, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.04);
		padding: 12px;
		border-radius: 10px;
		color: #e8f0ff;
		z-index: 1600;
	}
	.location-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}
	/* make the top row (place name + leave button) visually distinct */
	.location-header .location-title,
	.location-header .location-close {
		color: #ffd27a;
	}
	.location-title {
		font-weight: 700;
		text-transform: capitalize;
	}
	.location-close {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.04);
		color: inherit;
		padding: 6px 8px;
		border-radius: 6px;
		cursor: pointer;
	}
	.location-close:hover {
		background: rgba(255, 255, 255, 0.02);
		transform: translateY(-1px);
	}
	.location-close:focus {
		outline: 2px solid rgba(124, 181, 255, 0.35);
		outline-offset: 2px;
	}
	.npc-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.npc-item {
		display: flex;
		justify-content: space-between;
		padding: 8px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	.npc-name {
		font-weight: 600;
	}
	.npc-actions button {
		padding: 6px 10px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.03);
		color: inherit;
		cursor: pointer;
	}
	.npc-actions button:hover {
		background: rgba(255, 255, 255, 0.04);
		transform: translateY(-1px);
	}
	.npc-actions button:focus {
		outline: 2px solid rgba(124, 181, 255, 0.28);
		outline-offset: 2px;
	}
	.no-npcs {
		color: rgba(255, 255, 255, 0.7);
		font-style: italic;
	}

	/* Override MusicToggle fixed positioning to fit in the toolbar */
	.music-toggle-wrapper :global(.audio-control-container) {
		position: relative !important;
		top: auto !important;
		right: auto !important;
		margin: 0 !important;
		display: block !important; /* Reset flex column if needed, or keep flex but ensure it fits */
	}

	/* Match icon-btn styles */
	.music-toggle-wrapper :global(.audio-toggle) {
		width: 40px !important;
		height: 40px !important;
		border-radius: 8px !important;
		background: var(--ui-bg) !important;
		border: 1px solid var(--ui-border) !important;
	}

	.music-toggle-wrapper :global(.audio-toggle:hover) {
		border-color: rgba(255, 255, 255, 0.3) !important;
		transform: scale(1.05);
	}

	.music-toggle-wrapper :global(.volume-popup) {
		position: absolute !important;
		top: 45px !important;
		right: 0 !important;
		z-index: 1000 !important;
	}
</style>
