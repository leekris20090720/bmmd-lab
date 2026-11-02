/* BM//MD movement journal.
 * ScrollReveal's piece interpolation is adapted from React Bits (David Haz).
 * See assets/vendor/studio-redesign/README.md and the retained licence notices.
 * This module changes presentation only. No persistence, training writes or networking.
 */
(() => {
  'use strict';
  const B = window.BM = window.BM || {};
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const clamp = x => Math.min(1, Math.max(0, x));
  const reduced = () => media.matches || document.documentElement.classList.contains('pd-reduced');
  let frame = 0, queued = 0, home = null, reveal = null, words = [], pictures = [], animations = [];
  let stage = null, scrollRotation = 0, targetRotation = 0, lastTime = 0;
  let pointerX = 0, pointerY = 0, aimX = 0, aimY = 0;
  const shadowHosts = new WeakSet();
  const shadowObservers = new Set();
  const shadowCSS = `
    :host{--ui-bg:#090b0a;--ui-surface:#151817;--ui-surface-subtle:#222625;--ui-text:#f0f3f1;--ui-muted:#b4bcb8;--ui-line:#3e4942;--ui-accent:#0ef87a;--ui-focus:#0ef87a;--ui-primary-bg:#0ef87a;--ui-primary-hover:#64ffa9;--ui-primary-text:#03190d;--ui-success:#0ef87a;--ui-danger:#ff9c91;font-family:"BM Inter",Inter,-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}
    *,*::before,*::after{background-image:none!important;text-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;-webkit-text-fill-color:currentColor!important;box-shadow:none!important}
    .pg-dialog{background:#090b0a!important;border:1px solid #3e4942!important;border-radius:8px!important;color:#f0f3f1!important}
    .pg-dialog::backdrop{background:#040605e8!important;backdrop-filter:none!important}
    .pg-ambient,.ref-light,.ref-edge,.ref-glare,.ref-beam{display:none!important}
    .pg-header{background:#090b0a!important}.pg-header h2{font-size:clamp(28px,4vw,44px)!important;letter-spacing:-.05em!important;color:#f0f3f1!important}
    .pg-brand-mark{border:0!important;background:#252c28!important;color:#f0f3f1!important;border-radius:3px!important}
    .pg-tabs{background:#151817!important;border:0!important;border-radius:4px!important}
    .pg-tabs::before{background:#303c35!important;border:0!important;border-radius:3px!important}
    .pg-tabs button{background:transparent!important;color:#b4bcb8!important}.pg-tabs button[aria-selected=true]{color:#f0f3f1!important}
    button,input,select{font-family:inherit!important;border-radius:4px!important}button{transition:transform .2s,background-color .2s!important}button:active{transform:scale(.98)}
    .pg-gallery-display,.pg-game,.pg-gallery-info,.pg-search-field,.pg-choice,.pg-wave-choice,.pg-empty,.pg-result{background:#151817!important;border-color:#36423a!important;border-radius:5px!important}
    .pg-gallery-display{background:#222625!important}.pg-gallery-info{color:#f0f3f1!important}
    .pg-gallery-stage{background:#202622!important}.pg-gallery-ambient,.pg-gallery-grid,.pg-gallery-ring{display:none!important}
    .pg-primary,.pg-gallery-primary{background:#0ef87a!important;color:#03190d!important;border:0!important}
    .pg-search-field input{background:transparent!important;color:#f0f3f1!important}
    :focus-visible{outline:2px solid #0ef87a!important;outline-offset:4px!important}
    .pg-dialog :is(p,small){color:var(--ui-muted)}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;animation:none!important}}
    :host([data-pg-reduced=true]) *{transition:none!important;animation:none!important}
  `;
  function skinShadow() {
    const host = document.getElementById('bm-explore-root');
    if (!host?.shadowRoot) return;
    if (!shadowHosts.has(host)) {
      const observer = new MutationObserver(skinShadow);
      observer.observe(host.shadowRoot, { childList: true });
      shadowObservers.add(observer); shadowHosts.add(host);
    }
    if (host.shadowRoot.querySelector('[data-studio-skin]')) return;
    const style = document.createElement('style');
    style.dataset.studioSkin = 'true'; style.textContent = shadowCSS;
    host.shadowRoot.append(style);
  }
  function cleanup() {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0;
    reveal?.disconnect(); reveal = null;
    animations.forEach(animation => animation.cancel()); animations = [];
    words = []; pictures = []; stage = null;
    scrollRotation = targetRotation = pointerX = pointerY = aimX = aimY = 0;
  }
  function arrive(element, delay = 0, horizontal = false) {
    if (!element?.animate || reduced()) return;
    const move = horizontal ? 'translateX(24px)' : 'translateY(24px)';
    const animation = element.animate([{ opacity: .55, transform: move }, { opacity: 1, transform: 'none' }], {
      duration: 820, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards'
    });
    animations.push(animation);
    animation.finished.then(() => { animations = animations.filter(a => a !== animation); }, () => {});
  }
  // React Bits ScrollReveal: same clamped stagger, cubic rise and alpha interpolation.
  // Chinese is segmented as characters; the sentence's accessible name remains intact.
  function split(element) {
    const text = element.textContent;
    element.setAttribute('aria-label', text);
    const pieces = Array.from(text).map(char => {
      const piece = document.createElement('span'); piece.className = 'studio-piece';
      piece.textContent = char; piece.setAttribute('aria-hidden', 'true'); return piece;
    });
    element.replaceChildren(...pieces); words.push({ element, pieces });
  }
  function drawWords() {
    for (const { element, pieces } of words) {
      const rect = element.getBoundingClientRect();
      const p = reduced() ? 1 : clamp((innerHeight * .88 - rect.top) / (innerHeight * .48 + rect.height));
      const gap = .014, span = .5, at = p * (span + Math.max(0, pieces.length - 1) * gap);
      pieces.forEach((piece, i) => {
        const t = clamp((at - i * gap) / span), rise = 1 - Math.pow(1 - t, 3);
        piece.style.opacity = String(.62 + .38 * t);
        piece.style.transform = t === 1 ? '' : `translateY(${(1 - rise) * 12}px)`;
      });
    }
  }
  function wake() { if (!frame && home && !document.hidden) frame = requestAnimationFrame(tick); }
  function tick(now) {
    frame = 0;
    if (!home?.isConnected || document.hidden) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 1 / 60;
    lastTime = now;
    const rest = reduced() || document.body.hasAttribute('data-explore-open');
    const r = stage?.getBoundingClientRect();
    targetRotation = rest || !r || innerWidth < 651 ? 0 : 6 * (1 - clamp(scrollY / (innerHeight * .65)));
    const follow = 1 - Math.exp(-dt / .14);
    scrollRotation += (targetRotation - scrollRotation) * follow;
    pointerX += ((rest ? 0 : aimX) - pointerX) * follow;
    pointerY += ((rest ? 0 : aimY) - pointerY) * follow;
    if (stage) {
      stage.style.setProperty('--st-rotate', (rest ? 0 : scrollRotation + pointerY).toFixed(3) + 'deg');
      stage.style.setProperty('--st-scale', rest ? '1' : (1 - Math.abs(scrollRotation) * .002).toFixed(4));
      stage.style.rotate = rest ? '' : `y ${pointerX.toFixed(3)}deg`;
    }
    drawWords();
    pictures.forEach(picture => {
      const box = picture.getBoundingClientRect();
      if (box.bottom < 0 || box.top > innerHeight) return;
      picture.style.setProperty('--st-parallax', rest ? '0px' : `${((innerHeight / 2 - box.top - box.height / 2) * .035).toFixed(2)}px`);
    });
    if (Math.abs(targetRotation - scrollRotation) + Math.abs(aimX - pointerX) + Math.abs(aimY - pointerY) > .015 && !rest) wake();
  }
  function mount() {
    queued = 0; cleanup(); skinShadow();
    home = document.querySelector('.studio-home-main');
    if (document.body.dataset.bmRoute !== 'home' || !home) { home = null; return; }
    stage = home.querySelector('.studio-specimen-stage');
    pictures = [...home.querySelectorAll('.studio-chapter figure img')];
    home.querySelectorAll('[data-studio-words]').forEach(element => split(element));
    if (!reduced()) {
      home.querySelectorAll('[data-studio-arrive]').forEach((element, i) => arrive(element, Math.min(i, 4) * 75));
      reveal = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const targets = entry.target.querySelectorAll('[data-studio-reveal]');
          targets.forEach((element, i) => arrive(element, i * 75, element.tagName === 'FIGURE'));
          reveal.unobserve(entry.target);
        });
      }, { threshold: .13 });
      home.querySelectorAll('.studio-intro,.studio-chapter,.studio-cta,.studio-footer').forEach(element => reveal.observe(element));
    }
    document.documentElement.dataset.studioMotion = 'react-bits-scroll-reveal specimen-crossfade scroll-perspective chapter-stack uiverse-arrow';
    document.documentElement.dataset.studioReduced = String(reduced());
    wake();
  }
  function schedule() { if (!queued) queued = requestAnimationFrame(mount); }
  document.addEventListener('click', event => {
    if (home && document.body.dataset.bmRoute === 'home' && event.target.closest?.('a[href="#home"]')) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: reduced() ? 'instant' : 'smooth' });
      return;
    }
    const button = event.target.closest?.('[data-studio-specimen]');
    if (!button || !home) return;
    const index = button.dataset.studioSpecimen;
    home.querySelectorAll('[data-studio-specimen]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    home.querySelectorAll('.studio-specimen-image').forEach(image => image.dataset.active = String(image.dataset.specimen === index));
    const label = home.querySelector('[data-studio-caption]');
    if (label) label.textContent = button.dataset.caption;
    const course = home.querySelector('[data-studio-course]');
    if (course) course.href = '#course/' + button.dataset.course;
    const status = home.querySelector('[data-studio-announcement]');
    if (status) status.textContent = button.dataset.caption;
  });
  document.addEventListener('pointermove', event => {
    if (!stage || !fine.matches || reduced() || event.buttons) return;
    const r = stage.getBoundingClientRect();
    const inside = event.target.closest?.('.studio-specimen-stage');
    aimX = inside ? (clamp((event.clientX - r.left) / r.width) - .5) * 5 : 0;
    aimY = inside ? (.5 - clamp((event.clientY - r.top) / r.height)) * 4 : 0;
    wake();
  }, { passive: true });
  document.addEventListener('pointerleave', () => { aimX = aimY = 0; wake(); });
  document.addEventListener('scroll', wake, { passive: true, capture: true });
  window.addEventListener('resize', wake, { passive: true });
  window.addEventListener('bm:page-ready', schedule);
  window.addEventListener('hashchange', schedule);
  document.addEventListener('bm:language-change', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; animations.forEach(a => a.pause()); }
    else { animations.forEach(a => a.play()); wake(); }
  });
  media.addEventListener('change', schedule);
  const routeObserver = new MutationObserver(schedule);
  routeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-bm-route', 'data-explore-open'], childList: true });
  const preferenceObserver = new MutationObserver(() => {
    const next = String(reduced());
    if (document.documentElement.dataset.studioReduced !== next) schedule();
  });
  preferenceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pagehide', () => { cleanup(); routeObserver.disconnect(); preferenceObserver.disconnect(); shadowObservers.forEach(observer => observer.disconnect()); });
  B.StudioAppearance = { refresh: schedule, get reduced() { return reduced(); } };
  schedule();
})();
