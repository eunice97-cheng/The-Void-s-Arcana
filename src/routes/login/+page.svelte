<script>
  // @ts-nocheck
  import { supabase } from '$lib/supabaseClient';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { saveSlotsManager } from '$lib/stores/saveSlotsManager';

  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  onMount(async () => {
    // Already logged in → skip to game
    const { data } = await supabase.auth.getUser();
    if (data.user) goto('/prelude');
  });

  async function handleLogin() {
    if (!email || !password) { error = 'Please fill in all fields.'; return; }
    loading = true;
    error = '';
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) { error = authErr.message; loading = false; return; }

    // Try to restore cloud save into local storage
    const result = await saveSlotsManager.downloadFromCloud();
    loading = false;
    if (result.success) {
      // Cloud save found — go to game (SaveSlotsModal will let them pick a slot)
      goto('/game');
    } else {
      // No cloud save yet — start fresh
      goto('/prelude');
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') handleLogin();
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Lato:wght@300;400&display=swap" rel="stylesheet" />
</svelte:head>

<div class="bg-container"><div class="bg-image"></div></div>
<div class="vignette"></div>

<div class="page">
  <header>
    <a href="/" class="back-link">← Back</a>
    <h1>THE VOID'S ARCANA</h1>
    <p class="subtitle">Sign In</p>
  </header>

  <div class="card">
    <div class="field">
      <label for="email">Email</label>
      <input id="email" type="email" bind:value={email} placeholder="your@email.com" on:keydown={handleKeydown} disabled={loading} />
    </div>
    <div class="field">
      <label for="password">Password</label>
      <input id="password" type="password" bind:value={password} placeholder="••••••••" on:keydown={handleKeydown} disabled={loading} />
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <button class="btn-primary" on:click={handleLogin} disabled={loading}>
      {loading ? 'Signing in…' : 'Enter the Void'}
    </button>

    <p class="footer-link">
      New adventurer? <a href="/register">Create an account</a>
    </p>
  </div>
</div>

<style>
  :global(body) { overflow: hidden; background: #05010a; font-family: 'Cinzel', serif; color: white; height: 100vh; margin: 0; }

  .bg-container { position: fixed; inset: 0; z-index: -2; }
  .bg-image { width: 100%; height: 100%; background: url('/Images/cover.png') no-repeat center center / cover; animation: breathe 20s infinite alternate ease-in-out; }
  .vignette { position: fixed; inset: 0; z-index: -1; background: radial-gradient(circle at center, transparent 20%, #000 100%); pointer-events: none; }

  .page {
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    padding: 2rem;
  }

  header { text-align: center; position: relative; }
  .back-link {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: -2.5rem;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.5);
    text-decoration: none;
    letter-spacing: 0.1em;
    transition: color 0.2s;
  }
  .back-link:hover { color: #aeeeff; }

  h1 {
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-shadow: 0 0 10px #b8aaff, 0 0 30px #2a0a3a;
    margin: 0 0 0.25rem;
  }
  .subtitle {
    font-family: 'Lato', sans-serif;
    font-weight: 300;
    font-size: 1rem;
    color: rgba(255,255,255,0.6);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin: 0;
  }

  .card {
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(184, 170, 255, 0.25);
    border-radius: 4px;
    padding: 2rem;
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    backdrop-filter: blur(8px);
    box-shadow: 0 0 40px rgba(42, 10, 58, 0.6);
  }

  .field { display: flex; flex-direction: column; gap: 0.4rem; }
  label { font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.5); }
  input {
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 2px;
    color: white;
    padding: 0.6rem 0.75rem;
    font-family: 'Lato', sans-serif;
    font-size: 0.95rem;
    transition: border-color 0.2s;
    outline: none;
  }
  input:focus { border-color: #b8aaff; box-shadow: 0 0 8px rgba(184,170,255,0.2); }
  input:disabled { opacity: 0.5; cursor: not-allowed; }

  .error {
    font-family: 'Lato', sans-serif;
    font-size: 0.85rem;
    color: #ff6b6b;
    margin: 0;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 50, 50, 0.1);
    border-left: 2px solid #ff6b6b;
    border-radius: 2px;
  }

  .btn-primary {
    font-family: 'Cinzel', serif;
    font-weight: 700;
    font-size: 0.9rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: white;
    background: rgba(42, 10, 58, 0.8);
    border: 1px solid #b8aaff;
    border-radius: 2px;
    padding: 0.75rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 0 15px rgba(160,32,240,0.2);
  }
  .btn-primary:hover:not(:disabled) {
    background: #2a0a3a;
    box-shadow: 0 0 25px #b8aaff, inset 0 0 20px rgba(42,10,58,0.5);
    border-color: white;
  }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .footer-link {
    font-family: 'Lato', sans-serif;
    font-size: 0.85rem;
    color: rgba(255,255,255,0.4);
    text-align: center;
    margin: 0;
  }
  .footer-link a { color: #aeeeff; text-decoration: none; }
  .footer-link a:hover { text-decoration: underline; }

  @keyframes breathe { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }

  @media (max-width: 480px) {
    h1 { font-size: 1.8rem; }
    .card { padding: 1.5rem; }
  }
</style>
