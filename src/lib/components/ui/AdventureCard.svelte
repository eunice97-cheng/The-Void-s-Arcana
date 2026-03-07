<script>
	import { createEventDispatcher } from 'svelte';
	import { gameState, personalityTraits } from '$lib/stores/gameState';
	import { getRankInfo } from '$lib/utils/stats';

	const dispatch = createEventDispatcher();

	// reactive snapshot of current game state
	/** @type {any} */
	$: gs = $gameState || {};
	/** @type {any} */
	$: character = gs.character || { name: 'Adventurer', class: 'Unknown', avatar: null };
	/** @type {any} */
	$: pd = gs.playerData || {
		hp: 100,
		maxHp: 100,
		sp: 100,
		maxSp: 100,
		stamina: 100,
		maxStamina: 100,
		level: 1
	};

	// Personality traits (OCEAN model)
	/** @type {Record<string, number>} */
	$: traits = $personalityTraits || {};
	/** @type {number} */
	$: openness = traits.O || 0;
	/** @type {number} */
	$: conscientiousness = traits.C || 0;
	/** @type {number} */
	$: extraversion = traits.E || 0;
	/** @type {number} */
	$: agreeableness = traits.A || 0;
	/** @type {number} */
	$: neuroticism = traits.N || 0;

	// Get current adventurer rank info
	/** @type {any} */
	$: rankInfo = getRankInfo(character.rank || 'E');
	/** @type {string} */
	$: currentRank = character.rank || 'E';
	/** @type {string} */
	$: rankDisplayName = rankInfo ? rankInfo.name : 'E Rank';

	// apprenticeship / craft points display (show regardless of class)
	/** @type {any[]} */
	$: apprentices =
		character && Array.isArray(character.apprenticeships) ? character.apprenticeships : [];
	/** @type {any} */
	$: craftPoints =
		character && character.craftPoints ? character.craftPoints : { mainWeapon: 0, subWeapon: 0 };

	/** @param {any} a */
	function formatSlot(a) {
		try {
			if (!a || typeof a.slotStartHour !== 'number') return '—';
			const start = a.slotStartHour.toString().padStart(2, '0') + ':00';
			const endHour = (a.slotStartHour + (a.dailyHours || 2) - 1) % 24;
			const end = endHour.toString().padStart(2, '0') + ':59';
			return `${start} - ${end}`;
		} catch (e) {
			return '—';
		}
	}

	function close() {
		dispatch('close');
	}

	function advanceStats() {
		dispatch('advanceStats', { character, playerData: pd });
	}

	function showTraits() {
		dispatch('showTraits', {
			character,
			playerData: pd,
			traits: {
				openness,
				conscientiousness,
				extraversion,
				agreeableness,
				neuroticism
			}
		});
	}
</script>

