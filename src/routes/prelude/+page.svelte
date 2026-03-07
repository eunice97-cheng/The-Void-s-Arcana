<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { audioSettings } from '$lib/stores/gameState';
	import MusicToggle from '$lib/components/ui/MusicToggle.svelte';
	import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';

	let currentPage = 1;
	const totalPages = 4;
	let showSpinner = true;

	const pages = [1, 2, 3, 4];
	let audio;

	$: audioEnabled = $audioSettings?.enabled ?? true;
	$: bgmMultiplier = ($audioSettings?.bgmVolume ?? 50) / 100;
	$: sfxMultiplier = ($audioSettings?.sfxVolume ?? 50) / 100;

	$: if (audio) {
		audio.volume = audioEnabled ? 1.0 * bgmMultiplier : 0;
		if (audioEnabled && audio.paused) audio.play().catch(() => {});
		if (!audioEnabled && !audio.paused) audio.pause();
	}

	onMount(() => {
		animateTextOnPage(1);
		setTimeout(() => (showSpinner = false), 900);

		let handleInteraction;

		if (audio) {
			audio.volume = 1.0 * bgmMultiplier;

			const playAudio = () => {
				audio.play().catch(() => {});
			};

			playAudio();

			// Fallback: browsers block autoplay on HTTPS until user interaction
			handleInteraction = () => {
				playAudio();
				document.removeEventListener('click', handleInteraction);
				document.removeEventListener('keydown', handleInteraction);
			};
			document.addEventListener('click', handleInteraction);
			document.addEventListener('keydown', handleInteraction);
		}

		return () => {
			if (audio) {
				audio.pause();
				audio.currentTime = 0;
			}
			if (handleInteraction) {
				document.removeEventListener('click', handleInteraction);
				document.removeEventListener('keydown', handleInteraction);
			}
		};
	});

	/** @param {number} pageNumber */
	function showPage(pageNumber) {
		currentPage = pageNumber;
		animateTextOnPage(pageNumber);
	}

	/** @param {number} pageNumber */
	function animateTextOnPage(pageNumber) {
		// CSS handles the animations
	}

	function navigateBack() {
		playClickSound();
		if (currentPage === 1) {
			goto('/');
		} else {
			showPage(currentPage - 1);
		}
	}

	function navigateContinue() {
		playClickSound();
		if (currentPage < totalPages) {
			showPage(currentPage + 1);
		} else {
			goto('/landing');
		}
	}

	function playClickSound() {
		const audio = new Audio('/Audio/clicking.mp3');
		audio.volume = 1.0 * sfxMultiplier;
		audio.play().catch(() => {});
	}

	// audio is handled globally via MusicToggle (gameState / audioSettings)
</script>

