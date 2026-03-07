<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	let zoomed = false;
	let container;
	let isDown = false;
	let startX, startY, scrollLeft, scrollTop;
	let hasDragged = false;

	function close() {
		dispatch('close');
	}

	function toggleZoom(e) {
		zoomed = !zoomed;
	}

	function onMouseDown(e) {
		isDown = true;
		hasDragged = false;
		startX = e.pageX - container.offsetLeft;
		startY = e.pageY - container.offsetTop;
		scrollLeft = container.scrollLeft;
		scrollTop = container.scrollTop;
	}

	function onMouseLeave() {
		isDown = false;
	}

	function onMouseUp() {
		isDown = false;
	}

	function onMouseMove(e) {
		if (!isDown) return;
		e.preventDefault();
		const x = e.pageX - container.offsetLeft;
		const y = e.pageY - container.offsetTop;
		const walkX = (x - startX); 
		const walkY = (y - startY);
		
		if (Math.abs(walkX) > 5 || Math.abs(walkY) > 5) {
			hasDragged = true;
		}

		container.scrollLeft = scrollLeft - walkX;
		container.scrollTop = scrollTop - walkY;
	}

	function handleImageClick(e) {
		if (!hasDragged) {
			toggleZoom(e);
		}
	}
</script>

<div class="map-window" role="dialog" aria-modal="false">
	<header class="map-header">
		<h3>Map <span class="hint">(Click to zoom, Drag to pan)</span></h3>
		<button class="close" aria-label="Close map" on:click={close}>✕</button>
	</header>

	<div 
		class="map-body" 
		class:is-zoomed={zoomed}
		bind:this={container}
		on:mousedown={onMouseDown}
		on:mouseleave={onMouseLeave}
		on:mouseup={onMouseUp}
		on:mousemove={onMouseMove}
		role="presentation"
	>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
		<img 
			src="/Images/Maps/Aeleris Region.png" 
			alt="Aeleris Region Map" 
			class="map-image" 
			class:zoomed={zoomed}
			on:click={handleImageClick}
			draggable="false"
		/>
	</div>
</div>

<style>
	.map-window {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: 12vh;
		width: 900px; /* Fixed width to prevent resizing */
		max-width: 92%;
		height: 80vh; /* Fixed height to prevent resizing */
		max-height: calc(100vh - 160px);
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		color: #e8f0ff;
		border-radius: 12px;
		box-shadow: 0 22px 60px rgba(2, 8, 23, 0.75);
		z-index: 1500;
		border-left: 6px solid rgba(0, 200, 180, 0.9);
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}
	.map-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px;
		background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		border-bottom: 1px solid rgba(255, 255, 255, 0.03);
		flex-shrink: 0;
	}
	.map-header h3 {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin: 0;
	}
	.hint {
		font-size: 0.75rem;
		opacity: 0.6;
		font-weight: 400;
	}
	.map-header .close {
		background: transparent;
		border: 0;
		color: rgba(255, 255, 255, 0.85);
		font-size: 18px;
		cursor: pointer;
	}
	.map-body {
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: auto;
		flex: 1;
		background: #000;
		cursor: zoom-in;
		user-select: none; /* Prevent selection while dragging */
	}
	.map-body.is-zoomed {
		display: block; /* Allow scrolling */
		cursor: grab;
	}
	.map-body.is-zoomed:active {
		cursor: grabbing;
	}
	.map-image {
		max-width: 100%;
		height: auto;
		display: block;
		transition: width 0.2s ease;
		pointer-events: auto; /* Ensure clicks pass through */
	}
	.map-image.zoomed {
		max-width: none;
		width: 200%;
		margin: 0 auto;
	}
</style>
