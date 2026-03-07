<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { questTemplates } from '$lib/data/quests';
	export let open = true;
	export let quest = null;
	const dispatch = createEventDispatcher();

	let portalContainer = null;
	let modalHost = null;
	let chosenReward = null;
	let showResult = false;
	let resultText = '';

	function close() {
		dispatch('close');
	}

	function confirm() {
		dispatch('confirm', chosenReward);
	}

	function selectReward(reward) {
		chosenReward = reward;
		confirm();
	}

	function selectShadowsReward(reward, isRunAway) {
		chosenReward = reward;
		showResult = true;
		if (isRunAway) {
			resultText =
				'Submit Completed Quest\nQuest Complete\n\nYou decide this is beyond your capabilities. You report back to the Guild and tell Kane to be careful.';
		} else {
			resultText =
				'You bravely enter the cave to investigate further. Inside, you find a huge but harmless old worg, almost at the end of its time. You tell Kane the truth about what you found.';
		}
	}

	onMount(() => {
		if (typeof document !== 'undefined') {
			portalContainer = document.createElement('div');
			portalContainer.className = 'sq-portal-container';
			document.body.appendChild(portalContainer);
		}
	});

	// cleanup portal when component destroyed to avoid stale DOM overlays
	import { onDestroy } from 'svelte';
	onDestroy(() => {
		try {
			if (portalContainer && portalContainer.parentNode) {
				portalContainer.parentNode.removeChild(portalContainer);
			}
			portalContainer = null;
		} catch (e) {
			/* ignore */
		}
	});

	$: if (typeof document !== 'undefined') {
		if (modalHost && portalContainer && modalHost.parentNode !== portalContainer) {
			portalContainer.appendChild(modalHost);
		}
	}

	// Resolve template fallback so the modal can display rewards when `quest` is a persisted entry
	$: tpl = (quest && (quest.template || questTemplates.find((t) => t.id === (quest.templateId || quest.template?.id)))) || null;
	// Compute displayRewards for template/persisted quest fallback
	$: displayRewards = (quest && quest.rewards) || (tpl && tpl.rewards) || null;
</script>

{#if open}
	<div bind:this={modalHost} class="sq-modal-host">
		<div
			class="sq-backdrop"
			role="button"
			tabindex="0"
			aria-label="Close submit quest"
			on:click={close}
		></div>
		<div class="sq-modal" role="dialog" aria-modal="true" aria-label="Submit quest">
			<header class="sq-header">
				<h3>Submit Completed Quest</h3>
				<button class="sq-close" aria-label="Close" on:click={close}>✕</button>
			</header>

			<div class="sq-body">
				{#if quest}
					{console.log('SubmitQuestModal quest:', quest)}
					{#if quest.templateId === 'daily-family-heirloom'}
						<h4 class="sq-title">Timmy's Uncle</h4>
						<p class="sq-desc">
							As you prepare to return the locket to Timmy, a man approaches you urgently.
						</p>
						<div class="sq-dialogue">
							<p>
								<strong>Timmy's Uncle:</strong> "Hey there, adventurer! I couldn't help but overhear.
								That's my sister's locket you're holding. She's been looking for it everywhere. How about
								you hand it over to me instead? I'll give you 200 silver and 100 EXP for it. What do
								you say?"
							</p>
						</div>
						<div class="sq-actions heirloom">
							<button
								class="btn submit"
								on:click={() => selectReward({ rewards: { silver: 200, exp: 100 } })}
								>Hand it over (200 silver, 100 EXP)</button
							>
							<button class="btn cancel" on:click={() => selectReward(null)}
								>Refuse and return to Timmy (10 silver, 100 EXP)</button
							>
						</div>
					{:else if quest.templateId === 'daily-shadows-of-the-past'}
						{#if showResult}
							<h4 class="sq-title">Quest Complete</h4>
							<p class="sq-desc">{resultText}</p>
							<div class="sq-actions">
								<button class="btn submit" on:click={confirm}>Continue</button>
							</div>
						{:else}
							<h4 class="sq-title">Investigation Results</h4>
							<p class="sq-desc">
								You found large, non-human animal tracks and a scrap of black fur caught on a branch
								near where Kane last saw the beast.
							</p>
							<div class="sq-actions heirloom">
								<button
									class="btn submit"
									on:click={() =>
										selectShadowsReward(
											{ rewards: { silver: 150, exp: 75 }, hiddenTrait: 'N' },
											true
										)}>Run! This is beyond your capabilities!</button
								>
								<button
									class="btn cancel"
									on:click={() => selectShadowsReward({ rewards: { silver: 150, exp: 75 } }, false)}
									>Enter the cave to investigate further.</button
								>
							</div>
						{/if}
					{:else}
						<h4 class="sq-title">{quest.title}</h4>
						<p class="sq-desc">{quest.description}</p>
						<div class="sq-meta">Rewards:</div>
						<div class="sq-rewards">
							{#if quest.chosenReward && quest.chosenReward.rewards}
								{#if quest.chosenReward.rewards.gold}<div>Gold: {quest.chosenReward.rewards.gold}</div>{/if}
								{#if quest.chosenReward.rewards.silver}<div>Silver: {quest.chosenReward.rewards.silver}</div>{/if}
								{#if quest.chosenReward.rewards.diamonds}<div>Diamonds: {quest.chosenReward.rewards.diamonds}</div>{/if}
								{#if quest.chosenReward.rewards.exp}<div>EXP: {quest.chosenReward.rewards.exp}</div>{/if}
							{:else}
								{#if displayRewards}
									{#if displayRewards.gold}<div>Gold: {displayRewards.gold}</div>{/if}
									{#if displayRewards.silver}<div>Silver: {displayRewards.silver}</div>{/if}
									{#if displayRewards.diamonds}<div>Diamonds: {displayRewards.diamonds}</div>{/if}
									{#if displayRewards.exp}<div>EXP: {displayRewards.exp}</div>{/if}
								{:else}
									<div>No rewards listed.</div>
								{/if}
							{/if}
						</div>

						<div class="sq-actions">
							<button class="btn submit" on:click={confirm}>Submit Quest</button>
							<button class="btn cancel" on:click={close}>Cancel</button>
						</div>
					{/if}
				{:else}
					<div class="empty">No quest selected.</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.sq-modal-host {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 70000;
	}
	.sq-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
	}
	.sq-modal {
		position: relative;
		width: 500px;
		max-width: calc(100% - 32px);
		background: var(--surface, #0f1113);
		border-radius: 10px;
		padding: 24px;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.03);
	}
	.sq-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.sq-close {
		background: transparent;
		border: 0;
		color: #cfe1dd;
		cursor: pointer;
	}
	.sq-title {
		margin: 8px 0 16px 0;
	}
	.sq-desc {
		color: #c9d0d2;
		margin-bottom: 16px;
	}
	.sq-dialogue {
		margin-bottom: 16px;
	}
	.sq-actions {
		margin-top: 20px;
		display: flex;
		gap: 10px;
	}
	.sq-actions.heirloom {
		flex-direction: column;
		gap: 16px;
	}
	.btn.submit {
		background: linear-gradient(90deg, var(--accent, #7fd1b9), #66c3a8);
		border: 0;
		padding: 8px 12px;
		border-radius: 8px;
		font-weight: 700;
		color: #ffffff !important;
	}
	.btn.cancel {
		background: linear-gradient(90deg, #667eea, #764ba2);
		border: 0;
		padding: 8px 12px;
		border-radius: 8px;
		color: #ffffff !important;
		font-weight: 700;
	}
</style>
