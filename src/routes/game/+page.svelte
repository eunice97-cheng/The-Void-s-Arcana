<script>
	// @ts-nocheck
	import { onMount, onDestroy, tick } from 'svelte';
	import { get } from 'svelte/store';
	import { gameState, personalityTraits, audioSettings } from '$lib/stores/gameState';
	import { simulateFight as simulateFightBrowser } from '$lib/utils/combatSimulator.browser.js';
	import { playSimulation } from '$lib/utils/combatPlayback.js';
	import { monsterBook } from '$lib/data/monsters';
	import { hasActiveQuest } from '$lib/stores/questStore';
	import { activeQuest, resetDailySelection, serverNow, ensureServerTime } from '$lib/stores/questStore';
	import { saveManager } from '$lib/stores/saveManager';
	import { startForActiveQuest, stop as stopLiveEngine } from '$lib/engine/liveCombatEngine.js';
	import { questTemplates } from '$lib/data/quests';
	import { questEnemyMap } from '$lib/data/questEnemyMap.js';
	import skillsDb from '$lib/data/skills.json';
	import { sceneManager } from '$lib/stores/sceneManager';
	import { gameScenes } from '$lib/data/scenes';
	// Hub UI intentionally hidden globally per user preference (testing-only hub removed).
	// Use the native history API (avoid importing non-existent helpers)
	import NarrativeScene from '$lib/components/scenes/NarrativeScene.svelte';
	import ConversationScene from '$lib/components/scenes/ConversationScene.svelte';
	import SaveSlotsModal from '$lib/components/ui/SaveSlotsModal.svelte';
// Free mode hub (original behavior restored)
import FreeModeHub from '$lib/components/FreeModeHub.svelte';
	import { saveSlotsManager } from '$lib/stores/saveSlotsManager';
	import { checkStoryProgress } from '$lib/stores/storyStore';
	import { loadAudioBlob } from '$lib/utils/audioLoader';

	// Lazy-load ChoiceScene to avoid top-level import issues
	let choiceComponent = null;
	let choiceLoading = false;
	let choiceError = null;

	// Background Audio for Scenes 1-5
	/** @type {HTMLAudioElement} */
	let bgmBirds;
	/** @type {HTMLAudioElement} */
	let bgmWaves;
	/** @type {HTMLAudioElement} */
	let bgmTavern;
	/** @type {HTMLAudioElement} */
	let bgmInn;
	/** @type {HTMLAudioElement} */
	let bgmGuild;
	/** @type {HTMLAudioElement} */
	let bgmBasement;
	/** @type {HTMLAudioElement} */
	let bgmGame;
	/** @type {HTMLAudioElement} */
	let bgmForest;

	// Blob Audio Loader
	// Imported from $lib/utils/audioLoader

	let srcBirds = '';
	let srcWaves = '';
	let srcTavern = '';
	let srcInn = '';
	let srcGuild = '';
	let srcBasement = '';
	let srcForest = '';

	const gameTracks = [
		'/Audio/Scenes/Game.mp3',
		'/Audio/Scenes/Game1.mp3',
		'/Audio/Scenes/Game2.mp3',
		'/Audio/Scenes/Game3.mp3',
		'/Audio/Scenes/Game4.mp3',
		'/Audio/Scenes/Game5.mp3'
	];
	let currentGameTrack = ''; // Initialize empty, load on mount

	async function onGameTrackEnded() {
		// Pick a new random track that is preferably different from the current one
		let nextTrackUrl;
		// Find current URL index if possible to avoid repeat
		const currentUrl = Array.from(audioBlobCache.entries()).find(([k, v]) => v === currentGameTrack)?.[0];
		
		do {
			nextTrackUrl = gameTracks[Math.floor(Math.random() * gameTracks.length)];
		} while (nextTrackUrl === currentUrl && gameTracks.length > 1);
		
		currentGameTrack = await loadAudioBlob(nextTrackUrl);
		
		// Allow Svelte to update the src, then play
		setTimeout(() => {
			if (bgmGame) {
				safePlay(bgmGame);
			}
		}, 50);
	}

	// Helper to fade audio volume
	function fadeAudio(audio, targetVolume, duration = 1000) {
		if (!audio) return;
		
		// Clear existing interval if any to prevent conflicts
		// @ts-ignore
		if (audio._fadeInterval) {
			// @ts-ignore
			clearInterval(audio._fadeInterval);
		}

		const startVolume = audio.volume;
		const steps = 20;
		const stepTime = duration / steps;
		const volStep = (targetVolume - startVolume) / steps;
		let currentStep = 0;

		// @ts-ignore
		audio._fadeInterval = setInterval(() => {
			currentStep++;
			let newVol = startVolume + (volStep * currentStep);
			// Clamp volume
			if (newVol < 0) newVol = 0;
			if (newVol > 1) newVol = 1;
			
			try {
				audio.volume = newVol;
			} catch (e) { /* ignore */ }

			if (currentStep >= steps) {
				// @ts-ignore
				clearInterval(audio._fadeInterval);
				// @ts-ignore
				audio._fadeInterval = null;
				audio.volume = targetVolume;
			}
		}, stepTime);
	}

	// Helper to safely play audio
	function safePlay(audio) {
		if (!audio) return;
		// Check if audio is already playing to avoid interruption
		if (!audio.paused && audio.currentTime > 0 && !audio.ended) {
			return;
		}
		const playPromise = audio.play();
		if (playPromise !== undefined) {
			playPromise.catch(error => {
				// Auto-play was prevented
				// We can't force it, but we can suppress the error
				console.warn('Audio playback prevented:', error);
			});
		}
	}

	// Audio Unlocker Implementation
	function unlockAudio() {
		// Create and play silent audio on user interaction
		const silentAudio = new Audio();
		silentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ';
		silentAudio.volume = 0.01;
		
		silentAudio.play()
			.then(() => {
				console.log('Audio unlocked successfully');
				// Remove listeners once unlocked
				document.removeEventListener('click', unlockAudio);
				document.removeEventListener('keydown', unlockAudio);
				document.removeEventListener('touchstart', unlockAudio);
			})
			.catch(e => {
				console.warn('Audio unlock attempt failed:', e);
			});
	}

	$: audioEnabled = $gameState?.audioEnabled ?? $audioSettings?.enabled;
	$: bgmMultiplier = ($audioSettings?.bgmVolume ?? 50) / 100;
	$: sfxMultiplier = ($audioSettings?.sfxVolume ?? 50) / 100;

	// Determine if the active quest is non-combat (beginner, daily, dummy)
	$: activeQuestObj = $activeQuest;
	$: isNonCombatQuest = activeQuestObj && (
		(activeQuestObj.template && (activeQuestObj.template.series === 'beginner' || activeQuestObj.template.series === 'daily' || activeQuestObj.template.series === 'dummy')) ||
		(activeQuestObj.series === 'beginner' || activeQuestObj.series === 'daily' || activeQuestObj.series === 'dummy')
	);

	let previousSceneTitle = null;
	$: if (currentScene) {
		const title = currentScene.title;

		// Story Completion Logic
		if (previousSceneTitle === 'Scene056' && title === 'free-mode') {
			console.log('[Game] Completed Scene056 -> Free Mode. Setting story flag and unlocking map.');
			gameState.update(s => {
				const flags = s.character?.storyFlags || {};
				const unlocks = s.character?.unlocks || {};
				
				let changed = false;
				
				// Set story flag
				if (!flags['met_alexa_level_3']) {
					flags['met_alexa_level_3'] = true;
					changed = true;
				}
				
				// Unlock map
				if (!unlocks.map) {
					unlocks.map = true;
					changed = true;
				}

				if (changed) {
					return { 
						...s, 
						character: { 
							...s.character, 
							storyFlags: flags,
							unlocks: unlocks
						} 
					};
				}
				return s;
			});
			// Re-check notifications to clear the "Summons" notification
			checkStoryProgress();
		}
		previousSceneTitle = title;
		
		// Birds & Waves Logic
		let shouldPlayBirdsWaves = false;
		if (typeof title === 'string' && title.startsWith('Scene')) {
			const num = parseInt(title.replace('Scene', ''), 10);
			if (!isNaN(num) && num >= 1 && num <= 6) {
				shouldPlayBirdsWaves = true;
			}
		}

		if (shouldPlayBirdsWaves && audioEnabled) {
			if (bgmBirds && bgmBirds.paused) {
				bgmBirds.volume = 1.0 * bgmMultiplier;
				safePlay(bgmBirds);
			}
			if (bgmWaves && bgmWaves.paused) {
				bgmWaves.volume = 1.0 * bgmMultiplier;
				safePlay(bgmWaves);
			}
		} else {
			if (bgmBirds) bgmBirds.pause();
			if (bgmWaves) bgmWaves.pause();
		}

		// Tavern Logic
		let shouldPlayTavern = false;
		if (currentScene.background && currentScene.background.includes('Tavern.png')) {
			shouldPlayTavern = true;
		}

		if (shouldPlayTavern && audioEnabled) {
			if (bgmTavern) {
				const hasSceneAudio = !!currentScene.audio;
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				
				if (bgmTavern.paused) {
					bgmTavern.volume = targetVol;
					safePlay(bgmTavern);
				} else {
					if (Math.abs(bgmTavern.volume - targetVol) > 0.01) {
						fadeAudio(bgmTavern, targetVol, 800);
					}
				}
			}
		} else {
			if (bgmTavern) bgmTavern.pause();
		}

		// Inn Logic
		let shouldPlayInn = false;
		if (currentScene.background && (currentScene.background.includes('Inn.png') || currentScene.background.includes('Inn2.png'))) {
			shouldPlayInn = true;
		}

		if (shouldPlayInn && audioEnabled) {
			if (bgmInn) {
				const hasSceneAudio = !!currentScene.audio;
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				
				if (bgmInn.paused) {
					bgmInn.volume = targetVol;
					safePlay(bgmInn);
				} else {
					if (Math.abs(bgmInn.volume - targetVol) > 0.01) {
						fadeAudio(bgmInn, targetVol, 800);
					}
				}
			}
		} else {
			if (bgmInn) {
				bgmInn.pause();
				// @ts-ignore
				if (bgmInn._fadeInterval) clearInterval(bgmInn._fadeInterval);
			}
		}

		// Guild Hall Logic
		let shouldPlayGuild = false;
		if (currentScene.background && (currentScene.background.includes('Guild Hall.png') || currentScene.background.includes('Artifact.PNG'))) {
			shouldPlayGuild = true;
		}
		if (title === 'PickClass') {
			shouldPlayGuild = true;
		}

		// Also treat Scene056 through Scene105 as Guild-related so the Guild BGM
		// continues during the Sandy Bay / Guild visit sequence.
		if (typeof title === 'string' && title.startsWith('Scene')) {
			const num = parseInt(title.replace('Scene', ''), 10);
			if (!isNaN(num) && num >= 56 && num <= 105) {
				shouldPlayGuild = true;
			}
		}

		if (shouldPlayGuild && audioEnabled) {
			if (bgmGuild) {
				const hasSceneAudio = !!currentScene.audio;
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				
				if (bgmGuild.paused) {
					bgmGuild.volume = targetVol;
					safePlay(bgmGuild);
				} else {
					if (Math.abs(bgmGuild.volume - targetVol) > 0.01) {
						fadeAudio(bgmGuild, targetVol, 800);
					}
				}
			}
		} else {
			if (bgmGuild) {
				bgmGuild.pause();
				// @ts-ignore
				if (bgmGuild._fadeInterval) clearInterval(bgmGuild._fadeInterval);
			}
		}

		// Guild Basement Logic (Scene034-Scene041 + Ritual-Q1-Q10)
		let shouldPlayBasement = false;
		if (typeof title === 'string') {
			if (title.startsWith('Scene')) {
				const num = parseInt(title.replace('Scene', ''), 10);
				if (!isNaN(num) && num >= 34 && num <= 41) {
					shouldPlayBasement = true;
				}
			} else if (title.startsWith('Ritual-Q')) {
				shouldPlayBasement = true;
			}
		}

		if (shouldPlayBasement && audioEnabled) {
			if (bgmBasement) {
				const hasSceneAudio = !!currentScene.audio;
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				
				if (bgmBasement.paused) {
					bgmBasement.volume = targetVol;
					safePlay(bgmBasement);
				} else {
					if (Math.abs(bgmBasement.volume - targetVol) > 0.01) {
						fadeAudio(bgmBasement, targetVol, 800);
					}
				}
			}
		} else {
			if (bgmBasement) {
				bgmBasement.pause();
				// @ts-ignore
				if (bgmBasement._fadeInterval) clearInterval(bgmBasement._fadeInterval);
			}
		}

		// Forest Logic (Scene107-Scene113)
		let shouldPlayForest = false;
		if (typeof title === 'string') {
			if (title.startsWith('Scene')) {
				const num = parseInt(title.replace('Scene', ''), 10);
				if (!isNaN(num) && num >= 107 && num <= 113) {
					shouldPlayForest = true;
				}
			} else if (title === 'Alexus Spear Training Scene' || title === 'HorseScene') {
				shouldPlayForest = true;
			}
		}

		if (shouldPlayForest && audioEnabled) {
			if (bgmForest) {
				// Ensure volume is correct even if already playing
				const hasSceneAudio = !!currentScene.audio && currentScene.audio !== '/Audio/Forest.mp3';
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				
				if (bgmForest.paused) {
					bgmForest.volume = targetVol;
					safePlay(bgmForest);
				} else {
					// If already playing, just adjust volume if needed
					if (Math.abs(bgmForest.volume - targetVol) > 0.01) {
						fadeAudio(bgmForest, targetVol, 800);
					}
				}
			}
		} else {
			if (bgmForest) {
				bgmForest.pause();
				// @ts-ignore
				if (bgmForest._fadeInterval) clearInterval(bgmForest._fadeInterval);
			}
		}

		// Free Mode Logic (Game.mp3)
		let shouldPlayGame = false;
		if (title === 'free-mode') {
			shouldPlayGame = true;
		}

		// Ensure exclusivity: stop Game BGM if any other BGM is active
		if (shouldPlayBirdsWaves || shouldPlayTavern || shouldPlayInn || shouldPlayGuild || shouldPlayBasement || shouldPlayForest) {
			shouldPlayGame = false;
		}

		if (shouldPlayGame && audioEnabled) {
			if (bgmGame) {
				if (bgmGame.paused) {
					bgmGame.volume = 1.0 * bgmMultiplier;
					safePlay(bgmGame);
				}
				
				// Ducking logic
				const hasSceneAudio = !!currentScene.audio;
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				
				// Only fade if significant difference to avoid jitter
				if (Math.abs(bgmGame.volume - targetVol) > 0.01) {
					fadeAudio(bgmGame, targetVol, 800);
				}
			}
		} else {
			if (bgmGame) {
				bgmGame.pause();
				// @ts-ignore
				if (bgmGame._fadeInterval) clearInterval(bgmGame._fadeInterval);
			}
		}
	}

	// React to audio toggle
	$: if (bgmBirds && bgmWaves && bgmTavern && bgmInn && bgmGuild && bgmBasement && bgmGame && bgmForest) {
		if (!audioEnabled) {
			bgmBirds.pause();
			bgmWaves.pause();
			bgmTavern.pause();
			bgmInn.pause();
			bgmGuild.pause();
			bgmBasement.pause();
			bgmGame.pause();
			bgmForest.pause();
		} else if (currentScene) {
			// Re-evaluate playback when enabled
			const title = currentScene.title;
			
			// Birds/Waves
			let shouldPlayBirdsWaves = false;
			if (typeof title === 'string' && title.startsWith('Scene')) {
				const num = parseInt(title.replace('Scene', ''), 10);
				if (!isNaN(num) && num >= 1 && num <= 6) {
					shouldPlayBirdsWaves = true;
				}
			}
			if (shouldPlayBirdsWaves) {
				bgmBirds.volume = 1.0 * bgmMultiplier;
				bgmBirds.play().catch(() => {});
				bgmWaves.volume = 1.0 * bgmMultiplier;
				bgmWaves.play().catch(() => {});
			}

			// Tavern
			let shouldPlayTavern = false;
			if (currentScene.background && currentScene.background.includes('Tavern.png')) {
				shouldPlayTavern = true;
			}
			if (shouldPlayTavern) {
				const hasSceneAudio = !!currentScene.audio;
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				bgmTavern.volume = targetVol;
				if (bgmTavern.paused) {
					bgmTavern.play().catch(() => {});
				}
			}

			// Inn
			let shouldPlayInn = false;
			if (currentScene.background && (currentScene.background.includes('Inn.png') || currentScene.background.includes('Inn2.png'))) {
				shouldPlayInn = true;
			}
			if (shouldPlayInn) {
				const hasSceneAudio = !!currentScene.audio;
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				bgmInn.volume = targetVol;
				if (bgmInn.paused) {
					bgmInn.play().catch(() => {});
				}
			}

			// Guild Hall
			let shouldPlayGuild = false;
			if (currentScene.background && (currentScene.background.includes('Guild Hall.png') || currentScene.background.includes('Artifact.PNG'))) {
				shouldPlayGuild = true;
			}
			if (title === 'PickClass') {
				shouldPlayGuild = true;
			}
			// Also treat Scene056 through Scene105 as Guild-related
			if (typeof title === 'string' && title.startsWith('Scene')) {
				const num = parseInt(title.replace('Scene', ''), 10);
				if (!isNaN(num) && num >= 56 && num <= 105) {
					shouldPlayGuild = true;
				}
			}
			if (shouldPlayGuild) {
				const hasSceneAudio = !!currentScene.audio;
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				bgmGuild.volume = targetVol;
				if (bgmGuild.paused) {
					bgmGuild.play().catch(() => {});
				}
			}

			// Guild Basement
			let shouldPlayBasement = false;
			if (typeof title === 'string') {
				if (title.startsWith('Scene')) {
					const num = parseInt(title.replace('Scene', ''), 10);
					if (!isNaN(num) && num >= 34 && num <= 41) {
						shouldPlayBasement = true;
					}
				} else if (title.startsWith('Ritual-Q')) {
					shouldPlayBasement = true;
				}
			}
			if (shouldPlayBasement) {
				const hasSceneAudio = !!currentScene.audio;
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				bgmBasement.volume = targetVol;
				if (bgmBasement.paused) {
					bgmBasement.play().catch(() => {});
				}
			}

			// Forest
			let shouldPlayForest = false;
			if (typeof title === 'string') {
				if (title.startsWith('Scene')) {
					const num = parseInt(title.replace('Scene', ''), 10);
					if (!isNaN(num) && num >= 107 && num <= 113) {
						shouldPlayForest = true;
					}
				} else if (title === 'Alexus Spear Training Scene' || title === 'HorseScene') {
					shouldPlayForest = true;
				}
			}
			if (shouldPlayForest) {
				const hasSceneAudio = !!currentScene.audio && currentScene.audio !== '/Audio/Forest.mp3';
				const targetVol = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				bgmForest.volume = targetVol;
				if (bgmForest.paused) {
					bgmForest.play().catch(() => {});
				}
			}

			// Free Mode (Game)
			let shouldPlayGame = false;
			if (title === 'free-mode') {
				shouldPlayGame = true;
			}
			if (shouldPlayGame) {
				const hasSceneAudio = !!currentScene.audio;
				bgmGame.volume = (hasSceneAudio ? 0.3 : 1.0) * bgmMultiplier;
				bgmGame.play().catch(() => {});
			}
		}
	}

	async function loadChoiceComponent() {
		if (choiceComponent || choiceLoading) return;
		choiceLoading = true;
		choiceError = null;
		try {
			const mod = await import('$lib/components/scenes/ChoiceScene.svelte');
			choiceComponent = mod.default;
		} catch (err) {
			console.error('Failed to lazy-load ChoiceScene:', err);
			choiceError = err;
		} finally {
			choiceLoading = false;
		}
	}

	let currentScene = null;
	let showSlotsModal = false;
	// debug helpers
	let debugLogs = [];
	let resolvedSceneTitle = null;
	let legacySaveRaw = null;

	// internal guard so handlers are installed only once per page life
	let _blockInstalled = false;
	let _unsubscribeScene = null;
	let _unsubscribeTraits = null;
	let _unsubscribeActiveQuest = null;
	// store handler refs for cleanup
	let _onPop = null;
	let _onKey = null;
	let _keyOptions = null;
	let _onBeforeUnload = null;
	let _onQuestSubmitted = null;
	let _onQuestCompleted = null;
	let _engineStartedForQuest = null;
	let _travelAnimationInterval = null;
	let _narrativeInsertedForQuest = null;
	let _travelBackInsertedForQuest = null;
	let _travelBackTimeout = null;
	let _processingQuest = false;
	// Track cancellation and indices for post-quest animations so they can be
	// stopped immediately when the quest timer transitions to completed.
	let cancelPostQuestAnim = false;
	let _postQuestTravelIdx = null;
	let _lastQuestStatus = null;

	// in-game quest simulator UI state
	// Re-enable the combat log by default (was previously hidden during debugging)
	let logExpanded = true;
	// `simVisible` represents the actual visual state of the log content element.
	// We track it separately to avoid races where `logExpanded` may be changed
	// by other reactive logic; the Show/Hide toggle will drive `simVisible`.
	let simVisible = true;
	let simLogEl = null;
