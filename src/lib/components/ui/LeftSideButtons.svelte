<script>
	import { createEventDispatcher } from 'svelte';
	import { gameState } from '$lib/stores/gameState';
	const dispatch = createEventDispatcher();

	export let hasNotifications = false;

	/** @param {string} action */
	function send(action) {
	    dispatch('toggle', { action });
	}

	$: mapUnlocked = $gameState.character?.unlocks?.map || false;
</script>

<div id="left-side-ui" data-left-side-ui="true" class="left-side-ui-container left-side-ui-global">
	<button
		class="window-toggle {hasNotifications ? 'notification-blink' : ''}"
		aria-label="Notifications"
		data-tooltip="Notifications"
		on:click={() => send('notifications')}><i class="fas fa-bell" aria-hidden="true"></i></button
	>
	<button
		class="window-toggle"
		aria-label="Adventure card"
		data-tooltip="Adventure Card"
		on:click={() => send('adventure-card')}><i class="fas fa-scroll" aria-hidden="true"></i></button
	>
	<button
		class="window-toggle"
		aria-label="Equipments"
		data-tooltip="Equipments"
		on:click={() => send('equipment')}><i class="fas fa-vest" aria-hidden="true"></i></button
	>
	<button
		class="window-toggle"
		data-window="inventory"
		aria-label="Inventory"
		data-tooltip="Inventory"
		on:click={() => send('inventory')}><i class="fas fa-box-open" aria-hidden="true"></i></button
	>
	<button
		class="window-toggle"
		data-window="quests"
		aria-label="Quests"
		data-tooltip="Quests"
		on:click={() => send('quests')}><i class="fas fa-tasks" aria-hidden="true"></i></button
	>
	<button
		class="window-toggle"
		data-window="status"
		aria-label="Stats and Skills"
		data-tooltip="Stats & Skills"
		on:click={() => send('status')}><i class="fas fa-chart-line" aria-hidden="true"></i></button
	>
	{#if mapUnlocked}
	<button
		class="window-toggle"
		data-window="map"
		aria-label="Map"
		data-tooltip="Map"
		on:click={() => send('map')}><i class="fas fa-map" aria-hidden="true"></i></button
	>
	{/if}
	<button
		class="window-toggle"
		data-window="achievements"
		aria-label="Achievements"
		data-tooltip="Achievements"
		on:click={() => send('achievements')}><i class="fas fa-trophy" aria-hidden="true"></i></button
	>
	<!-- Combat log toggle -->
</div>

<style>
    .notification-blink {
        animation: blink-animation 1.5s infinite ease-in-out;
        color: #ffd700 !important;
        text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
    }
    
    @keyframes blink-animation {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
    }
</style>
