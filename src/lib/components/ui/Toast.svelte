<script>
	import { toasts, show } from '$lib/stores/toastStore';
	import { fly, fade } from 'svelte/transition';
	import { derived } from 'svelte/store';
	import { onMount } from 'svelte';

	// Keep newest toasts first
	const list = derived(toasts, ($t) => $t);

	onMount(() => {
		const handleToast = (event) => {
			const { message, type } = event.detail;
			show(message, { type });
		};

		window.addEventListener('toast', handleToast);

		return () => {
			window.removeEventListener('toast', handleToast);
		};
	});
</script>

<div class="toast-wrapper" aria-live="polite" aria-atomic="true">
	{#each $list as t (t.id)}
		<div class="toast" in:fly={{ x: 40, duration: 220 }} out:fade={{ duration: 160 }}>
			{#if t.items && t.items.length}
				<div class="toast-items">
					{#each t.items as it (it)}
						<div class="toast-entry">
							{#if it.kind === 'silver'}
								<svg
									class="ic"
									viewBox="0 0 24 24"
									width="18"
									height="18"
									fill="none"
									aria-hidden="true"
									><circle cx="12" cy="12" r="9" fill="#C0C6CB" /><path
										d="M8 12a4 4 0 0 0 8 0 4 4 0 0 0-8 0z"
										fill="#8F98A0"
										opacity="0.95"
									/></svg
								>
							{:else if it.kind === 'gold'}
								<svg
									class="ic"
									viewBox="0 0 24 24"
									width="18"
									height="18"
									fill="none"
									aria-hidden="true"
									><circle cx="12" cy="12" r="9" fill="#FFD27A" /><path
										d="M8 12a4 4 0 0 0 8 0 4 4 0 0 0-8 0z"
										fill="#F4C95E"
									/></svg
								>
							{:else if it.kind === 'exp'}
								<svg
									class="ic"
									viewBox="0 0 24 24"
									width="18"
									height="18"
									fill="none"
									aria-hidden="true"
									><path
										d="M12 2l2.5 5.5L20 8l-4 3 1 6L12 15l-5 2 1-6-4-3 5.5-.5L12 2z"
										fill="#9AD3FF"
									/></svg
								>
							{:else if it.kind === 'diamond'}
								<svg
									class="ic"
									viewBox="0 0 24 24"
									width="18"
									height="18"
									fill="none"
									aria-hidden="true"><path d="M12 2l9 7-9 13L3 9l9-7z" fill="#A6E1FF" /></svg
								>
							{:else}
								<svg
									class="ic"
									viewBox="0 0 24 24"
									width="18"
									height="18"
									fill="none"
									aria-hidden="true"
									><rect x="3" y="7" width="18" height="10" rx="2" fill="#d1d5db" /></svg
								>
							{/if}
							<span class="entry-label">{it.label}</span>
						</div>
					{/each}
				</div>
			{:else}
				<div class="toast-message">{t.message}</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.toast-wrapper {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 18px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		align-items: center;
		z-index: 99999;
	}
	.toast {
		background: linear-gradient(90deg, #0f1724, #071029);
		color: #e6f7f0;
		padding: 10px 14px;
		border-radius: 10px;
		box-shadow: 0 8px 22px rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.03);
		min-width: 180px;
		max-width: 420px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.toast-message {
		font-weight: 700;
		font-size: 14px;
		text-align: center;
	}
	.toast-items {
		display: flex;
		flex-direction: column;
		gap: 6px;
		align-items: center;
	}
	.toast-entry {
		display: flex;
		gap: 8px;
		align-items: center;
		justify-content: center;
	}
	.toast-entry .ic {
		flex: 0 0 auto;
	}
	.entry-label {
		font-weight: 700;
		color: #e6f7f0;
	}
</style>
