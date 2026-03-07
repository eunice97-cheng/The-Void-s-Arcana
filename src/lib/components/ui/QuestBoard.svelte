<script>
	import { createEventDispatcher, onDestroy } from 'svelte';
	import questStore, { hasActiveQuest } from '../../stores/questStore';
	import { gameState } from '$lib/stores/gameState';
	import { show } from '$lib/stores/toastStore';
	import { canAcceptQuest, getQuestBlockReason } from '$lib/utils/questLogic';
	import QuestModal from './QuestModal.svelte';
	import QuestList from './QuestList.svelte';
	import QuestDetail from './QuestDetail.svelte';

	export let showBoard = false;

	const dispatch = createEventDispatcher();

	// State management
	/** @type {string|null} */
	let selectedQuestId = null;
	/** @type {string|null} */
	let selectedRewardId = null;
	let active = false;

	const unsub = hasActiveQuest.subscribe((v) => (active = v));
	onDestroy(() => unsub());

	function handleAccept(/** @type {CustomEvent} */ event) {
		const { questId, rewardId } = event.detail;

		console.debug('[QuestBoard] handleAccept', { questId, rewardId, active });
		const blockReason = getQuestBlockReason ? getQuestBlockReason(questId, rewardId, active) : null;
		if (!canAcceptQuest(questId, rewardId, active)) {
			try {
				show(blockReason || 'You cannot accept this quest right now.', {
					type: 'info',
					duration: 4000
				});
			} catch (e) {}
			console.debug('[QuestBoard] accept blocked:', blockReason);
			return;
		}

		try {
			questStore.startQuest(questId, rewardId);
			dispatch('accepted');
			dispatch('close');
		} catch (e) {
			console.warn('startQuest failed', e);
		}
	}

	function handleSelectQuest(/** @type {CustomEvent} */ event) {
		selectedQuestId = event.detail;
		selectedRewardId = null; // Reset reward selection when changing quests
	}

	function handleClose() {
		dispatch('close');
	}
</script>

<QuestModal showModal={showBoard} on:close={handleClose}>
	<div class="quest-board">
		<QuestList {selectedQuestId} on:select={handleSelectQuest} />
		<QuestDetail
			{selectedQuestId}
			bind:selectedRewardId
			{active}
			on:accept={handleAccept}
			on:close={handleClose}
		/>
	</div>
</QuestModal>

<style>
	.quest-board {
		display: flex;
		height: 100%;
		width: 100%;
		background: #1a1a1a;
		overflow: hidden;
		padding: 0;
		margin: 0;
		box-sizing: border-box;
	}
</style>
