/* BM//MD movement journal.
 * GSAP timelines and ScrollTrigger drive the existing movement-journal layout.
 * Readable character staging follows the earlier React Bits adaptation.
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
  const G = window.gsap, ST = window.ScrollTrigger;
  if (G && ST) G.registerPlugin(ST);
  let queued = 0, home = null, stage = null, mm = null, context = null, pointerTilt = null, swapImage = null;
  let words = [], paused = [];
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
    mm?.revert(); mm = null; context = null; pointerTilt = null; swapImage = null;
    words = []; paused = []; stage = null;
  }
  function split(element) {
    const text = element.textContent;
    element.setAttribute('aria-label', text);
    const pieces = Array.from(text).map(char => {
      const piece = document.createElement('span'); piece.className = 'studio-piece';
      piece.textContent = char; piece.setAttribute('aria-hidden', 'true'); return piece;
    });
    element.replaceChildren(...pieces); words.push({ element, pieces });
  }
  function mount() {
    queued = 0; cleanup(); skinShadow();
    home = document.body.dataset.bmRoute === 'home' ? document.querySelector('.studio-home-main') : null;
    document.documentElement.dataset.studioReduced = String(reduced());
    document.documentElement.dataset.studioEngine = G && ST ? 'gsap' : 'static';
    if (!home || !G || !ST) return;
    stage = home.querySelector('.studio-specimen-stage');
    home.querySelectorAll('[data-studio-words]').forEach(split);
    mm = G.matchMedia();
    mm.add({ all: 'all', desktop: '(min-width:651px)', reduce: '(prefers-reduced-motion:reduce)' }, ctx => {
      context = ctx; pointerTilt = null; swapImage = null;
      if (ctx.conditions.reduce || reduced() || document.body.hasAttribute('data-explore-open')) return;
      const images = [...home.querySelectorAll('.studio-specimen-image')];
      G.set(images, { autoAlpha: 0 });
      G.set(images.filter(image => image.dataset.active === 'true'), { autoAlpha: 1 });
      ctx.add('swapImage', next => {
        const others = images.filter(image => image !== next);
        G.killTweensOf(images);
        const tl = G.timeline({ defaults: { ease: 'power3.out', overwrite: 'auto' } });
        tl.to(others, { autoAlpha: 0, x: -28, duration: .35 }, 0)
          .fromTo(next, { autoAlpha: 0, x: 38, y: 10, scale: .98 }, { autoAlpha: 1, x: 0, y: 0, scale: 1.04, duration: .72 }, 0);
      });
      swapImage = ctx.swapImage;
      if (stage && ctx.conditions.desktop) {
        G.set(stage, { transformPerspective: 1400, rotationX: 6, rotationY: 0, scale: .988, transformOrigin: '50% 65%' });
        G.to(stage, { rotationX: 0, scale: 1, ease: 'none', scrollTrigger: {
          id: 'bm-studio-specimen', trigger: home, start: 0, end: () => Math.max(1, innerHeight * .65), scrub: .65, invalidateOnRefresh: true
        } });
        pointerTilt = G.quickTo(stage, 'rotationY', { duration: .45, ease: 'power3.out' });
      }
      for (const { element, pieces } of words) {
        G.fromTo(pieces, { opacity: .62, y: 12 }, { opacity: 1, y: 0, stagger: .012, duration: .5, ease: 'none', scrollTrigger: {
          id: 'bm-studio-words', trigger: element, start: 'top 88%', end: 'bottom 40%', scrub: .6
        } });
      }
      const intro = home.querySelector('.studio-intro');
      if (intro) G.fromTo(intro.querySelector('h2'), { y: 36, opacity: .72 }, { y: 0, opacity: 1, ease: 'none', scrollTrigger: {
        id: 'bm-studio-intro', trigger: intro, start: 'top 88%', end: 'top 35%', scrub: .65
      } });
      home.querySelectorAll('.studio-chapter').forEach((chapter, i) => {
        const heading = chapter.querySelector('h3'), photos = chapter.querySelectorAll('figure img,.studio-chapter-gallery img');
        const tl = G.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
          id: 'bm-studio-chapter-' + i, trigger: chapter, start: 'top 88%', end: 'top 20%', scrub: .8
        } });
        if (heading) tl.fromTo(heading, { y: 30, opacity: .72 }, { y: 0, opacity: 1 }, 0);
        if (photos.length) tl.fromTo(photos, { y: 30, scale: 1.10 }, { y: -30, scale: 1.02, stagger: .06 }, 0);
      });
      home.querySelectorAll('.studio-cta,.studio-footer').forEach((section, i) => {
        const heading = section.querySelector('h2');
        if (heading) G.fromTo(heading, { y: 32, scale: .97, opacity: .72 }, { y: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: {
          id: 'bm-studio-close-' + i, trigger: section, start: 'top 92%', end: 'top 45%', scrub: .6
        } });
      });
    }, home);
    document.documentElement.dataset.studioMotion = 'gsap-scrolltrigger gsap-timeline gsap-quickto specimen-crossfade chapter-parallax uiverse-arrow';
  }
  function schedule() { if (!queued) queued = requestAnimationFrame(mount); }
  document.addEventListener('click', event => {
    if (home && document.body.dataset.bmRoute === 'home' && event.target.closest?.('a[href="#home"]')) {
      event.preventDefault(); window.scrollTo({ top: 0, behavior: reduced() ? 'instant' : 'smooth' }); return;
    }
    const button = event.target.closest?.('[data-studio-specimen]');
    if (!button || !home) return;
    const index = button.dataset.studioSpecimen;
    const next = home.querySelector(`.studio-specimen-image[data-specimen="${index}"]`);
    if (button.getAttribute('aria-pressed') !== 'true' && next && !reduced()) swapImage?.(next);
    home.querySelectorAll('[data-studio-specimen]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    home.querySelectorAll('.studio-specimen-image').forEach(image => image.dataset.active = String(image.dataset.specimen === index));
    const label = home.querySelector('[data-studio-caption]'); if (label) label.textContent = button.dataset.caption;
    const course = home.querySelector('[data-studio-course]'); if (course) course.href = '#course/' + button.dataset.course;
    const status = home.querySelector('[data-studio-announcement]'); if (status) status.textContent = button.dataset.caption;
  });
  document.addEventListener('pointermove', event => {
    if (!stage || !pointerTilt || !fine.matches || reduced() || event.buttons) return;
    const inside = event.target.closest?.('.studio-specimen-stage');
    const r = stage.getBoundingClientRect();
    pointerTilt(inside ? (clamp((event.clientX - r.left) / r.width) - .5) * 7 : 0);
  }, { passive: true });
  document.addEventListener('pointerleave', () => pointerTilt?.(0));
  window.addEventListener('bm:page-ready', schedule);
  window.addEventListener('hashchange', schedule);
  document.addEventListener('bm:language-change', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { paused = context?.getTweens().filter(t => t.isActive()) || []; paused.forEach(t => t.pause()); }
    else { paused.forEach(t => t.play()); paused = []; }
  });
  media.addEventListener('change', schedule);
  const routeObserver = new MutationObserver(records => {
    if (records.some(record => record.type === 'attributes')) schedule();
    else skinShadow();
  });
  routeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-bm-route', 'data-explore-open'], childList: true });
  const preferenceObserver = new MutationObserver(() => {
    if (document.documentElement.dataset.studioReduced !== String(reduced())) schedule();
  });
  preferenceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('pagehide', () => { cleanup(); routeObserver.disconnect(); preferenceObserver.disconnect(); shadowObservers.forEach(observer => observer.disconnect()); });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    routeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-bm-route', 'data-explore-open'], childList: true });
    preferenceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const root = document.getElementById('bm-explore-root')?.shadowRoot;
    if (root) shadowObservers.forEach(observer => observer.observe(root, { childList: true }));
    schedule();
  });
  B.StudioAppearance = { refresh: schedule, get reduced() { return reduced(); }, get engine() { return G && ST ? 'gsap' : 'static'; }, get triggers() { return ST?.getAll().filter(t => String(t.vars.id || '').startsWith('bm-studio-')).length || 0; } };
  schedule();
})();
