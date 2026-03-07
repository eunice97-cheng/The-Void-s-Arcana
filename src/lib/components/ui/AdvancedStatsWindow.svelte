<script>
	import { createEventDispatcher } from 'svelte';
	import { gameState } from '$lib/stores/gameState';
	import { calculateDerived } from '$lib/utils/stats';

	const dispatch = createEventDispatcher();

	// optional props: if provided, AdvancedStatsWindow will use these instead of reading from the store
	export let initialCharacter = null;
	export let initialPlayerData = null;

	// reactive snapshot of current game state (fallback)
	/** @type {any} */
	$: gs = $gameState || {};
	/** @type {any} */
	$: storeCharacter = gs.character || {};
	/** @type {any} */
	$: storePd = gs.playerData || { level: 1 };

	// prefer provided initial props, otherwise use store values
	/** @type {any} */
	$: character = initialCharacter || storeCharacter;
	/** @type {any} */
	$: pd = initialPlayerData || storePd;

	// Calculate derived stats (combat stats, accuracy, etc.) including equipment bonuses
	/** @type {any} */
	$: equipment = character.equipment || {};
	/** @type {any} */
	$: derivedStats = calculateDerived(character.stats || {}, character.class, pd.level, equipment, {
		skills: character.skills || []
	});

	// Calculate base stats (without equipment) for comparison
	/** @type {any} */
	$: baseStats = calculateDerived(
		character.stats || {},
		character.class,
		pd.level,
		{},
		{ skills: character.skills || [] }
	);

	function close() {
		dispatch('close');
	}
</script>

