<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte';
  import { audioSettings } from '$lib/stores/gameState';
  import MusicToggle from '$lib/components/ui/MusicToggle.svelte';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { createEventDispatcher } from 'svelte';

  export let onLogin = () => {};
  export let onPrimary = () => {};
  export let onRegister = () => {};
  export let primaryLabel = 'Enter The Void';
  export let showSpinner = true;
  export let enableLogin = true;
  export let enableRegister = true;

  $: sfxMultiplier = ($audioSettings?.sfxVolume ?? 50) / 100;

  const dispatch = createEventDispatcher();

  // audio elements (from static/Audio)
  let sfxClick, sfxLevelUp, sfxNotAvailable, sfxStorm;

  function loadSfx() {
    try {
      sfxClick = new Audio('/Audio/clicking.mp3');
      sfxClick.preload = 'none';
      sfxClick.volume = 0.8;

      sfxLevelUp = new Audio('/Audio/LevelUp.mp3');
      sfxLevelUp.preload = 'none';
      sfxLevelUp.volume = 0.6;

      sfxNotAvailable = new Audio('/Audio/NotAvailable.mp3');
      sfxNotAvailable.preload = 'none';
      sfxNotAvailable.volume = 0.8;

      sfxStorm = new Audio('/Audio/QuestFail.mp3');
      sfxStorm.preload = 'none';
      sfxStorm.volume = 0.6;
    } catch (e) {
      console.warn('SFX load failed', e);
    }
  }

  let canvas;
  let stormOverlay;

  let particlesArray = [];
  let centerX = 0;
  let centerY = 0;

  function setDimensions() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
  }

  class WarpStreak {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      let dx = this.x - centerX;
      let dy = this.y - centerY;
      if (Math.sqrt(dx*dx + dy*dy) < 100) this.x = 0;
      this.prevX = this.x;
      this.prevY = this.y;
      this.speed = Math.random() * 2 + 1;
      this.acceleration = 1.02;
      this.size = Math.random() * 2 + 0.5;
      this.color = Math.random() > 0.5 ? `rgba(174, 238, 255, ${Math.random() * 0.5})` : `rgba(184, 170, 255, ${Math.random() * 0.5})`;
    }
    update() {
      this.prevX = this.x;
      this.prevY = this.y;
      let dx = centerX - this.x;
      let dy = centerY - this.y;
      let distance = Math.sqrt(dx*dx + dy*dy);
      let angle = Math.atan2(dy, dx);
      this.x += Math.cos(angle) * this.speed;
      this.y += Math.sin(angle) * this.speed;
      this.speed *= this.acceleration;
      if (distance < 50) this.resetAtEdge();
    }
    resetAtEdge() {
      if (Math.random() < 0.5) {
        this.x = Math.random() < 0.5 ? 0 : canvas.width;
        this.y = Math.random() * canvas.height;
      } else {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() < 0.5 ? 0 : canvas.height;
      }
      this.prevX = this.x;
      this.prevY = this.y;
      this.speed = Math.random() * 2 + 1;
    }
    draw(ctx) {
      ctx.beginPath();
      ctx.moveTo(this.prevX, this.prevY);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  let ctx;
  let animFrame;
  function initParticles() {
    particlesArray = [];
    let numberOfParticles = 150;
    for (let i = 0; i < numberOfParticles; i++) particlesArray.push(new WarpStreak());
  }

  function animate() {
    animFrame = requestAnimationFrame(animate);
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesArray.forEach(p => { p.update(); p.draw(ctx); });
  }

  let lightningTimer;
  function triggerLightning() {
    const intensity = (Math.random() * 0.3) + 0.1;
    const isCyan = Math.random() > 0.5;
    if (stormOverlay) {
      stormOverlay.style.backgroundColor = isCyan ? 'var(--rune-cyan)' : 'var(--arcane-glow)';
      stormOverlay.style.opacity = intensity;
      // do not play quest-fail/storm SFX here; lightning is visual-only
      setTimeout(() => { if (stormOverlay) stormOverlay.style.opacity = 0; }, Math.random() * 100 + 50);
      if (Math.random() > 0.7) {
        setTimeout(() => {
          if (stormOverlay) stormOverlay.style.opacity = intensity * 0.5;
          setTimeout(() => { if (stormOverlay) stormOverlay.style.opacity = 0; }, 50);
        }, 150);
      }
    }
    let nextFlash = Math.random() * 5000 + 2000;
    lightningTimer = setTimeout(triggerLightning, nextFlash);
  }

  onMount(() => {
    setDimensions();
    window.addEventListener('resize', setDimensions);
    if (canvas) ctx = canvas.getContext('2d');
    initParticles();
    animate();
    triggerLightning();
    loadSfx();
    let spinnerTimer;
    // auto-hide spinner after entrance animation if requested
    if (showSpinner) spinnerTimer = setTimeout(() => (internalSpinner = false), 900);

    return () => {
      window.removeEventListener('resize', setDimensions);
      cancelAnimationFrame(animFrame);
      clearTimeout(lightningTimer);
      clearTimeout(spinnerTimer);
    };
  });

  function handleLogin(e) {
    if (!enableLogin) {
      if (sfxNotAvailable) {
        sfxNotAvailable.volume = 1.0 * sfxMultiplier;
        sfxNotAvailable.play().catch(() => {});
      }
      return;
    }
    if (sfxClick) {
      sfxClick.volume = 1.0 * sfxMultiplier;
      sfxClick.play().catch(() => {});
    }
    onLogin();
    dispatch('login');
  }

  function handlePrimary(e) {
    if (sfxClick) { try { sfxClick.currentTime = 0; sfxClick.volume = 1.0 * sfxMultiplier; sfxClick.play().catch(()=>{}); } catch(e){} }
    onPrimary();
    dispatch('primary');
  }

  function handleRegister(e) {
    if (!enableRegister) {
      if (sfxNotAvailable) {
        sfxNotAvailable.volume = 1.0 * sfxMultiplier;
        sfxNotAvailable.play().catch(() => {});
      }
      return;
    }
    if (sfxClick) {
      sfxClick.volume = 1.0 * sfxMultiplier;
      sfxClick.play().catch(() => {});
    }
    onRegister();
    dispatch('register');
  }
  
  // local spinner state so routes can pass initial value
  let internalSpinner = showSpinner;
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Courgette&family=Lato:wght@300;400&display=swap" rel="stylesheet" />
</svelte:head>

<div class="bg-container">
  <div class="bg-image"></div>
</div>

<div class="void-heartbeat"></div>
<div class="storm-flash" bind:this={stormOverlay} id="storm-overlay"></div>

<div class="cinematic-shades"></div>
<canvas id="particle-canvas" bind:this={canvas}></canvas>

<div class="ui-layer">
  <MusicToggle />
  <LoadingSpinner visible={internalSpinner} />
  <header>
    <h1 class="title">THE VOID'S ARCANA</h1>
    <p class="subtitle">A Tale from Ashen Hearth</p>
  </header>
  <footer class="controls-area">
    <div class="btn-group">
      <button class="btn" on:click={handleLogin} aria-disabled={!enableLogin} class:disabled={!enableLogin}>
        <span>Login</span>
      </button>

      <button class="btn btn-primary" on:click={handlePrimary}>{primaryLabel}</button>

      <button class="btn" on:click={handleRegister} aria-disabled={!enableRegister} class:disabled={!enableRegister}>
        <span>Register</span>
      </button>
    </div>
  </footer>
</div>

<style>
  :root{
    --void-purple: #2a0a3a;
    --arcane-glow: #b8aaff;
    --rune-cyan: #aeeeff;
    --subtitle-glow: #00d0ff;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  :global(body){overflow:hidden;background-color:#05010a;font-family:'Cinzel',serif;height:100vh;color:white}
  .bg-container{position:absolute;top:0;left:0;width:100%;height:100%;z-index:-5;overflow:hidden}
  .bg-image{width:100%;height:100%;background:url('/Images/cover.png') no-repeat center center;background-size:cover;animation:breathe-bg 20s infinite alternate ease-in-out}
  .void-heartbeat{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40vw;height:40vw;background:radial-gradient(circle, rgba(174, 238, 255, 0.2) 0%, transparent 70%);z-index:-4;pointer-events:none;mix-blend-mode:screen;animation:heartbeat 4s infinite ease-in-out}
  .storm-flash{position:absolute;top:0;left:0;width:100%;height:100%;background-color:var(--arcane-glow);opacity:0;z-index:-3;pointer-events:none;mix-blend-mode:color-dodge;transition:opacity .1s ease-out}
  .cinematic-shades{position:absolute;top:0;left:0;width:100%;height:100%;background:radial-gradient(circle at center, transparent 30%, #000000 100%);z-index:-2;pointer-events:none}
  #particle-canvas{position:absolute;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none}
  .ui-layer{position:relative;z-index:10;height:100vh;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:2rem}
  header{text-align:center;margin-top:2rem;animation:fadeDown 1.5s cubic-bezier(.2,.8,.2,1) forwards;opacity:0;transform:translateY(-30px)}
  h1.title{font-family:'Cinzel',serif;font-weight:700;font-size:4rem;letter-spacing:.05em;color:#fff;text-transform:uppercase;text-shadow:0 0 10px var(--arcane-glow),0 0 20px var(--void-purple),0 0 40px var(--void-purple);line-height:1;margin-bottom:.5rem}
  p.subtitle{font-family:'Courgette',cursive;font-size:1.5rem;color:white;letter-spacing:.05em;text-shadow:0 0 5px var(--subtitle-glow),0 0 10px var(--subtitle-glow),2px 2px 2px rgba(0,0,0,.8);opacity:1}
  /* Force exact subtitle font from Gemini design to avoid overrides */
  p.subtitle{font-family: 'Courgette', cursive !important; font-weight: 400 !important; font-style: normal !important; text-transform: none !important}
  .controls-area{margin-bottom:3rem;width:100%;display:flex;justify-content:center;animation:fadeUp 1.5s cubic-bezier(.2,.8,.2,1) forwards;animation-delay:.3s;opacity:0;transform:translateY(30px)}
  .btn-group{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:3rem;background:rgba(0,0,0,.6);padding:1rem 3rem;border-radius:50px;border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(5px);box-shadow:0 0 30px rgba(0,0,0,.5)}
  .btn-group > .btn:first-child{justify-self:end}
  .btn-group > .btn:last-child{justify-self:start}
  .btn{font-family:'Cinzel',serif;font-weight:600;font-size:.9rem;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.7);background:transparent;border:none;cursor:pointer;transition:all .3s ease;position:relative;text-decoration:none;padding:10px 20px}
  .btn:not(.btn-primary):hover{color:white;text-shadow:0 0 8px var(--rune-cyan);transform:translateY(-2px)}
  .btn.disabled, .btn[aria-disabled="true"]{opacity:0.5;cursor:not-allowed;transform:none;pointer-events:auto}
  .btn-primary{color:white;font-weight:900;font-size:1.1rem;border:1px solid var(--arcane-glow);background:rgba(42,10,58,.6);padding:12px 40px;box-shadow:0 0 15px rgba(160,32,240,.3);border-radius:2px}
  .btn-primary:hover{background:var(--void-purple);box-shadow:0 0 25px var(--arcane-glow),inset 0 0 20px var(--void-purple);transform:scale(1.05);border-color:white}
  @keyframes breathe-bg{0%{transform:scale(1)}100%{transform:scale(1.15)}}@keyframes fadeUp{to{opacity:1;transform:translateY(0)}}@keyframes fadeDown{to{opacity:1;transform:translateY(0)}}@keyframes heartbeat{0%{opacity:.1;transform:translate(-50%,-50%) scale(.8)}50%{opacity:.4;transform:translate(-50%,-50%) scale(1.2)}100%{opacity:.1;transform:translate(-50%,-50%) scale(.8)}}
  @media(max-width:768px){h1.title{font-size:2.5rem}p.subtitle{font-size:1.2rem}.btn-group{grid-template-columns:1fr;gap:1rem;padding:1.5rem;background:rgba(0,0,0,.7);border-radius:20px}.btn-group > .btn{justify-self:stretch}}
</style>