<div class="adventure-backdrop" role="dialog" aria-modal="true">
	<div class="adventure-card">
		<header class="card-header">
			<div class="left">
				{#if character.avatar}
					<img
						class="avatar"
						src={character.avatar}
						alt="{character.name} avatar"
						width="80"
						height="80"
					/>
				{:else}
					<div class="avatar placeholder">📜</div>
				{/if}
			</div>
			<div class="meta">
				<h2 class="name">{character.name}</h2>
				<div class="sub">LEVEL {pd.level}</div>
			</div>
			<button class="close-btn" aria-label="Close" on:click={close}>✕</button>
		</header>

		<section class="card-body">
			<div class="info-grid">
				<div class="info-row">
					<strong>BASIC CLASS:</strong>
					{(character.class || character.job || '—').toString().toUpperCase()}
				</div>
				<div class="info-row"><strong>ORIGIN:</strong> Mirror's Repose</div>
				<div class="info-row">
					<strong>RANK:</strong> <span class="rank-badge">{currentRank}</span>
				</div>
			</div>

			<div class="quests">
				<h4>Quests Completed</h4>
				<div class="quest-grid">
					<div class="q">SSS: <strong>0</strong></div>
					<div class="q">SS: <strong>0</strong></div>
					<div class="q">S: <strong>0</strong></div>
					<div class="q">A: <strong>0</strong></div>
					<div class="q">B: <strong>0</strong></div>
					<div class="q">C: <strong>0</strong></div>
					<div class="q">D: <strong>0</strong></div>
					<div class="q">E: <strong>0</strong></div>
				</div>
			</div>

			<!-- Apprenticeship and craft points displayed under Quests Completed (above action locks) -->
			<div class="info-grid apprentices-section">
				{#if String(character.class || '').toLowerCase() === 'tinkerer'}
					<div class="info-row">
						<strong>APPRENTICESHIPS:</strong>
						{#if apprentices.length > 0}
							<div style="display:inline-block">
								{#each apprentices.filter((a) => a.active) as a, i (a)}
									{#if i > 0}<br />{/if}
									<span>{a.mentor} - {formatSlot(a)}</span>
								{/each}
								{#if apprentices.filter((a) => a.active).length === 0}
									<span class="locked-note">None active</span>
								{/if}
							</div>
						{:else}
							<span class="locked-note">None active</span>
						{/if}
					</div>
					<div class="info-row">
						<strong>CRAFT PTS:</strong> Main: {craftPoints.mainWeapon || 0} — Sub: {craftPoints.subWeapon ||
							0}
					</div>
				{:else}
					<div class="info-row">
						<strong>APPRENTICESHIPS:</strong>
						<span class="locked-note"
							><i class="fas fa-lock" aria-hidden="true"></i> Available for Tinkerer ONLY</span
						>
					</div>
				{/if}
			</div>
		</section>

		<footer class="card-actions">
			<button
				class="btn-action"
				title="Advance Stats"
				aria-label="Advance Stats"
				on:click={advanceStats}
			>
				<i class="fas fa-chart-line" aria-hidden="true"></i>
				Advance Stats
			</button>
			<button
				class="btn-action"
				title="View Personality Traits"
				aria-label="View Personality Traits"
				on:click={showTraits}
			>
				<i class="fas fa-brain" aria-hidden="true"></i>
				Traits
			</button>
		</footer>
	</div>
</div>

<style>
	.adventure-backdrop {
		/* Keep layout centered but do not darken the whole screen. */
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent; /* no fullscreen dimming */
		z-index: 1200;
		pointer-events: none; /* allow clicks to pass through outside the card */
	}
	.adventure-card {
		width: 520px;
		/* Dark card variant: deep indigo gradient for a moody, readable surface */
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		border-radius: 12px;
		box-shadow:
			0 22px 60px rgba(2, 8, 23, 0.75),
			0 4px 12px rgba(13, 38, 76, 0.12);
		overflow: hidden;
		color: #e8f0ff;
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			Roboto,
			'Helvetica Neue',
			Arial;
		border-left: 6px solid rgba(94, 58, 255, 0.95);
		position: relative;
		/* ensure card remains interactive even though backdrop ignores pointer events */
		pointer-events: auto;
	}
	.card-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	.avatar {
		border-radius: 8px;
		width: 80px;
		height: 80px;
		object-fit: cover;
	}
	.avatar.placeholder {
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		border-radius: 8px;
		background: rgba(255, 255, 255, 0.03);
		color: rgba(255, 255, 255, 0.9);
	}
	.meta .name {
		margin: 0;
		font-size: 22px;
		font-weight: 700;
		letter-spacing: 0.2px;
		color: #f7fbff;
	}
	.meta .sub {
		color: #c9d6ef;
		font-size: 13px;
		margin-top: 6px;
		font-weight: 700;
		letter-spacing: 0.8px;
	}
	.close-btn {
		margin-left: auto;
		background: transparent;
		border: 0;
		font-size: 16px;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.85);
	}

	.card-body {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.info-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.info-row {
		background: rgba(255, 255, 255, 0.03);
		padding: 12px 14px;
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.02);
		font-size: 14px;
		display: flex;
		align-items: center;
		color: rgba(232, 240, 255, 0.95);
	}
	.info-row strong {
		width: 140px;
		display: inline-block;
		color: rgba(232, 240, 255, 0.95);
	}

	.quests {
		margin-top: 8px;
	}
	.quest-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
		margin-top: 8px;
	}
	.q {
		background: rgba(255, 255, 255, 0.02);
		padding: 8px 10px;
		border-radius: 8px;
		text-align: left;
		color: rgba(232, 240, 255, 0.95);
	}

	.rank-badge {
		display: inline-block;
		padding: 6px 10px;
		border-radius: 10px;
		background: rgba(94, 58, 255, 0.22);
		color: #fff;
		font-weight: 800;
		font-size: 13px;
	}



	.card-actions {
		display: flex;
		gap: 10px;
		padding: 12px 16px;
		border-top: 1px solid rgba(255, 255, 255, 0.02);
		justify-content: flex-end;
	}
	.btn-action {
		background: linear-gradient(135deg, rgba(123, 92, 255, 0.8), rgba(92, 160, 255, 0.8));
		border: 1px solid rgba(255, 255, 255, 0.1);
		padding: 10px 16px;
		border-radius: 10px;
		cursor: pointer;
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		transition:
			transform 120ms ease,
			box-shadow 120ms ease,
			background 120ms ease;
		min-width: 120px;
		justify-content: center;
	}
	.btn-action:focus {
		outline: none;
		box-shadow: 0 6px 24px rgba(94, 58, 255, 0.3);
	}
	.btn-action i {
		font-size: 16px;
	}
</style>