// When true, the reactive auto-scroll will be suppressed so the user can
// scroll up without being forced back to the bottom by new log events.
let suspendAutoScroll = false;

// Disable Clear button until the active quest is completed (timer reaches 0).
let clearDisabled = false;
$: try {
    clearDisabled = $hasActiveQuest && $activeQuest && $activeQuest.status !== 'completed';
} catch (e) {}

	async function scrollLogToBottom() {
		try {
			await tick();
			if (simLogEl) {
				// smooth scrolling helps UX; fall back to immediate if not supported
				try {
					simLogEl.scrollTo({ top: simLogEl.scrollHeight, behavior: 'smooth' });
				} catch (e) {
					simLogEl.scrollTop = simLogEl.scrollHeight;
				}
			}
		} catch (e) {}
	}

$: if (simLogEl && logExpanded && Array.isArray(combatLogs)) {
	// Run the scroll helper whenever the log is visible and `combatLogs` changes.
	// Referencing `combatLogs.length` ensures this reactive block runs on updates.
	const _len = combatLogs.length;
	if (!suspendAutoScroll) scrollLogToBottom();
}

// Called when the user manually scrolls the combat log. When the user is
// not at the bottom, suspend auto-scroll so they can read older lines.
function onCombatLogScroll() {
	try {
		if (!simLogEl) return;
		const atBottom = simLogEl.scrollTop + simLogEl.clientHeight >= simLogEl.scrollHeight - 8;
		if (atBottom) {
			if (suspendAutoScroll) {
				suspendAutoScroll = false;
				// snap to bottom once auto-scroll is re-enabled
				scrollLogToBottom();
			}
		} else {
			suspendAutoScroll = true;
		}
	} catch (e) {
		/* ignore */
	}
}

async function setLogVisible(visible) {
	try {
		logExpanded = !!visible;
		simVisible = !!visible;
		// Keep left-side UI class in sync
		try {
			if (typeof document !== 'undefined' && document && document.body) {
				if (logExpanded) document.body.classList.add('hide-left-ui');
				else document.body.classList.remove('hide-left-ui');
			}
		} catch (e) {}

		// Ensure the DOM element is explicitly hidden/shown for reliability
		try {
			// If the element isn't bound yet (rare), await a tick for binding.
			if (!simLogEl) {
				// eslint-disable-next-line no-await-in-loop
				await tick();
			}
			if (simLogEl) {
				if (!logExpanded) {
					simLogEl.classList.add('collapsed');
					simLogEl.style.display = 'none';
				} else {
					// remove collapsed class first so CSS display rules no longer apply
					simLogEl.classList.remove('collapsed');
					// clear inline style to allow normal CSS to apply
					simLogEl.style.display = '';
					// force reflow to ensure browser updates layout
					// eslint-disable-next-line no-unused-expressions
					simLogEl.offsetHeight;
					// scroll to bottom so users see recent entries when showing
					try {
						scrollLogToBottom();
					} catch (e) {}
				}
				// Debugging: log visibility state
				try {
					// eslint-disable-next-line no-console
					console.debug('[combat-log] setLogVisible', { logExpanded, simVisible, hasEl: !!simLogEl, classList: simLogEl.className, styleDisplay: simLogEl.style.display });
				} catch (e) {}
			}
		} catch (e) {}
	} catch (e) {}
}

// Auto-open the combat log when entries arrive (if enabled)
$: if (autoOpenOnCombat && Array.isArray(combatLogs) && combatLogs.length > 0 && !logExpanded) {
	logExpanded = true;
}

// Idle detection for travel-back narrative:
// When combat log is idle for `TRAVEL_BACK_IDLE_MS`, insert the travel-back narrative once per quest.
const TRAVEL_BACK_IDLE_MS = 30000;
let _travelIdleTimer = null;

