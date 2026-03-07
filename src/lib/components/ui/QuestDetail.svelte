<script>
	import { createEventDispatcher } from 'svelte';
	import { questTemplates } from '../../data/quests';
	import { hasActiveQuest } from '../../stores/questStore';

	/** @type {string|null} */
	export let selectedQuestId = null;
	/** @type {string|null} */
	export let selectedRewardId = null;
	export let active = false;

	const dispatch = createEventDispatcher();

	$: selectedQuest = questTemplates.find((q) => q.id === selectedQuestId);

	function handleAccept() {
		if (!selectedQuest) return;
		try {
			console.debug('[QuestDetail] handleAccept', {
				questId: selectedQuest.id,
				rewardId: selectedRewardId,
				active
			});
			if (typeof window !== 'undefined') {
				try {
					window._lastQuestAccept = {
						questId: selectedQuest.id,
						rewardId: selectedRewardId,
						timestamp: Date.now()
					};
				} catch (e) {}
				if (typeof window.show === 'function') {
					try {
						window.show(`Attempting to accept quest ${selectedQuest.id}`, {
							type: 'info',
							duration: 2000
						});
					} catch (e) {}
				}
			}
		} catch (e) {}
		dispatch('accept', {
			questId: selectedQuest.id,
			rewardId: selectedRewardId
		});
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

	function formatDuration(seconds) {
		return seconds < 60 ? `${seconds}s` : `${Math.ceil(seconds / 60)}m`;
	}
</script>

<div class="quest-detail-container">
	{#if selectedQuest}
		<div class="quest-detail">
			<h3 class="detail-title">{selectedQuest.title}</h3>

			{#if selectedQuest.questGiver}
				<div class="detail-giver"><strong>Request by</strong>: {selectedQuest.questGiver}</div>
			{/if}

			<div class="detail-image-wrap">
				<div class="detail-image">
					{#if selectedQuest.thumbnail}
						<img src={'/Images/Quest/' + selectedQuest.thumbnail} alt="" loading="lazy" />
					{:else}
						<div class="detail-fallback">?</div>
					{/if}
				</div>
			</div>

			<p class="detail-desc">{selectedQuest.description}</p>

			{#if selectedQuest.objective}
				<div class="detail-objective">
					<strong>Objective</strong>: {selectedQuest.objective}
				</div>
			{/if}

			<div class="detail-meta">
				{#if getCommonStamina(selectedQuest)}
					<div class="meta-item">
						<strong>Requirements</strong>: {getCommonStamina(selectedQuest)} stamina
					</div>
				{/if}

				{#if selectedQuest.durationSeconds && (!selectedQuest.rewardOptions || selectedQuest.rewardOptions.length <= 1)}
					<div class="meta-item">
						<strong>Duration</strong>: {formatDuration(selectedQuest.durationSeconds)}
					</div>
				{/if}
			</div>

			{#if selectedQuest.rewardOptions}
				<div class="detail-rewards-section">
					<div class="rewards-label">
						<strong>Rewards</strong>: {selectedQuest.rewardOptions.length > 1 ? '(Choose one)' : ''}
					</div>

					<div class="reward-cards">
						{#each selectedQuest.rewardOptions as option (option.id)}
							<label class="reward-card">
								{#if selectedQuest.rewardOptions.length > 1}
									<input type="radio" bind:group={selectedRewardId} value={option.id} />
								{/if}
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
											<span>{option.rewards.items.map((it) => it.name || it.id).join(', ')}</span>
										{/if}
									</div>
								</div>
							</label>
						{/each}
					</div>
				</div>
			{:else if selectedQuest.rewards}
				<div class="detail-rewards-section">
					<div class="rewards-label">
						<strong>Rewards</strong>
					</div>
					<div class="reward-cards">
						<div class="reward-card single-reward">
							<div class="opt-rewards">
								<div class="opt-details">
									{#if selectedQuest.rewards.silver}
										<span>{selectedQuest.rewards.silver} silver</span>
									{/if}
									{#if selectedQuest.rewards.exp}
										<span>{selectedQuest.rewards.exp} exp</span>
									{/if}
									{#if selectedQuest.rewards.items?.length}
										<span
											>{selectedQuest.rewards.items.map((it) => it.name || it.id).join(', ')}</span
										>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if selectedQuest.randomReward}
				<div class="detail-random-reward">
					<strong>Bonus</strong>: Possible Random E Rank Equipment Box
				</div>
			{/if}

			<div class="detail-actions">
				<button
					class="qb-btn accept"
					on:click={handleAccept}
					disabled={active || (selectedQuest.rewardOptions?.length > 1 && !selectedRewardId)}
				>
					{active ? 'Active quest in progress' : 'Accept'}
				</button>
				<button class="qb-btn secondary" on:click={() => dispatch('close')}>Close</button>
			</div>
		</div>
	{:else}
		<div class="quest-detail-placeholder">
			<p>Select a quest from the list to view details.</p>
		</div>
	{/if}
</div>

<style>
	/* Quest detail styles - extracted from original */
	.quest-detail-container {
		position: relative;
		height: 100%;
		flex: 1;
		min-width: 400px;
	}

	.quest-detail {
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

	.detail-title {
		font-size: 24px;
		margin-bottom: 16px;
		text-align: center;
	}

	.detail-giver {
		font-size: 14px;
		color: rgba(255,255,255,0.75);
		margin-bottom: 8px;
		text-align: center;
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
	}

	.detail-objective {
		margin-bottom: 16px;
		padding: 12px;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 6px;
		text-align: center;
	}

	.detail-meta {
		margin-bottom: 20px;
		text-align: center;
	}

	.meta-item {
		margin-bottom: 8px;
		font-size: 14px;
	}

	.detail-rewards-section {
		margin-bottom: 24px;
	}

	.rewards-label {
		margin-bottom: 12px;
		font-size: 16px;
		text-align: center;
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
	}

	.reward-card:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.reward-card input[type='radio'] {
		margin-right: 12px;
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
	}

	.opt-details span {
		background: rgba(255, 255, 255, 0.1);
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 13px;
	}

	.single-reward {
		border: none;
		cursor: default;
		text-align: center;
	}

	.single-reward:hover {
		background: rgba(255, 255, 255, 0.05);
	}

	.detail-random-reward {
		margin-bottom: 16px;
		padding: 12px;
		background: rgba(127, 209, 185, 0.1);
		border-left: 3px solid var(--accent, #7fd1b9);
		border-radius: 6px;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.9);
		text-align: center;
	}

	.detail-actions {
		display: flex;
		gap: 12px;
		justify-content: center;
	}

	.qb-btn {
		padding: 10px 16px;
		border-radius: 8px;
		border: 0;
		cursor: pointer;
		font-weight: 700;
	}

	.qb-btn.accept {
		background: linear-gradient(90deg, var(--accent, #7fd1b9), #66c3a8);
		color: #05221b;
	}

	.qb-btn.accept:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.qb-btn.secondary {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.04);
		color: #cfe1dd;
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
