<script>
	export let visible = true;
</script>

{#if visible}
	<div class="va-loading-overlay" role="status" aria-live="polite">
		<div class="va-spinner">
			<div></div>
			<div></div>
			<div></div>
			<div></div>
		</div>
		<div class="va-loading-text">Loading…</div>
	</div>
{/if}

<style>
	.va-loading-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		z-index: 20000;
		-webkit-font-smoothing: antialiased;
	}

	.va-spinner {
		display: inline-block;
		position: relative;
		width: 64px;
		height: 64px;
	}

	.va-spinner div {
		box-sizing: border-box;
		display: block;
		position: absolute;
		width: 51px;
		height: 51px;
		margin: 6px;
		border: 6px solid rgba(138, 43, 226, 0.9);
		border-radius: 50%;
		animation: va-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
		border-color: rgba(138, 43, 226, 0.95) transparent transparent transparent;
	}

	.va-spinner div:nth-child(1) {
		animation-delay: -0.45s;
	}
	.va-spinner div:nth-child(2) {
		animation-delay: -0.3s;
	}
	.va-spinner div:nth-child(3) {
		animation-delay: -0.15s;
	}

	@keyframes va-ring {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.va-loading-text {
		color: #fff;
		margin-top: 12px;
		font-family: 'Cinzel', serif;
		font-size: 1rem;
	}
</style>