function _clearTravelIdleTimer() {
	try {
		if (_travelIdleTimer) {
			clearTimeout(_travelIdleTimer);
			_travelIdleTimer = null;
		}
	} catch (e) {}
}

function _scheduleTravelBackForIdle() {
	try {
		_clearTravelIdleTimer();
		const aq = get(activeQuest) || {};
		const qid = aq.title || aq.templateId || aq.id || null;
		if (!qid) return;
		if (_travelBackInsertedForQuest === qid) return;
		_travelIdleTimer = setTimeout(async () => {
			try {
				const nowAq = get(activeQuest) || {};
				const nowId = nowAq.title || nowAq.templateId || nowAq.id || null;
				if (!nowId || _travelBackInsertedForQuest === nowId) return;
				await maybeInsertTravelBackNarrative();
				_travelBackInsertedForQuest = nowId;
			} catch (e) {
				/* ignore */
			}
		}, TRAVEL_BACK_IDLE_MS);
	} catch (e) {}
}

// Reset the idle timer whenever combatLogs changes (new activity).
$: if (Array.isArray(combatLogs)) {
	const _lenForIdle = combatLogs.length;
	try {
		_scheduleTravelBackForIdle();
	} catch (e) {}
}

// Auto-hide the combat log when there are no pending or active quests.
// Previously this hid based on quest timer completion; change to wait until the
// player submits a completed quest or abandons/fails it (so the quest UI drives visibility).
$: {
	try {
		const gs = get(gameState) || {};
		const ch = gs.character || {};
		const quests = Array.isArray(ch.quests) ? ch.quests : [];
		const hasPendingQuest = quests.some((q) => q && (q.status === 'in_progress' || q.status === 'completed' || q.status === 'failed'));
		const hasActive = !!(get(activeQuest));
		if (!hasPendingQuest && !hasActive && logExpanded) {
			// Close the panel and restore left-side UI
			logExpanded = false;
			try {
				if (typeof document !== 'undefined' && document && document.body) {
					document.body.classList.remove('hide-left-ui');
				}
			} catch (e) {}
		}
	} catch (e) {}
}

	// combat log storage (captures `combat:log` events dispatched by playback)
	let combatLogs = [];

	// Persist combat logs to session storage to survive reloads during a quest
	$: if (typeof window !== 'undefined' && combatLogs) {
		try {
			const aq = get(activeQuest);
			// Only save if we have an active quest in progress
			if (aq && aq.status === 'in_progress') {
				// Debounce slightly or just save (logs update frequently)
				// For simplicity, we save on every update but rely on the browser's speed.
				// Limit to last 500 to match UI limit and save space
				const toSave = combatLogs.slice(-500);
				sessionStorage.setItem('voids_combat_logs', JSON.stringify(toSave));
			} else if (!aq) {
				// If no quest, clear logs
				sessionStorage.removeItem('voids_combat_logs');
			}
		} catch (e) {
			/* ignore storage errors */
		}
	}

	// Prevent duplicate quest accepts and travels
	let acceptedQuestTitles = new Set();
	let traveledPlaces = new Set();

	// Track seen target instances by name so we can show per-instance numbers
	// Example: { "Giant Cave Bat": [{id:1, alive:true}, {id:2, alive:false}], ... }
	let targetInstances = {};
	let targetNextId = {};
	// remember the last instance assigned by _assignInstanceForTarget so callers can announce encounters
	let _lastAssignedTarget = null;
	// track which (name,id) encounters we've already announced
	let announcedEncounters = {};
	// remember whether we've already injected pre-departure narrative for current activeQuest transition
	let _lastHasActive = false;
	// track which completions we've already announced per quest -> targetName
	let completionAnnounced = {};
	// debounce 'Searching for any drop(s)' per quest+target to avoid spam
	let lastCollectAt = {};
	const COLLECT_DEBOUNCE_MS = 500;
	// track last displayed completed count per quest+target to avoid duplicate Completed lines
	let lastDisplayedCompleted = {};
	// track whether we've announced the overall quest-level collection/completion to avoid duplicates
	let questCompletionAnnounced = {};
	// track seen target base names per quest so completion checks persist across events
	let questSeenNames = {};
	// Pause before starting the live engine so travel/arrival narration appears first
	// Narrative/Flavor state
	let questNarrativeStartedFor = null; // templateId or quest id

// When false, avoid emitting narrative/flavor lines into `combatLogs`.
// Internal bookkeeping still runs so quest state and completion detection
// are unaffected; only the user-visible prose is suppressed.
// Enable narrative lines (pre-departure travel, etc.) when true.
const NARRATIVE_ENABLED = true;

// Auto-open combat log when new activity appears. Set to `false` if you
// prefer manual toggling only.
let autoOpenOnCombat = true;
	// Keep promises for ongoing narratives so callers can await the same completion
	let _questNarrativePromises = {};
	// Track combat event index for staggering log display
	let combatEventIndex = 0;

	function rollChance(p) {
		return Math.random() < p;
	}

	// Helper: format a duration and schedule a narrative line after a delay
	function formatDurationMs(ms) {
		try {
			if (ms < 1000) return `${ms}ms`;
			return `${Math.round(ms / 1000)}s`;
		} catch (e) {
			return '';
		}
	}

	function pushWithDelay(msg, delayMs, includeDuration) {
		try {
			const dur = includeDuration ? ` (Duration: ${formatDurationMs(delayMs)})` : '';
			setTimeout(() => {
				try {
					if (NARRATIVE_ENABLED) {
						combatLogs.push(msg + dur);
						combatLogs = [...combatLogs];
						if (combatLogs.length > 500) combatLogs.splice(0, combatLogs.length - 500);
					}
				} catch (e) {
					/* ignore push errors */
				}
			}, delayMs);
		} catch (e) {
			/* ignore scheduling errors */
		}
	}

	async function maybeInsertPreDepartureNarrative() {
			try {
				if (!NARRATIVE_ENABLED) return Promise.resolve();
			const aq = get(activeQuest) || {};
			const tpl = aq.template || {}; // template may be embedded
			const tplId = aq.templateId || tpl.id || aq.id || null;
			if (!tplId) return Promise.resolve();

			// If a narrative promise already exists for this tplId, return it so callers can await
			if (_questNarrativePromises[tplId]) {
				return _questNarrativePromises[tplId];
			}

			// Create and store the promise for this narrative before marking started, so concurrent
			// callers will see the promise and await the same completion (avoids races where
			// `questNarrativeStartedFor` is set but the promise hasn't been stored yet).
			_questNarrativePromises[tplId] = (async () => {
				try {
					// announce pick/leave using player name so behavior is consistent with other lines
					const title = (tpl && tpl.title) || (aq && aq.title) || 'Quest';
					const playerName = (get(gameState).character && get(gameState).character.name) || 'You';
					const place =
						((tpl && tpl.location) || '').split('->').pop().split('-').pop().trim() || 'Unknown';

					combatLogs.push({ text: `${playerName} picked Quest : ${title}`, isAnimated: false });
					combatLogs.push({ text: 'Leaving Guild Hall...', isAnimated: false });
					let currentIndex = combatLogs.length - 1;
					let currentBase = 'Leaving Guild Hall';
					// Animate for 15 seconds, adding new lines at 5s and 10s
					let elapsed = 0;
					const startTime = Date.now();
					while (elapsed < 15000) {
						await new Promise((resolve) => setTimeout(resolve, 1000));
						elapsed = Date.now() - startTime;
						if (elapsed >= 5000 && currentBase === 'Leaving Guild Hall') {
							// Set previous to static
							combatLogs[currentIndex].text = 'Leaving Guild Hall';
							// Push new
							combatLogs.push({ text: `Travel to ${place}...`, isAnimated: false });
							currentIndex = combatLogs.length - 1;
							currentBase = `Travel to ${place}`;
						} else if (elapsed >= 10000 && currentBase === `Travel to ${place}`) {
							// Set previous to static
							combatLogs[currentIndex].text = `Travel to ${place}`;
							// Push new
							combatLogs.push({ text: `Arrived at ${place}...`, isAnimated: false });
							currentIndex = combatLogs.length - 1;
							currentBase = `Arrived at ${place}`;
						}
						const dots = '.'.repeat(Math.floor(elapsed / 1000) % 4);
						combatLogs[currentIndex].text = currentBase + dots;
						combatLogs = [...combatLogs];
					}
					// Final static text for the last line
					combatLogs[currentIndex].text = `Arrived at ${place}`;

					return;
				} catch (e) {
					/* ignore */
					return;
				} finally {
					// Clean up the stored promise, but keep it resolved to prevent re-run
					try {
						_questNarrativePromises[tplId] = Promise.resolve();
					} catch (e) {}
				}
			})();

			return _questNarrativePromises[tplId];
		} catch (e) {
			/* ignore */
			return Promise.resolve();
		}
	}

async function maybeInsertTravelBackNarrative() {
	if (!NARRATIVE_ENABLED) return;
	cancelPostQuestAnim = false;
	const aq = get(activeQuest) || {};
	const questId = aq.title || aq.templateId || aq.id || 'unknown';
	if (_travelBackInsertedForQuest === questId) return;
	_travelBackInsertedForQuest = questId;

	try {
		// Push collecting line and animate dots for 30s (user requested pause)
		combatLogs.push({ text: 'Collecting proofs of Quest Completion', isAnimated: false });
		combatLogs = [...combatLogs];
		const collectIdx = combatLogs.length - 1;
		const collectStart = Date.now();
			while (Date.now() - collectStart < 30000) {
			// update every second
			// eslint-disable-next-line no-await-in-loop
			await new Promise((r) => setTimeout(r, 1000));
			const dots = '.'.repeat(Math.floor((Date.now() - collectStart) / 1000) % 4);
			combatLogs[collectIdx].text = 'Collecting proofs of Quest Completion' + dots;
			combatLogs = [...combatLogs];
		}
			// finalize the collecting line without trailing dots once animation completes
			try {
				combatLogs[collectIdx].text = 'Collecting proofs of Quest Completion';
				combatLogs = [...combatLogs];
			} catch (e) {}

		// Then push travel line and animate dots continuously until quest completion
		combatLogs.push({ text: 'Traveling back to Town', isAnimated: false });
		combatLogs = [...combatLogs];
		const travelIdx = combatLogs.length - 1;
		_postQuestTravelIdx = travelIdx;
		const travelStart = Date.now();
		// start an interval updater that will be cleared when quest completes
		try {
			if (_travelAnimationInterval) {
				clearInterval(_travelAnimationInterval);
				_travelAnimationInterval = null;
			}
			_travelAnimationInterval = setInterval(() => {
				try {
					if (cancelPostQuestAnim) {
						clearInterval(_travelAnimationInterval);
						_travelAnimationInterval = null;
						// replace with final arrival text
						try {
							if (typeof _postQuestTravelIdx === 'number' && combatLogs[_postQuestTravelIdx]) {
								combatLogs[_postQuestTravelIdx].text = 'Arrived in Town';
								combatLogs = [...combatLogs];
							} else if (NARRATIVE_ENABLED) {
								combatLogs.push({ text: 'Arrived in Town', isAnimated: false });
								combatLogs = [...combatLogs];
							}
						} catch (e) {}
						_postQuestTravelIdx = null;
						return;
					}
					const dots = '.'.repeat(Math.floor((Date.now() - travelStart) / 1000) % 4);
					combatLogs[travelIdx].text = 'Traveling back to Town' + dots;
					combatLogs = [...combatLogs];
				} catch (e) {
					/* ignore */
				}
			}, 1000);
		} catch (e) {
			/* ignore */
		}
	} catch (e) {
		/* ignore */
	}
}

