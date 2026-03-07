<script>
	import { createEventDispatcher } from 'svelte';
	import { personalityTraits } from '$lib/stores/gameState';

	const dispatch = createEventDispatcher();

	// Get traits directly from the store
	/** @type {number} */
	$: openness = ($personalityTraits || {}).O || 0;
	/** @type {number} */
	$: conscientiousness = ($personalityTraits || {}).C || 0;
	/** @type {number} */
	$: extraversion = ($personalityTraits || {}).E || 0;
	/** @type {number} */
	$: agreeableness = ($personalityTraits || {}).A || 0;
	/** @type {number} */
	$: neuroticism = ($personalityTraits || {}).N || 0;

	// For backward compatibility, also accept props
	export let traits = {
		openness: 0,
		conscientiousness: 0,
		extraversion: 0,
		agreeableness: 0,
		neuroticism: 0
	};

	// Use store values if available, otherwise use props
	/** @type {number} */
	$: finalOpenness = openness || traits.openness || 0;
	/** @type {number} */
	$: finalConscientiousness = conscientiousness || traits.conscientiousness || 0;
	/** @type {number} */
	$: finalExtraversion = extraversion || traits.extraversion || 0;
	/** @type {number} */
	$: finalAgreeableness = agreeableness || traits.agreeableness || 0;
	/** @type {number} */
	$: finalNeuroticism = neuroticism || traits.neuroticism || 0;

	function close() {
		dispatch('close');
	}

	// Trait descriptions for better UX
	const traitDescriptions = {
		openness:
			'Openness reflects imagination, curiosity, and openness to new experiences. High scores indicate creativity and broad interests.',
		conscientiousness:
			'Conscientiousness reflects organization, responsibility, and self-discipline. High scores indicate reliability and goal-directed behavior.',
		extraversion:
			'Extraversion reflects sociability, assertiveness, and energy. High scores indicate outgoing and energetic behavior.',
		agreeableness:
			'Agreeableness reflects compassion, cooperation, and trust. High scores indicate kindness and helpfulness toward others.',
		neuroticism:
			'Neuroticism reflects emotional stability and resilience. High scores indicate sensitivity to stress and emotional reactivity.'
	};
</script>

<div class="traits-backdrop" role="dialog" aria-modal="true" on:click={close}>
	<div class="traits-modal" on:click|stopPropagation>
		<header class="traits-header">
			<h3>Personality Traits</h3>
			<button class="close-btn" aria-label="Close" on:click={close}>✕</button>
		</header>

		<div class="traits-content">
			<p class="traits-intro">
				Your personality traits are shaped by the choices you've made throughout your journey. These
				traits influence various aspects of gameplay and character development.
			</p>

			<div class="traits-grid">
				<div class="trait-item">
					<div class="trait-header">
						<h4>Openness</h4>
						<span class="trait-score">{finalOpenness}</span>
					</div>
					<p class="trait-description">{traitDescriptions.openness}</p>
				</div>

				<div class="trait-item">
					<div class="trait-header">
						<h4>Conscientiousness</h4>
						<span class="trait-score">{finalConscientiousness}</span>
					</div>
					<p class="trait-description">{traitDescriptions.conscientiousness}</p>
				</div>

				<div class="trait-item">
					<div class="trait-header">
						<h4>Extraversion</h4>
						<span class="trait-score">{finalExtraversion}</span>
					</div>
					<p class="trait-description">{traitDescriptions.extraversion}</p>
				</div>

				<div class="trait-item">
					<div class="trait-header">
						<h4>Agreeableness</h4>
						<span class="trait-score">{finalAgreeableness}</span>
					</div>
					<p class="trait-description">{traitDescriptions.agreeableness}</p>
				</div>

				<div class="trait-item">
					<div class="trait-header">
						<h4>Neuroticism</h4>
						<span class="trait-score">{finalNeuroticism}</span>
					</div>
					<p class="trait-description">{traitDescriptions.neuroticism}</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.traits-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.75);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1500;
		backdrop-filter: blur(4px);
	}

	.traits-modal {
		width: min(600px, 90vw);
		max-height: 80vh;
		background: linear-gradient(180deg, #0f1724 0%, #071029 100%);
		border-radius: 12px;
		box-shadow:
			0 22px 60px rgba(2, 8, 23, 0.75),
			0 4px 12px rgba(13, 38, 76, 0.12);
		overflow: hidden;
		color: #e8f0ff;
		font-family:
			system-ui,
			-apple-system,
			'Segoe UI',
			Roboto,
			'Helvetica Neue',
			Arial;
	}

	.traits-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		background: linear-gradient(90deg, rgba(155, 94, 255, 0.1), rgba(92, 160, 255, 0.1));
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.traits-header h3 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #e8f0ff;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: rgba(255, 255, 255, 0.8);
		font-size: 24px;
		cursor: pointer;
		padding: 4px;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}

	.traits-content {
		padding: 24px;
		overflow-y: auto;
		max-height: calc(80vh - 80px);
	}

	.traits-intro {
		margin: 0 0 24px 0;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.6;
		font-size: 0.95rem;
	}

	.traits-grid {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.trait-item {
		padding: 16px;
		background: rgba(255, 255, 255, 0.02);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.trait-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}

	.trait-header h4 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: #e8f0ff;
	}

	.trait-score {
		font-size: 1.5rem;
		font-weight: 700;
		color: #7b5cff;
		background: rgba(123, 92, 255, 0.1);
		padding: 4px 12px;
		border-radius: 20px;
		min-width: 50px;
		text-align: center;
	}

	.trait-description {
		margin: 0;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.5;
		font-size: 0.9rem;
	}

	@media (max-width: 640px) {
		.traits-modal {
			width: 95vw;
			margin: 10px;
		}

		.traits-header {
			padding: 16px 20px;
		}

		.traits-content {
			padding: 20px;
		}

		.trait-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}

		.trait-score {
			align-self: flex-end;
		}
	}
</style>
