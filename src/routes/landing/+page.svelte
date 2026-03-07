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
        const slot = lu ? saveSlotsManager.getSlot(lu) : null;
        if (slot && slot.payload) {
          saveSlotsManager.loadFromSlot(lu);
          goto('/game');
        } else {
          // Cloud exists but all slots are empty — create a character
          goto('/guest');
        }
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
  let audioUnlocked = false;
  $: audioEnabled = $audioSettings?.enabled ?? true;
  $: bgmMultiplier = ($audioSettings?.bgmVolume ?? 50) / 100;

  // Only control play/pause after the user has interacted once (audioUnlocked).
  // Before that, the browser blocks autoplay on HTTPS anyway.
  $: if (audio && audioUnlocked) {
    audio.volume = audioEnabled ? 1.0 * bgmMultiplier : 0;
    if (!audioEnabled && !audio.paused) audio.pause();
    if (audioEnabled && audio.paused) audio.play().catch(() => {});
  } else if (audio) {
    audio.volume = audioEnabled ? 1.0 * bgmMultiplier : 0;
  }

  onMount(async () => {
    const { data } = await supabase.auth.getUser();
    user = data.user;
    authChecked = true;
    if (user) hasSave = saveSlotsManager.hasAnySaved();

    supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user ?? null;
    });

    let unlock;
    if (audio) {
      audio.volume = audioEnabled ? bgmMultiplier : 0;

      // Try autoplay — succeeds on some browsers/contexts
      audio.play().then(() => {
        audioUnlocked = true;
      }).catch(() => {
        // Blocked — wait for first user interaction
        unlock = () => {
          document.removeEventListener('click', unlock);
          document.removeEventListener('keydown', unlock);
          if (!audioEnabled) { audioUnlocked = true; return; }
          audio.play().then(() => { audioUnlocked = true; }).catch(() => {});
        };
        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
      });
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
      if (unlock) {
        document.removeEventListener('click', unlock);
        document.removeEventListener('keydown', unlock);
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
    left: 1rem;
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