<div class="advanced-stats-backdrop" role="dialog" aria-modal="true">
	<div class="advanced-stats-window">
		<header class="window-header">
			<h3>Advanced Stats</h3>
			<button class="close-btn" aria-label="Close" on:click={close}>✕</button>
		</header>

		<div class="stats-content">
			<div class="stats-section">
				<h4>Combat Stats</h4>
				<div class="stats-grid one-column">
					<div class="stat-item">
						<strong>P.ATK:</strong>
						<span>{baseStats.pAtk?.toFixed(1) || '0.0'}</span>
						<span style="color: #4ade80;"
							>+{(derivedStats.pAtk - baseStats.pAtk)?.toFixed(1) || '0.0'}</span
						>
						<span>= {derivedStats.pAtk?.toFixed(1) || '0.0'}</span>
					</div>
					<div class="stat-item">
						<strong>P.DEF:</strong>
						<span>{baseStats.pDef?.toFixed(1) || '0.0'}</span>
						<span style="color: #4ade80;"
							>+{(derivedStats.pDef - baseStats.pDef)?.toFixed(1) || '0.0'}</span
						>
						<span>= {derivedStats.pDef?.toFixed(1) || '0.0'}</span>
					</div>
					<div class="stat-item">
						<strong>M.ATK:</strong>
						<span>{baseStats.mAtk?.toFixed(1) || '0.0'}</span>
						<span style="color: #4ade80;"
							>+{(derivedStats.mAtk - baseStats.mAtk)?.toFixed(1) || '0.0'}</span
						>
						<span>= {derivedStats.mAtk?.toFixed(1) || '0.0'}</span>
					</div>
					<div class="stat-item">
						<strong>M.RES:</strong>
						<span>{baseStats.mRes?.toFixed(1) || '0.0'}</span>
						<span style="color: #4ade80;"
							>+{(derivedStats.mRes - baseStats.mRes)?.toFixed(1) || '0.0'}</span
						>
						<span>= {derivedStats.mRes?.toFixed(1) || '0.0'}</span>
					</div>
					<div class="stat-item">
						<strong>RANGE ATK:</strong>
						<span>{baseStats.rangeAtk?.toFixed(1) || '0.0'}</span>
						<span style="color: #4ade80;"
							>+{(derivedStats.rangeAtk - baseStats.rangeAtk)?.toFixed(1) || '0.0'}</span
						>
						<span>= {derivedStats.rangeAtk?.toFixed(1) || '0.0'}</span>
					</div>
					<div class="stat-item">
						<strong>ACC:</strong>
						<span>{(baseStats.accuracy * 100)?.toFixed(1) || '0.0'}%</span>
						<span style="color: #4ade80;"
							>+{((derivedStats.accuracy - baseStats.accuracy) * 100)?.toFixed(1) || '0.0'}%</span
						>
						<span>= {(derivedStats.accuracy * 100)?.toFixed(1) || '0.0'}%</span>
					</div>
					<div class="stat-item">
						<strong>CRIT:</strong>
						<span>{(baseStats.critical * 100)?.toFixed(1) || '0.0'}%</span>
						<span style="color: #4ade80;"
							>+{((derivedStats.critical - baseStats.critical) * 100)?.toFixed(1) || '0.0'}%</span
						>
						<span>= {(derivedStats.critical * 100)?.toFixed(1) || '0.0'}%</span>
					</div>
					<div class="stat-item">
						<strong>EVA:</strong>
						<span>{(baseStats.evasion * 100)?.toFixed(1) || '0.0'}%</span>
						<span style="color: #4ade80;"
							>+{((derivedStats.evasion - baseStats.evasion) * 100)?.toFixed(1) || '0.0'}%</span
						>
						<span>= {(derivedStats.evasion * 100)?.toFixed(1) || '0.0'}%</span>
					</div>
					<div class="stat-item">
						<strong>ATK SPD:</strong>
						<span>{(baseStats.atkSpd * 100)?.toFixed(1) || '0.0'}%</span>
						<span style="color: #4ade80;"
							>+{((derivedStats.atkSpd - baseStats.atkSpd) * 100)?.toFixed(1) || '0.0'}%</span
						>
						<span>= {(derivedStats.atkSpd * 100)?.toFixed(1) || '0.0'}%</span>
					</div>
					<div class="stat-item">
						<strong>DPS:</strong>
						<span>{baseStats.dps?.toFixed(1) || '0.0'}</span>
						<span style="color: #4ade80;"
							>+{(derivedStats.dps - baseStats.dps)?.toFixed(1) || '0.0'}</span
						>
						<span>= {derivedStats.dps?.toFixed(1) || '0.0'}</span>
					</div>
					<div class="stat-item">
						<strong>HP REGEN:</strong>
						<span>{(baseStats.hpRegen * 100)?.toFixed(1) || '0.0'}%</span>
						<span style="color: #4ade80;"
							>+{((derivedStats.hpRegen - baseStats.hpRegen) * 100)?.toFixed(1) || '0.0'}%</span
						>
						<span>= {(derivedStats.hpRegen * 100)?.toFixed(1) || '0.0'}%</span>
					</div>
					<div class="stat-item">
						<strong>SP REGEN:</strong>
						<span>{(baseStats.spRegen * 100)?.toFixed(1) || '0.0'}%</span>
						<span style="color: #4ade80;"
							>+{((derivedStats.spRegen - baseStats.spRegen) * 100)?.toFixed(1) || '0.0'}%</span
						>
						<span>= {(derivedStats.spRegen * 100)?.toFixed(1) || '0.0'}%</span>
					</div>
				</div>
			</div>

			<div class="stats-section">
				<h4>Skill Proficiencies</h4>
				<div class="proficiency-grid">
					<div class="prof-item">
						<strong>MELEE:</strong>
						{(derivedStats.melee * 100)?.toFixed(1) || '0.0'}%
					</div>
					<div class="prof-item">
						<strong>RANGED:</strong>
						{(derivedStats.range * 100)?.toFixed(1) || '0.0'}%
					</div>
					<div class="prof-item">
						<strong>HEALING:</strong>
						{(derivedStats.healing * 100)?.toFixed(1) || '0.0'}%
					</div>
					<div class="prof-item">
						<strong>CRAFT:</strong>
						{(derivedStats.craft * 100)?.toFixed(1) || '0.0'}%
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.advanced-stats-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.7);
		z-index: 1500;
		pointer-events: none;
	}

	.advanced-stats-window {
		width: 500px;
		max-height: 80vh;
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		border-radius: 12px;
		box-shadow: 0 22px 60px rgba(2, 8, 23, 0.75);
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
		pointer-events: auto;
	}

	.window-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}

	.window-header h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 700;
		color: #f7fbff;
	}

	.close-btn {
		background: transparent;
		border: 0;
		font-size: 16px;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.85);
	}

	.stats-content {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		max-height: calc(80vh - 60px);
		overflow-y: auto;
	}

	.stats-section h4 {
		margin: 0 0 12px 0;
		font-size: 16px;
		font-weight: 700;
		color: rgba(232, 240, 255, 0.95);
	}

	.stats-grid.one-column {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.proficiency-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.stat-item {
		background: rgba(255, 255, 255, 0.03);
		padding: 10px 16px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.02);
		font-size: 13px;
		display: grid;
		grid-template-columns: 80px 52px 52px 1fr;
		gap: 16px;
		align-items: center;
		color: rgba(232, 240, 255, 0.9);
	}

	.prof-item {
		background: rgba(255, 255, 255, 0.03);
		padding: 8px 12px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.02);
		font-size: 13px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: rgba(232, 240, 255, 0.9);
		flex: 1 1 calc(50% - 6px);
		min-width: 0;
	}

	.stat-item strong,
	.prof-item strong {
		color: rgba(232, 240, 255, 0.95);
		font-weight: 600;
	}
</style>
