/* One visible, pausable clock for each learning demonstration. No training writes. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.BM = root.BM || {}).LearningDynamics = api;
})(typeof window === 'undefined' ? null : window, function (win) {
  'use strict';
  const clamp = x => Math.max(0, Math.min(1, Number(x) || 0));
  function createClock(options = {}) {
    const request = options.request || (fn => win.requestAnimationFrame(fn));
    const cancel = options.cancel || (id => win.cancelAnimationFrame(id));
    // Lightweight diagrams retain their existing 30 fps cap. A 3D course opts
    // into display-rate updates with fps:0 rather than repeating poses between
    // capped frames. There is still only one clock and one pending callback.
    const interval = options.fps === 0 ? 0 : 1000 / Math.max(1, options.fps || 30);
    let duration = Math.max(.1, options.duration || 12), progress = clamp(options.progress);
    let wanted = options.auto !== false, disposed = false, frameId = null, last = null, painted = null, drawn = null, hold = 0, signature = '';
    const gates = { visible: true, hidden: false, reduced: false, blocked: false };
    const reason = () => disposed ? 'disposed' : gates.reduced ? 'reduced' : !wanted ? 'paused' : gates.hidden ? 'background' : !gates.visible ? 'offscreen' : gates.blocked ? 'blocked' : 'playing';
    const snapshot = () => ({ progress, wanted, running: reason() === 'playing', reason: reason() });
    function report() {
      const value = snapshot(), key = [value.wanted, value.reason].join(':');
      if (signature !== key) { signature = key; options.onState?.(value); }
    }
    function paint() { drawn = progress; options.onFrame?.(progress); }
    function reconcile() {
      if (!snapshot().running) { if (frameId !== null) cancel(frameId); frameId = null; last = painted = null; }
      else if (frameId === null) frameId = request(tick);
      report();
    }
    function tick(now) {
      frameId = null;
      if (!snapshot().running) return reconcile();
      const dt = last === null ? 0 : Math.max(0, Math.min(.1, (now - last) / 1000)); last = now;
      if (progress >= 1) {
        if (options.loop === false) { wanted = false; return reconcile(); }
        hold += dt;
        if (hold >= (options.hold ?? 1.2)) { progress = 0; hold = 0; options.onLoop?.(); }
      } else progress = Math.min(1, progress + dt / duration);
      if (drawn !== progress && (painted === null || now - painted >= interval || progress === 1)) {
        painted = now;
        try { paint(); } catch (error) { wanted = false; options.onError?.(error); }
      }
      reconcile();
    }
    const clock = {
      play() { if (!disposed) { wanted = true; reconcile(); } },
      pause() { wanted = false; reconcile(); },
      seek(value, { pause = true } = {}) { if (disposed) return; if (pause) wanted = false; progress = clamp(value); hold = 0; last = painted = null; paint(); reconcile(); },
      duration(value) { duration = Math.max(.1, Number(value) || 12); },
      availability(value) { Object.assign(gates, value); reconcile(); },
      destroy() { disposed = true; wanted = false; reconcile(); },
      snapshot
    };
    // A binder may set visibility before the first requested frame executes.
    reconcile();
    return clock;
  }
  function reduced() {
    return !!(win.matchMedia('(prefers-reduced-motion: reduce)').matches || win.document.documentElement.classList.contains('pd-reduced') || win.BM.flow?.state().preferences.reducedMotion);
  }
  function bindPlayback(options) {
    const { surface, targets = [surface] } = options, doc = win.document, controller = new AbortController();
    const media = win.matchMedia('(prefers-reduced-motion: reduce)');
    const clock = createClock({ ...options, onState(value) {
      if (surface?.isConnected) { surface.dataset.learningMotionState = value.reason; surface.dataset.learningRunning = String(value.running); }
      options.onState?.(value);
    } });
    const sync = () => clock.availability({ hidden: doc.hidden, reduced: reduced(), blocked: !!doc.querySelector('#bm-dialog[open],body[data-explore-open]') });
    const signal = controller.signal;
    doc.addEventListener('visibilitychange', sync, { signal });
    win.addEventListener('bm:store', sync, { signal });
    win.addEventListener('pagehide', () => clock.availability({ hidden: true }), { signal });
    win.addEventListener('pageshow', sync, { signal });
    media.addEventListener('change', sync, { signal });
    const preferences = new MutationObserver(sync);
    preferences.observe(doc.documentElement, { attributes: true, attributeFilter: ['class'] });
    preferences.observe(doc.body, { attributes: true, subtree: true, attributeFilter: ['data-explore-open', 'open'] });
    const inView = new Map();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) inView.set(entry.target, entry.isIntersecting);
      clock.availability({ visible: [...inView.values()].some(Boolean) });
    }, { root: doc.getElementById('product-root'), threshold: .08 });
    clock.availability({ visible: false });
    targets.filter(Boolean).forEach(el => observer.observe(el)); sync();
    const destroy = clock.destroy;
    clock.destroy = () => { controller.abort(); observer.disconnect(); preferences.disconnect(); destroy(); };
    return clock;
  }
  function stateText(value, t) {
    if (value.reason === 'reduced') return t('静态观察 · 已开启减少动态', 'Static view · reduced motion is on');
    if (value.reason === 'paused' || value.reason === 'disposed') return t('已暂停 · 可以仔细观察', 'Paused · take a closer look');
    if (value.reason === 'background' || value.reason === 'offscreen') return t('离开画面时自动暂停', 'Paused while out of view');
    if (value.reason === 'blocked') return t('查看其他内容时暂停', 'Paused while another panel is open');
    return t('自动演示中', 'Automatic demonstration');
  }
  // Compare one variable at a time. All results still come from ExperimentEngine.
  const comparisons = {
    'force-balance': {key:'forceB',values:[50,150,250]}, counterweight:{key:'massRight',values:[5,10,20]}, 'elastic-load':{key:'stiffness',values:[100,300,600]}, 'rotational-inertia':{key:'radius',values:[.2,.4,.6]}, 'pulley-efficiency':{key:'efficiency',values:[.5,.75,1]}, 'base-stability':{key:'halfWidth',values:[.2,.4,.6]},
    direction: { key: 'angle', values: [20, 90, 160] }, lever: { key: 'reach', values: [.2, .45, .7] },
    pulley: { key: 'ratio', values: [1, 2, 4] }, cam: { key: 'shape', values: [0, .4, .8] },
    incline: { key: 'slope', values: [15, 40, 65] }, work: { key: 'direction', values: [0, 1] },
    power: { key: 'duration', values: [2, 4, 6] }, kinematics: { key: 'duration', values: [2, 4, 6] },
    spring: { key: 'damping', values: [0, 4, 8] }, calculus: { key: 'segments', values: [4, 16, 64, 256] },
    uncertainty: { key: 'range', values: [0, .01, .02] }, design: { key: 'shape', values: [.1, .45, .8] }
  };
  function experimentFrame(id, start, progress, compare = false) {
    const q = clamp(progress), spec = comparisons[id], params = { ...start };
    let point = q, index = -1;
    if (compare && spec) {
      const count = spec.values.length, section = Math.min(count - 1, Math.floor(q * count));
      index = section; params[spec.key] = spec.values[section];
      point = Math.min(1, (q * count - section) / .82);
    } else if (['direction', 'lever', 'incline'].includes(id)) {
      const key = spec.key, bounds = spec.values, u = .5 - .5 * Math.cos(q * Math.PI * 2);
      params[key] = bounds[0] + (bounds[bounds.length - 1] - bounds[0]) * u;
      const step = id === 'lever' ? .01 : 1; params[key] = Math.round(params[key] / step) * step;
      // Incline is a quasi-static angle comparison, never a solved acceleration.
      point = .4;
    }
    return { params, progress: point, index, key: compare || ['direction', 'lever', 'incline'].includes(id) ? spec?.key : null };
  }
  function courseFrame(value) {
    const q = clamp(value), smooth = u => u * u * (3 - 2 * u);
    // Deliberate pauses at setup and the endpoint keep cues readable.
    const motion = q < .10 ? 0 : q < .45 ? smooth((q - .10) / .35) : q < .55 ? 1 : q < .96 ? 1 - smooth((q - .55) / .41) : 0;
    const stage = [.04, .10, .45, .55, .96].filter(v => q >= v).length;
    return { motion, stage };
  }
  let overview = null, overviewVersion = 0;
  const topics = [
    { id: 'direction', name: ['侧平举拉力', 'Lateral-raise force'], title: ['侧平举：同一拉力，方向为什么重要？', 'Lateral raise: why does force direction matter?'], copy: ['固定一个抬臂姿态，把抬臂切线设为+x，观察钢索拉力沿这个方向的分量。', 'Fix one pose, define +x along the raising tangent, and inspect the cable-force component.'], formula: 'Fₓ = F cos α', unit: 'N' },
    { id: 'lever', name: ['腿屈伸力臂', 'Leg-extension arm'], title: ['腿屈伸：同样滚垫力，膝部力矩为何会变？', 'Leg extension: same pad force, different knee moment?'], copy: ['固定垂直滚垫力100 N，只比较膝轴到接触点的距离；不是个人座椅调节建议。', 'Hold perpendicular pad force at 100 N and vary knee-to-pad distance. This is not personal setup advice.'], formula: 'τ = F × d', unit: 'N·m' },
    { id: 'power', name: ['滑轮动作节奏', 'Cable tempo'], title: ['拉得快，功率为何更高？', 'Same travel, why does a faster pull raise power?'], copy: ['固定配重和手柄行程，比较不同速度下的瞬时功率。机械功与人体消耗的热量是不同的量。', 'Keep the stack and handle travel fixed, then compare instantaneous power at different speeds. Mechanical work and calories burned measure different quantities.'], formula: 'P = Fv, P̄ = W/T', unit: 'W' }
  ];
  function overviewHTML(t) {
    return `<section id="pd-learning-live" class="pd-live-lab" aria-labelledby="pd-live-heading">
      <header class="pd-live-top">
        <h2 id="pd-live-heading">${t('力学演示', 'Mechanics demonstrations')}</h2>
        <button type="button" id="pd-live-play">${t('暂停演示', 'Pause demo')}</button>
      </header>
      <div class="pd-live-topics" role="group" aria-label="${t('选择演示主题', 'Choose a demonstration')}">
        ${topics.map((s, i) => `<button type="button" data-live-topic="${i}" aria-pressed="${i === 0}">${t(...s.name)}<span aria-hidden="true"></span></button>`).join('')}
      </div>
      <div class="pd-live-grid">
        <div class="pd-live-copy">
          <h3 id="pd-live-title">${t(...topics[0].title)}</h3>
          <p id="pd-live-copy">${t(...topics[0].copy)}</p>
          <p class="pd-live-formula" id="pd-live-formula">${topics[0].formula}</p>
          <a href="#experiment/direction" id="pd-live-link">${t('打开完整实验', 'Open full experiment')} ↗</a>
        </div>
        <figure class="pd-live-stage">
          <svg id="pd-live-svg" viewBox="0 0 500 280" role="img" aria-label="${t('侧平举拉力、腿屈伸力臂与滑轮功率演示', 'Lateral-raise force, knee-extension arm and cable power')}"></svg>
          <figcaption class="pd-live-values">
            <span id="pd-live-input"></span>
            <strong><output id="pd-live-output"></output> <small id="pd-live-unit">N</small></strong>
          </figcaption>
        </figure>
      </div>
      <footer class="pd-live-bottom">
        <span id="pd-live-status">${t('正在准备图解', 'Preparing the diagram')}</span>
        <span>${t('理想模型 · 读数与图解同步', 'Ideal model · live readings')}</span>
      </footer>
    </section>`;
  }
  async function mountOverview() {
    leaveOverview();
    const token = overviewVersion, B = win.BM, P = B.Product, t = P.t, host = win.document.getElementById('pd-learning-live');
    if (!host) return;
    const f = id => host.querySelector('#' + id), controller = new AbortController(); let clock, topic = 0, sampled;
    overview = { destroy() { controller.abort(); clock?.destroy(); } };
    const set = (id, value) => { const el = f(id); if (el.textContent !== value) el.textContent = value; };
    try {
      for (const src of ['mechanics-core.js', 'mechanics-spring.js', 'experiment-engine.js']) await P.script(src);
      if (token !== overviewVersion || !host.isConnected) return;
      const X = B.Experiments, svg = f('pd-live-svg');
      const defs = '<defs><marker id="pd-live-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>';
      function select(index) {
        topic = index; const s = topics[topic];
        sampled = X.calculate(s.id, s.id === 'lever' ? { angle: 90 } : {});
        set('pd-live-title', t(...s.title)); set('pd-live-copy', t(...s.copy)); set('pd-live-formula', s.formula); set('pd-live-unit', s.unit);
        f('pd-live-link').setAttribute('href', '#experiment/' + s.id);
        host.querySelectorAll('[data-live-topic]').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
        const grid = '<path class="pd-live-gridline" d="M40 60H460M40 110H460M40 160H460M40 210H460M90 35V245M190 35V245M290 35V245M390 35V245"/>';
        if (s.id === 'direction') svg.innerHTML = defs + grid + `<path class="pd-live-axis" d="M35 215H450M215 245V40"/><text x="443" y="238">x</text><text x="190" y="44">y</text><path class="pd-live-ghost" d="M105 215L274 153M105 215V35M105 215L-64 153" transform="translate(110 0)"/><path id="pd-live-projection" class="pd-live-projection"/><path id="pd-live-component" class="pd-live-component" marker-end="url(#pd-live-arrow)"/><path id="pd-live-force" class="pd-live-force" marker-end="url(#pd-live-arrow)"/><circle cx="215" cy="215" r="6" class="pd-live-pivot"/><text x="358" y="53">F = 100 N</text><text id="pd-live-angle" x="245" y="246"></text>`;
        if (s.id === 'lever') svg.innerHTML = defs + grid + `<path class="pd-live-axis" d="M70 234H450"/><path class="pd-live-ghost" d="M160 70V230M360 70V230"/><path id="pd-live-arm" class="pd-live-arm"/><path id="pd-live-force" class="pd-live-force" marker-end="url(#pd-live-arrow)"/><path id="pd-live-distance" class="pd-live-component"/><circle cx="80" cy="195" r="7" class="pd-live-pivot"/><text x="60" y="264">O</text><text x="285" y="53">F = 100 N</text><text id="pd-live-distance-label" x="125" y="253"></text>`;
        if (s.id === 'power') svg.innerHTML = defs + grid + `<path class="pd-live-axis" d="M65 174H445"/><path class="pd-live-ghost" d="M100 65V210M400 65V210"/><path id="pd-live-cable" class="pd-live-spring"/><rect id="pd-live-mass" y="110" width="64" height="64" rx="12"/><path class="pd-live-energy-track" d="M90 251H410"/><path id="pd-live-energy" class="pd-live-energy"/><text x="65" y="53">${t('理想滑轮手柄的单程位移', 'Ideal cable handle, one-way travel')}</text><text id="pd-live-time" x="300" y="236"></text>`;
        svg.setAttribute('aria-label', t(...s.name));
        host.dataset.liveTopic = s.id;
      }
      function draw(q) {
        const s = topics[topic]; let r;
        if (s.id === 'power') r = X.atProgress(sampled, q);
        else { const frame = experimentFrame(s.id, sampled.p, q); r = X.atProgress({ ...sampled, p: frame.params }, frame.progress); }
        const node = id => f(id), path = (id, d) => node(id).setAttribute('d', d), num = (n, d = 1) => n.toFixed(d).replace(/^-0\.0$/, '0.0');
        if (s.id === 'direction') {
          const a = r.p.angle * Math.PI / 180, x = 215 + Math.cos(a) * 180, y = 215 - Math.sin(a) * 180;
          path('pd-live-force', `M215 215L${x} ${y}`); path('pd-live-component', `M215 215H${x}`); path('pd-live-projection', `M${x} 215V${y}`);
          set('pd-live-angle', 'α = ' + num(r.p.angle, 0) + '°'); set('pd-live-input', t('水平方向分量', 'Horizontal component') + ' · Fₓ'); set('pd-live-output', num(r.metrics.parallel));
        } else if (s.id === 'lever') {
          const x = 80 + r.p.reach * 400;
          path('pd-live-arm', `M80 195H${x}`); path('pd-live-force', `M${x} 195V85`); path('pd-live-distance', `M80 228v-7v7H${x}v-7`);
          set('pd-live-distance-label', 'd = ' + num(r.p.reach, 2) + ' m'); set('pd-live-input', t('绕 O 点的力矩', 'Torque about O') + ' · τ'); set('pd-live-output', num(r.metrics.torque));
        } else {
          const x = 100 + r.metrics.position / r.p.travel * 300;
          path('pd-live-cable', `M65 142H${x - 32}`); node('pd-live-mass').setAttribute('x', x - 32);
          const ratio = r.metrics.power / (sampled.metrics.work * Math.PI / (2 * r.p.duration));
          path('pd-live-energy', 'M90 251H' + (90 + ratio * 320)); set('pd-live-time', 't = ' + num(r.metrics.time) + ' s');
          set('pd-live-input', t('手柄瞬时机械功率', 'Instantaneous handle power') + ' · P'); set('pd-live-output', num(r.metrics.power, 1));
        }
        host.style.setProperty('--pd-live-progress', q);
        host.dataset.liveProgress = q.toFixed(3);
      }
      select(0); draw(0);
      clock = bindPlayback({ surface: host, duration: 12, hold: 0, onFrame: draw, onLoop() { select((topic + 1) % topics.length); }, onState(value) {
        set('pd-live-status', stateText(value, t)); set('pd-live-play', value.reason === 'reduced' ? t('静态观察', 'Static view') : value.wanted ? t('暂停演示', 'Pause demo') : t('继续演示', 'Resume demo'));
        f('pd-live-play').disabled = value.reason === 'reduced';
      }, onError(error) { P.notice(error.message, true); } });
      f('pd-live-play').addEventListener('click', () => clock.snapshot().wanted ? clock.pause() : clock.play(), { signal: controller.signal });
      host.querySelectorAll('[data-live-topic]').forEach(button => button.addEventListener('click', () => { select(Number(button.dataset.liveTopic)); clock.seek(.18, { pause: false }); }, { signal: controller.signal }));
    } catch (error) {
      if (token === overviewVersion && host.isConnected) { set('pd-live-status', t('自动图解暂不可用；完整实验仍可打开。', 'Automatic preview unavailable; the full experiments are still accessible.')); f('pd-live-play').disabled = true; }
    }
  }
  function leaveOverview() { ++overviewVersion; overview?.destroy(); overview = null; }
  return { createClock, bindPlayback, stateText, reduced, experimentFrame, comparisons, courseFrame, overviewHTML, mountOverview, leaveOverview };
});
