import { simulateFight as simulateFightBrowser } from './combatSimulator.browser.js';

// Play back a simulator run as real-time events. Returns a controller
// with a `done` promise and `cancel()` to stop playback.
export function playSimulation(attacker, defender, options = {}) {
	const playbackSpeed = Number(options.playbackSpeed) || 1; // 1 = realtime of simTime
	const seed = options.seed == null ? undefined : options.seed;

	const res = simulateFightBrowser(attacker, defender, Object.assign({}, options, { seed }));

	const timeouts = [];
	let cancelled = false;

	function dispatchLog(ev) {
		try {
			if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
				window.dispatchEvent(new CustomEvent('combat:log', { detail: ev }));
			}
		} catch (e) {
			// ignore
		}
	}

	const start = Date.now();
	const baseSim = res.logs.length ? res.logs[0].simTime : 0;

	// schedule each log entry using its simTime relative to baseSim
	// Enforce a minimum visual pacing so the user can actually read the logs
	const MIN_VISUAL_DELAY_MS = 800; 
	let lastScheduledTime = 0;

	for (let i = 0; i < res.logs.length; i++) {
		const entry = res.logs[i];
		
		// Calculate "Game Time" delay
		const relative = Math.max(0, entry.simTime - baseSim);
		let delay = Math.round(relative / playbackSpeed);

		// Enforce "Reading Time" pacing
		// If the calculated delay is too close to the previous one, push it forward
		if (delay < lastScheduledTime + MIN_VISUAL_DELAY_MS) {
			delay = lastScheduledTime + MIN_VISUAL_DELAY_MS;
		}
		lastScheduledTime = delay;

		const id = setTimeout(() => {
			if (cancelled) return;
			dispatchLog(Object.assign({}, entry, { seed: res.seed }));
		}, delay);
		timeouts.push(id);
	}

	// Resolve when last timeout fires (or immediately if no logs)
	const done = new Promise((resolve) => {
		if (res.logs.length === 0) {
			resolve(res);
			return;
		}
		// Add a small buffer after the last event
		const totalDelay = lastScheduledTime + 500;
		const finishId = setTimeout(() => {
			if (!cancelled) resolve(res);
			else resolve({ cancelled: true });
		}, totalDelay);
		timeouts.push(finishId);
	});

	return {
		done,
		cancel() {
			cancelled = true;
			timeouts.forEach((t) => clearTimeout(t));
		},
		result: res
	};
}

export default { playSimulation };