<div id="prelude-container">
	<audio bind:this={audio} loop preload="none" controlsList="nodownload" on:contextmenu|preventDefault>
		<source src="/Audio/Mystery.mp3" type="audio/mpeg" />
	</audio>

	<div id="prelude-background"></div>

	<div id="top-right-ui">
		<MusicToggle />
	</div>

	<LoadingSpinner visible={showSpinner} />

	<div id="story-container">
		<!-- Page 1 -->
		<div class="story-page {currentPage === 1 ? 'active' : ''}">
			<h2 class="story-title">The Prelude</h2>
			<div class="story-text">
				<p>Welcome, Adventurer, to the Land of Ashen Hearth.</p>
				<p>
					Once, our world knew an age of golden light and whispered legends. Now, we live in the
					long shadow it left behind.
				</p>
				<p>
					From the desolate, wind-scarred reaches of the far north, a blight was born—a silent,
					creeping darkness that twisted the very soul of the land.
				</p>
			</div>
		</div>

		<!-- Page 2 -->
		<div class="story-page {currentPage === 2 ? 'active' : ''}">
			<h2 class="story-title">The Blight</h2>
			<div class="story-text">
				<p>
					It did not march with armies, but seeped into the soil and the spirit, a corrupting tide
					that turned beast into monster and man into puppet.
				</p>
				<p>The earth withered where it walked, and hope itself grew faint.</p>
				<p>
					This primordial evil, this unspeakable hunger from a place we now dare only name in hushed
					tones—the Umbral Cradle—sought to devour all of Ashen Hearth.
				</p>
			</div>
		</div>

		<!-- Page 3 -->
		<div class="story-page {currentPage === 3 ? 'active' : ''}">
			<h2 class="story-title">The Sacrifice</h2>
			<div class="story-text">
				<p>
					In that desperate hour, heroes of forgotten names rose. They fought not for glory, but for
					embers in the overwhelming night.
				</p>
				<p>
					Their sacrifice was absolute, a price paid in blood and memory, and with their final
					breath, they cast the darkness back into its slumber.
				</p>
				<p>The land began to heal, and for generations, the horrors faded into myth.</p>
			</div>
		</div>

		<!-- Page 4 -->
		<div class="story-page {currentPage === 4 ? 'active' : ''}">
			<h2 class="story-title">The Awakening</h2>
			<div class="story-text">
				<p>But legends have a way of forgetting their own truth.</p>
				<p>
					The darkness was never destroyed. It was merely… waiting. Patient. Festering in the deep,
					silent places of the world.
				</p>
				<p>
					Now, a new chill grips the air. The shadows lengthen with malicious intent, and the
					corrupted once again stir in the wilds. The Umbral Cradle stirs from its long repose, its
					ancient malice reaching out once more to engulf Ashen Hearth in a final, eternal terror.
				</p>
			</div>
		</div>
	</div>

	<!-- Page Indicators -->
	<div id="page-indicators">
		{#each pages as page (page)}
			<button
				class="page-dot {currentPage === page ? 'active' : ''}"
				on:click={() => {
					playClickSound();
					showPage(page);
				}}
				aria-label="Go to page {page}"
				type="button"
			></button>
		{/each}
	</div>

	<div id="navigation">
		<button class="nav-btn" on:click={navigateBack}>
			<i class="fas fa-arrow-left"></i>
			Back
		</button>

		<button class="nav-btn" on:click={navigateContinue}>
			{#if currentPage === totalPages}
				Begin Journey
				<i class="fas fa-play"></i>
			{:else}
				Continue
				<i class="fas fa-arrow-right"></i>
			{/if}
		</button>
	</div>
</div>

<style>
	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: 'Cinzel', serif;
		background: #000;
		color: #fff;
		height: 100vh;
		overflow: hidden;
		margin: 0;
		padding: 0;
	}

	#prelude-container {
		position: relative;
		width: 100%;
		height: 100vh;
		background:
			radial-gradient(circle at 20% 50%, rgba(40, 10, 80, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 80% 20%, rgba(10, 30, 70, 0.4) 0%, transparent 50%),
			radial-gradient(circle at 40% 80%, rgba(70, 10, 40, 0.4) 0%, transparent 50%), #0a0a1a;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}

	#prelude-background {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image: url('/Images/Arcana.jpg');
		background-size: cover;
		background-position: center;
		opacity: 0.6;
		z-index: 1;
	}

	#top-right-ui {
		position: absolute;
		top: 10px;
		right: 10px;
		display: flex;
		gap: 10px;
		z-index: 10;
	}

	#story-container {
		position: relative;
		z-index: 3;
		width: 80%;
		max-width: 800px;
		height: 60%;
		background: rgba(30, 30, 46, 0.85);
		border: 2px solid rgba(138, 43, 226, 0.5);
		border-radius: 15px;
		padding: 40px;
		overflow-y: auto;
		box-shadow: 0 0 30px rgba(138, 43, 226, 0.3);
	}

	.story-page {
		display: none;
		opacity: 0;
		transform: translateY(20px);
		animation: fadeInUp 1s forwards;
	}

	.story-page.active {
		display: block;
	}

	@keyframes fadeInUp {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.story-title {
		font-size: 2.5rem;
		text-align: center;
		margin-bottom: 30px;
		color: #b19cd9;
		text-shadow: 0 0 10px rgba(138, 43, 226, 0.5);
	}

	.story-text {
		font-size: 1.3rem;
		line-height: 1.8;
		text-align: justify;
		font-family: 'MedievalSharp', cursive;
		color: #e6e6fa;
		text-align: center;
	}

	.story-text p {
		margin-bottom: 20px;
		opacity: 0;
		animation: textReveal 1s forwards;
		animation-delay: calc(var(--paragraph-index) * 0.5s);
	}

	@keyframes textReveal {
		to {
			opacity: 1;
		}
	}

	#navigation {
		position: absolute;
		bottom: 20px;
		width: 100%;
		display: flex;
		justify-content: space-between;
		padding: 0 50px;
		z-index: 10;
	}

	.nav-btn {
		background: rgba(30, 30, 46, 0.95);
		border: 2px solid rgba(138, 43, 226, 0.5);
		color: white;
		padding: 12px 30px;
		font-size: 1.1rem;
		font-family: 'Cinzel', serif;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.3s ease;
		opacity: 0;
		animation: buttonAppear 1s forwards 2s;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.nav-btn:hover {
		background: rgba(138, 43, 226, 0.2);
		box-shadow: 0 0 15px rgba(138, 43, 226, 0.5);
		transform: translateY(-2px);
	}

	@keyframes buttonAppear {
		to {
			opacity: 1;
		}
	}

	#page-indicators {
		position: absolute;
		bottom: 80px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 10px;
		z-index: 10;
	}

	.page-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.3);
		border: 1px solid rgba(138, 43, 226, 0.5);
		transition: all 0.3s ease;
		cursor: pointer;
	}

	.page-dot.active {
		background: rgba(138, 43, 226, 0.8);
		box-shadow: 0 0 10px rgba(138, 43, 226, 0.7);
	}

	#story-container::-webkit-scrollbar {
		width: 8px;
	}

	#story-container::-webkit-scrollbar-track {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}

	#story-container::-webkit-scrollbar-thumb {
		background: rgba(138, 43, 226, 0.5);
		border-radius: 4px;
	}

	#story-container::-webkit-scrollbar-thumb:hover {
		background: rgba(138, 43, 226, 0.7);
	}

	@media (max-width: 768px) {
		#story-container {
			width: 90%;
			padding: 30px;
			height: 65%;
		}

		.story-title {
			font-size: 2rem;
		}

		.story-text {
			font-size: 1.1rem;
		}

		#navigation {
			padding: 0 20px;
		}

		.nav-btn {
			padding: 10px 20px;
			font-size: 1rem;
		}
	}

	@media (max-width: 480px) {
		#story-container {
			width: 95%;
			padding: 20px;
			height: 70%;
		}

		.story-title {
			font-size: 1.8rem;
		}

		.story-text {
			font-size: 1rem;
		}

		#top-right-ui {
			top: 5px;
			right: 5px;
		}

		/* icon-btn styles were moved to component-specific styles (MusicToggle) */
	}
</style>
