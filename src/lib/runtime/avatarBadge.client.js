// Client-only runtime helper to ensure an avatar badge is visible and not clipped.
// It creates a small fixed badge using the resolved image src found on
// `#avatar-container` as the `data-player-element-src` attribute (set by Svelte).
// Returns a cleanup function to remove the badge and any observers.
export default function initAvatarBadge({ size = 48 } = {}) {
  if (typeof window === 'undefined') return () => {};

  const BADGE_CLASS = 'avatar-badge-runtime-fixed';

  // Remove any previous runtime badges to avoid duplicates
  try {
    document.querySelectorAll('.' + BADGE_CLASS).forEach((e) => e.remove());
  } catch (e) {}

  const container = document.getElementById('avatar-container') || document.querySelector('[data-player-element-src]');
  let src = null;
  if (container) {
    src = container.dataset.playerElementSrc || null;
    // If not present in dataset, try to read from an in-place .avatar-badge background-image
    if (!src) {
      try {
        const badge = container.querySelector('.avatar-badge');
        if (badge) {
          const bg = window.getComputedStyle(badge).backgroundImage;
          if (bg && bg !== 'none') {
            const m = bg.match(/url\(["']?(.*?)["']?\)/);
            if (m) src = m[1];
          }
        }
      } catch (e) {}
    }
  }

  if (!src) return () => {};

  const fixed = document.createElement('div');
  fixed.className = BADGE_CLASS;
  fixed.style.position = 'fixed';
  fixed.style.width = size + 'px';
  fixed.style.height = size + 'px';
  fixed.style.right = '12px';
  fixed.style.bottom = '12px';
  fixed.style.zIndex = '9999';
  fixed.style.borderRadius = '50%';
  fixed.style.overflow = 'hidden';
  fixed.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.45)';
  fixed.style.backgroundSize = 'cover';
  fixed.style.backgroundPosition = 'center';
  fixed.style.backgroundImage = `url("${src}")`;

  document.body.appendChild(fixed);

  const ro = new MutationObserver(() => {
    if (!container) return;
    const newSrc = container.dataset.playerElementSrc || null;
    if (newSrc !== src) {
      src = newSrc;
      if (src) fixed.style.backgroundImage = `url("${src}")`;
      else fixed.style.backgroundImage = '';
    }
  });

  try {
    if (container) ro.observe(container, { attributes: true, attributeFilter: ['data-player-element-src'] });
  } catch (e) {}

  return function cleanup() {
    try { fixed.remove(); } catch (e) {}
    try { ro.disconnect(); } catch (e) {}
  };
}