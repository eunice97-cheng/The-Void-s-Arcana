<script>
	import { createEventDispatcher } from 'svelte';
	import { storyNotifications } from '$lib/stores/storyStore';
	import { gameState } from '$lib/stores/gameState';
	import { sceneManager } from '$lib/stores/sceneManager';

	const dispatch = createEventDispatcher();

	$: hasActiveQuest = !!($gameState.character && $gameState.character.activeQuest && $gameState.character.activeQuest.status === 'in_progress');

	function close() {
		dispatch('close');
	}

	function handleGoNow(note) {
		if (hasActiveQuest) return;
		console.log('Go Now clicked for:', note.id);
		
		// Trigger the story scene
		// IMPORTANT: Do NOT set the completion flag (e.g. met_alexa_level_3) here.
		// The flag should only be set when the actual scene is fully completed.
		if (note.actionScene) {
			sceneManager.loadScene(note.actionScene);
		} else if (note.id === 'story-level-3-guild') {
			sceneManager.loadScene('Scene049');
		} else {
			alert('Story scene placeholder for: ' + note.title);
		}
		dispatch('close');
	}
</script>

<div class="window-overlay" on:click={close} on:keydown={(e) => e.key === 'Escape' && close()} role="button" tabindex="0">
	<div class="window-content notification-window" on:click|stopPropagation role="presentation">
		<div class="window-header">
			<h2>Notifications</h2>
			<button class="close-button" on:click={close}><i class="fas fa-times"></i></button>
		</div>
		<div class="window-body">
            {#if $storyNotifications.length === 0}
                <p class="no-notifications">No new notifications.</p>
            {:else}
                <div class="notification-list">
                    {#each $storyNotifications as note}
                        <div class="notification-item">
                            <h3>{note.title}</h3>
                            <p>{note.message}</p>
							<div class="actions">
								<button 
									class="go-now-btn" 
									disabled={hasActiveQuest}
									title={hasActiveQuest ? "Unable to proceed due to active quest" : "Go to event"}
									on:click={() => handleGoNow(note)}
								>
									Go Now
								</button>
							</div>
                        </div>
                    {/each}
                </div>
            {/if}
		</div>
	</div>
</div>

<style>
    .notification-window {
        width: 400px;
        max-width: 90vw;
        background: var(--bg-color, #1a1a1a);
        border: 1px solid var(--border-color, #333);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        max-height: 80vh;
    }
    .window-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        background: rgba(0,0,0,0.2);
    }
    .window-header h2 {
        margin: 0;
        font-size: 1.2rem;
        color: var(--text-color, #fff);
    }
    .close-button {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0.2rem 0.5rem;
    }
    .close-button:hover {
        color: #fff;
    }
    .window-body {
        padding: 1rem;
        overflow-y: auto;
    }
    .notification-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .notification-item {
        background: rgba(255, 255, 255, 0.05);
        padding: 1rem;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .notification-item h3 {
        margin: 0 0 0.5rem 0;
        color: #ffd700;
        font-size: 1rem;
    }
    .notification-item p {
        margin: 0;
        line-height: 1.4;
        color: #ddd;
    }
	.actions {
		margin-top: 1rem;
		display: flex;
		justify-content: flex-end;
	}
	.go-now-btn {
		background: #4a90e2;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-weight: bold;
		transition: background 0.2s;
	}
	.go-now-btn:hover:not(:disabled) {
		background: #357abd;
	}
	.go-now-btn:disabled {
		background: #555;
		color: #888;
		cursor: not-allowed;
		opacity: 0.7;
	}
    .no-notifications {
        text-align: center;
        color: #888;
        font-style: italic;
        padding: 2rem;
    }
    .window-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
</style>
