<!-- src/routes/error/+page.svelte -->
<script>
	import { goto } from '$app/navigation';

	function goToLanding() {
		goto('/landing');
	}
</script>

<div id="error-container">
	<div id="error-content">
		<h1>An Error Occurred</h1>
		<p>Something went wrong while loading your game.</p>
		<div class="error-actions">
			<button class="error-btn" on:click={goToLanding}> Return to Main Menu </button>
		</div>
	</div>
</div>

<style>
	#error-container {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background:
			radial-gradient(circle at 20% 50%, rgba(40, 10, 80, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 80% 20%, rgba(10, 30, 70, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 40% 80%, rgba(70, 10, 40, 0.4) 0%, transparent 50%), #0a0a1a;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
	}

	#error-content {
		background: rgba(30, 30, 46, 0.85);
		border: 2px solid rgba(138, 43, 226, 0.5);
		border-radius: 15px;
		padding: 40px;
		text-align: center;
		max-width: 600px;
		width: 90%;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 20px;
		color: #e6e6fa;
	}

	p {
		font-family: 'MedievalSharp', cursive;
		font-size: 1.2rem;
		color: #b19cd9;
		margin-bottom: 30px;
	}

	.error-actions {
		margin-top: 20px;
	}

	.error-btn {
		background: rgba(138, 43, 226, 0.6);
		border: 1px solid rgba(138, 43, 226, 0.8);
		color: white;
		padding: 12px 30px;
		border-radius: 8px;
		font-family: 'Cinzel', serif;
		font-size: 1.1rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.error-btn:hover {
		background: rgba(138, 43, 226, 0.8);
		transform: translateY(-2px);
	}
</style>
