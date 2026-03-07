<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	function close() {
		dispatch('close');
	}
</script>

<div class="ach-window" role="dialog" aria-modal="false">
	<header class="ach-header">
		<h3>Achievements</h3>
		<button class="close" aria-label="Close achievements" on:click={close}>✕</button>
	</header>

	<div class="ach-body">
		<div class="locked">
			<div class="lock-icon">🔒</div>
			<div class="coming">Coming Soon</div>
		</div>
	</div>
</div>

<style>
	.ach-window {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 12vh;
		width: min(720px, 92%);
		max-height: calc(100vh - 160px);
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		color: #e8f0ff;
		border-radius: 12px;
		box-shadow: 0 22px 60px rgba(2, 8, 23, 0.75);
		z-index: 1500;
		border-left: 6px solid rgba(255, 176, 58, 0.95);
		overflow: hidden;
	}
	.ach-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
	}
	.ach-header .close {
		background: transparent;
		border: 0;
		color: rgba(255, 255, 255, 0.85);
		font-size: 18px;
		cursor: pointer;
	}
	.ach-body {
		padding: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.locked {
		text-align: center;
		color: rgba(255, 255, 255, 0.9);
	}
	.lock-icon {
		font-size: 48px;
		margin-bottom: 12px;
	}
	.coming {
		font-size: 18px;
		opacity: 0.95;
	}
</style>
