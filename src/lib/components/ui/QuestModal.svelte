<script>
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';

	export let showModal = false;

	const dispatch = createEventDispatcher();

	let portalContainer = null;
	let modalHost = null;

	onMount(() => {
		if (typeof document !== 'undefined') {
			portalContainer = document.createElement('div');
			portalContainer.className = 'qb-portal-container';
			document.body.appendChild(portalContainer);
			document.documentElement.style.overflowX = 'hidden';
			document.body.style.overflowX = 'hidden';
		}
	});

	onDestroy(() => {
		if (modalHost && portalContainer && portalContainer.contains(modalHost)) {
			portalContainer.removeChild(modalHost);
		}
		if (portalContainer && portalContainer.parentNode) {
			portalContainer.parentNode.removeChild(portalContainer);
		}
	});

	$: if (typeof document !== 'undefined') {
		if (modalHost && portalContainer && modalHost.parentNode !== portalContainer) {
			portalContainer.appendChild(modalHost);
		}
	}

	function handleBackdropClick() {
		dispatch('close');
	}

	function handleKeydown(event) {
		if (event.key === 'Escape') {
			dispatch('close');
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div class="qb-modal-backdrop" on:click={handleBackdropClick} bind:this={modalHost}>
		<div class="qb-modal" on:click|stopPropagation>
			<button class="qb-close-btn" on:click={() => dispatch('close')} aria-label="Close">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>
			<slot />
		</div>
	</div>
{/if}

<style>
	.qb-modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.qb-modal {
		position: relative;
		background: #1a1a1a;
		border-radius: 12px;
		width: 90vw;
		max-width: 1200px;
		height: 80vh;
		max-height: 800px;
		display: flex;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
		border: none;
		overflow: hidden;
	}

	.qb-close-btn {
		position: absolute;
		top: 16px;
		right: 16px;
		width: 36px;
		height: 36px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: rgba(255, 255, 255, 0.8);
		transition: all 0.2s;
		z-index: 10;
	}

	.qb-close-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		color: rgba(255, 255, 255, 1);
	}

	@media (max-width: 700px) {
		.qb-modal {
			width: calc(100vw - 24px);
			height: calc(100vh - 24px);
			border-radius: 8px;
		}
	}
</style>
