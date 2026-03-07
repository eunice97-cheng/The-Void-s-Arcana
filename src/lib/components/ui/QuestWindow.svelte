<script>
	import { createEventDispatcher, onDestroy } from 'svelte';
	import questStore, { remainingSeconds } from '../../stores/questStore';
	const dispatch = createEventDispatcher();
	let remaining = 0;
	const unsub = remainingSeconds.subscribe((v) => (remaining = v));
	onDestroy(() => unsub());

	function submit() {
		const res = questStore.submitQuest();
		console.log('submitQuest', res);
		// close after submit
		dispatch('close');
	}

	function abandon() {
		if (!confirm('Give up the quest?')) return;
		questStore.abandonQuest();
		dispatch('close');
	}

	// helper to read active quest for display
	let active = null;
	const sub2 = questStore.subscribe((q) => (active = q));
	onDestroy(() => sub2());

	function close() {
		dispatch('close');
	}
</script>

<div class="qw-backdrop" role="dialog" aria-modal="true" tabindex="-1" on:click={close}>
	<div
		class="qw-modal"
		role="dialog"
		aria-label="Quest window"
		on:click|stopPropagation
		on:keydown={(e) => {
			if (e.key === 'Escape') close();
		}}
		tabindex="0"
	>
		<header class="qw-header">
			<h3>{active ? active.template.title : 'Quest'}</h3>
			<button class="qw-close" aria-label="Close" on:click={close}>✕</button>
		</header>
		<div class="qw-body">
			{#if active}
				<div>{active.template.description}</div>
				<div>Remaining: {remaining}s</div>
				{#if active.status === 'completed' && active.result === 'success'}
					<button class="btn submit" on:click={submit}>Submit Completed Quest</button>
				{:else}
					<button class="btn abandon" on:click={abandon}>Give Up Quest</button>
				{/if}
			{:else}
				<div class="empty">No active quest</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.qw-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 70000;
	}
	.qw-modal {
		width: 420px;
		max-width: calc(100% - 32px);
		background: #071029;
		border: 1px solid #071029;
		padding: 12px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
		color: #e8f0ff;
	}
	.qw-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
		color: #e8f0ff;
	}
	.qw-close {
		background: transparent;
		border: 0;
		color: #ccc;
		font-size: 18px;
	}
	.empty {
		color: #e8f0ff;
	}
</style>
