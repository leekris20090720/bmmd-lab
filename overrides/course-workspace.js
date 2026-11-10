/* Course presentation only. Chapters share the existing model, camera and clock. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BM.CourseWorkspace = api;
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const chapters = [
    { key: 'overview', label: ['认识动作', 'Overview'], sections: ['overview', 'parts'] },
    { key: 'setup', label: ['调节器械', 'Setup'], sections: ['setup'] },
    { key: 'steps', label: ['动作流程', 'Movement'], sections: ['steps', 'observe'] },
    { key: 'compare', label: ['姿态对照', 'Compare'], sections: ['compare'] },
    { key: 'physics', label: ['受力原理', 'Mechanics'], sections: ['physics'] },
    { key: 'evidence', label: ['研究与来源', 'Evidence'], sections: ['research', 'check', 'sources'] }
  ];
  function mount({ root, signal, t, onSelect = () => {} }) {
    const doc = root.ownerDocument, main = root.querySelector('.pd-main');
    const content = root.querySelector('#pd-content'), prose = content?.querySelector('.pd-course-prose');
    const demo = content?.querySelector('.pd-course-demo');
    if (!prose || !demo) return null;
    doc.body.dataset.courseLayout = 'split';
    demo.classList.add('pd-course-persistent');
    const create = (tag, className) => { const node = doc.createElement(tag); node.className = className; return node; };
    const top = create('div', 'pd-course-topline');
    top.append(main.querySelector('.pd-return-bar'), main.querySelector('.pd-page-heading'));
    main.prepend(top);
    content.querySelector('.pd-lead')?.remove(); // The same introduction remains in Overview.
    content.querySelector('.pd-course-toc')?.remove();
    const workspace = create('div', 'pd-course-workspace');
    const reader = create('section', 'pd-course-reader');
    reader.setAttribute('aria-label', t('动作知识', 'Movement knowledge'));
    const tabs = create('div', 'pd-course-chapters'); tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', t('学习章节', 'Lesson chapters'));
    const panels = chapters.map((chapter, index) => {
      const button = create('button', 'pd-course-chapter-tab'); button.type = 'button';
      button.id = 'pd-chapter-tab-' + chapter.key; button.dataset.courseChapter = String(index);
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', 'pd-chapter-' + chapter.key);
      button.textContent = t(...chapter.label); tabs.append(button);
      const panel = create('section', 'pd-course-chapter'); panel.id = 'pd-chapter-' + chapter.key;
      panel.dataset.chapter = chapter.key; panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', button.id);
      chapter.sections.forEach(id => { const section = prose.querySelector('#course-' + id); if (section) panel.append(section); });
      return panel;
    });
    prose.replaceChildren(...panels); prose.classList.add('pd-course-reading');
    prose.tabIndex = 0; prose.setAttribute('role', 'region'); prose.setAttribute('aria-label', t('本章内容，可上下滚动阅读', 'Chapter content; scroll to read'));
    const mobileBoundary = create('p', 'pd-course-mobile-boundary');
    mobileBoundary.textContent = demo.querySelector('.pd-demo-badge').textContent;
    panels[0].querySelector('#course-overview').append(mobileBoundary);
    const footer = create('div', 'pd-course-pager');
    const previous = create('button', 'pd-course-previous'); previous.type = 'button'; previous.textContent = t('← 上一章', '← Previous');
    const count = create('span', 'pd-course-page-count'); count.setAttribute('role', 'status');
    const next = create('button', 'pd-course-next'); next.type = 'button'; next.textContent = t('下一章 →', 'Next →');
    footer.append(previous, count, next); reader.append(tabs, prose, footer);
    workspace.append(reader, demo); content.append(workspace);

    // Keep the existing controls and event bindings; only move their DOM nodes.
    const actions = demo.querySelector('.pd-actions'), play = demo.querySelector('#pd-course-play');
    actions.prepend(play);
    const views = create('details', 'pd-course-view-menu'), summary = doc.createElement('summary');
    summary.textContent = t('视角', 'View');
    const tools = create('div', 'pd-course-view-options'); tools.setAttribute('role', 'group');
    tools.setAttribute('aria-label', t('模型视角', 'Model view'));
    actions.querySelectorAll('[data-course-view],[data-course-zoom]').forEach(button => tools.append(button));
    const help = demo.querySelector('.pd-course-demo-controls .pd-note'); if (help) tools.append(help);
    views.append(summary, tools); actions.append(views);
    const phases = demo.querySelector('.pd-course-phase-strip');
    demo.querySelector('.pd-course-demo-controls').prepend(phases);

    let current = 0, gesture = null, animation = null;
    const scrollPositions = panels.map(() => 0), buttons = [...tabs.children];
    function revealCurrent() {
      const tabRect = buttons[current].getBoundingClientRect(), tabsRect = tabs.getBoundingClientRect();
      if (tabRect.left < tabsRect.left) tabs.scrollLeft -= tabsRect.left - tabRect.left + 4;
      else if (tabRect.right > tabsRect.right) tabs.scrollLeft += tabRect.right - tabsRect.right + 4;
    }
    const tabResize = new ResizeObserver(revealCurrent);
    tabResize.observe(tabs);
    function select(index, notify = true) {
      index = Math.max(0, Math.min(chapters.length - 1, index));
      const changed = index !== current;
      const focusInside = changed && panels[current].contains(doc.activeElement);
      scrollPositions[current] = prose.scrollTop;
      current = index;
      panels.forEach((panel, i) => { panel.hidden = i !== current; panel.inert = i !== current; });
      buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === current)); button.tabIndex = i === current ? 0 : -1; });
      prose.scrollTop = scrollPositions[current];
      previous.disabled = current === 0; next.disabled = current === chapters.length - 1;
      count.textContent = (current + 1) + ' / ' + chapters.length;
      reader.dataset.chapter = chapters[current].key;
      revealCurrent();
      if (focusInside) prose.focus({ preventScroll: true });
      if (changed && !doc.documentElement.classList.contains('pd-reduced') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animation?.cancel();
        animation = panels[current].animate?.([{ opacity: .5, transform: 'translateX(8px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
      }
      if (notify && changed) onSelect(chapters[current].key);
    }
    tabs.addEventListener('click', event => { const button = event.target.closest('[data-course-chapter]'); if (button) select(Number(button.dataset.courseChapter)); }, { signal });
    tabs.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); select(event.key === 'Home' ? 0 : event.key === 'End' ? chapters.length - 1 : current + (event.key === 'ArrowLeft' ? -1 : 1)); buttons[current].focus();
    }, { signal });
    previous.addEventListener('click', () => select(current - 1), { signal });
    next.addEventListener('click', () => select(current + 1), { signal });
    prose.addEventListener('keydown', event => {
      if (event.target !== prose || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      select(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }, { signal });
    prose.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || event.target.closest('button,a,input,select,textarea,summary')) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
    }, { signal, passive: true });
    prose.addEventListener('pointerup', event => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y, elapsed = event.timeStamp - gesture.time; gesture = null;
      if (elapsed < 800 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.6) select(current + (dx < 0 ? 1 : -1));
    }, { signal, passive: true });
    prose.addEventListener('pointercancel', () => { gesture = null; }, { signal });
    signal.addEventListener('abort', () => { animation?.cancel(); tabResize.disconnect(); }, { once: true });
    select(0, false);
    return {
      get current() { return chapters[current].key; },
      showSection(id) {
        const index = chapters.findIndex(chapter => chapter.sections.includes(id.replace(/^course-/, '')));
        if (index >= 0) {
          select(index);
          const section = doc.getElementById(id), padding = parseFloat(doc.defaultView.getComputedStyle(prose).paddingTop) || 0;
          if (section) prose.scrollTop += section.getBoundingClientRect().top - prose.getBoundingClientRect().top - padding;
        }
      }
    };
  }
  return { mount, chapters };
});
