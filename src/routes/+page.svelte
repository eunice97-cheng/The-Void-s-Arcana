<script>
  import { goto } from '$app/navigation';
  import GeminiDesign from '$lib/components/GeminiDesign.svelte';
  import { onMount } from 'svelte';
  import { audioSettings } from '$lib/stores/gameState';

  function handlePrimary() {
    goto('/prelude');
  }

  function handleLogin() {
    goto('/login');
  }

  function handleRegister() {
    goto('/register');
  }

  let audio;
  $: bgmMultiplier = ($audioSettings?.bgmVolume ?? 50) / 100;
  $: if (audio) {
      audio.volume = 1.0 * bgmMultiplier;
  }

  onMount(() => {
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
        // Clear source to prevent lingering downloads
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

<GeminiDesign
  on:login={handleLogin}
  on:primary={handlePrimary}
  on:register={handleRegister}
  showSpinner={true}
  enableLogin={true}
  enableRegister={true}
/> 