// Play the post-quest narrative sequence: collecting (30s) then travel animation (5s), then arrival.
async function playPostQuestNarrative() {
	if (!NARRATIVE_ENABLED) return;
	try {
		cancelPostQuestAnim = false;
		// collecting for 30s
		combatLogs.push({ text: 'Collecting proofs of Quest Completion', isAnimated: false });
		combatLogs = [...combatLogs];
		const collectIdx = combatLogs.length - 1;
		const collectStart = Date.now();
		while (Date.now() - collectStart < 30000) {
			// eslint-disable-next-line no-await-in-loop
			await new Promise((r) => setTimeout(r, 1000));
			if (cancelPostQuestAnim) break;
			const dots = '.'.repeat(Math.floor((Date.now() - collectStart) / 1000) % 4);
			combatLogs[collectIdx].text = 'Collecting proofs of Quest Completion' + dots;
			combatLogs = [...combatLogs];
		}
			// finalize the collecting line without trailing dots once animation completes
			try {
			if (!cancelPostQuestAnim) {
				combatLogs[collectIdx].text = 'Collecting proofs of Quest Completion';
				combatLogs = [...combatLogs];
			}
			} catch (e) {}

		// travel animation for 5s
		combatLogs.push({ text: 'Traveling back to Town', isAnimated: false });
		combatLogs = [...combatLogs];
		const travelIdx = combatLogs.length - 1;
		_postQuestTravelIdx = travelIdx;
		const travelStart = Date.now();
		while (Date.now() - travelStart < 5000) {
			// eslint-disable-next-line no-await-in-loop
			await new Promise((r) => setTimeout(r, 1000));
			if (cancelPostQuestAnim) break;
			const dots = '.'.repeat(Math.floor((Date.now() - travelStart) / 1000) % 4);
			combatLogs[travelIdx].text = 'Traveling back to Town' + dots;
			combatLogs = [...combatLogs];
		}
		// arrived (unless canceled already handled by subscriber)
		if (!cancelPostQuestAnim) {
			combatLogs.push({ text: 'Arrived in Town', isAnimated: false });
			combatLogs = [...combatLogs];
		}
		_postQuestTravelIdx = null;
	} catch (e) {
		/* ignore */
	}
}

