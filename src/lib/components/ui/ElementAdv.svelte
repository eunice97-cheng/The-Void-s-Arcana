<script>
  import { onMount, onDestroy } from 'svelte';
  import { gameState, audioSettings } from '$lib/stores/gameState';

  let visible = false;
  let baseIcon = '';
  let advIcon = '';
  let elName = '';
  let advName = '';
  let currentName = '';
  let videoSrc = '';
  let isAdvanced = true;
  let showVideo = false;

  $: sfxMultiplier = ($audioSettings?.sfxVolume ?? 50) / 100;

  $: if (videoElement) {
    const enabled = $gameState.audioEnabled;
    const vol = enabled ? sfxMultiplier : 0;
    videoElement.volume = vol;
  }

  // image currently shown: 'base' or 'adv'
  let shown = 'base';

  let timers = [];

  function clearTimers() {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  }

  let videoElement;

  function handleEvent(e) {
    try {
      const d = e && e.detail ? e.detail : {};
      baseIcon = d.baseIcon || '';
      advIcon = d.advIcon || '';
      elName = d.name || '';
      advName = d.advName || (elName + ' Ascendant');
      videoSrc = d.video || '';
      isAdvanced = d.isAdvanced !== false; // default to true if not specified
      
      currentName = elName;
      shown = 'base';
      visible = true;
      clearTimers();

      if (videoSrc) {
        showVideo = true;
        // Attempt to play after render
        setTimeout(() => {
          if (videoElement) {
            // Volume handled by reactive statement
            videoElement.play().catch(err => {
              console.warn('Video autoplay failed:', err);
              // If autoplay fails (e.g. due to audio), try muting
              videoElement.muted = true;
              videoElement.play().catch(e2 => console.error('Muted autoplay also failed', e2));
            });
          }
        }, 50);
      } else {
        showVideo = false;
        startAnimationSequence();
      }
    } catch (err) {
      console.warn('ElementAdv handler error', err);
    }
  }

  function onVideoEnded() {
    showVideo = false;
    startAnimationSequence();
  }

  function startAnimationSequence() {
    if (isAdvanced) {
      // Existing sequence for Advanced element
      shown = 'base';
      
      // show base for a longer moment, then animate to adv
      timers.push(setTimeout(() => {
        // start swap animation
        shown = 'swapping';
        currentName = advName;
      }, 1000)); // Reduced from 4000 since video played before

      // after swap animation, show adv image
      timers.push(setTimeout(() => {
        shown = 'adv';
        // dispatch a toast now that the advanced form is visible
        try {
          if (advName && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('toast', { detail: { message: `You have learned ${advName}!`, type: 'success' } }));
        } catch (e) {
          console.warn('Failed to dispatch toast from ElementAdv', e);
        }
      }, 2200)); // Adjusted timing

      // then hide
      timers.push(setTimeout(() => {
        visible = false;
        shown = 'base';
        baseIcon = '';
        advIcon = '';
        elName = '';
        currentName = '';
      }, 9000));
    } else {
      // Sequence for Base element (just show base card briefly then hide)
      shown = 'base';
      
      timers.push(setTimeout(() => {
        visible = false;
        shown = 'base';
        baseIcon = '';
        advIcon = '';
        elName = '';
        currentName = '';
      }, 4000));
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('element-adv', handleEvent);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('element-adv', handleEvent);
    }
    clearTimers();
  });
</script>

{#if visible}
  <div class="element-adv-overlay" aria-hidden="true" on:click={() => visible = false}>
    {#if showVideo}
      <div class="video-container">
        {#key videoSrc}
          <!-- svelte-ignore a11y-media-has-caption -->
          <video 
            bind:this={videoElement}
            src={videoSrc}
            autoplay 
            controls
            preload="none"
            controlsList="nodownload"
            on:contextmenu|preventDefault
            on:ended={onVideoEnded} 
            on:error={(e) => console.error('Video playback error:', e, videoSrc)}
            class="summon-video"
          >
            Your browser does not support the video tag.
          </video>
        {/key}
      </div>
    {:else}
      <div class="card">
        <div class="label">{currentName}</div>
        <div class="image-wrap {shown}">
          {#if shown === 'base' || shown === 'swapping'}
            <img src={baseIcon} alt="{elName} base" class="base-image" />
          {/if}
          {#if shown === 'swapping' || shown === 'adv'}
            <img src={advIcon} alt="{elName} advanced" class="adv-image" />
          {/if}
          {#if shown === 'adv' && $gameState.character?.class === 'mage' && $gameState.character?.avatar}
            <div class="player-badge">
              <img src={$gameState.character.avatar} alt="Player avatar" />
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .element-adv-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto; /* Allow clicks */
    z-index: 9999;
    background: rgba(0, 0, 0, 0.8); /* Darker background for video */
  }

  .video-container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .summon-video {
    max-width: 90%;
    max-height: 90%;
    box-shadow: 0 0 50px rgba(0,0,0,0.8);
    border-radius: 8px;
  }

  .card {
    background: rgba(30, 30, 46, 0.95);
    border-radius: 12px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    box-shadow: 0 8px 30px rgba(0,0,0,0.6);
    backdrop-filter: blur(6px) saturate(120%);
  }

  .label {
    color: #fff;
    font-weight: 700;
    margin-bottom: 8px;
    text-shadow: 0 2px 6px rgba(0,0,0,0.6);
  }

  .image-wrap {
    width: 400px;
    height: 400px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .image-wrap img {
    max-width: 100%;
    max-height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    transition: transform 800ms ease, opacity 800ms ease, filter 800ms ease;
    will-change: transform, opacity;
  }

  .image-wrap.base .base-image {
    opacity: 1;
    transform: scale(1);
  }
  .image-wrap.base .adv-image { opacity: 0; transform: scale(0.8); }

  .image-wrap.swapping .base-image {
    opacity: 0;
    transform: scale(0.8);
  }
  .image-wrap.swapping .adv-image {
    animation: ascend 1200ms ease-in-out;
  }

  @keyframes ascend {
    0% { transform: scale(0.3) rotateY(-90deg); opacity: 0; filter: blur(10px) brightness(0.2) saturate(0.5); }
    50% { transform: scale(1.4) rotateY(0deg); opacity: 0.8; filter: blur(2px) brightness(0.8) saturate(1.5); }
    100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 12px 24px rgba(0,0,0,0.8)) hue-rotate(15deg) saturate(150%) brightness(1.2); }
  }

  .image-wrap.adv .adv-image {
    opacity: 1;
    transform: scale(1);
    filter: drop-shadow(0 12px 24px rgba(0,0,0,0.8)) hue-rotate(15deg) saturate(150%) brightness(1.2);
  }
  .image-wrap.adv .base-image { opacity: 0; transform: scale(0.8); }

  .player-badge {
    position: absolute;
    bottom: 10px;
    right: 10px;
    width: 32px;
    height: 32px;
    clip-path: circle(50% at center);
    background-size: cover;
    background-position: center;
    border: 4px solid #a855f7;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
    z-index: 10;
  }

  .player-badge img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    clip-path: circle(50% at center);
  }
  .card {
    animation: popIn 500ms cubic-bezier(.2,.9,.2,1);
  }

  @keyframes popIn {
    0% { transform: scale(0.5); opacity: 0; filter: blur(10px) }
    50% { transform: scale(1.1); opacity: 1; filter: blur(2px) }
    100% { transform: scale(1); opacity: 1; filter: blur(0px) }
  }
</style>
