/* Local display-only localization. Never rewrites plans, records, input values or exports. */
(function (global) {
  'use strict';
  const B = global.BM ||= {};
  if (B.i18n) return;
  const doc = global.document;
  const KEY = 'bmmd_language_v1';
  const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const packs = [B.i18nTraining, B.i18nMechanics, B.i18nCatalog].filter(Boolean);
  const exact = new Map(), reverse = new Map(), patterns = [];
  const base = {
    'BM//MD 健身房动作负荷实验室': 'BM//MD — Training & Mechanics Lab',
    '设置': 'Settings', '语言': 'Language', '简体中文': 'Simplified Chinese',
    '英语': 'English', '已切换为英文': 'Language changed to English.',
    '已切换为简体中文': 'Language changed to Simplified Chinese.',
    '语言设置未能保存，当前页面仍可使用所选语言。': 'The language could not be saved. Your selection still applies to this page.',
    '动态效果设置': 'Motion settings', '向下探索': 'Explore below',
    '从认识到记录': 'From learning to logging', '今天，先学好': 'Today, start with',
    '一个动作': 'one movement', '。': '.', '在这里，你可以': 'Here you can',
    '从第一组开始，': 'From your very first set,', '看见进步': 'see your progress',
    '认识器械': 'Explore equipment', '学会动作': 'Learn movements', '学习动作': 'Learn movements',
    '记录训练': 'Log your training', '认识器械、学会动作、记录训练': 'Explore equipment, learn movements, and log your training',
    '按自己的节奏开始。': 'Start at your own pace.',
    '暂停标题互动': 'Pause title motion', '继续标题互动': 'Resume title motion', '静态标题': 'Static titles',
    '系统已启用减少动态效果': 'Reduced motion is enabled on your system',
    '此项控制标题的指针互动；其他文字动效跟随系统减少动态效果设置。': 'Controls pointer interaction on titles. Other text animations follow your system’s reduced-motion setting.',
    '准备': 'Ready', '已暂停': 'Paused', '稍晚了，抓住下一拍': 'A little late — catch the next beat', '就是现在': 'Now!',
    '记录与备份': 'Records & backup', '模型与个人记录分开': 'Models and personal records stay separate',
    '用途已展开 · 再次点击收起': 'Details shown · click again to hide', '查看用途 · 点击揭示': 'View purpose · click to reveal',
  };
  for (const pack of [{ exact: base }, ...packs]) {
    for (const [zh, en] of Object.entries(pack.exact || {})) {
      exact.set(normalize(zh), en);
      if (!reverse.has(normalize(en))) reverse.set(normalize(en), zh);
    }
    for (const item of pack.patterns || []) {
      try { patterns.push({ re: new RegExp(item.source, item.flags || ''), target: item.target }); } catch (_) { /* A bad optional rule cannot break the app. */ }
    }
  }
  const renderedSources = new Map(), cache = new Map(), missing = new Set();
  let language = 'zh-CN';
  try { if (global.localStorage?.getItem(KEY) === 'en') language = 'en'; } catch (_) { /* Session-only fallback. */ }
  const roots = new Map(), textRecords = new WeakMap(), attributeRecords = new WeakMap();
  const pending = new Set();
  let queued = false, changing = false;
  const cjk = /[\u3400-\u9fff]/;
  const source = value => renderedSources.get(normalize(value)) || reverse.get(normalize(value)) || String(value ?? '');
  function english(value) {
    const key = normalize(value);
    if (exact.has(key)) return exact.get(key);
    for (const rule of patterns) {
      rule.re.lastIndex = 0;
      if (rule.re.test(key)) { rule.re.lastIndex = 0; return key.replace(rule.re, rule.target); }
    }
    // Split only at authored UI punctuation; never replace arbitrary substrings.
    const chunks = key.split(/(\s*[·；;]\s*|\n)/);
    if (chunks.length > 1) {
      let changed = false;
      const output = chunks.map(part => {
        const known = exact.get(normalize(part));
        if (known) { changed = true; return known; }
        for (const rule of patterns) { rule.re.lastIndex = 0; if (rule.re.test(normalize(part))) { changed = true; rule.re.lastIndex = 0; return normalize(part).replace(rule.re, rule.target); } }
        return part;
      }).join('');
      if (changed) return output;
    }
    if (cjk.test(key) && key.length < 1800) missing.add(key);
    return value;
  }
  function t(value, requestedLanguage = language) {
    const raw = String(value ?? '');
    if (!raw.trim()) return raw;
    const original = source(raw);
    if (requestedLanguage !== 'en') return original;
    const cacheKey = normalize(original);
    let translated = cache.get(cacheKey);
    if (translated === undefined) { translated = english(original); cache.set(cacheKey, translated); }
    if (translated !== original) renderedSources.set(normalize(translated), original);
    const leading = raw.match(/^\s*/)[0], trailing = raw.match(/\s*$/)[0];
    // A translated prefix can deliberately end in a space before an inline
    // highlighted word. Keep that separator even when Chinese needs none.
    const body = translated === original ? String(translated).trim() : String(translated);
    return leading + body + trailing;
  }
  const skip = element => !element || !!element.closest?.('script,style,textarea,code,pre,[contenteditable="true"],[data-i18n-skip],[translate="no"],.bm-upgrade-button-label,.bm-upgrade-button-decor,.bm-text-letters,.bm-halftone-slot');
  function translateText(node) {
    if (skip(node.parentElement) || !node.data.trim()) return;
    let record = textRecords.get(node);
    if (!record || record.last !== node.data) record = { original: source(node.data), last: node.data };
    const next = t(record.original);
    if (node.data !== next) node.data = next;
    record.last = next; textRecords.set(node, record);
  }
  const attributes = ['aria-label', 'aria-valuetext', 'title', 'placeholder', 'alt', 'data-fx-static', 'data-fx-phrases'];
  function translateAttributes(element) {
    if (skip(element)) return;
    let records = attributeRecords.get(element);
    if (!records) { records = {}; attributeRecords.set(element, records); }
    for (const key of attributes) {
      const raw = element.getAttribute(key);
      if (raw === null) continue;
      let record = records[key];
      if (!record || record.last !== raw) record = { original: raw, last: raw };
      let next;
      if (key === 'data-fx-phrases') {
        try { next = JSON.stringify(JSON.parse(record.original).map(value => t(source(value)))); } catch (_) { next = raw; }
      } else next = t(source(record.original));
      if (next !== raw) element.setAttribute(key, next);
      record.last = next; records[key] = record;
    }
  }
  function picker() {
    const label = doc.createElement('label'); label.className = 'bm-language-picker';
    const caption = doc.createElement('span'); caption.textContent = '语言';
    const select = doc.createElement('select'); select.setAttribute('aria-label', '语言');
    for (const [value, text] of [['zh-CN', '简体中文'], ['en', 'English']]) {
      const option = doc.createElement('option'); option.value = value; option.textContent = text; select.append(option);
    }
    select.value = language;
    select.addEventListener('change', () => setLanguage(select.value));
    label.append(caption, select); return label;
  }
  function installControls(root) {
    root.querySelectorAll?.('.bm-home-settings-menu,.bm-action-menu-content,.pg-tool-menu').forEach(menu => {
      if (!menu.querySelector('.bm-language-picker')) menu.append(picker());
    });
    root.querySelectorAll?.('.bm-top nav,.eng-top,.pg-header').forEach(menu => {
      if (menu.querySelector('.bm-language-settings')) return;
      const details = doc.createElement('details'); details.className = 'bm-language-settings';
      const summary = doc.createElement('summary'); summary.textContent = t('设置');
      const panel = doc.createElement('div'); panel.className = 'bm-language-panel'; panel.append(picker());
      details.append(summary, panel); menu.append(details);
    });
    root.querySelectorAll?.('.bm-language-picker select').forEach(select => { if (select.value !== language) select.value = language; });
  }
  function translate(root = doc) {
    if (!doc || !root) return;
    if (root.nodeType === 3) { translateText(root); return; }
    if (root.nodeType === 1) translateAttributes(root);
    const walk = doc.createTreeWalker(root, 4);
    let text;
    while ((text = walk.nextNode())) translateText(text);
    root.querySelectorAll?.(attributes.map(key => '[' + key + ']').join(',')).forEach(translateAttributes);
  }
  function flush() {
    queued = false;
    const nodes = [...pending]; pending.clear();
    for (const node of nodes) if (node.isConnected || roots.has(node)) translate(node);
    for (const root of roots.keys()) if (root === doc || root.host?.isConnected) installControls(root);
  }
  function queue(node) {
    // Product pages own their bilingual copy. Do not rescan the document's
    // language controls for every live readout or SVG change inside them.
    if (skip(node.nodeType === 1 ? node : node.parentElement)) return;
    pending.add(node);
    if (!queued && !changing) { queued = true; queueMicrotask(flush); }
  }
  function registerRoot(root) {
    if (!root || !doc) return () => {};
    const existing = roots.get(root);
    if (existing) { existing.refs++; return () => releaseRoot(root); }
    const target = root === doc ? doc.documentElement : root;
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'childList') { for (const node of record.addedNodes) queue(node); }
        else queue(record.target);
      }
    });
    observer.observe(target, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
    let link = null;
    if (root !== doc) {
      link = doc.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('i18n.css', doc.baseURI).href; root.append(link);
    }
    roots.set(root, { observer, refs: 1, link });
    installControls(root); translate(root);
    return () => releaseRoot(root);
  }
  function releaseRoot(root) {
    const record = roots.get(root); if (!record || --record.refs > 0) return;
    record.observer.disconnect(); record.link?.remove(); roots.delete(root);
  }
  function setLanguage(value, persist = true) {
    if (!['zh-CN', 'en'].includes(value)) return false;
    if (value === language) return true;
    changing = true;
    doc?.dispatchEvent(new CustomEvent('bm:language-before-change', { detail: { language: value, previous: language } }));
    language = value;
    let saved = true;
    if (persist) { try { global.localStorage?.setItem(KEY, value); } catch (_) { saved = false; } }
    if (doc) {
      doc.documentElement.lang = value;
      for (const root of roots.keys()) { translate(root); installControls(root); }
      doc.title = t('BM//MD 健身房动作负荷实验室');
      doc.dispatchEvent(new CustomEvent('bm:language-change', { detail: { language: value } }));
      const live = doc.getElementById('bm-language-status');
      if (live) live.textContent = t(saved ? value === 'en' ? '已切换为英文' : '已切换为简体中文' : '语言设置未能保存，当前页面仍可使用所选语言。');
    }
    changing = false;
    if (pending.size && !queued) { queued = true; queueMicrotask(flush); }
    return true;
  }
  B.i18n = { t, source, translate, registerRoot, setLanguage, getLanguage: () => language,
    diagnostics: () => ({ language, roots: roots.size, entries: exact.size, patterns: patterns.length, missing: [...missing] }) };
  if (!doc) return;
  doc.documentElement.lang = language;
  function start() {
    const live = doc.createElement('p'); live.id = 'bm-language-status'; live.className = 'bm-language-status'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); doc.body.append(live);
    registerRoot(doc); doc.title = t('BM//MD 健身房动作负荷实验室');
    doc.addEventListener('keydown', event => { if (event.key === 'Escape') for (const root of roots.keys()) root.querySelectorAll?.('.bm-language-settings[open]').forEach(details => { details.open = false; details.querySelector('summary')?.focus(); }); });
    global.addEventListener('storage', event => { if (event.key === KEY && ['zh-CN', 'en'].includes(event.newValue)) setLanguage(event.newValue, false); });
    doc.dispatchEvent(new CustomEvent('bm:i18n-ready'));
  }
  // This script is placed before the application's renderers at the end of body.
  if (doc.body) start(); else doc.addEventListener('DOMContentLoaded', start, { once: true });
})(typeof window !== 'undefined' ? window : globalThis);