function maybeInsertFlavorAfterDeath(name) {
		try {
			if (!NARRATIVE_ENABLED) return;
			// small chance to trip in cavern and lose a bit of HP
			if (rollChance(0.12)) {
				const dmg = Math.max(1, Math.floor(Math.random() * 3) + 1); // 1-3
				// apply to gameState player hp safely
				try {
					gameState.update((s) => {
						const next = { ...(s || {}) };
						const pd = next.playerData || {};
						const cur = typeof pd.hp === 'number' ? pd.hp : pd.maxHp || 100;
						const newHp = Math.max(0, cur - dmg);
						next.playerData = { ...(pd || {}), hp: newHp };
						return next;
					});
				} catch (e) {}
				pushWithDelay(`You trip on a slippery rock and lose ${dmg} HP.`, 350, true);
				pushWithDelay('You stagger and recover your footing.', 850, false);
			}

			// small chance to encounter an NPC mid-route
			if (rollChance(0.08)) {
				pushWithDelay(
					`You bump into a travelling merchant named Tomas who offers a curious trinket.`,
					500,
					false
				);
				pushWithDelay(`Tomas: "For a coin, I can tell you where the best ores hide."`, 1000, false);
			}
		} catch (e) {
			/* ignore */
		}
	}

	// Toggle the in-page combat log visibility and hide/show left-side UI
	function toggleLog() {
		try {
			// Prevent opening the log while a quest is actively running; allow closing.
			const aqNow = get(activeQuest) || {};
			if (!logExpanded && aqNow && aqNow.status === 'in_progress') return;
			logExpanded = !logExpanded;
			if (typeof document !== 'undefined' && document && document.body) {
				if (logExpanded) document.body.classList.add('hide-left-ui');
				else document.body.classList.remove('hide-left-ui');
			}
			// when opening the log, optionally insert pre-departure narrative
			if (logExpanded) {
				try {
					// pre-departure narrative is intentionally disabled when NARRATIVE_ENABLED=false
					if (NARRATIVE_ENABLED) maybeInsertPreDepartureNarrative();
				} catch (e) {
					/* ignore */
				}
			}
		} catch (e) {
			console.warn('toggleLog failed', e);
		}
	}

	// Clear both combat and debug logs (disabled during active quest)
	function clearDebugLogs() {
		try {
			const aq = get(activeQuest) || {};
			if (aq && aq.status === 'in_progress') return;
			combatLogs = [];
			debugLogs = [];
		} catch (e) {
			/* ignore */
		}
	}

	function _assignInstanceForTarget(name) {
		if (!name) return null;
		if (!targetInstances[name]) {
			targetInstances[name] = [];
			targetNextId[name] = 1;
		}
		// prefer an existing alive instance
		const alive = targetInstances[name].find((x) => x.alive);
		if (alive) return alive.id;
		const id = targetNextId[name]++;
		targetInstances[name].push({ id, alive: true });
		_lastAssignedTarget = { name, id };
		return id;
	}

	function _markInstanceDead(name) {
		if (!name) return null;
		if (!targetInstances[name]) {
			targetInstances[name] = [];
			targetNextId[name] = 1;
		}
		const alive = targetInstances[name].find((x) => x.alive);
		if (alive) {
			alive.alive = false;
			return alive.id;
		}
		// no alive instance found — create a dead one (we saw a death without prior hits)
		const id = targetNextId[name]++;
		targetInstances[name].push({ id, alive: false });
		return id;
	}

	function formatCombatEntry(e) {
		try {
			if (!e || typeof e !== 'object') return String(e);
			const t = e.type || 'LOG';
			const sim = typeof e.simTime === 'number' ? `t=${e.simTime}` : '';
			// Friendly attacker fallback: use player name from gameState when attacker missing
			const gs = get(gameState) || {};
			const playerName =
				(gs.character && gs.character.name) || (gs.playerData && gs.playerData.name) || 'You';

			if (t === 'ATTACK_RESULT') {
					const dmg = e.hit ? (typeof e.damage === 'number' ? e.damage : e.raw || 0) : 'Miss';
					const attacker = e.actor && String(e.actor).trim() ? e.actor : playerName;
					// Prefer explicit target id/index if present
					const explicitIndex = e.targetIndex || e.targetId;
					const targetBase = e.target || '';
					let targetIndex = explicitIndex || null;
					// If the target is the player, instead assign an instance id to the attacker
					let attackerIndex = null;
					if ((targetBase || '').trim() === playerName) {
						// assign or reuse an instance id for this attacker name so we can show which monster number hit the player
						attackerIndex = _assignInstanceForTarget(attacker);
					} else {
						if (!targetIndex) {
							// assign or reuse an instance id for this target name
							targetIndex = _assignInstanceForTarget(targetBase);
						}
					}
					const targetSuffix = targetIndex ? ` ${targetIndex}` : '';
					const attackerSuffix = attackerIndex ? ` ${attackerIndex}` : '';
					// indicate criticals
					const critTag = e.crit ? ' (CRIT)' : '';
					const dmgText = dmg === 'Miss' ? 'Miss' : `${dmg} DMG`;
					// When the attacker is a monster hitting the player, show attacker index; otherwise show target index as before
					if (attackerIndex) {
						return `${attacker}${attackerSuffix} hit ${targetBase} : ${dmgText}${critTag}`;
					}
					return `${attacker} hit ${targetBase}${targetSuffix} : ${dmgText}${critTag}`;
			}

			if (t === 'NO_DROP') {
				return `${playerName} found NOTHING!`;
			}

				if (t === 'DROP') {
					try {
						const qty = typeof e.qty === 'number' ? e.qty : Number(e.qty) || 0;
						const itemId = e.itemId || (e.detail && e.detail.itemId) || null;
						// Map known fragment id to friendly name; fallback to generic 'item'
						let name = 'item';
						try {
							if (String(itemId) === '2300001') name = 'E Rank Crystal Fragment';
							else if (String(itemId) === '2300002') name = 'D Rank Crystal Fragment';
							else if (String(itemId) === '2300003') name = 'C Rank Crystal Fragment';
							else if (String(itemId) === '2300004') name = 'B Rank Crystal Fragment';
							else if (String(itemId) === '2300005') name = 'A Rank Crystal Fragment';
							else if (String(itemId) === '2300006') name = 'S Rank Crystal Fragment';
						} catch (ex) {}
						return `Obtained ${name} x ${qty}`;
					} catch (ex) {
						return 'Obtained item';
					}
				}
			if (t === 'SKILL_CAST') {
				const who = e.actor || playerName;
				const skId = e.skill || (e.detail && e.detail.skill) || 'skill';
				let skName = skId;
				try {
					const meta = skillsDb.find((s) => s.id === skId);
					if (meta && meta.name) skName = meta.name;
				} catch (ex) {}

				// show when barrier/other buffs are applied
				let detail = '';
				try {
					const d = e.detail || {};
					if (typeof d.damage === 'number' && d.damage > 0) {
						detail += ` : ${d.damage} DMG`;
					}
					if (typeof d.hpDelta === 'number' && d.hpDelta > 0) {
						detail += ` : Healed ${d.hpDelta} HP`;
					}
					
					const buffObj = d.buff || (d.applied && d.buff);
					if (buffObj) {
						let bName = buffObj.name;
						if (!bName && buffObj.id) {
							const sk = skillsDb.find((s) => s.id === buffObj.id);
							if (sk) bName = sk.name;
						}
						if (bName) {
							detail += ` -> applied ${bName}`;
						}
					} else if (d.reason) {
						detail += ` (${d.reason})`;
					}
				} catch (ex) {}
				return `${who} cast ${skName}${detail}`;
			}
			if (t === 'REFLECT_DAMAGE') {
				const source = e.sources && e.sources.length > 0 ? e.sources.join('/') : 'Reflection';
				const targetBase = e.target || '';
				const dmg = e.damage || 0;
				let targetIndex = e.targetIndex || e.targetId || null;
				
				// If target is not player, try to resolve instance index
				if (!targetIndex && targetBase && targetBase !== playerName) {
					targetIndex = _assignInstanceForTarget(targetBase);
				}
				const targetSuffix = targetIndex ? ` ${targetIndex}` : '';
				return `${source} hit ${targetBase}${targetSuffix} : ${dmg} DMG`;
			}
			if (t === 'BUFF_EXPIRED') {
				const buffName = e.buff || 'Buff';
				return `${buffName} effect(s) worn out`;
			}
			if (t === 'DOT_TICK') {
				const who = e.actor || 'Target';
				const buffName = e.buff || 'Effect';
				const dmg = e.damage || 0;
				return `${who} took ${dmg} damage from ${buffName}`;
			}
			if (t === 'HOT_TICK') {
				const who = e.actor || 'Target';
				const buffName = e.buff || 'Effect';
				const heal = e.heal || 0;
				return `${who} recovered ${heal} HP from ${buffName}`;
			}
			if (t === 'STUNNED') {
				const who = e.actor || 'Target';
				return `${who} is stunned and cannot move!`;
			}
			if (t === 'DEFENSE_RESULT') {
				const who = e.actor || playerName;
				const reduced = typeof e.reduced === 'number' ? e.reduced : (e.reducedBy || 0);
				const after = typeof e.after === 'number' ? e.after : (e.damageAfter || 0);
				// indicate barrier usage
				if (reduced && reduced > 0) return `${who} used barrier -> reduced ${reduced}, after ${after}`;
				return `${who} defense result -> after ${after}`;
			}
			if (t === 'DEATH') {
				const actorBase = e.actor || e.target || '';
				const explicitIndex = e.targetIndex || e.targetId;
				let index = explicitIndex || null;
				if (!index) {
					index = _markInstanceDead(actorBase);
				} else {
					// if explicit index provided, try to mark that instance dead
					try {
						const name = actorBase;
						if (name) {
							if (!targetInstances[name]) {
								targetInstances[name] = [];
								targetNextId[name] = targetNextId[name] || 1;
							}
							const found = targetInstances[name].find((x) => x.id == index);
							if (found) found.alive = false;
						}
					} catch (ex) {}
				}
				const suffix = index ? ` ${index}` : '';
				// compute dead/required counts for this target name (show progress relative to quest requirement)
				let countSuffix = '';
				try {
					const name = actorBase || '';
					const list = name && targetInstances[name] ? targetInstances[name] : [];
					const total = list.length || 0;
					const dead = list.filter((x) => !x.alive).length || 0;
					// Prefer authoritative required count derived from the active quest mapping
					let required = null;
					try {
						const aq = get(activeQuest) || {};
						// helper: find required count by mapping monster name -> monsterBook.id -> questEnemyMap
						if (aq) {
							const tplId = aq.templateId || aq.id || null;
							if (tplId && questEnemyMap && monsterBook) {
								const entries = questEnemyMap[tplId] || [];
								// try to find the entry whose monsterBook name matches this actorBase
								for (let en of entries) {
									const mb = monsterBook.find((m) => m.id === en.id);
									const displayName = (mb && mb.name) || en.id;
									if (displayName === name || en.id === name) {
										required = en.count;
										break;
									}
								}
							}
						}
					} catch (err) {
						/* ignore */
					}
					// fallback: try parsing objective text
					if (!required) {
						try {
							const aq = get(activeQuest) || {};
							const tpl =
								aq.template ||
								(aq.templateId ? questTemplates.find((q) => q.id === aq.templateId) : null) ||
								{};
							const obj = (tpl && tpl.objective) || '';
							const m = obj && obj.match(/(\d+)\s*(?:x|×)?/i);
							if (m && m[1]) required = parseInt(m[1], 10);
						} catch (err) {
							/* ignore */
						}
					}
					if (!required) {
						// Prefer observed total only when we have multiple instances; otherwise leave unknown
						if (total && total > 1) required = total;
						else required = null;
					}
					if (typeof required === 'number' && required > 0) countSuffix = ` (${dead}/${required})`;
				} catch (ex) {
					countSuffix = '';
				}
				return `${actorBase}${suffix} died${countSuffix}`;
			}
			// fallback to concise JSON
			try {
				return `${t} ${sim} ${JSON.stringify(e)}`;
			} catch (ex) {
				return String(t);
			}
		} catch (ex) {
			return String(e);
		}
	}

	function onCombatLogEvent(ev) {
		try {
			const entry = ev && ev.detail ? ev.detail : ev;
			// Format the human-friendly line (this may assign/mark instances)
			const text = formatCombatEntry(entry);

			// If the quest already recorded completion for this target, suppress further attack/death lines
			// REMOVED: This logic was aggressively hiding logs for multi-enemy quests (like 20x Goblin)
			// because it would mark "Goblin" as complete after the first one died, then hide the rest.
			/*
			try {
				if (entry && (entry.type === 'ATTACK_RESULT' || entry.type === 'DEATH')) {
					const aq = get(activeQuest) || {};
					const questId = aq.title || aq.templateId || aq.id || 'unknown';
					const targetName = entry.target || entry.actor || '';
					if (completionAnnounced[questId] && completionAnnounced[questId][targetName]) {
						// Drop the line silently to avoid spamming with extra deaths/attacks
						return;
					}
				}
			} catch (e) {
				// ignore suppression errors
			}
			*/

			// Inject narrative: for first-seen encounters announce them before the attack line
			try {
				if (entry && entry.type === 'ATTACK_RESULT') {
					const targetName = entry.target || '';
					const last = _lastAssignedTarget;
					// avoid announcing encounters for targets already completed for this quest
					try {
						const aq = get(activeQuest) || {};
						const questId = aq.title || aq.templateId || aq.id || 'unknown';
						// REMOVED: Do not suppress encounters based on completion status
						/*
						if (completionAnnounced[questId] && completionAnnounced[questId][targetName]) {
							// already completed — skip encounter announcement
						} else */ 
						if (last && last.name === targetName) {
							// Use the full name (e.g. "Goblin Grunt 1") as the unique ID if no ID is present
							const id = last.id || last.name;
							announcedEncounters[targetName] = announcedEncounters[targetName] || {};
							if (!announcedEncounters[targetName][id]) {
								if (_engineStartedForQuest) {
									if (NARRATIVE_ENABLED) {
										combatLogs.push({ text: `Encounter ${targetName} ${id}!`, isAnimated: false });
										combatLogs = [...combatLogs];
									}
								} else {
									if (NARRATIVE_ENABLED) {
										combatLogs.push({ text: `Encounter ${targetName} ${id}!`, isAnimated: false });
										combatLogs = [...combatLogs];
									}
								}
								announcedEncounters[targetName][id] = true;
							}
						}
					} catch (err) {
						// fallback: still announce if we cannot determine quest state
						const id = last && (last.id || last.name);
						if (id) {
							announcedEncounters[targetName] = announcedEncounters[targetName] || {};
							if (!announcedEncounters[targetName][id]) {
								if (_engineStartedForQuest) {
									if (NARRATIVE_ENABLED) {
										combatLogs.push({ text: `Encounter ${targetName} ${id}!`, isAnimated: false });
										combatLogs = [...combatLogs];
									}
								} else {
									if (NARRATIVE_ENABLED) {
										combatLogs.push({ text: `Encounter ${targetName} ${id}!`, isAnimated: false });
										combatLogs = [...combatLogs];
									}
								}
								announcedEncounters[targetName][id] = true;
							}
						}
					}
				}
			} catch (e) {
				/* ignore announcement errors */
			}

			// Push the formatted combat line
			// Suppress noisy self-hit lines where the player is both attacker and target
			try {
				if (entry && entry.type === 'ATTACK_RESULT') {
					const gs = get(gameState) || {};
					const playerNameNow =
						(gs.character && gs.character.name) || (gs.playerData && gs.playerData.name) || 'You';
					const attacker = entry.attacker ? String(entry.attacker).trim() : null;
					const target = entry.target ? String(entry.target).trim() : null;
					if (attacker && target && attacker === target && attacker === playerNameNow) {
						// skip self-hit lines entirely
						return;
					}
				}
			} catch (e) {}
			if (_engineStartedForQuest) {
				// SIMPLIFIED TIMING:
				// If the event is a "catch-up" event (from offline progress), show it immediately.
				// If the event is "live" (from the running engine), ALSO show it immediately, because the engine
				// has already handled the real-time delay (1s per turn).
				// The previous logic of adding `combatEventIndex * 1000` was causing live events to drift
				// further and further behind the actual game state.
				const delay = 0;
				
				setTimeout(() => {
					try {
						if (entry && (entry.type === 'ATTACK_RESULT' || entry.type === 'DEATH' || entry.type === 'DROP' || entry.type === 'SKILL_CAST' || entry.type === 'NO_DROP' || entry.type === 'REFLECT_DAMAGE' || entry.type === 'BUFF_EXPIRED' || entry.type === 'DOT_TICK' || entry.type === 'HOT_TICK' || entry.type === 'SKIPPED')) {
							if (entry.type === 'SKIPPED') {
								// Optional: You can uncomment this if you want to see every skipped enemy in the log
								// combatLogs.push({ text: `(Skipped previously defeated ${entry.actor})`, isAnimated: false });
							} else {
								combatLogs.push({ text, isAnimated: false });
							}
							combatLogs = [...combatLogs];
						}
					} catch (e) {}

					// Also surface auto-cast/defense events so players see barrier usage and reasons
					try {
						if (entry && entry.type === 'DEFENSE_RESULT') {
							const ac = entry.autoCast || null;
							if (ac) {
								try {
									if (ac.applied || ac.used) {
										const actor = entry.actor || 'Unknown';
										const red = typeof entry.reduced === 'number' ? entry.reduced : (ac.reductionPercent ? `~${ac.reductionPercent}%` : '');
										const spText = typeof ac.spDelta === 'number' ? ` SP ${ac.spDelta}` : '';
										const msg = `${actor} auto-cast Magic Barrier; reduced ${red}${spText}`;
										if (NARRATIVE_ENABLED) {
											combatLogs.push({ text: msg, isAnimated: false });
											combatLogs = [...combatLogs];
										}
									} else if (ac.reason) {
										const actor = entry.actor || 'Unknown';
										const msg = `${actor} attempted Magic Barrier: ${ac.reason}`;
										if (NARRATIVE_ENABLED) {
											combatLogs.push({ text: msg, isAnimated: false });
											combatLogs = [...combatLogs];
										}
									}
								} catch (e) {}
							}
						}
					} catch (e) {}
					// If a death occurred, add collecting/drops and completion messages
					try {
						if (entry && entry.type === 'DEATH') {
							const name = (entry.actor || entry.target || '').replace(/\s+\d+$/, '');
							// If the death references the player, skip quest-target bookkeeping and avoid spurious "Completed" lines
							const gs = get(gameState) || {};
							const playerNameNow =
								(gs.character && gs.character.name) ||
								(gs.playerData && gs.playerData.name) ||
								'You';
							if ((name || '').trim() === playerNameNow) {
								// still push the death line but skip quest progress logic
								return;
							}
							try {
								const aq = get(activeQuest) || {};
								const questId = aq.title || aq.templateId || aq.id || 'unknown';
								completionAnnounced[questId] = completionAnnounced[questId] || {};

								// compute counts
								const list = name && targetInstances[name] ? targetInstances[name] : [];
								const total = list.length || 0;
								const dead = list.filter((x) => !x.alive).length || 0;
								let required = 0;
								// snapshot placeholders for delayed handlers (declare in outer scope so closures can access)
								let snapshotTotal = 0;
								let snapshotDead = 0;
								let snapshotRequired = null;
								try {
									const tpl = aq.template || {};
									const enemies = tpl.enemies || aq.enemies || [];
									const enemy = enemies.find((e) => e && e.name === name);
									if (enemy && enemy.count) required = enemy.count;
									if (!required) {
										// fallback: parse from title or description
										const title = tpl.title || aq.title || '';
										const m = title.match(/(\d+)\s*(?:x|×)?/i);
										if (m && m[1]) required = parseInt(m[1], 10);
									}
											if (!required) {
												if (total && total > 1) required = total;
												else required = null;
											}

											// Capture snapshot values now so later delayed handlers operate on
											// the state as-of this event (engine can emit many events quickly).
											snapshotTotal = total;
											snapshotDead = dead;
											snapshotRequired = required;
								} catch (err) {}
								if (!required) {
									if (total && total > 1) required = total;
									else required = null;
								}

								// Per-death collecting: emit Searching for any drop(s) immediately so it appears inline
								const completedDelay = 300;
								try {
									// Always show per-death collecting inline for every kill
									const runSearchLog = () => {
										if (NARRATIVE_ENABLED) {
											combatLogs.push({ text: 'Searching for any drop(s)', isAnimated: false });
											combatLogs = [...combatLogs];
											if (combatLogs.length > 500) combatLogs.splice(0, combatLogs.length - 500);

											// Use snapshot values in delayed handler so later events don't change
											// the decision for this death.
											const total = snapshotTotal;
											const dead = snapshotDead;
											const required = snapshotRequired;
											try {
												// surface computed counts removed (debug)
											} catch (e) {}

											    if (typeof required === 'number' && dead >= required && !completionAnnounced[questId][name]) {
												    completionAnnounced[questId][name] = true;
												    const qnames = questSeenNames[questId] || (questSeenNames[questId] = new Set());
												    qnames.add(name);
											    }
										} else {
											// Even when narrative is disabled, ensure we still mark completion state
											const total = snapshotTotal;
											const dead = snapshotDead;
											const required = snapshotRequired;
											if (typeof required === 'number' && dead >= required && !completionAnnounced[questId][name]) {
												completionAnnounced[questId][name] = true;
												const qnames = questSeenNames[questId] || (questSeenNames[questId] = new Set());
												qnames.add(name);
											}
										}
									};

									runSearchLog();

											// Removed auto-complete and debug pushes to keep combat log
											// focused on narrative and per-kill messages. Quest completion
											// will not be automatically announced here to avoid premature
											// completion reporting during playback.
									if (combatLogs.length > 500) combatLogs.splice(0, combatLogs.length - 500);
								} catch (err) {
									/* ignore */
								}

								// mark seen for this quest
								try {
									const aq = get(activeQuest) || {};
									const qid = aq.title || aq.templateId || aq.id || 'unknown';
									const qnames = questSeenNames[qid] || (questSeenNames[qid] = new Set());
									qnames.add(name);
								} catch (e) {}
							} catch (e) {
								/* ignore */
							}
						}
					} catch (e) {}
				}, delay);
			} else {
				try {
					if (entry && (entry.type === 'ATTACK_RESULT' || entry.type === 'DEATH' || entry.type === 'DROP' || entry.type === 'NO_DROP' || entry.type === 'SKIPPED')) {
						if (entry.type === 'SKIPPED') {
							// Optional: combatLogs.push({ text: `(Skipped ${entry.actor})`, isAnimated: false });
						} else {
							combatLogs.push({ text, isAnimated: false });
						}
						combatLogs = [...combatLogs];
					}
				} catch (e) {}
			}

			if (_engineStartedForQuest) combatEventIndex++;

			// If a death occurred, add collecting/drops and completion messages (for non-combat events)
			try {
				if (entry && entry.type === 'DEATH' && !_engineStartedForQuest) {
					const name = (entry.actor || entry.target || '').replace(/\s+\d+$/, '');
					// If the death references the player, skip quest-target bookkeeping and avoid spurious "Completed" lines
					const gs = get(gameState) || {};
					const playerNameNow =
						(gs.character && gs.character.name) || (gs.playerData && gs.playerData.name) || 'You';
					if ((name || '').trim() === playerNameNow) {
						// still push the death line but skip quest progress logic
						return;
					}
					try {
						const aq = get(activeQuest) || {};
						const questId = aq.title || aq.templateId || aq.id || 'unknown';
						completionAnnounced[questId] = completionAnnounced[questId] || {};

						// compute counts
						const list = name && targetInstances[name] ? targetInstances[name] : [];
						const total = list.length || 0;
						const dead = list.filter((x) => !x.alive).length || 0;

						// determine required kill count (try template parsing, fallback to observed total)
						let required = null;
						try {
							const tpl =
								aq.template ||
								(aq.templateId ? questTemplates.find((q) => q.id === aq.templateId) : null) ||
								{};
							const obj = (tpl && tpl.objective) || '';
							const m = obj && obj.match(/(\d+)\s*(?:x|×)?/i);
							if (m && m[1]) required = parseInt(m[1], 10);
						} catch (err) {}
								if (!required) {
									if (total && total > 1) required = total;
									else required = null;
								}

						// Per-death collecting: emit Searching for any drop(s) immediately so it appears inline
						const completedDelay = 300;
						try {
							// Always show per-death collecting inline for every kill
							if (NARRATIVE_ENABLED) {
								combatLogs.push({ text: 'Searching for any drop(s)', isAnimated: false });
								combatLogs = [...combatLogs];
							}
							if (combatLogs.length > 500) combatLogs.splice(0, combatLogs.length - 500);
						} catch (err) {
							/* ignore */
						}

						// announce final follow-ups only once per quest+target
								// removed debug logging

							if (typeof required === 'number' && dead >= required && !completionAnnounced[questId][name]) {
								completionAnnounced[questId][name] = true;
							const qnames = questSeenNames[questId] || (questSeenNames[questId] = new Set());
							qnames.add(name);
							// Check whether the whole quest is complete (all required enemy types finished).
							try {
								const aq = get(activeQuest) || {};
								const tplId = aq.templateId || aq.id || null;
								let allComplete = qnames.size > 0 && Array.from(qnames).every(
									(nm) => completionAnnounced[questId] && completionAnnounced[questId][nm]
								);
								if (allComplete) {
									if (!questCompletionAnnounced[questId]) questCompletionAnnounced[questId] = true;
								}
							} catch (e) {
								/* ignore quest-level completion detection errors */
							}
						}
					} catch (e) {
						/* ignore post-death narration errors */
					}
				}
			} catch (e) {
				/* ignore post-death narration errors */
			}
			// cap length
			if (combatLogs.length > 500) combatLogs.splice(0, combatLogs.length - 500);
		} catch (e) {
			console.warn('Failed to append combat log', e);
		}
	}

	// Show the active quest when present; fall back to E101 for the demo panel
	let displayedQuest = questTemplates.find((q) => q.id === 'E101');
	$: try {
		if ($hasActiveQuest && $activeQuest && $activeQuest.templateId) {
			displayedQuest =
				questTemplates.find((q) => q.id === $activeQuest.templateId) || displayedQuest;
		} else {
			displayedQuest = questTemplates.find((q) => q.id === 'E101') || displayedQuest;
		}
	} catch (e) {
		console.warn('toggleLog failed', e);
	}

	function buildPlayerFromState() {
		const state = get(gameState) || {};
		const playerData = state.playerData || {};
		const character = state.character || {};
		// best-effort mapping of fields used by the simulator
		const stats = {
			hp: playerData.maxHp || playerData.hp || 100,
			dps: character.stats && character.stats.STR ? Math.max(10, character.stats.STR * 10) : 100,
			acc: character.stats && character.stats.DEX ? 0.01 * Math.max(1, character.stats.DEX) : 0.015,
			eva:
				character.stats && character.stats.DEX
					? 0.005 * Math.max(1, Math.floor(character.stats.DEX / 2))
					: 0.01,
			phyDef: character.stats && character.stats.CON ? character.stats.CON * 5 : 10,
			magDef: character.stats && character.stats.INT ? character.stats.INT * 2 : 5,
			cr: 0.01,
			sp: playerData.sp || 100,
			attackIntervalMs: 1000
		};
		return {
			name: character.name || 'Player',
			stats,
			skills: (character.skills || []).slice(0, 10)
		};
	}

	// Simulation UI removed — runQuestInGame and playback controllers are not used
	let _playbackControllers = [];

	// log rendering removed

	$: if (currentScene && currentScene.type === 'choice') {
		loadChoiceComponent();
	}

	// combat log listener will be attached on mount and removed on destroy

	// Start/stop the engine when an active quest appears/disappears
	$: (async () => {
		try {
			if (typeof window === 'undefined') return;
			if (_processingQuest) return;
			// If we have an active quest, ensure the pre-departure narrative completes
			if ($hasActiveQuest) {
				_processingQuest = true;
				const aq = get(activeQuest);
				const tplId = aq && aq.templateId ? aq.templateId : (aq && aq.id) || 'E101';
				if (!_narrativeInsertedForQuest || _narrativeInsertedForQuest !== tplId) {
					try {
						// Only insert narrative if the quest is fresh (progress is 0)
						if (!aq.progress || aq.progress === 0) {
							await maybeInsertPreDepartureNarrative();
						}
					} catch (e) {
						/* ignore */
					}
					_narrativeInsertedForQuest = tplId;
				}
				if (!_engineStartedForQuest || _engineStartedForQuest !== tplId) {
					// Determine quest template object (prefer embedded template if present)
					const tplObj = (aq && aq.template) || questTemplates.find((q) => q.id === tplId) || {};
					const skipEngine = tplObj && (tplObj.series === 'beginner' || tplObj.series === 'dummy' || tplObj.series === 'daily');
					if (skipEngine) {
						_engineStartedForQuest = tplId; // mark as handled to avoid repeated attempts
						console.debug('[game/+page] Skipping auto-start of live engine for non-combat quest', tplId);
					}
					// Assign enemies to the active quest
					activeQuest.update((q) => {
						if (q && q.templateId && questEnemyMap[q.templateId]) {
							q.enemies = questEnemyMap[q.templateId];
						}
						return q;
					});
					// Brief pause after narrative to allow UI to update
					await new Promise((resolve) => setTimeout(resolve, 500));
					// start engine only once for this quest
					try {
						// Reset per-quest encounter/instance tracking so numbering starts at 1
						// whenever a new quest engine is started. This prevents instance IDs
						// from carrying over between sequential quests (e.g., E101 -> E201).
						// Only reset if this is a fresh start (progress 0)
						if (!aq.progress || aq.progress === 0) {
							targetInstances = {};
							targetNextId = {};
							_lastAssignedTarget = null;
							announcedEncounters = {};
							completionAnnounced = {};
							questSeenNames = {};
							lastCollectAt = {};
							lastDisplayedCompleted = {};
							questCompletionAnnounced = {};
						}

						combatEventIndex = 0;
						const lastLine =
							combatLogs && combatLogs.length ? combatLogs[combatLogs.length - 1] : null;
						const startIndex = combatLogs.length;
						// Check if we already have the "Resuming..." line (avoid duplicate if re-entrant)
						const hasResumingLine = lastLine && lastLine.text && lastLine.text.startsWith('Resuming quest');
						
						if (lastLine && lastLine.text !== 'Starting encounters...' && !hasResumingLine) {
							try {
								if (NARRATIVE_ENABLED) {
									// Only show "Starting encounters..." if fresh start
									if (!aq.progress || aq.progress === 0) {
										combatLogs.push({ text: 'Starting encounters...', isAnimated: false });
										combatLogs = [...combatLogs];
									} else {
										const skippedCount = aq.progress || 0;
										combatLogs.push({ 
											text: `Resuming quest. Skipped ${skippedCount} previously defeated enemies.`, 
											isAnimated: false 
										});
										combatLogs = [...combatLogs];
									}
								}
							} catch (e) {}
						}
						try {
							if (!skipEngine) {
								_engineStartedForQuest = tplId; // Set early so events are delayed
								let catchUpTimeMs = 0;
								if (aq) {
									// Ensure we have the latest server time offset before calculating catch-up
									try { await ensureServerTime(); } catch (e) { console.warn('ensureServerTime failed', e); }

									// Use serverNow() to align with quest timestamps (which use server time)
									// Fallback to Date.now() if serverNow fails or returns invalid
									const now = (typeof serverNow === 'function' ? serverNow() : Date.now());
									
									if (aq.lastProgressTimestamp) {
										// If we have a timestamp from the last progress update, use that
										catchUpTimeMs = Math.max(0, now - aq.lastProgressTimestamp);
									} else if (aq.startTime) {
										// Fallback to start time (may include time already spent on completed encounters)
										catchUpTimeMs = Math.max(0, now - aq.startTime);
									}
									
									// Safety cap: if catchUpTimeMs is excessively large (e.g. > 24 hours) or negative, clamp it.
									// Also, if it's very small (< 5 seconds), ignore it to prevent jitter.
									if (catchUpTimeMs < 5000) catchUpTimeMs = 0;

									// CRITICAL FIX: If the quest is fresh (progress 0), FORCE catch-up to 0.
									// This ensures that starting a new quest ALWAYS runs in live mode, regardless of timestamps.
									if (!aq.progress || aq.progress === 0) {
										console.log('[game/+page] Fresh quest start. Forcing Live Mode (catchUp=0).');
										catchUpTimeMs = 0;
									} else {
										// Existing logic for resuming: check time since start
										const timeSinceStart = now - (aq.startTime || now);
										if (timeSinceStart < 30000) {
											console.log('[game/+page] Quest started recently (' + timeSinceStart + 'ms). Forcing Live Mode (catchUp=0).');
											catchUpTimeMs = 0;
										}
									}
									
									console.log('[game/+page] catchUpTimeMs:', catchUpTimeMs, 'now:', now, 'lastProgress:', aq.lastProgressTimestamp, 'start:', aq.startTime);
									
									// DEBUG: Alert to diagnose offline progress issues
									if (typeof window !== 'undefined' && (catchUpTimeMs > 0 || aq.lastProgressTimestamp)) {
										// alert(`DEBUG: Offline Progress Check\n\nCatchUp: ${catchUpTimeMs}ms\nNow: ${now}\nLast Progress: ${aq.lastProgressTimestamp}\nServer Offset: ${get(gameState).serverTimeOffset}`);
									}

									// Temporary debug alert to verify catch-up logic
									if (catchUpTimeMs > 0) {
										try {
											// alert(`Resuming quest! Catching up ${Math.round(catchUpTimeMs / 1000)} seconds.`);
										} catch (e) {}
									}
								}
								const startRes = await startForActiveQuest(tplId, { playbackSpeed: 1, catchUpTimeMs });
							// Only consider the engine started when the engine indicates success
								if (startRes && startRes.started) {
									// already set
								} else {
									const reason = (startRes && startRes.reason) || 'unknown';
									console.warn('startForActiveQuest did not start:', reason);
									if (reason === 'already-active') {
										// Engine is already running for this quest, mark as started
										// already set
									} else {
										combatLogs.push({
											text: `Failed to start encounters: ${reason}`,
											isAnimated: false
										});
										combatLogs = [...combatLogs];
										// keep flag set to delay any events that may still come
									}
								}
							} else {
								// Engine start intentionally skipped for this quest (e.g., beginner series)
							}
						} catch (err) {
							console.warn('startForActiveQuest threw', err);
							combatLogs.push({ text: 'Failed to start encounters.', isAnimated: false });
							combatLogs = [...combatLogs];
							_engineStartedForQuest = null;
						}
						// remove the temporary indicator if still present
						try {
							if (
								combatLogs[startIndex] &&
								combatLogs[startIndex].startsWith('Starting encounters')
							) {
								combatLogs.splice(startIndex, 1);
								combatLogs = [...combatLogs];
							}
						} catch (e) {}

						// Fallback: only schedule travel-back if the engine actually completed
						// (startRes.started === true). If the engine did not start, don't
						// schedule the fallback (avoids firing while encounters still run).
						try {
							if (typeof startRes !== 'undefined' && startRes && startRes.started) {
								const aqNow = get(activeQuest) || {};
								const qidNow = aqNow.title || aqNow.templateId || aqNow.id || 'unknown';
								if (!questCompletionAnnounced[qidNow]) {
									// If no combat logs were added (meaning we skipped everything or finished instantly),
									// trigger the narrative immediately so the user isn't staring at a blank screen.
									// startIndex captures length before "Resuming..." was added.
									// If length is startIndex + 1 (just "Resuming..."), then no combat happened.
									if (combatLogs.length <= startIndex + 1) {
										maybeInsertTravelBackNarrative();
									}
								}
							}
						} catch (e) {}
					} catch (err) {
						console.warn('startForActiveQuest outer threw', err);
					}
				}
			} else if (!$hasActiveQuest && _lastHasActive) {
				// quest was active and now cleared — ensure engine stopped
				try {
					stopLiveEngine();
				} catch (e) {
					/* ignore */
				}
				try {
					_engineStartedForQuest = null;
					_narrativeInsertedForQuest = null;
					_travelBackInsertedForQuest = null;
					_travelBackTimeout = null;
					// Clear per-quest encounter/instance tracking to avoid stale state
					targetInstances = {};
					targetNextId = {};
					_lastAssignedTarget = null;
					announcedEncounters = {};
					completionAnnounced = {};
					questSeenNames = {};
					lastCollectAt = {};
					lastDisplayedCompleted = {};
					questCompletionAnnounced = {};
					combatEventIndex = 0;
				} catch (e) {}
			}
			_processingQuest = false;
			_lastHasActive = !!$hasActiveQuest;
		} catch (e) {
			console.warn('Failed to start/stop live engine', e);
			_processingQuest = false;
		}
	})();

	function installBlockHandlersIfRequested() {
		if (_blockInstalled) return;
		try {
			const block = sessionStorage.getItem('blockBack');
			if (block === 'true') {
				_blockInstalled = true;
				// Push two states so a single Back press hits our dummy entry and triggers popstate
				try {
					window.history.pushState(null, '', location.href);
				} catch (err) {
					/* ignore */
				}
				try {
					window.history.pushState(null, '', location.href);
				} catch {
					/* ignore */
				}

				const onPop = () => {
					try {
						window.history.pushState(null, '', location.href);
					} catch {
						/* ignore */
					}
					console.warn('Back navigation blocked by game security policy (popstate)');
				};

				const keyOptions = { capture: true };
				const onKey = (e) => {
					if (e.key === 'Backspace') {
						const tag = document.activeElement && document.activeElement.tagName;
						const editable =
							document.activeElement &&
							(document.activeElement.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA');
						if (!editable) {
							e.preventDefault();
						}
					}
					if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'Left')) {
						e.preventDefault();
					}
					if (e.key === 'BrowserBack') {
						e.preventDefault();
					}
				};

				const onBeforeUnload = (e) => {
					e.preventDefault();
					e.returnValue = '';
					return '';
				};

				window.addEventListener('popstate', onPop);
				window.addEventListener('keydown', onKey, keyOptions);
				window.addEventListener('beforeunload', onBeforeUnload);

				// keep references so we can remove them later
				_onPop = onPop;
				_onKey = onKey;
				_keyOptions = keyOptions;
				_onBeforeUnload = onBeforeUnload;

				// remove the session flag so reloading doesn't re-trigger unintentionally
				try {
					sessionStorage.removeItem('blockBack');
				} catch {
					/* ignore */
				}
			}
		} catch (err) {
			console.warn('blockBack handling failed', err);
		}
	}

	onMount(() => {
		// Audio Unlocker
		document.addEventListener('click', unlockAudio);
		document.addEventListener('keydown', unlockAudio);
		document.addEventListener('touchstart', unlockAudio);

		// Preload Audio Blobs
		(async () => {
			srcBirds = await loadAudioBlob('/Audio/Scenes/Scene001-005_Birds.mp3');
			srcWaves = await loadAudioBlob('/Audio/Scenes/Scene001-005_Waves.mp3');
			srcTavern = await loadAudioBlob('/Audio/Scenes/Tavern.mp3');
			srcInn = await loadAudioBlob('/Audio/Scenes/Inn.mp3');
			srcGuild = await loadAudioBlob('/Audio/GuildHall.mp3');
			srcBasement = await loadAudioBlob('/Audio/Scenes/GuildBasement.mp3');
			srcForest = await loadAudioBlob('/Audio/Forest.mp3');
			
			// Initial Game Track
			const initialGameTrackUrl = gameTracks[Math.floor(Math.random() * gameTracks.length)];
			currentGameTrack = await loadAudioBlob(initialGameTrackUrl);
		})();

		// make an async mount flow so we can await sceneManager.loadScene and log progress
		(async () => {
			debugLogs.push('[game/+page] onMount - starting client init');
			console.log('[game/+page] onMount - starting client init');

			// Sync activeQuest from gameState if present (e.g. from previous navigation)
			try {
				const gs = get(gameState);
				if (gs && gs.character && gs.character.activeQuest) {
					activeQuest.set(gs.character.activeQuest);
				} else {
					// If not in gameState, try to load from legacy save if present
					const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('game_save_data') : null;
					if (raw) {
						try {
							const parsed = parseMaybeEncrypted(raw, 'game_save_data');
							const data = parsed.data;
							if (data) {
								if (data.character && data.character.activeQuest) {
									activeQuest.set(data.character.activeQuest);
								}
								if (data.serverTimeOffset) {
									gameState.update(s => ({ ...s, serverTimeOffset: data.serverTimeOffset }));
								}
							}
						} catch (e) { console.warn('Failed to parse legacy save on mount', e); }
					}
				}
			} catch (e) { console.warn('Failed to sync activeQuest on mount', e); }

			// If we appear to be returning to an active character (has name or active slot),
			// proactively set the session flag to block back navigation. This prevents
			// accidentally navigating back to character creation / selection screens
			// which could lead to save conflicts or cheating.
			try {
				const maybeState = get(gameState);
				if (
					maybeState &&
					(maybeState.activeSlotId || (maybeState.character && maybeState.character.name))
				) {
					try {
						sessionStorage.setItem('blockBack', 'true');
					} catch {
						/* ignore */
					}
				}
			} catch {
				/* ignore */
			}
			// Subscribe to sceneManager only on client to avoid SSR-side evaluation issues
			try {
				_unsubscribeScene = sceneManager.subscribe((manager) => {
					currentScene = manager.currentScene;

					// No special free-mode store handling here; rendering will react to
					// the manager.currentScene value (including a scene with title 'free-mode').
				});
			} catch (err) {
				console.warn('[game/+page] Failed to subscribe to sceneManager on mount', err);
			}

			// Subscribe to personalityTraits to debug changes
			try {
				_unsubscribeTraits = personalityTraits.subscribe((traits) => {
					console.log('[game/+page] personalityTraits changed:', traits);
				});
				// Store for cleanup if needed
			} catch (err) {
				console.warn('[game/+page] Failed to subscribe to personalityTraits', err);
			}

			// If we have slot-based saves, open the slot chooser modal instead of auto-loading a legacy save
			// UNLESS we're coming from character creation (gameState.currentScene is set)
			try {
				const state = get(gameState);
				const hasCurrentScene = state && state.currentScene;

				// If gameState already has a currentScene, we're in active gameplay - load that scene directly
				if (hasCurrentScene) {
					debugLogs.push('[game/+page] gameState has currentScene -> ' + state.currentScene);
					console.log('[game/+page] gameState has currentScene, loading:', state.currentScene);
					try {
						// Avoid re-loading the same scene if sceneManager is already set
						const managerSnapshot = get(sceneManager);
						if (
							managerSnapshot.currentScene &&
							managerSnapshot.currentScene.title === state.currentScene
						) {
							debugLogs.push('[game/+page] sceneManager already at currentScene, skipping load');
							installBlockHandlersIfRequested();
							return;
						}

						await sceneManager.loadScene(state.currentScene);
						installBlockHandlersIfRequested();
						return;
					} catch (err) {
						console.warn('[game/+page] Failed to load scene from gameState', err);
					}
				}

				const hasSlots =
					saveSlotsManager && typeof saveSlotsManager.hasAnySaved === 'function'
						? saveSlotsManager.hasAnySaved()
						: false;
				debugLogs.push('[game/+page] saveSlotsManager.hasAnySaved -> ' + hasSlots);
				console.log('[game/+page] saveSlotsManager.hasAnySaved ->', hasSlots);
				if (hasSlots) {
					showSlotsModal = true;
					// still install block handlers in case a previous flow requested it
					installBlockHandlersIfRequested();
					return;
				}
			} catch (err) {
				console.warn('[game/+page] saveSlotsManager check failed', err);
			}

			// Fallback to legacy single-save behavior when no slots present
			legacySaveRaw =
				typeof localStorage !== 'undefined' ? localStorage.getItem('game_save_data') : null;
			debugLogs.push('[game/+page] legacy save raw -> ' + (legacySaveRaw ? 'present' : 'absent'));
			console.log('[game/+page] legacy save raw ->', legacySaveRaw ? 'present' : 'absent');
			if (legacySaveRaw) {
				try {
					let data = null;
					// parseMaybeEncrypted may throw; allow outer catch to handle it
					const parsedRes = parseMaybeEncrypted(legacySaveRaw, 'game_save_data');
					data = parsedRes && parsedRes.data;
					debugLogs.push(
						'[game/+page] legacy save parsed -> ' +
							JSON.stringify({ currentScene: data && data.currentScene })
					);
					console.log('[game/+page] legacy save parsed ->', data);
					if (data && data.currentScene) {
						// Explicitly restore gameState and activeQuest from legacy save if needed
						try {
							if (data.character || data.playerData) {
								gameState.update(s => ({
									...s,
									character: data.character || s.character,
									playerData: data.playerData || s.playerData,
									currentScene: data.currentScene || s.currentScene
								}));
							}
							if (data.character && data.character.activeQuest) {
								activeQuest.set(data.character.activeQuest);
							}
						} catch (e) { console.warn('Failed to restore state from legacy save', e); }

						const scene = gameScenes.find((s) => s.title === data.currentScene);
						resolvedSceneTitle = scene && scene.title;
						debugLogs.push('[game/+page] resolved scene -> ' + (resolvedSceneTitle || 'null'));
						console.log('[game/+page] resolved scene ->', scene && scene.title);
						if (scene) {
							const manager = get(sceneManager);
							if (manager.currentScene && manager.currentScene.title === data.currentScene) {
								debugLogs.push('[game/+page] scene already current, skipping load');
								console.log('[game/+page] scene already current, skipping load');
								return;
							}
							try {
								debugLogs.push('[game/+page] calling sceneManager.loadScene(' + scene.title + ')');
								console.log('[game/+page] calling sceneManager.loadScene(', scene.title, ')');
								await sceneManager.loadScene(scene.title);
								debugLogs.push('[game/+page] sceneManager.loadScene returned');
								console.log('[game/+page] sceneManager.loadScene returned');
							} catch (loadErr) {
								debugLogs.push(
									'[game/+page] sceneManager.loadScene failed ' +
										(loadErr && loadErr.message ? loadErr.message : String(loadErr))
								);
								console.error('[game/+page] sceneManager.loadScene failed', loadErr);
							}
						} else {
							debugLogs.push(
								'[game/+page] legacy save references unknown scene ' + data.currentScene
							);
							console.warn('[game/+page] legacy save references unknown scene', data.currentScene);
						}
					}
				} catch (err) {
					debugLogs.push(
						'[game/+page] Failed to parse legacy save data ' +
							(err && err.message ? err.message : String(err))
					);

					console.warn('[game/+page] Failed to parse legacy save data', err);
				}
			}

			// Install block handlers if requested by previous flow
			installBlockHandlersIfRequested();
		})();

		// attach combat log listener for the in-page combat log
		try {
			if (typeof window !== 'undefined' && window.addEventListener) {
				// Restore logs from session storage if resuming a quest
				try {
					const aq = get(activeQuest);
					if (aq && aq.status === 'in_progress' && aq.progress > 0) {
						const savedLogs = sessionStorage.getItem('voids_combat_logs');
						if (savedLogs) {
							const parsed = JSON.parse(savedLogs);
							if (Array.isArray(parsed) && parsed.length > 0) {
								combatLogs = parsed;
								// Ensure log is visible if we have content
								logExpanded = true;
							}
						}
					} else {
						// Clear stale logs if not resuming
						sessionStorage.removeItem('voids_combat_logs');
					}
				} catch (e) {
					/* ignore restore errors */
				}

				window.addEventListener('combat:log', onCombatLogEvent);
				// clear logs automatically when a quest is submitted
				_onQuestSubmitted = (ev) => {
					try {
						combatLogs = [];
						debugLogs = [];
						sessionStorage.removeItem('voids_combat_logs');
						setLogVisible(false); // hide log and restore UI
					} catch (e) {
						/* ignore */
					}
				};
				window.addEventListener('quest:submitted', _onQuestSubmitted);

				// Do NOT attach a quest:completed listener — rely on idle detection
				// to insert the post-quest travel narrative. Keep a stub handler
				// reference for symmetry with quest:submitted removal on destroy.
				_onQuestCompleted = (ev) => {
					/* Intentionally empty: idle-based timer triggers travel-back narrative */
				};

				// Subscribe to `activeQuest` to detect when the quest timer/status
				// transitions to `completed`. When that happens, cancel any running
				// post-quest animations (collecting/travel) and replace the travel
				// line with `Arrived in Town` so the UI reflects the timer.
				try {
					_unsubscribeActiveQuest = activeQuest.subscribe((q) => {
						try {
							const status = q && q.status;
							// initialize last status if unset
							if (_lastQuestStatus === null) _lastQuestStatus = status;
							// Detect transition to completed
							if (_lastQuestStatus !== 'completed' && status === 'completed') {
								// Cancel any running post-quest animation loops
								try {
									cancelPostQuestAnim = true;
								} catch (e) {}
								try {
									if (_travelAnimationInterval) {
										clearInterval(_travelAnimationInterval);
										_travelAnimationInterval = null;
									}
								} catch (e) {}
								// Replace travel line with arrival text if present
								try {
									if (typeof _postQuestTravelIdx === 'number' && combatLogs[_postQuestTravelIdx]) {
										combatLogs[_postQuestTravelIdx].text = 'Arrived in Town';
										combatLogs = [...combatLogs];
									} else if (NARRATIVE_ENABLED) {
										combatLogs.push({ text: 'Arrived in Town', isAnimated: false });
										combatLogs = [...combatLogs];
									}
								} catch (e) {}
								_postQuestTravelIdx = null;
							}
							_lastQuestStatus = status;
						} catch (e) {
							/* ignore */
						}
					});
				} catch (e) {}
			}
		} catch (e) {}

			// Ensure the left-side UI reflects the current log visibility on mount
			try {
				if (typeof document !== 'undefined' && document && document.body) {
					if (logExpanded) document.body.classList.add('hide-left-ui');
					else document.body.classList.remove('hide-left-ui');
				}
			} catch (e) {}

		// combat playback logging removed

		// Expose dev helper to reset daily quest cooldown
		if (typeof window !== 'undefined') {
			window.resetDailyQuest = resetDailySelection;
			window.reset_daily = resetDailySelection;

			window.resetSkillCooldowns = () => {
				gameState.update((s) => {
					const next = { ...(s || {}) };
					if (next.character) {
						next.character = { ...(next.character || {}), skillCooldowns: {} };
					}
					return next;
				});
				console.log('Skill cooldowns reset.');
			};
			window.reset_cd = window.resetSkillCooldowns;

			window.resetQuestCooldowns = () => {
				gameState.update((s) => {
					const next = { ...(s || {}) };
					const ch = { ...(next.character || {}) };
					if (ch.questsCompleted) {
						// Set all completion timestamps to 1 (completed long ago)
						// This preserves the 'completed' status for prerequisites but removes the cooldown wait
						Object.keys(ch.questsCompleted).forEach((k) => {
							ch.questsCompleted[k] = 1;
						});
					}
					next.character = ch;
					return next;
				});
				console.log('Quest cooldowns reset (timestamps set to 1).');
			};
			window.reset_quest_cd = window.resetQuestCooldowns;

			window.restoreAll = () => {
				gameState.update((s) => {
					const next = { ...(s || {}) };
					const pd = { ...(next.playerData || {}) };
					
					// Restore HP
					if (pd.maxHp) pd.hp = pd.maxHp;
					
					// Restore SP
					if (pd.maxSp) pd.sp = pd.maxSp;
					
					// Restore Stamina
					if (pd.maxStamina) pd.stamina = pd.maxStamina;
					
					next.playerData = pd;
					return next;
				});
				console.log('HP, SP, and Stamina restored to full.');
			};
			window.restore_all = window.restoreAll;
		}
	});

	onDestroy(() => {
		try {
			if (typeof window !== 'undefined') {
				delete window.resetDailyQuest;
				delete window.reset_daily;
				delete window.resetSkillCooldowns;
				delete window.reset_cd;
				delete window.resetQuestCooldowns;
				delete window.reset_quest_cd;
				delete window.restoreAll;
				delete window.restore_all;
			}
		} catch (e) {}

		try {
			if (typeof _unsubscribeScene === 'function') _unsubscribeScene();
		} catch {
			/* ignore */
		}

		try {
			if (typeof _unsubscribeTraits === 'function') _unsubscribeTraits();
		} catch {
			/* ignore */
		}

		try {
			if (typeof _unsubscribeActiveQuest === 'function') _unsubscribeActiveQuest();
		} catch {
			/* ignore */
		}

		try {
			if (_onPop) window.removeEventListener('popstate', _onPop);
			if (_onKey) window.removeEventListener('keydown', _onKey, _keyOptions || false);
			if (_onBeforeUnload) window.removeEventListener('beforeunload', _onBeforeUnload);
			try {
				if (typeof window !== 'undefined' && window.removeEventListener) {
					window.removeEventListener('combat:log', onCombatLogEvent);
					if (_onQuestSubmitted) window.removeEventListener('quest:submitted', _onQuestSubmitted);
					if (_onQuestCompleted) window.removeEventListener('quest:completed', _onQuestCompleted);
				}
			} catch (e) {}
		} catch {
			/* ignore */
		}

		try {
			// Cancel any running playbacks
			_playbackControllers.forEach((c) => c && c.cancel && c.cancel());
			_playbackControllers = [];
		} catch (e) {
			/* ignore */
		}

		try {
			if (_travelAnimationInterval) {
				clearInterval(_travelAnimationInterval);
				_travelAnimationInterval = null;
			}
		} catch (e) {}

		// Ensure left-side UI is restored if we hid it
		try {
			if (typeof document !== 'undefined' && document && document.body) {
				document.body.classList.remove('hide-left-ui');
			}
		} catch (e) {
			/* ignore */
		}
	});
