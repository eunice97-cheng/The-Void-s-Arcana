<script>
	import { onDestroy, onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import {
		gameState,
		recalculateStatPoints,
		updateAdventurerRank,
		completeQuest,
		unlockAchievement
	} from '$lib/stores/gameState';
	import { get } from 'svelte/store';
	import { createEventDispatcher } from 'svelte';
	import { getBaseStats, calculateDerived } from '$lib/utils/stats';
	import skillsDb from '$lib/data/skills.json';

	const dispatch = createEventDispatcher();

	const STAT_KEYS = ['STR', 'DEX', 'INT', 'CON', 'WIS', 'CHA'];

	let gs = get(gameState) || {};
	let character = gs.character || {};
	let availablePoints = 0;
	let originalStats = {};
	let workingStats = {};
	let initialized = false;

	// Expose functions globally for console access
	if (typeof window !== 'undefined') {
		window.recalculateStatPoints = recalculateStatPoints;
		window.updateAdventurerRank = updateAdventurerRank;
		window.completeQuest = completeQuest;
		window.unlockAchievement = unlockAchievement;
	}

	const unsub = gameState.subscribe((v) => {
		gs = v || {};
		character = gs.character || {};

		// Initialize stats only once when component mounts or when character data first becomes available
		if (!initialized && character) {
			// Update available points
			availablePoints = Number((character && character.unallocatedStatPoints) || 0);

			// Update stats when character data changes
			const base = character && character.stats ? { ...character.stats } : getBaseStats();
			originalStats = { ...base };
			// ensure all keys present
			for (const k of STAT_KEYS) {
				if (typeof originalStats[k] === 'undefined') originalStats[k] = 5;
			}
			workingStats = { ...originalStats };
			initialized = true;
		} else if (initialized) {
			// Only update available points when gameState changes
			availablePoints = Number((character && character.unallocatedStatPoints) || 0);
		}
	});

	// Cleanup subscription on component destroy
	onDestroy(() => {
		if (unsub) unsub();
	});

	// Prepare a normalized skill list for rendering so the template doesn't need
	// to call `getSkillMeta` repeatedly. This keeps the markup simple.
	$: skillList =
		character && Array.isArray(character.skills)
			? character.skills.map((s) => getSkillMeta(s))
			: [];

	function inc(stat) {
		if (availablePoints <= 0) return;
		workingStats[stat] = (workingStats[stat] || 0) + 1;
		availablePoints -= 1;
	}

	function dec(stat) {
		// don't allow going below original value
		const minVal = originalStats[stat] || 0;
		if ((workingStats[stat] || 0) <= minVal) return;
		workingStats[stat] = (workingStats[stat] || 0) - 1;
		availablePoints += 1;
	}

	function confirmAlloc() {
		// persist to gameState: update character.stats and unallocatedStatPoints
		gameState.update((s) => {
			const base = s || {};
			const nextChar = {
				...(base.character || {}),
				stats: {
					...(base.character && base.character.stats ? base.character.stats : {}),
					...workingStats
				},
				unallocatedStatPoints: availablePoints
			};

			// Recalculate derived stats (maxHp, maxSp, maxStamina) based on new stats
			const derived = calculateDerived(
				workingStats,
				nextChar.class,
				gs.playerData?.level || 1,
				{},
				{ skills: nextChar.skills || character.skills || [] }
			);
			const nextPlayerData = {
				...(base.playerData || {}),
				maxHp: derived.maxHp,
				maxSp: derived.maxSp,
				maxStamina: derived.maxStamina
			};

			return { ...base, character: nextChar, playerData: nextPlayerData };
		});
		// after confirm, allocations are final (no undo) — we simply close the window
		dispatch('close');
	}

	function close() {
		dispatch('close');
	}

	function isSkillEnabled(skillId) {
		const config = character.skillConfig || {};
		return config[skillId] !== false;
	}

	function toggleSkill(skillId) {
		gameState.update((s) => {
			const char = s.character || {};
			const config = char.skillConfig || {};
			const current = config[skillId] !== false;
			return {
				...s,
				character: {
					...char,
					skillConfig: {
						...config,
						[skillId]: !current
					}
				}
			};
		});
	}

	function getSkillMeta(sk) {
		// Return a normalized skill metadata object used by the UI
		if (!sk) return { id: 'unknown', name: 'Unknown', level: 1 };
		let dbEntry = null;
		if (typeof sk === 'string') {
			dbEntry = skillsDb.find((s) => s.id === sk) || null;
			return {
				id: sk,
				name: dbEntry ? dbEntry.name : sk,
				level: 1,
				type: dbEntry ? dbEntry.type : undefined,
				description: dbEntry ? dbEntry.description : undefined,
				icon: dbEntry
					? dbEntry.icon && dbEntry.icon.startsWith('/')
						? dbEntry.icon
						: '/' + dbEntry.icon
					: undefined,
				spCost: dbEntry ? dbEntry.spCost : undefined,
				cooldownSeconds: dbEntry ? dbEntry.cooldownSeconds : undefined,
				effects: dbEntry ? dbEntry.effects : undefined
			};
		}

		// sk is an object
		dbEntry = skillsDb.find((s) => s.id === sk.id) || null;
		const name = sk.name || (dbEntry && dbEntry.name) || sk.id || 'Unknown';
		const iconRaw = (dbEntry && dbEntry.icon) || sk.icon || undefined;
		return {
			id: sk.id || name,
			name,
			level: (dbEntry && dbEntry.level) || sk.level || 1,
			type: sk.type || (dbEntry && dbEntry.type) || undefined,
			description: sk.description || (dbEntry && dbEntry.description) || undefined,
			icon: iconRaw ? (iconRaw.startsWith('/') ? iconRaw : '/' + iconRaw) : undefined,
			// preserve explicit zero values (0) instead of falling back due to falsy checks
			spCost:
				typeof sk.spCost !== 'undefined'
					? sk.spCost
					: dbEntry && typeof dbEntry.spCost !== 'undefined'
						? dbEntry.spCost
						: undefined,
			cooldownSeconds:
				typeof sk.cooldownSeconds !== 'undefined'
					? sk.cooldownSeconds
					: dbEntry && typeof dbEntry.cooldownSeconds !== 'undefined'
						? dbEntry.cooldownSeconds
						: undefined,
			effects:
				typeof sk.effects !== 'undefined'
					? sk.effects
					: dbEntry && typeof dbEntry.effects !== 'undefined'
						? dbEntry.effects
						: undefined
		};
	}

	function formatCooldown(sec) {
		if (typeof sec !== 'number' || isNaN(sec)) return '' + sec;
		// Format as HH:MM:SS (zero padded)
		const total = Math.max(0, Math.floor(sec));
		const hours = Math.floor(total / 3600);
		const minutes = Math.floor((total % 3600) / 60);
		const seconds = total % 60;
		const pad = (n) => String(n).padStart(2, '0');
		return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
	}

	// Return remaining cooldown seconds for a skill meta based on character.skillCooldowns
	let now = writable(Date.now());

	onMount(() => {
		const h = setInterval(() => {
			now.set(Date.now());
		}, 1000);
		return () => clearInterval(h);
	});

	$: dummy = $now;

	function getSkillCooldownRemaining(meta) {
		try {
			if (!meta || !meta.id || typeof meta.cooldownSeconds !== 'number') return 0;
			const cdSec = meta.cooldownSeconds;
			const cooldowns = (character && character.skillCooldowns) || {};
			const last = cooldowns[meta.id] || 0;
			if (!last) return 0;
			const end = last + cdSec * 1000;
			const remMs = end - $now;
			if (remMs <= 0) return 0;
			return Math.ceil(remMs / 1000);
		} catch (e) {
			return 0;
		}
	}

	function formatEffects(effects) {
		if (!effects || typeof effects !== 'object') return [];
		const out = [];
		for (const k of Object.keys(effects)) {
			const v = effects[k];
			// human friendly key
			const label = k
				.replace(/([A-Z])/g, ' $1')
				.replace(/^./, (s) => s.toUpperCase())
				.replace(/_/g, ' ');
			out.push({ text: `${label}: ${v}` });
		}
		return out;
	}

	// Render more natural sentences for certain complex effects
	function renderEffectsForMeta(meta) {
		if (!meta || !meta.effects) return [];

		const out = [];
		// Special-case the Acolyte Heal skill for a clean sentence
		if (meta.id === 'acolyte_heal' && meta.effects.healAmount) {
			const heal = meta.effects.healAmount;
			const undead = meta.effects.undeadDamage;
			if (undead) {
				return [
					{ text: `Heal ${heal} HP. If targeted on an Undead foe, it instantly deals ${undead} Magic Damage.` }
				];
			}
			return [{ text: `Heal ${heal} HP.` }];
		}
		// Special-case some boolean or complex flags for clearer sentences
		if (meta.effects && meta.effects.escapeFailedQuest) {
			return [{ text: 'Allows you to escape a failed quest when the situation permits.' }];
		}

		// Special-case craftArrowsFree to a friendly sentence
		if (meta.effects && meta.effects.craftArrowsFree) {
			return [
				{ text: 'Permanently craft standard arrows at no cost, eliminating the need to purchase or carry them' }
			];
		}

		// Special-case element-specific modifiers (e.g. Ifrit: +50% vs Earth, -25% vs Water)
		if (meta.effects && meta.effects.elementalAgainst && typeof meta.effects.elementalAgainst === 'object') {
			const iconMap = {
				fire: '/Images/fire.png',
				water: '/Images/water.png',
				earth: '/Images/earth.png',
				air: '/Images/air.png'
			};
			// Sort entries by modifier descending so prominent bonuses appear first
			const ents = Object.entries(meta.effects.elementalAgainst).sort((a, b) => b[1] - a[1]);
			const out = [];
			for (const [el, val] of ents) {
				const elName = el.charAt(0).toUpperCase() + el.slice(1);
				const icon = iconMap[el] || null;
				if (typeof val === 'number') {
					if (val > 0) {
						out.push({ text: `Add ${val}% Elemental Damage against ${elName} Elemental Monster`, icon, element: elName });
					} else if (val < 0) {
						out.push({ text: `Lose ${Math.abs(val)}% Elemental Damage against ${elName}`, icon, element: elName });
					}
				}
			}
			return out;
		}

		// Special-case flat accuracy bonuses to a friendly sentence
		if (meta.effects && typeof meta.effects.accuracyFlat === 'number') {
			try {
				const pct = meta.effects.accuracyFlat * 100;
				const pctStr = Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
				return [{ text: `Permanently Increases Base Accuracy by ${pctStr}%` }];
			} catch (e) {
				return [{ text: `Permanently Increases Base Accuracy by ${meta.effects.accuracyFlat * 100}%` }];
			}
		}
		// Special-case elemental damage percent: return a single item so the
		// UI can place the text on the left and the icon+label on the right.
		if (meta.effects && typeof meta.effects.elementalDamagePercent === 'number') {
			const iconMap = {
				fire: '/Images/fire.png',
				water: '/Images/water.png',
				earth: '/Images/earth.png',
				air: '/Images/air.png'
			};
			const icon = meta.effects.element ? iconMap[meta.effects.element] : null;
			return [
				{
					text: `Add Elemental Damage ${meta.effects.elementalDamagePercent}%`,
					icon,
					element: 'Element'
				}
			];
		}

		// Custom formatting for damage reduction and duration keys
		if (meta.effects) {
			if (typeof meta.effects.damageReductionPercent === 'number') {
				out.push({ text: `Damage Reduction : ${meta.effects.damageReductionPercent}%` });
			}
			if (typeof meta.effects.damageReduction === 'number') {
				// Some data may use a non-percent key; treat as percent for display
				out.push({ text: `Damage Reduction : ${meta.effects.damageReduction}%` });
			}
			if (typeof meta.effects.physicalDamagePercent === 'number') {
				const val = meta.effects.physicalDamagePercent;
				const sign = val > 0 ? '+' : '';
				out.push({ text: `Physical Damage : ${sign}${val}%` });
			}
			if (typeof meta.effects.physicalDefensePercent === 'number') {
				const val = meta.effects.physicalDefensePercent;
				const sign = val > 0 ? '+' : '';
				out.push({ text: `Physical Defense : ${sign}${val}%` });
			}
			if (typeof meta.effects.magicResistancePercent === 'number') {
				const val = meta.effects.magicResistancePercent;
				const sign = val > 0 ? '+' : '';
				out.push({ text: `Magic Resistance : ${sign}${val}%` });
			}
			if (typeof meta.effects.accuracyPercent === 'number') {
				const val = meta.effects.accuracyPercent;
				const sign = val > 0 ? '+' : '';
				out.push({ text: `Accuracy : ${sign}${val}%` });
			}
			if (typeof meta.effects.evasionPercent === 'number') {
				const val = meta.effects.evasionPercent;
				const sign = val > 0 ? '+' : '';
				out.push({ text: `Evasion : ${sign}${val}%` });
			}
			if (typeof meta.effects.reflectDamagePercent === 'number') {
				out.push({ text: `Reflect Damage : ${meta.effects.reflectDamagePercent}%` });
			}
			if (typeof meta.effects.reflectCapPercent === 'number') {
				out.push({ text: `Max Reflect Damage per Cast : ${meta.effects.reflectCapPercent}% of Max HP` });
			}
			if (typeof meta.effects.durationSeconds === 'number') {
				out.push({ text: `Skill Duration : ${formatSecondsReadable(meta.effects.durationSeconds)}` });
			}
			if (typeof meta.effects.duration === 'number') {
				out.push({ text: `Skill Duration : ${formatSecondsReadable(meta.effects.duration)}` });
			}
			if (out.length) return out;
		}
		// Special-case flat defense bonuses into a single readable sentence
		if (
			meta.effects &&
			(typeof meta.effects.physicalDefenseFlat === 'number' ||
				typeof meta.effects.magicDefenseFlat === 'number')
		) {
			try {
				const pd =
					typeof meta.effects.physicalDefenseFlat === 'number'
						? meta.effects.physicalDefenseFlat
						: null;
				const md =
					typeof meta.effects.magicDefenseFlat === 'number' ? meta.effects.magicDefenseFlat : null;
				if (pd != null && md != null) {
					return [{ text: `Permanently increases Physical Defense by ${pd} and Magic Defense by ${md}` }];
				}
				if (pd != null) return [{ text: `Permanently increases Physical Defense by ${pd}` }];
				if (md != null) return [{ text: `Permanently increases Magic Defense by ${md}` }];
			} catch (e) {
				// fallthrough to default formatting on error
			}
		}
		// default: use the key/value formatter
		return formatEffects(meta.effects);
	}

	// Return an accent color (CSS) for a skill to use in decorations
	function getAccentColor(meta) {
		if (!meta || !meta.id) return '#6b7280'; // neutral gray
		// Prefer pill-driven accents: make the small circular badge match the
		// top color used by Active / Passive pills so they visually align.
		if (meta.type === 'active') return '#10b981'; // top emerald green used in Active pill
		if (meta.type === 'passive') return '#0b3d91'; // top navy used in Passive pill
		// special-case some skills (fallback heuristics)
		if (meta.id === 'acolyte_heal') return '#10b981'; // healing -> green
		// class-based heuristics: mages -> blue, warrior -> red, rogue -> amber, tinkerer -> orange
		if (meta.id.includes('mage') || meta.id.includes('spell') || meta.id.includes('arcane'))
			return '#60a5fa';
		if (meta.id.includes('warrior') || meta.id.includes('strike')) return '#f87171';
		if (meta.id.includes('rogue') || meta.id.includes('stealth')) return '#f59e0b';
		return '#7c3aed'; // fallback purple
	}

	// Background color for specific items (subtle tint for healing skills etc.)
	function getItemBgColor(meta) {
		if (!meta || !meta.id) return 'rgba(255,255,255,0.02)';
		if (meta.id === 'acolyte_heal') return 'rgba(110,231,183,0.06)';
		return 'rgba(255,255,255,0.02)';
	}

// Image enlarge / skill-card overlay state and handlers
let enlargedMeta = null;
let showSkillBadge = false;
function openImage(meta) {
	if (!meta) return;
	enlargedMeta = meta;
	// Only show the Ascendant badge when the skill is an ascendant AND
	// the player actually has that ascendant activated. Activation can
	// be represented by `character.alexiChosenElement` or by having the
	// ascendant in the character.skills array (saved-state).
	const isAscendant = (meta && (meta.name && meta.name.includes('Ascendant'))) || (meta.id && meta.id.includes('_adv'));
	if (!isAscendant) {
		showSkillBadge = false;
		return;
	}
	const player = $gameState && $gameState.character ? $gameState.character : character;
	const activated = !!(
		(player && player.alexiChosenElement && player.alexiChosenElement === meta.id) ||
		(player && Array.isArray(player.skills) && player.skills.includes(meta.id))
	);
	showSkillBadge = activated;
}

// Human friendly seconds -> readable string (e.g. "10 seconds", "2m 05s", "1h 02m")
function formatSecondsReadable(sec) {
	if (typeof sec !== 'number' || isNaN(sec) || sec <= 0) return '0 seconds';
	const s = Math.floor(sec);
	if (s < 60) return `${s} seconds`;
	const minutes = Math.floor(s / 60);
	const seconds = s % 60;
	if (minutes < 60) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${hours}h ${String(mins).padStart(2, '0')}m`;
}
function closeImage() {
	enlargedMeta = null;
}

onMount(() => {
	const onKey = (e) => {
		if (e.key === 'Escape' && enlargedMeta) closeImage();
	};
	window.addEventListener('keydown', onKey);
	return () => window.removeEventListener('keydown', onKey);
});
</script>

<div class="status-window" role="dialog" aria-modal="false">
	<header class="status-header">
		<h3>Status — Stats & Skills</h3>
		<button class="close" aria-label="Close" on:click={close}>✕</button>
	</header>
	<span style="display: none;">{$now}</span>

	<div class="split">
		<div class="left">
			<h4>Attributes</h4>
			<div class="available">Available points: <strong>{availablePoints}</strong></div>
			<div class="stats-list">
				{#each STAT_KEYS as key (key)}
					<div class="stat-row">
						<div class="stat-name">{key}</div>
						<div class="stat-controls">
							<button
								class="dec"
								aria-label="Decrease {key}"
								on:click={() => dec(key)}
								disabled={workingStats[key] <= originalStats[key]}>−</button
							>
							<div class="stat-value">{workingStats[key]}</div>
							<button
								class="inc"
								aria-label="Increase {key}"
								on:click={() => inc(key)}
								disabled={availablePoints <= 0}>+</button
							>
						</div>
					</div>
				{/each}
			</div>
			<div class="confirm-row">
				<button class="btn-confirm" on:click={confirmAlloc} disabled={false}>Confirm</button>
			</div>
		</div>

		<div class="right">
			<h4>Skills</h4>
			{#if character && Array.isArray(character.skills) && character.skills.length}
				<ul class="skills-list">
					{#each skillList as meta (meta.id + $now)}
						<li style="--accent: {getAccentColor(meta)}; --item-bg: {getItemBgColor(meta)}">
							<div class="skill-icon-wrapper">
									{#if meta.icon}
										<button class="skill-icon-btn" type="button" on:click={() => openImage(meta)} aria-label={`Open ${meta.name} skill card`} title={meta.name}>
										<img class="skill-icon" src={meta.icon} alt={meta.name} loading="eager" />
									</button>
									{#if meta.description}
										<div class="skill-tooltip" role="tooltip">{meta.description}</div>
									{/if}
								{:else}
									<div class="skill-icon empty" aria-hidden="true"></div>
								{/if}
							</div>
							<div class="skill-body">
								<div class="skill-row">
									<div class="skill-name">{meta.name}</div>
									<div style="display:flex; gap:8px; align-items:center">
										<div
											class="skill-type"
											class:activeType={meta.type === 'active'}
											class:passiveType={meta.type === 'passive'}
										>
											{meta.type ? (meta.type === 'active' ? 'Active' : 'Passive') : '—'}
										</div>
										<div class="skill-level" class:lv1={meta.level === 1}>Level {meta.level}</div>
									</div>
								</div>
								<div class="skill-submeta">
									<div class="cost-box" style="--accent: {getAccentColor(meta)}">
										{#if typeof meta.spCost === 'number'}
											<div class="cost-btn sp">SP <span class="cost-val">{meta.spCost}</span></div>
										{/if}
										{#if meta.cooldownSeconds != null}
											{#if getSkillCooldownRemaining(meta) > 0}
												<div class="cost-btn cd">
													CD <span class="cost-val"
														>{formatCooldown(getSkillCooldownRemaining(meta))}</span
													><small class="cd-total">/{formatCooldown(meta.cooldownSeconds)}</small>
												</div>
											{:else}
												<div class="cost-btn cd">
													CD <span class="cost-val">{formatCooldown(meta.cooldownSeconds)}</span>
												</div>
											{/if}
										{/if}
									</div>
									{#if meta.type === 'active'}
										<button 
											class="skill-toggle-btn" 
											class:off={!isSkillEnabled(meta.id)} 
											on:click|stopPropagation={() => toggleSkill(meta.id)}
											title={isSkillEnabled(meta.id) ? "Auto-cast enabled" : "Auto-cast disabled"}
										>
											{isSkillEnabled(meta.id) ? 'ON' : 'OFF'}
										</button>
									{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="empty">No skills found.</div>
			{/if}
		</div>
	</div>
</div>

{#if enlargedMeta}
	<div class="img-overlay" role="dialog" aria-modal="true" on:click={closeImage} tabindex="-1">
		<div class="skill-card" on:click|stopPropagation>
			<div class="card-left">
				<div class="avatar-wrap">
					<img src={enlargedMeta.icon} alt={enlargedMeta.name} class="enlarged-img" loading="eager" />
					{#if showSkillBadge}
						<span
							class="avatar-badge"
							aria-hidden="true"
							style={`background: url(${$gameState.character?.avatar || '/Images/NPC/npc-alexa.PNG'}); background-size: cover; background-position: center; position: absolute; bottom: 10px; right: 10px; width: 90px; height: 90px; border: 2px solid #a855f7;`}
						></span>
					{/if}
				</div>
			</div>
			<div class="card-right">
				<div class="card-content">
					<div class="card-header">
						<div class="skill-name-large">{enlargedMeta.name}</div>
						<div style="display:flex; gap:8px; align-items:center">
							<div
								class="skill-type"
								class:activeType={enlargedMeta.type === 'active'}
								class:passiveType={enlargedMeta.type === 'passive'}
								style="--accent: transparent"
							>
								{enlargedMeta.type ? (enlargedMeta.type === 'active' ? 'Active' : 'Passive') : '—'}
							</div>
							<div class="skill-level" class:lv1={enlargedMeta.level === 1}>Level {enlargedMeta.level}</div>
						</div>
					</div>
					<div class="card-submeta">
						<div class="cost-box" style="--accent: transparent">
							{#if typeof enlargedMeta.spCost === 'number' && enlargedMeta.spCost != null}
								<div class="cost-btn sp">SP <span class="cost-val">{enlargedMeta.spCost}</span></div>
							{/if}
							{#if enlargedMeta.cooldownSeconds != null}
								<div class="cost-btn cd">CD <span class="cost-val">{formatCooldown(enlargedMeta.cooldownSeconds)}</span></div>
							{/if}
						</div>
					</div>
					{#if enlargedMeta.description}
						<p class="skill-desc">{enlargedMeta.description}</p>
					{/if}
					{#if (enlargedMeta.effects && Object.keys(enlargedMeta.effects).length) || typeof enlargedMeta.spCost === 'number' || enlargedMeta.cooldownSeconds != null}
						<ul class="skill-effects-list">
							{#if enlargedMeta.effects}
								{#each renderEffectsForMeta(enlargedMeta) as eff}
                                        <li class="effect-line">- {eff.text}</li>
								{/each}
							{/if}

						</ul>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.status-window {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 12vh;
		width: min(820px, 96%);
		max-height: 600px;
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		color: #e8f0ff;
		border-radius: 12px;
		box-shadow: 0 22px 60px rgba(2, 8, 23, 0.75);
		z-index: 1500;
		border-left: 6px solid rgba(155, 94, 255, 0.95);
		/* make layout column so header stays fixed and body can scroll */
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	/* UI font variables for Status window */
	.status-window {
		--ui-font-family: 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		--ui-font-size: 12px;
		--skill-font-size: 12px; /* skill name row */
		--pill-font-size: 12px; /* pills: active/level/SP/CD */
		--effect-font-size: 12px; /* effect items */
		--tooltip-font-size: 12px;
		font-family: var(--ui-font-family);
		font-size: var(--ui-font-size);
	}
	.status-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	.status-header .close {
		background: transparent;
		border: 0;
		color: rgba(255, 255, 255, 0.85);
		font-size: 18px;
		cursor: pointer;
		transition: transform 140ms ease;
	}
	.status-header .close:hover {
		transform: scale(1.06);
	}
	.split {
		display: flex;
		gap: 12px;
		/* occupy remaining vertical space inside the window so the right
		   column can scroll independently when content overflows */
		flex: 1 1 auto;
		overflow: hidden;
	}
	.left {
		/* keep the left stats pane a stable width so it doesn't collapse
		   when the window is resized; allow some responsiveness via min-width */
		flex: 0 0 260px;
		min-width: 220px;
		padding: 12px;
		border-right: 1px solid rgba(255, 255, 255, 0.03);
		min-height: 240px;
		overflow: auto; /* allow left to scroll if needed */
	}
	.right {
		flex: 1 1 auto;
		min-width: 0;
		padding: 12px;
		min-height: 240px;
		/* independent vertical scrolling when skills overflow */
		overflow: auto;
	}

	/* tighten spacing between the Skills heading and the first skill entry */
	.right h4 {
		margin: 0 0 8px 0;
	}
	.available {
		margin-bottom: 8px;
		color: rgba(255, 255, 255, 0.9);
	}
	.stats-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.stat-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.stat-name {
		width: 60px;
		font-weight: 700;
	}
	.stat-controls {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.stat-value {
		min-width: 36px;
		text-align: center;
	}
	.inc,
	.dec {
		width: 34px;
		height: 34px;
		border-radius: 8px;
		border: 0;
		background: rgba(255, 255, 255, 0.02);
		color: inherit;
		cursor: pointer;
	}
	.inc:disabled,
	.dec:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.confirm-row {
		margin-top: 12px;
	}
	.btn-confirm {
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.04);
		background: linear-gradient(90deg, #7b5cff, #5ca0ff);
		color: #fff;
		cursor: pointer;
	}
	.skills-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.skills-list li {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: start;
		gap: 10px;
		padding: 8px;
		background: var(--item-bg, rgba(255, 255, 255, 0.02));
		border-radius: 8px;
		/* do not reuse the window's left stripe — use a subtle background tint
		   and a per-icon accent badge instead */
		transition: background 160ms ease;
	}
	/* compute icon size from the heights of the name row + submeta row */
	:root {
		--skill-row-h: 20px; /* should match .skill-row line-height */
		--skill-submeta-h: 18px; /* should match .skill-submeta line-height */
		--skill-icon-pad: 8px; /* spacing buffer */
		/* responsive icon size: min 48px, preferred by viewport, max 80px */
		--skill-icon-size: clamp(48px, 6.5vw, 80px);
	}
	.skill-icon-wrapper {
		position: relative;
		flex: 0 0 auto;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-start;
		gap: 6px;
	}

	/* small colored badge on the icon to indicate the accent color without
		   reusing the big left stripe from the window */
	.skill-icon-wrapper::after {
		content: '';
		position: absolute;
		/* position the badge relative to the icon size so it stays visually consistent */
		top: calc(var(--skill-icon-size) * -0.09);
		right: calc(var(--skill-icon-size) * -0.09);
		width: calc(var(--skill-icon-size) * 0.15);
		height: calc(var(--skill-icon-size) * 0.15);
		border-radius: 50%;
		background: var(--accent, transparent);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
	}

	.skill-icon {
		width: var(--skill-icon-size);
		height: var(--skill-icon-size);
		object-fit: cover;
		border-radius: 8px;
		flex: 0 0 auto;
		background: rgba(255, 255, 255, 0.02);
		cursor: zoom-in;
	}
	.skill-icon.empty {
		width: var(--skill-icon-size);
		height: var(--skill-icon-size);
		background: rgba(255, 255, 255, 0.01);
		border-radius: 8px;
	}

	.skill-icon-btn {
		background: transparent;
		border: 0;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		border-radius: 8px;
	}
	.skill-icon-btn:focus {
		outline: 2px solid rgba(124, 58, 237, 0.6);
		outline-offset: 4px;
	}

	/* Skill card layout for enlarged view */
	.skill-card {
		display: flex;
		gap: 28px; /* more breathing room between portrait and content */
		/* Match the status window's width and max-height exactly */
		width: min(820px, 96%);
		max-width: min(820px, 96%);
		max-height: 600px;
		overflow: hidden;
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		padding: 22px;
		border-radius: 12px;
		border: 3px solid #00d4ff;
		box-shadow: 0 20px 50px rgba(2,6,23,0.7);
		color: #fff;
		position: absolute; /* place it at same spot as the status window */
		top: 12vh;
		left: 50%;
		transform: translateX(-50%);
	}
	.skill-card .card-right {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
		overflow: hidden;
	}


	/* card header: name + small metadata strip */
	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid rgba(255,255,255,0.04);
	}

	.card-header .left {
		display:flex;
		flex-direction:column;
		gap:6px;
	}

	.card-submeta {
		margin-top: 6px;
	}

	/* make pills a bit larger and spaced */
	.skill-type, .skill-level, .cost-btn {
		padding: 8px 14px;
		height: 36px;
		min-width: 64px;
	}
	.skill-card .card-right .card-content {
		padding-right: 8px;
		overflow: auto;
		max-height: calc(80vh - 70px); /* allow room for padding inside the card */
		min-width: 0;
	}
	.skill-name-large {
		font-size: 20px;
		font-weight: 800;
		line-height: 1.05;
		letter-spacing: -0.2px;
	}
	.skill-desc {
		margin-top: 6px;
		color: rgba(255,255,255,0.9);
		font-size: 13px;
	}

	/* effect icons removed from UI */
	.skill-body {
		flex: 1 1 auto;
		min-width: 0; /* allow shrinking in flex layouts to avoid overflow */
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.skill-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: var(--skill-font-size, 12px);
		line-height: 20px; /* --skill-row-h */
	}
	.skill-submeta {
		display: flex;
		gap: 8px;
		font-size: var(--pill-font-size, 12px);
		line-height: 18px; /* --skill-submeta-h */
		color: rgba(255, 255, 255, 0.6);
	}

	/* tooltip shown when hovering the icon wrapper */
	.skill-tooltip {
		position: absolute;
		top: 0;
		left: calc(100% + 10px);
		min-width: 220px;
		max-width: 340px;
		padding: 8px 10px;
		background: rgba(6, 10, 20, 0.96);
		color: #fff;
		border-radius: 8px;
		box-shadow: 0 8px 20px rgba(2, 8, 23, 0.6);
		font-size: var(--tooltip-font-size, 12px);
		line-height: 1.3;
		opacity: 0;
		transform: translateY(-6px);
		pointer-events: none;
		z-index: 40;
	}
	.skill-icon-wrapper:hover .skill-tooltip,
	.skill-icon-wrapper:focus-within .skill-tooltip {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
	}
	.skill-name {
		font-weight: 700;
		font-size: var(--skill-font-size, 12px);
	}

	/* Unified pill styling (ensure Active, Level, SP, CD share same shape/size) */
	.skill-type,
	.skill-level,
	.cost-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 6px 12px;
		border-radius: 999px;
		font-weight: 700;
		font-size: var(--pill-font-size, 12px);
		min-width: 58px;
		height: 34px;
		box-sizing: border-box;
	}
	.skill-type {
		background: rgba(255, 255, 255, 0.03);
		color: rgba(255, 255, 255, 0.95);
	}

/* Overlay for enlarged skill image */
.img-overlay {
	position: fixed;
	left: 0;
	top: 0;
	width: 100vw;
	height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0,0,0,0.05);
	backdrop-filter: blur(1px);
	/* Ensure the overlay renders above the status window (which uses z-index:1500) */
	z-index: 99999;
	padding: 24px;
	box-sizing: border-box;
}
.img-overlay .enlarged-img {
	max-width: min(92vw, 960px);
	max-height: 92vh;
	width: auto;
	height: auto;
	border-radius: 10px;
	box-shadow: 0 18px 40px rgba(2, 6, 23, 0.7);
	object-fit: contain;
	background: #08101a;
	border: 1px solid rgba(255,255,255,0.04);
}

/* When showing the skill-card (compact card inside the overlay), limit
   the image so it behaves like a portrait/icon instead of taking the whole
   viewport. This overrides the larger .img-overlay rule for images inside
   the card. */
	.skill-card .enlarged-img {
		max-width: 320px;
		max-height: 72vh;
	width: auto;
	height: auto;
	border-radius: 8px;
	box-shadow: 0 10px 28px rgba(2,6,23,0.6);
	object-fit: contain;
	background: #08101a;
	border: 1px solid rgba(255,255,255,0.04);
}

/* Avatar wrapper + small badge in the corner */
.avatar-wrap {
	position: relative;
	display: inline-block;
}
.avatar-badge {
	position: absolute;
	right: -16px;
	bottom: -16px;
	width: 48px;
	height: 48px;
	border-radius: 50%;
	box-shadow: 0 6px 16px rgba(2,6,23,0.6);
	border: 2px solid rgba(0,0,0,0.35);
	background: #7c3aed;
}

	/* Improve spacing for description and make it more readable */
	.skill-desc {
		margin-top: 10px;
		color: rgba(255,255,255,0.95);
		font-size: 14px;
		line-height: 1.5;
		max-width: 100%;
	}

	/* New effects list style for bullet lines */
	.skill-effects-list {
		list-style: none;
		padding-left: 0;
		margin: 8px 0 0 0;
		display: block;
	}
	.skill-effects-list .effect-line {
		margin: 6px 0;
		color: rgba(255,255,255,0.92);
		font-size: 13px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	/* boxed effects area */
	.skill-effects-list {
		background: rgba(255,255,255,0.02);
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid rgba(255,255,255,0.03);
	}
	/* skill-effects icons removed */
.img-overlay:focus {
	outline: none;
}
	.skill-level {
		background: rgba(255, 255, 255, 0.04);
		color: #fff;
	}
	.skill-type::first-letter {
		text-transform: uppercase;
	}
	.skill-level.lv1 {
		/* Use the same pill style as other pills for a uniform appearance */
		background: rgba(255, 255, 255, 0.04);
		color: #fff;
		box-shadow: inset 0 -1px rgba(0, 0, 0, 0.12);
	}

	/* Active / Passive pill variants */
	.skill-type.activeType {
		/* green gradient for Active skills */
		background: linear-gradient(90deg, #10b981, #059669);
		color: #fff;
		min-width: 58px;
		text-align: center;
	}
	.skill-type.passiveType {
		/* navy-blue gradient for Passive skills */
		background: linear-gradient(90deg, #0b3d91, #1e40af);
		color: #fff;
		min-width: 58px;
		text-align: center;
	}

	/* SP / Cooldown cost box */
	.cost-box {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.cost-btn {
		padding: 6px 10px;
		border-radius: 999px;
		font-weight: 700;
		font-size: var(--pill-font-size, 12px);
		color: #fff;
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.cost-btn .cost-val {
		font-weight: 800;
		margin-left: 6px;
	}
	/* Use a subtle translucent background and a colored border instead of a full gradient
	   so the pills read as outlined accents (blue for SP, purple for CD). */
	.skill-toggle-btn {
		margin-left: auto;
		padding: 4px 12px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: rgba(16, 185, 129, 0.2); /* Greenish tint for ON */
		color: #10b981;
		transition: all 0.2s;
	}
	.skill-toggle-btn:hover {
		background: rgba(16, 185, 129, 0.3);
	}
	.skill-toggle-btn.off {
		background: rgba(239, 68, 68, 0.2); /* Reddish tint for OFF */
		color: #ef4444;
		border-color: rgba(239, 68, 68, 0.3);
	}
	.skill-toggle-btn.off:hover {
		background: rgba(239, 68, 68, 0.3);
	}
	.cost-btn.sp {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid #3b82f6; /* blue border */
		color: #3b82f6;
	}
	.cost-btn.cd {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid #8b5cf6; /* purple border */
		color: #8b5cf6;
	}

	.empty {
		color: rgba(255, 255, 255, 0.6);
		padding: 10px;
	}

	@media (max-width: 720px) {
		.split {
			flex-direction: column;
		}
		.left {
			width: 100%;
			border-right: 0;
		}
	}

	.cd-total {
		margin-left: 6px;
		font-size: 11px;
		color: rgba(255, 255, 255, 0.65);
	}
</style>
