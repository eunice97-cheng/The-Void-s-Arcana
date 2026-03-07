<script>
	import { gameState } from '$lib/stores/gameState';
	import { get } from 'svelte/store';
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import questStore, {
		serverNow,
		hasActiveQuest,
		submitQuest,
		remainingSeconds,
		activeQuest
	} from '../../stores/questStore';
	import { showRewards, show } from '$lib/stores/toastStore';
	import { questTemplates } from '../../data/quests';
	import { canAcceptQuest, getQuestBlockReason } from '$lib/utils/questLogic';
	import SubmitQuestModal from './SubmitQuestModal.svelte';
	const dispatch = createEventDispatcher();

	let gs = get(gameState) || {};
	let character = gs.character || {};
	let active = character && Array.isArray(character.quests) ? character.quests : [];
	let selected = null;
	let questGroups = [];
	let timerTick = writable(0);

	onMount(() => {
		const interval = setInterval(() => {
			timerTick.update(n => n + 1);
		}, 1000);
		return () => clearInterval(interval);
	});

	$: dummy = $timerTick;

	// Helper function to get template for a quest
	function getQuestTemplate(quest) {
		const templateId = quest.templateId || (quest.template && quest.template.id);
		return questTemplates.find((t) => t.id === templateId);
	}

	// Calculate remaining time for a quest
	function getRemainingTime(quest) {
		if (!quest || !quest.endTime || quest.status !== 'in_progress') return null;
		const now = Date.now();
		const remaining = Math.max(0, Math.ceil((quest.endTime - now) / 1000));
		return remaining;
	}

	function getCommonStamina(quest) {
		if (!quest?.rewardOptions?.length) {
			return quest?.requirements?.stamina || null;
		}

		const optionsWithSta = quest.rewardOptions.filter((ro) => typeof ro.stamina === 'number');
		if (optionsWithSta.length === quest.rewardOptions.length) {
			const first = optionsWithSta[0];
			const allSame = optionsWithSta.every((ro) => ro.stamina === first.stamina);
			return allSame ? first.stamina : null;
		}
		return null;
	}

	// Format quest status for display
	function formatStatus(status) {
		switch (status) {
			case 'in_progress':
				return 'In Progress';
			case 'completed':
				return 'Completed';
			case 'failed':
				return 'Failed';
			case 'abandoned':
				return 'Abandoned';
			default:
				return status || 'Active';
		}
	}

	// Group quests by series
	function groupQuestsBySeries(quests) {
		const groups = {};
		quests.forEach((q) => {
			const templateId = q.templateId || (q.template && q.template.id);
			const template = questTemplates.find((t) => t.id === templateId);
			const series = template && template.series ? template.series : 'other';
			const seriesName = template && template.seriesName ? template.seriesName : 'Other Quests';

			if (!groups[series]) {
				groups[series] = { name: seriesName, series: series, quests: [] };
			}
			groups[series].quests.push(q);
		});

		// Convert to array and sort: daily first, then others
		const result = Object.values(groups);
		result.sort((a, b) => {
			if (a.name === 'Daily Quest') return -1;
			if (b.name === 'Daily Quest') return 1;
			return a.name.localeCompare(b.name);
		});
		return result;
	}

	// Keep local `active` and `selected` in sync with persisted `gameState.character.quests`.
	// When the questStore tick marks a quest completed it updates the gameState; we must
	// refresh `selected` to the updated object from the list so UI shows the new status.
	const unsub = gameState.subscribe((v) => {
		gs = v || {};
		character = gs.character || {};
		active = character && Array.isArray(character.quests) ? character.quests : [];
		questGroups = groupQuestsBySeries(active);

		if (selected) {
			// attempt to find an updated entry for the currently selected quest
			const updated = active.find((a) => a.id === selected.id);
			if (updated) {
				selected = updated;
			} else if (active.length) {
				// previously selected quest was removed, select the first active
				selected = active[0];
			} else {
				selected = null;
			}
		} else if (active.length) {
			selected = active[0];
		}
	});

	function formatDuration(seconds) {
		if (seconds < 60) return `${seconds}s`;
		return `${Math.ceil(seconds / 60)}m`;
	}

	function onRequestSubmit(q) {
		showSubmitModal = true;
	}

	function handleSubmitConfirmed() {
		showSubmitModal = false;
		// Get rewards before submitting
		const rewards =
			selected && selected.chosenReward && selected.chosenReward.rewards
				? selected.chosenReward.rewards
				: {};
		const result = submitQuest();
		if (result && result.ok) {
			show('Quest submitted successfully!', { type: 'success', duration: 3000 });
			// Show rewards toast
			if (Object.keys(rewards).length > 0) {
				showRewards(rewards, { duration: 5000 });
			}
		} else {
			show('Failed to submit quest.', { type: 'error', duration: 3000 });
		}
	}

	let showSubmitModal = false;

	function getStaminaCost(q) {
		try {
			if (q.chosenReward && q.chosenReward.stamina) {
				return q.chosenReward.stamina;
			}
			// quest instance may include requirements
			if (q.requirements && typeof q.requirements.stamina === 'number')
				return q.requirements.stamina;
			// fallback: lookup template by templateId
			const tplId = q.templateId || (q.template && q.template.id);
			if (tplId) {
				const tpl = questTemplates.find((t) => t.id === tplId);
				if (tpl) {
					// If template has rewardOptions with stamina, we can't determine choice here; use template requirement
					if (tpl.requirements && typeof tpl.requirements.stamina === 'number')
						return tpl.requirements.stamina;
				}
			}
		} catch (_e) {
			// Ignore stamina requirement calculation errors
		}
		return 0;
	}

	function abandonQuest(q) {
		// Check if this is the active quest
		const currentActive = get(activeQuest);
		if (currentActive && currentActive.id === q.id) {
			activeQuest.set(null);
		}
		gameState.update((s) => {
			const next = { ...(s || {}) };
			const list =
				next.character && Array.isArray(next.character.quests)
					? next.character.quests.filter((x) => x.id !== q.id)
					: [];
			next.character = { ...(next.character || {}), quests: list };
			return next;
		});
		selected = null;
	}

	function startAbandon(q) {
		if (confirm(`Are you sure you want to abandon "${q.template ? q.template.title : q.id}"?`)) {
			abandonQuest(q);
		}
	}
