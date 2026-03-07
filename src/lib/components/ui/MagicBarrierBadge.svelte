<script>
// @ts-nocheck
import { gameState } from '$lib/stores/gameState';
import { activeQuest } from '$lib/stores/questStore';
import { onDestroy, onMount } from 'svelte';
import skillsDb from '$lib/data/skills.json';

let snap;
let prevSnap = null;
const unsub = gameState.subscribe((v) => {
  const old = snap;
  snap = v;
  // ensure UI updates immediately when gameState changes
  try { refresh(); } catch (e) {}
  // detect buff or cooldown changes and flash the badge
  try {
    const oldExpires = old?.character?.activeBuffs?.magicBarrier?.expiresAt ?? old?.character?.activeBuffs?.magicBarrier?.expires ?? null;
    const newExpires = snap?.character?.activeBuffs?.magicBarrier?.expiresAt ?? snap?.character?.activeBuffs?.magicBarrier?.expires ?? null;
    const oldCd = old?.character?.skillCooldowns?.mage_magic_barrier || 0;
    const newCd = snap?.character?.skillCooldowns?.mage_magic_barrier || 0;
    if ((newExpires && newExpires !== oldExpires) || (newCd && newCd !== oldCd)) {
      flash = true;
      setTimeout(() => (flash = false), 1200);
    }
  } catch (e) {}
});
let aqSnap;
const unsubAq = activeQuest.subscribe((v) => (aqSnap = v));

onDestroy(() => {
  try { unsub(); } catch (e) {}
  try { unsubAq(); } catch (e) {}
});

function getExpires() {
  const mb = snap?.character?.activeBuffs?.magicBarrier;
  if (!mb) return null;
  return mb.expires ?? mb.expiresAt ?? null;
}
function getCooldownLastUsed() {
  return snap?.character?.skillCooldowns?.mage_magic_barrier || 0;
}

function getCooldownRemainingSeconds(nowTs = Date.now()) {
  const lastUsed = getCooldownLastUsed();
  if (!lastUsed) return 0;
  const meta = Array.isArray(skillsDb) ? skillsDb.find((s) => s.id === 'mage_magic_barrier') : null;
  const cdSeconds = meta && typeof meta.cooldownSeconds === 'number' ? meta.cooldownSeconds : 0;
  const elapsed = Math.max(0, Math.round((nowTs - lastUsed) / 1000));
  const remaining = Math.max(0, Math.round(cdSeconds - elapsed));
  return remaining;
}

let expires = null;
let now = Date.now();
let buffRemaining = null;
let cooldownRemaining = 0;
let tickId = null;
let flash = false;

function refresh() {
  expires = getExpires();
  now = Date.now();
  buffRemaining = expires ? Math.max(0, Math.round((expires - now) / 1000)) : null;
  cooldownRemaining = getCooldownRemainingSeconds(now);
}

onMount(() => {
  refresh();
  tickId = setInterval(refresh, 1000);

  function onCombatLog(ev) {
    try {
      const log = ev && ev.detail ? ev.detail : null;
      if (!log || typeof log !== 'object') return;
      const playerName = (snap && snap.character && snap.character.name) || 'Player';
      if (log.type === 'DEFENSE_RESULT' && log.actor === playerName && log.autoCast) {
        const ac = log.autoCast || {};
        if (ac.used || ac.applied) {
          refresh();
          flash = true;
          setTimeout(() => (flash = false), 1200);
        }
      }
      if (log.type === 'SKILL_CAST' && log.actor === playerName && log.detail) {
        refresh();
      }
    } catch (e) {}
  }

  if (typeof window !== 'undefined') window.addEventListener('combat:log', onCombatLog);

  return () => {
    if (tickId) clearInterval(tickId);
    if (typeof window !== 'undefined') window.removeEventListener('combat:log', onCombatLog);
  };
});
</script>

<style>
.mb-badge {
  display:flex;align-items:center;gap:8px;padding:6px;border-radius:8px;background:rgba(8,16,20,0.6);border:1px solid rgba(255,255,255,0.04);color:#dfeeff;font-size:12px;
}
.mb-icon { width:22px;height:22px;border-radius:6px;background:linear-gradient(180deg,#7fd1b9,#5fbfa3);display:flex;align-items:center;justify-content:center;font-weight:700;color:#042023 }
.mb-text { display:flex;flex-direction:column }
.mb-sub { font-size:11px;color:#cfeee2 }
.mb-muted { font-size:11px;color:rgba(223,238,255,0.6) }
.mb-badge.flash { box-shadow: 0 0 14px rgba(127,209,185,0.9); transform: translateY(-2px); transition: box-shadow 200ms ease, transform 120ms ease; }
</style>

{#if snap?.character}
  {#if flash || (aqSnap && aqSnap.status === 'in_progress') || (buffRemaining !== null && buffRemaining > 0) || (cooldownRemaining && cooldownRemaining > 0)}
    <div class="mb-badge {flash ? 'flash' : ''}" title={buffRemaining!==null && buffRemaining>0?`Magic Barrier active: ${buffRemaining}s`:'Magic Barrier inactive'}>
      <div class="mb-icon">MB</div>
      <div class="mb-text">
        <div>Magic Barrier</div>
        <div class="mb-sub">{buffRemaining!==null && buffRemaining>0?`Active ${buffRemaining}s`:'Inactive'}</div>
      </div>
      <div class="mb-muted">CD {cooldownRemaining}s</div>
    </div>
  {/if}
{/if}
