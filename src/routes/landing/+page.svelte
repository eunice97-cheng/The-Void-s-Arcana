<script>
  import { goto } from '$app/navigation';
  import GeminiDesign from '$lib/components/GeminiDesign.svelte';
  import { onMount } from 'svelte';
  import { audioSettings } from '$lib/stores/gameState';
  import { supabase } from '$lib/supabaseClient';
  import { saveSlotsManager } from '$lib/stores/saveSlotsManager';

  let user = null;
  let authChecked = false;
  let hasSave = false;
  let loadingGame = false;

  $: isLoggedIn = !!user;
  $: primaryLabel = loadingGame
    ? 'Loading…'
    : isLoggedIn
      ? hasSave ? 'Continue Adventure' : 'Start New Adventure'
      : 'Play as Guest';

  async function handlePrimary() {
    if (isLoggedIn) {
      loadingGame = true;
      // Try local save first
      const lastUsed = saveSlotsManager.getLastUsed();
      if (lastUsed) {
        const slot = saveSlotsManager.getSlot(lastUsed);
        if (slot && slot.payload) {
          saveSlotsManager.loadFromSlot(lastUsed);
          goto('/game');
          return;
        }
      }
      // No local save — try cloud
      const result = await saveSlotsManager.downloadFromCloud();
      if (result.success) {
        const lu = saveSlotsManager.getLastUsed();
        if (lu) saveSlotsManager.loadFromSlot(lu);
        goto('/game');
      } else {
        // New account with no save — create a character
        goto('/guest');
      }
      loadingGame = false;
    } else {
      goto('/guest');
    }
  }

  function handleLogin() {
    goto('/login');
  }

  function handleRegister() {
    goto('/register');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    user = null;
  }

  let audio;
  $: bgmMultiplier = ($audioSettings?.bgmVolume ?? 50) / 100;
  $: if (audio) {
      audio.volume = 1.0 * bgmMultiplier;
  }

  onMount(async () => {
    const { data } = await supabase.auth.getUser();
    user = data.user;
    authChecked = true;
    if (user) hasSave = saveSlotsManager.hasAnySaved();

    supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
    });

    let handleInteraction;
    if (audio) {
      audio.volume = 1.0 * bgmMultiplier;

      const playAudio = () => {
        audio.play().catch((e) => {
          console.warn('Autoplay prevented, waiting for interaction', e);
        });
      };

      playAudio();

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
        const source = audio.querySelector('source');
        if (source) source.removeAttribute('src');
        audio.removeAttribute('src');
        audio.load();
      }
      if (handleInteraction) {
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
      }
    };
  });
</script>

<audio bind:this={audio} loop preload="none" controlsList="nodownload" on:contextmenu|preventDefault>
  <source src="/Audio/Thunder.mp3" type="audio/mpeg" />
</audio>

{#if authChecked}
  {#if isLoggedIn}
    <GeminiDesign
      primaryLabel={primaryLabel}
      on:primary={handlePrimary}
      showSpinner={false}
      enableLogin={false}
      enableRegister={false}
    />
    <div class="user-bar">
      <span>Signed in as <strong>{user.email}</strong></span>
      <button on:click={handleLogout}>Sign Out</button>
    </div>
  {:else}
    <GeminiDesign
      primaryLabel={primaryLabel}
      on:login={handleLogin}
      on:primary={handlePrimary}
      on:register={handleRegister}
      showSpinner={true}
      enableLogin={true}
      enableRegister={true}
    />
  {/if}
{/if}

<style>
  .user-bar {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(184, 170, 255, 0.3);
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-family: 'Cinzel', serif;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(6px);
  }
  .user-bar strong {
    color: #aeeeff;
  }
  .user-bar button {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    font-family: 'Cinzel', serif;
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    padding: 0.25rem 0.6rem;
    transition: all 0.2s;
  }
  .user-bar button:hover {
    color: white;
    border-color: #b8aaff;
  }
</style>
