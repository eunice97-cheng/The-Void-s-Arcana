<script>
// @ts-nocheck
  import { gameState } from '$lib/stores/gameState';
  import { onDestroy } from 'svelte';
  let snap;
  const unsub = gameState.subscribe((v) => (snap = v));
  import { onMount } from 'svelte';
  onDestroy(() => unsub());

  function getExpires() {
    const mb = snap?.character?.activeBuffs?.magicBarrier;
    if (!mb) return null;
    return mb.expires ?? mb.expiresAt ?? null;
  }
  function getCooldown() {
    return snap?.character?.skillCooldowns?.mage_magic_barrier || 0;
  }

  let expires = null;
  let now = Date.now();
  let buffRemaining = null;
  let cooldownRemaining = 0;
  let tickId = null;

  function refresh() {
    expires = getExpires();
    now = Date.now();
    buffRemaining = expires ? Math.max(0, Math.round((expires - now) / 1000)) : null;
    const cd = getCooldown();
    cooldownRemaining = cd ? Math.max(0, Math.round((cd - now) / 1000)) : 0;
  }

  onMount(() => {
    // update every second so countdowns stay accurate
    refresh();
    tickId = setInterval(refresh, 1000);
    return () => {
      if (tickId) clearInterval(tickId);
    };
  });
</script>

<style>
  .mb-hud {
    position: fixed;
    right: 16px;
    top: 16px;
    z-index: 2000;
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
  }
  .mb-card {
    background: rgba(6,16,24,0.7);
    border: 1px solid rgba(255,255,255,0.05);
    color: #dfeeff;
    padding: 6px 8px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    min-width: 120px;
    pointer-events: auto;
  }
  .mb-icon {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: linear-gradient(180deg,#7fd1b9,#5fbfa3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: #042023;
  }
  .mb-text { display:flex; flex-direction:column; }
  .mb-title { font-weight:700; font-size:12px; }
  .mb-sub { font-size:11px; color: #bfe9db; }
  .mb-muted { color: rgba(223,238,255,0.6); font-size:11px }
</style>

{#if snap?.character}
  {#if (buffRemaining !== null && buffRemaining > 0) || (cooldownRemaining && cooldownRemaining > 0)}
    <div class="mb-hud" role="status" aria-live="polite">
      <div class="mb-card">
        <div class="mb-icon">MB</div>
        <div class="mb-text">
          <div class="mb-title">Magic Barrier</div>
          {#if buffRemaining !== null && buffRemaining > 0}
            <div class="mb-sub">Active: {buffRemaining}s</div>
          {:else}
            <div class="mb-sub">Inactive</div>
          {/if}
          <div class="mb-muted">CD: {cooldownRemaining}s</div>
        </div>
      </div>
    </div>
  {/if}
{/if}
