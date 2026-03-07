<script>
	import { createEventDispatcher } from 'svelte';
	import { questTemplates } from '../../data/quests';
	import { gameState } from '../../stores/gameState';
	import { serverNow } from '../../stores/questStore';
	import { canSeeQuest } from '../../utils/questLogic';

	/** @type {string|null} */
	export let selectedQuestId = null;

	const dispatch = createEventDispatcher();

	// Helper to get server date string (YYYY-MM-DD)
	function getServerDateString(nowMs) {
		const d = new Date(nowMs || Date.now());
		const yyyy = d.getUTCFullYear();
		const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
		const dd = String(d.getUTCDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	}

	// Filter quests based on daily selection rules
	$: filteredQuests = (() => {
		const gs = $gameState || {};
		const ch = gs.character || {};
		const today = getServerDateString(serverNow());
		const dailySelectedDate = ch.dailyQuestSelectedDate || null;
		const dailySelectedId = ch.dailyQuestSelectedId || null;
		const dailyCompletedDate = ch.dailyQuestCompletedDate || null;

		return questTemplates.filter((quest) => {
			// Hide duplicate test variants (IDs ending with _20) from the normal quest list
			if (quest && typeof quest.id === 'string' && quest.id.endsWith('_20')) return false;
			// For daily quests: show all daily quest templates unless they've been completed today
			if (quest.series === 'daily') {
				// If a daily quest was completed today, hide all daily quests
				if (dailyCompletedDate && String(dailyCompletedDate) === String(today)) {
					return false;
				}
				// Always show daily quests (do not hide other dailies when one is selected)
				return true;
			}
			// Non-daily quests: show only if requirements met
			return canSeeQuest(quest.id);
		});
	})();

	// Group quests by series
	$: questGroups = (() => {
		const groups = {};
		filteredQuests.forEach((quest) => {
			const series = quest.series || 'other';
			if (!groups[series]) {
				groups[series] = [];
			}
			groups[series].push(quest);
		});
		return groups;
	})();

	function formatDuration(seconds) {
		if (!seconds) return '';
		return seconds < 60 ? `${seconds}s` : `${Math.ceil(seconds / 60)}m`;
	}

	function selectQuest(questId) {
		dispatch('select', questId);
	}
</script>

<div class="quest-list">
	{#each Object.entries(questGroups) as [series, quests] (series)}
		<div class="quest-group">
			{#if series !== 'other'}
				<h4 class="group-title">
					{quests[0]?.seriesName || series}
				</h4>
			{/if}

			<ul class="quest-items">
				{#each quests as quest (quest.id)}
					<li class="quest-item">
						<button
							class="quest-btn"
							class:selected={selectedQuestId === quest.id}
							on:click={() => selectQuest(quest.id)}
						>
							<div class="quest-thumbnail">
								{#if quest.thumbnail}
									<img src={'/Images/Quest/' + quest.thumbnail} alt="" loading="lazy" />
								{:else}
									<div class="thumbnail-fallback">?</div>
								{/if}
							</div>

							<div class="quest-info">
								<div class="quest-title">{quest.title}</div>
								{#if quest.questGiver}
									<div class="quest-giver"><strong>Request by</strong>: {quest.questGiver}</div>
								{/if}
								<div class="quest-meta">
									{#if quest.durationSeconds}
										<span class="duration">{formatDuration(quest.durationSeconds)}</span>
									{/if}
									{#if quest.requirements?.stamina}
										<span class="stamina">{quest.requirements.stamina} sta</span>
									{/if}
								</div>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</div>

<style>
	.quest-list {
		width: 280px;
		min-width: 280px;
		max-width: 280px;
		flex-shrink: 0;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		padding: 20px;
		overflow-y: auto;
		background: #1a1a1a;
	}

	/* Scrollbar styling for webkit browsers */
	.quest-list::-webkit-scrollbar {
		width: 8px;
	}

	.quest-list::-webkit-scrollbar-track {
		background: #1a1a1a;
	}

	.quest-list::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	.quest-list::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.quest-group {
		margin-bottom: 24px;
	}

	.group-title {
		font-size: 16px;
		font-weight: 700;
		margin-bottom: 12px;
		color: rgba(255, 255, 255, 0.9);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.quest-items {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.quest-item {
		margin-bottom: 8px;
	}

	.quest-btn {
		width: 100%;
		display: flex;
		align-items: center;
		padding: 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.quest-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.quest-btn.selected {
		background: rgba(127, 209, 185, 0.1);
		border-color: var(--accent, #7fd1b9);
	}

	.quest-thumbnail {
		width: 50px;
		height: 50px;
		margin-right: 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.quest-thumbnail img {
		max-width: 100%;
		max-height: 100%;
		border-radius: 4px;
	}

	.thumbnail-fallback {
		font-size: 20px;
		color: rgba(255, 255, 255, 0.3);
	}

	.quest-info {
		flex: 1;
		min-width: 0;
	}

	.quest-title {
		font-size: 14px;
		font-weight: 600;
		margin-bottom: 4px;
		line-height: 1.3;
		color: rgba(255, 255, 255, 0.9);
	}

	.quest-meta {
		display: flex;
		gap: 8px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.6);
	}

	.quest-giver {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.65);
		margin-bottom: 6px;
	}

	.duration,
	.stamina {
		background: rgba(255, 255, 255, 0.1);
		padding: 2px 6px;
		border-radius: 3px;
	}
</style>
