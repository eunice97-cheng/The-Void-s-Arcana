<script>
  import { supabase } from '$lib/supabaseClient';
  import { saveSlotsManager } from '$lib/stores/saveSlotsManager';
  import { onMount } from 'svelte';

  let loading = false;
  let email = '';
  let password = '';
  let user = null;
  let message = '';
  let isError = false;

  onMount(async () => {
    const { data } = await supabase.auth.getUser();
    user = data.user;
    
    supabase.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
    });
  });

  const handleLogin = async () => {
    try {
      loading = true;
      message = '';
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      message = 'Logged in successfully!';
      isError = false;
    } catch (error) {
      message = error.message;
      isError = true;
    } finally {
      loading = false;
    }
  };

  const handleSignUp = async () => {
    try {
      loading = true;
      message = '';
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      message = 'Check your email for the confirmation link!';
      isError = false;
    } catch (error) {
      message = error.message;
      isError = true;
    } finally {
      loading = false;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    message = 'Logged out.';
    isError = false;
  };

  const handleUpload = async () => {
      loading = true;
      message = 'Uploading...';
      const res = await saveSlotsManager.uploadToCloud();
      loading = false;
      if (res.success) {
          message = 'Upload successful!';
          isError = false;
      } else {
          message = 'Upload failed: ' + res.error;
          isError = true;
      }
  };

  const handleDownload = async () => {
      if (!confirm('This will overwrite your local saves with the cloud version. Are you sure?')) return;
      loading = true;
      message = 'Downloading...';
      const res = await saveSlotsManager.downloadFromCloud();
      loading = false;
      if (res.success) {
          message = 'Download successful! Reloading...';
          isError = false;
          setTimeout(() => window.location.reload(), 1000);
      } else {
          message = 'Download failed: ' + res.error;
          isError = true;
      }
  };
</script>

<div class="auth-panel">
  <h3>Cloud Sync</h3>
  
  {#if user}
    <div class="logged-in">
      <p>Signed in as: <strong>{user.email}</strong></p>
      <div class="btn-group" style="margin-bottom: 0.5rem;">
        <button class="btn-primary" on:click={handleUpload} disabled={loading}>Upload</button>
        <button class="btn-primary" on:click={handleDownload} disabled={loading}>Download</button>
        <button class="btn-secondary" on:click={handleLogout} disabled={loading}>Sign Out</button>
      </div>
    </div>
  {:else}
    <div class="login-form">
      <p class="hint">Sign in to sync your saves across devices.</p>
      <div class="input-group">
        <input type="email" placeholder="Email" bind:value={email} />
        <input type="password" placeholder="Password" bind:value={password} />
      </div>
      <div class="btn-group">
        <button class="btn-primary" on:click={handleLogin} disabled={loading}>
          {loading ? '...' : 'Login'}
        </button>
        <button class="btn-secondary" on:click={handleSignUp} disabled={loading}>
          Sign Up
        </button>
      </div>
    </div>
  {/if}

  {#if message}
    <p class="message" class:error={isError}>{message}</p>
  {/if}
</div>

<style>
  .auth-panel {
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    margin-bottom: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #efe9ee; /* ensure readable text on dark modal background */
  }
  h3 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-size: 1.1rem;
    color: #ffd700;
  }
  .hint {
    font-size: 0.8rem;
    color: #aaa;
    margin-bottom: 0.5rem;
  }
  .auth-panel p { color: #efe9ee; }
  .auth-panel .logged-in strong { color: #ffffff; }
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  input {
    padding: 0.4rem;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #555;
    color: white;
    border-radius: 3px;
  }
  .btn-group {
    display: flex;
    gap: 0.5rem;
  }
  button {
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    border: none;
    border-radius: 3px;
    font-weight: bold;
  }
  .btn-primary {
    background: #4a90e2;
    color: white;
  }
  .btn-secondary {
    background: #555;
    color: white;
  }
  .message {
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: #4caf50;
  }
  .message.error {
    color: #f44336;
  }
</style>