</script>

<div class="quests-panel" role="dialog" aria-modal="true">
	<header>
		<h3>Active Quests</h3>
		<div class="header-actions">
			<button class="close" aria-label="Close" on:click={() => dispatch('close')}>✕</button>
		</div>
	</header>

	<div class="content">
		<span style="display: none;">{$timerTick}</span>
		<div class="quests-list">
			{#each questGroups as group (group.series + $timerTick)}
				<div class="group-section">
					<h4>{group.name}</h4>
					<div class="quests-container">
						{#each group.quests as quest (quest.id)}
							<div
								class="quest-item"
								class:selected={selected && selected.id === quest.id}
								on:click={() => (selected = quest)}
							>
								<div class="quest-thumbnail">
									{#if getQuestTemplate(quest) && getQuestTemplate(quest).thumbnail}
										<img
												src={'/Images/Quest/' + getQuestTemplate(quest).thumbnail}
												alt=""
												loading="lazy"
											/>
									{:else}
										<div class="thumbnail-fallback">?</div>
									{/if}
								</div>
								<div class="quest-info">
									<div class="quest-title">
										{quest.title ||
											(getQuestTemplate(quest) ? getQuestTemplate(quest).title : quest.id)}
									</div>
									<div class="quest-meta">
										{#if getRemainingTime(quest)}
											<span class="timer">{formatDuration(getRemainingTime(quest))}</span>
										{:else if getQuestTemplate(quest) && getQuestTemplate(quest).durationSeconds}
											<span class="duration"
												>{formatDuration(getQuestTemplate(quest).durationSeconds)}</span
											>
										{/if}
										{#if getStaminaCost(quest)}
											<span class="stamina">{getStaminaCost(quest)} STA</span>
										{/if}
										<span class="status">{formatStatus(quest.status || 'active')}</span>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<div class="quest-detail">
			{#if selected}
				<div class="quest-detail-content">
					<h3 class="detail-title">
						{getQuestTemplate(selected)
							? getQuestTemplate(selected).title
							: selected.title || selected.id}
					</h3>

					<div class="detail-image-wrap">
						<div class="detail-image">
							{#if getQuestTemplate(selected) && getQuestTemplate(selected).thumbnail}
								<img
									src={'/Images/Quest/' + getQuestTemplate(selected).thumbnail}
									alt=""
									loading="lazy"
								/>
							{:else}
								<div class="detail-fallback">?</div>
							{/if}
						</div>
					</div>

					{#if getQuestTemplate(selected) && getQuestTemplate(selected).description}
						<p class="detail-desc">{getQuestTemplate(selected).description}</p>
					{/if}

					{#if getQuestTemplate(selected) && getQuestTemplate(selected).objective}
						<div class="detail-objective">
							<strong>Objective</strong>: {getQuestTemplate(selected).objective}
						</div>
					{/if}

					<div class="detail-meta">
						{#if getQuestTemplate(selected) && getQuestTemplate(selected).requirements}
							<div class="meta-item">
								<strong>Requirements</strong>
								<div class="requirements-list">
									{#if getQuestTemplate(selected)?.requirements?.level}
										<div class="requirement-item">
											Level {getQuestTemplate(selected).requirements.level}
										</div>
									{/if}
									{#if getQuestTemplate(selected)?.requirements?.rank}
										<div class="requirement-item">
											Rank {getQuestTemplate(selected).requirements.rank}
										</div>
									{/if}
									{#if getCommonStamina(getQuestTemplate(selected))}
										<div class="requirement-item">
											{getCommonStamina(getQuestTemplate(selected))} stamina
										</div>
									{/if}
								</div>
							</div>
						{/if}

						{#if getRemainingTime(selected)}
							<div class="meta-item">
								<strong>Time Remaining</strong>: {formatDuration(getRemainingTime(selected))}
							</div>
						{:else if getQuestTemplate(selected) && getQuestTemplate(selected).durationSeconds && (!getQuestTemplate(selected).rewardOptions || getQuestTemplate(selected).rewardOptions.length <= 1)}
							<div class="meta-item">
								<strong>Duration</strong>: {formatDuration(
									getQuestTemplate(selected).durationSeconds
								)}
							</div>
						{/if}
						<div class="meta-item">
							<strong>Status</strong>: {formatStatus(selected.status || 'active')}
						</div>
					</div>

					{#if getQuestTemplate(selected) && getQuestTemplate(selected).rewardOptions}
						<div class="detail-rewards-section">
							<div class="rewards-label">
								<strong>Rewards</strong>: {getQuestTemplate(selected).rewardOptions.length > 1
									? '(Choose one)'
									: ''}
							</div>

							<div class="reward-cards">
								{#each getQuestTemplate(selected).rewardOptions as option (option.id)}
									<div class="reward-card">
										<div class="opt-rewards">
											{#if option.label}
												<div class="opt-label">{option.label}</div>
											{/if}
											<div class="opt-details">
												{#if option.rewards?.silver}
													<span>{option.rewards.silver} silver</span>
												{/if}
												{#if option.rewards?.exp}
													<span>{option.rewards.exp} exp</span>
												{/if}
												{#if option.rewards?.items?.length}
													<span
														>{option.rewards.items.map((it) => it.name || it.id).join(', ')}</span
													>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{:else if getQuestTemplate(selected) && getQuestTemplate(selected).rewards}
						<div class="detail-rewards-section">
							<div class="rewards-label">
								<strong>Rewards</strong>
							</div>
							<div class="reward-cards">
								<div class="reward-card single-reward">
									<div class="opt-rewards">
										<div class="opt-details">
											{#if getQuestTemplate(selected).rewards.silver}
												<span>{getQuestTemplate(selected).rewards.silver} silver</span>
											{/if}
											{#if getQuestTemplate(selected).rewards.exp}
												<span>{getQuestTemplate(selected).rewards.exp} exp</span>
											{/if}
											{#if getQuestTemplate(selected).rewards.items?.length}
												<span
													>{getQuestTemplate(selected)
														.rewards.items.map((it) => it.name || it.id)
														.join(', ')}</span
												>
											{/if}
										</div>
									</div>
								</div>
							</div>
						</div>
					{:else if selected.chosenReward && selected.chosenReward.rewards}
						<div class="detail-rewards-section">
							<div class="rewards-label">
								<strong>Rewards</strong>
							</div>
							<div class="reward-cards">
								<div class="reward-card single-reward">
									<div class="opt-rewards">
										<div class="opt-details">
											{#if selected.chosenReward.rewards.silver}
												<span>{selected.chosenReward.rewards.silver} silver</span>
											{/if}
											{#if selected.chosenReward.rewards.gold}
												<span>{selected.chosenReward.rewards.gold} gold</span>
											{/if}
											{#if selected.chosenReward.rewards.diamonds}
												<span>{selected.chosenReward.rewards.diamonds} diamonds</span>
											{/if}
											{#if selected.chosenReward.rewards.exp}
												<span>{selected.chosenReward.rewards.exp} exp</span>
											{/if}
											{#if selected.chosenReward.rewards.items && selected.chosenReward.rewards.items.length}
												<span
													>{selected.chosenReward.rewards.items
														.map((it) => it.name || it.id)
														.join(', ')}</span
												>
											{/if}
										</div>
									</div>
								</div>
							</div>
						</div>
					{/if}

					{#if getQuestTemplate(selected) && getQuestTemplate(selected).randomReward}
						<div class="detail-random-reward">
							<strong>Bonus</strong>: {getQuestTemplate(selected)?.randomReward}
						</div>
					{/if}

					<div class="detail-actions">
						{#if selected.status === 'completed'}
							<button class="qb-btn accept" on:click={() => onRequestSubmit(selected)}>
								Submit Quest
							</button>
						{/if}
						<button class="qb-btn secondary" on:click={() => startAbandon(selected)}>
							Abandon Quest
						</button>
					</div>
				</div>
			{:else}
				<div class="quest-detail-placeholder">
					<p>Select a quest to view details</p>
				</div>
			{/if}
		</div>
	</div>
</div>

{#if showSubmitModal}
	<SubmitQuestModal
		open={showSubmitModal}
		quest={selected}
		on:confirm={handleSubmitConfirmed}
		on:close={() => (showSubmitModal = false)}
	/>
{/if}

<style>
	.quests-panel {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 12vh;
		bottom: 12vh;
		width: min(1200px, 96%);
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		color: #e8f0ff;
		padding: 0;
		border-radius: 12px;
		box-shadow:
			0 22px 60px rgba(2, 8, 23, 0.75),
			0 4px 12px rgba(13, 38, 76, 0.12);
		z-index: 1400;
		border-left: 6px solid rgba(127, 209, 185, 0.9); /* teal accent for quests */
		pointer-events: auto;
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
		flex-shrink: 0;
	}

	header h3 {
		margin: 0;
		font-size: 18px;
	}

	.header-actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.close {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.7);
		padding: 6px 12px;
		border-radius: 6px;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.2s;
	}

	.close:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.3);
		color: rgba(255, 255, 255, 0.9);
	}

	.content {
		flex: 1;
		display: flex;
		overflow: hidden;
		padding: 12px;
		gap: 12px;
		min-height: 0; /* Allow flex items to shrink below their content size */
	}

	.quests-list,
	.quest-detail {
		display: flex;
		flex-direction: column;
		min-height: 0; /* Allow flex items to shrink */
	}

	.quests-list {
		width: 280px;
		min-width: 280px;
		max-width: 280px;
		flex-shrink: 0;
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		padding: 20px;
		overflow-y: auto;
		background: #1a1a1a;
	}

	.quest-detail {
		flex: 1;
		min-width: 400px;
		background: #1a1a1a;
		position: relative;
		height: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		padding: 20px;
		overflow-y: auto;
	}

	.quests-list h4 {
		margin: 0 0 8px 0;
		font-size: 16px;
		font-weight: 600;
		flex-shrink: 0;
		color: rgba(255, 255, 255, 0.9);
	}

	.quests-container {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding-right: 4px; /* Space for scrollbar */
	}



	/* Scrollbar */
	.quests-list::-webkit-scrollbar {
		width: 8px;
	}

	.quests-list::-webkit-scrollbar-track {
		background: rgba(255, 255, 255, 0.01);
	}

	.quests-list::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	.quests-list::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.group-section {
		margin-bottom: 24px;
	}

	.group-section h4 {
		font-size: 14px;
		font-weight: 700;
		margin-bottom: 12px;
		color: rgba(255, 255, 255, 0.8);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding-bottom: 4px;
	}

	.quests-container {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.quest-item {
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

	.quest-item:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.2);
	}

	.quest-item.selected {
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
		color: rgba(127, 209, 185, 0.9);
		text-shadow: 0 0 4px rgba(127, 209, 185, 0.3);
	}

	.quest-meta {
		display: flex;
		gap: 8px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.6);
		flex-wrap: wrap;
	}

	.status,
	.duration,
	.stamina {
		background: rgba(255, 255, 255, 0.1);
		padding: 2px 6px;
		border-radius: 3px;
		font-weight: 500;
	}

	.status {
		color: rgba(127, 209, 185, 0.9);
		background: rgba(127, 209, 185, 0.1);
		border: 1px solid rgba(127, 209, 185, 0.3);
	}

	.quest-detail {
		flex: 1;
		min-width: 400px;
		background: #1a1a1a;
		position: relative;
		height: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	/* Scrollbar styling for webkit browsers */
	.quest-detail::-webkit-scrollbar {
		width: 8px;
	}

	.quest-detail::-webkit-scrollbar-track {
		background: #1a1a1a;
	}

	.quest-detail::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	.quest-detail::-webkit-scrollbar-thumb:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.quest-detail-content {
		background: #1a1a1a;
		position: relative;
		height: 100%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		padding: 20px;
		overflow-y: auto;
	}

	.detail-title {
		font-size: 24px;
		margin-bottom: 16px;
		text-align: center;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 700;
	}

	.detail-image-wrap {
		margin-bottom: 16px;
		display: flex;
		justify-content: center;
	}

	.detail-image {
		width: 200px;
		height: 200px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.detail-image img {
		max-width: 100%;
		max-height: 100%;
		border-radius: 8px;
	}

	.detail-fallback {
		font-size: 48px;
		color: rgba(255, 255, 255, 0.3);
	}

	.detail-desc {
		margin-bottom: 16px;
		line-height: 1.5;
		text-align: center;
		color: #e8f0ff;
	}

	.detail-objective {
		margin-bottom: 16px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		text-align: center;
		color: rgba(255, 255, 255, 0.9);
		border-left: 3px solid rgba(127, 209, 185, 0.8);
	}

	.detail-meta {
		margin-bottom: 20px;
		text-align: center;
	}

	.meta-item {
		margin-bottom: 8px;
		font-size: 14px;
		color: #e8f0ff;
	}

	.requirements-list {
		margin-top: 4px;
	}

	.requirement-item {
		margin-bottom: 4px;
		text-align: center;
		color: rgba(255, 255, 255, 0.8);
		padding: 4px 8px;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 4px;
		border-left: 2px solid rgba(127, 209, 185, 0.6);
	}

	.detail-rewards-section {
		margin-bottom: 24px;
	}

	.rewards-label {
		margin-bottom: 12px;
		font-size: 16px;
		text-align: center;
		color: #e8f0ff;
	}

	.reward-cards {
		display: flex;
		flex-direction: column;
		gap: 8px;
		align-items: center;
	}

	.reward-card {
		display: flex;
		align-items: center;
		padding: 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s;
		justify-content: center;
		text-align: center;
	}

	.reward-card:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.opt-rewards {
		font-size: 14px;
		flex: 1;
	}

	.opt-label {
		font-weight: 600;
		margin-bottom: 6px;
		color: rgba(255, 255, 255, 0.95);
		text-align: center;
	}

	.opt-details {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		color: rgba(255, 255, 255, 0.7);
		justify-content: center;
	}

	.opt-details span {
		background: rgba(255, 255, 255, 0.1);
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 13px;
		color: rgba(127, 209, 185, 0.9);
		font-weight: 500;
	}

	.single-reward {
		border: none;
		cursor: default;
		text-align: center;
	}

	.detail-objective strong,
	.meta-item strong,
	.rewards-label strong,
	.detail-random-reward strong {
		color: rgba(127, 209, 185, 0.9);
		font-weight: 600;
	}

	.detail-random-reward {
		margin-bottom: 16px;
		padding: 12px;
		background: rgba(127, 209, 185, 0.1);
		border-left: 3px solid rgba(127, 209, 185, 0.9);
		border-radius: 6px;
		font-size: 14px;
		text-align: center;
		color: rgba(255, 255, 255, 0.9);
	}

	.detail-actions {
		display: flex;
		gap: 12px;
		justify-content: center;
		margin-top: auto;
		padding-top: 20px;
	}

	.qb-btn {
		padding: 10px 16px;
		border-radius: 8px;
		border: 0;
		cursor: pointer;
		font-weight: 700;
		transition: all 0.2s;
	}

	.qb-btn.accept {
		background: linear-gradient(90deg, var(--accent, #7fd1b9), #66c3a8);
		color: #05221b;
	}

	.qb-btn.accept:hover {
		background: linear-gradient(90deg, #66c3a8, var(--accent, #7fd1b9));
	}

	.qb-btn.secondary {
		background: linear-gradient(90deg, #ff6b6b, #ee5a52);
		border: 1px solid #ff6b6b;
		color: #ffffff;
	}

	.qb-btn.secondary:hover {
		background: linear-gradient(90deg, #ee5a52, #ff6b6b);
		border-color: #ee5a52;
		color: #ffffff;
	}

	.quest-detail-placeholder {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: rgba(255, 255, 255, 0.6);
		text-align: center;
		padding: 20px;
	}

	.quest-detail-placeholder p {
		margin: 0;
		text-align: center;
		font-size: 18px;
		font-weight: 500;
	}
</style>