</script>

{#if showSlotsModal}
	<SaveSlotsModal
		on:close={() => (showSlotsModal = false)}
		on:loaded={async (e) => {
			const d = e.detail || {};
			// Sync activeQuest from loaded save data
			if (d.save && d.save.character && d.save.character.activeQuest) {
				activeQuest.set(d.save.character.activeQuest);
			}
			const player = d.meta && d.meta.playerName ? d.meta.playerName : '—';
			// Visible feedback for the user
			try {
				alert(`Loaded save from ${player}`);
			} catch {
				/* ignore */
			}
			debugLogs.push('[game/+page] slot loaded -> ' + player);
			console.log('[game/+page] loaded event received:', d);
			console.log('[game/+page] save data:', d.save);
			console.log('[game/+page] currentScene in save:', d.save?.currentScene);
			showSlotsModal = false;
			// If the loaded save contains a target scene, ask sceneManager to load it
			if (d.save && d.save.currentScene) {
				try {
					console.log('[game/+page] attempting to load scene:', d.save.currentScene);
					await sceneManager.loadScene(d.save.currentScene);
					console.log('[game/+page] scene loaded successfully');
				} catch (err) {
					console.error('[game/+page] Failed to load scene from slot:', err);
					console.error('[game/+page] Scene that failed:', d.save.currentScene);
				}
			} else {
				console.warn('[game/+page] No currentScene in save data');
			}
			// install back-block handlers if needed after resuming
			installBlockHandlersIfRequested();
		}}
	/>
{/if}

<!-- Magic Barrier integrated in hub -->

<!-- Debug panel removed per user request -->

{#if currentScene}
	{#if currentScene.type === 'free-mode'}
			<!-- Free mode active: render the original hub interface -->
			<FreeModeHub on:combatToggle={() => toggleLog()} />
	{:else if currentScene.type === 'narrative'}
		<NarrativeScene scene={currentScene} />
	{:else if currentScene.type === 'conversation'}
		<ConversationScene scene={currentScene} />
	{:else if currentScene.type === 'choice'}
		{#if choiceComponent}
			<svelte:component this={choiceComponent} scene={currentScene} />
		{:else if choiceLoading}
			<div class="choice-loading">Loading choices…</div>
		{:else if choiceError}
			<div class="choice-error">Failed to load choices.</div>
		{/if}
	{/if}
{:else}
	<div class="no-scene">No scene loaded.</div>
{/if}

<!-- Floating fallback: ensure a persistent Show Hub button is available when hub is hidden
	 and the active scene is free-mode (helps after loading a save). -->

<!-- Re-enabled in-page Combat Log panel (header always visible; content toggled) -->
{#if $hasActiveQuest && !isNonCombatQuest}
	<div class="combat-log-panel" role="log" aria-live="polite">
		<div bind:this={simLogEl} class="combat-log {simVisible ? '' : 'collapsed'}" aria-hidden={!simVisible} on:scroll={onCombatLogScroll}>
			{#each combatLogs as line, idx (idx)}
				<div class="log-line {idx === (combatLogs.length - 1) ? 'newest' : ''}">
					{#if typeof line === 'string'}
						{line}
					{:else if line && line.text}
						{line.text}
					{:else}
						{@html String(line)}
					{/if}
				</div>
				{/each}
		</div>
		<div class="combat-log-header">
			<div class="combat-log-title">Combat Log</div>
			<div class="combat-log-actions">
				<!-- Show/Hide toggle -->
				<button
					class="combat-log-toggle"
					on:click={() => setLogVisible(!simVisible)}
					title="Show or hide combat log"
				>
					{simVisible ? 'Hide' : 'Show'}
				</button>
				<!-- Clear button -->
				<button
					class="combat-log-clear"
					on:click={clearDebugLogs}
					title={ clearDisabled ? 'Cannot clear until quest completes' : 'Clear combat log' }
					disabled={clearDisabled}
				>
					Clear
				</button>
			</div>
		</div>
	</div>
{/if}

<audio bind:this={bgmBirds} src={srcBirds} loop preload="auto" controlsList="nodownload" on:contextmenu|preventDefault></audio>
<audio bind:this={bgmWaves} src={srcWaves} loop preload="auto" controlsList="nodownload" on:contextmenu|preventDefault></audio>
<audio bind:this={bgmTavern} src={srcTavern} loop preload="auto" controlsList="nodownload" on:contextmenu|preventDefault></audio>
<audio bind:this={bgmInn} src={srcInn} loop preload="auto" controlsList="nodownload" on:contextmenu|preventDefault></audio>
<audio bind:this={bgmGuild} src={srcGuild} loop preload="auto" controlsList="nodownload" on:contextmenu|preventDefault></audio>
<audio bind:this={bgmBasement} src={srcBasement} loop preload="auto" controlsList="nodownload" on:contextmenu|preventDefault></audio>
<audio bind:this={bgmForest} src={srcForest} loop preload="auto" controlsList="nodownload" on:contextmenu|preventDefault></audio>
<audio bind:this={bgmGame} src={currentGameTrack} on:ended={onGameTrackEnded} preload="auto" controlsList="nodownload" on:contextmenu|preventDefault></audio>

<style>
/* Minimal combat log styles */
.combat-log-panel {
	 /* Anchor the combat log to the bottom-left so it appears under the
		 quest UI area but near the viewport bottom. Header/buttons stay
		 visible above the log content. */
	 position: fixed;
	 left: 16px;
	 bottom: 16px;
	right: auto;
	width: 325px;
	max-height: 60vh;
	z-index: 1600;
	display: flex;
	flex-direction: column;
	gap: 8px;
}
.combat-log-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 6px 8px;
}
.combat-log-title {
	color: #e8f0ff;
	font-weight: 700;
}
.combat-log-toggle {
	background: transparent;
	color: #e8f0ff;
	border: 1px solid rgba(255,255,255,0.06);
	padding: 4px 8px;
	border-radius: 6px;
	cursor: pointer;
}
.combat-log-actions {
	display: flex;
	justify-content: flex-end;
	padding: 6px 8px;
}

/* (temporary free-mode shell styles removed) */
.combat-log-clear {
	background: rgba(255,255,255,0.04);
	color: #e8f0ff;
	border: 1px solid rgba(255,255,255,0.06);
	padding: 6px 8px;
	border-radius: 6px;
	cursor: pointer;
}
.combat-log-clear[disabled], .combat-log-clear[disabled]:hover {
	opacity: 0.45;
	cursor: not-allowed;
}
.combat-log {
	background: linear-gradient(180deg,#071029 0%, #0b1722 100%);
	border: 1px solid rgba(255,255,255,0.04);
	padding: 8px;
	border-radius: 8px;
	overflow-y: auto;
	max-height: 48vh;
	box-shadow: 0 8px 24px rgba(2,8,23,0.6);
}
.combat-log.collapsed {
	display: none;
}
.log-line {
	font-size: 13px;
	color: #dfeeff;
	padding: 6px 8px;
	border-bottom: 1px dashed rgba(255,255,255,0.02);
	background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.0));
	transition: background 160ms ease, transform 120ms ease;
}
.log-line.newest {
	background: linear-gradient(90deg, rgba(127,209,185,0.06), rgba(127,209,185,0.02));
	box-shadow: 0 6px 18px rgba(8,30,40,0.45);
	transform: translateY(-2px);
}
.combat-log::-webkit-scrollbar {
	width: 10px;
}
.combat-log::-webkit-scrollbar-thumb {
	background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
	border-radius: 6px;
}
</style>
