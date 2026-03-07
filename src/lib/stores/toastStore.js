import { writable } from 'svelte/store';

/**
 * Simple toast store for short snackbars.
 * Exports `toasts` (writable array) and helpers `show`, `remove`, and `showRewards`.
 * @typedef {{label:string,kind?:string}} ToastEntry
 * @typedef {{id:number,message?:string,type:string,items?:ToastEntry[]}} ToastItem
 */

/** @type {import('svelte/store').Writable<ToastItem[]>} */
const toasts = writable([]);

/** Remove a toast by id
 * @param {number} id
 */
function remove(id) {
	toasts.update(/** @param {ToastItem[]} t */ (t) => t.filter((x) => x.id !== id));
}

/** Show a toast
 * @param {string | undefined} message
 * @param {{duration?:number,type?:string,items?:ToastEntry[]}} [opts]
 * @returns {number} id
 */
function show(message, { duration = 4000, type = 'info', items } = {}) {
	const id = Date.now() + Math.floor(Math.random() * 1000);
	const item = /** @type {ToastItem} */ ({ id, message, type, items });
	toasts.update(/** @param {ToastItem[]} t */ (t) => [item, ...t]);
	setTimeout(() => remove(id), duration);
	return id;
}

/** Show a formatted reward toast
 * @param {any} rewards
 * @param {{duration?:number,type?:string}} [opts]
 */
function showRewards(rewards, opts = {}) {
	if (!rewards) return null;
	/** @type {ToastEntry[]} */
	const entries = [];
	if (rewards.silver) entries.push({ label: `+${rewards.silver}`, kind: 'silver' });
	if (rewards.gold) entries.push({ label: `+${rewards.gold}`, kind: 'gold' });
	if (rewards.diamonds) entries.push({ label: `+${rewards.diamonds}`, kind: 'diamond' });
	if (rewards.exp) entries.push({ label: `+${rewards.exp}`, kind: 'exp' });
	if (rewards.items && rewards.items.length) {
		const items = rewards.items.map(
			(/** @type {any} */ it) =>
				/** @type {ToastEntry} */ ({ label: `${it.name} x${it.qty || 1}`, kind: 'item' })
		);
		entries.push(...items);
	}

	// If no structured entries, fall back to a generic message
	if (!entries.length) return show('Quest rewards received', opts);
	return show(undefined, { ...opts, items: entries });
}

export { toasts, show, remove, showRewards };
