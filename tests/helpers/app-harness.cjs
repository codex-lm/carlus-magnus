// Shared minimal DOM harness for real application callbacks; not a browser renderer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const legacy = require('../fixtures/legacy-v1.json');
const SAVE_KEY = 'carlus-magnus:aurore:v1';
const TRIAL_KEY = 'carlus-magnus:trials:v1';
const LANGUAGE_KEY = 'carlus-magnus:language:v1';

function boot(saveName = 'ongoing', options = {}) {
  const elements = new Map(), nodes = new Set(), listeners = new Map(), storage = new Map(options.storage || []);
  const original = options.original || JSON.stringify({ version: 1, config: legacy[saveName].config, snapshot: legacy[saveName], savedAt: 1 });
  storage.set(SAVE_KEY, original);
  if (options.locale) storage.set(LANGUAGE_KEY, options.locale);
  let frameCallback, clock = 100;
  const dataKey = name => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const decode = text => text.replace(/&(?:amp|quot|lt|gt|apos|#39);/g, value => ({ '&amp;': '&', '&quot;': '"', '&lt;': '<', '&gt;': '>', '&apos;': "'", '&#39;': "'" }[value]));
  class Element {
    constructor(id = '') {
      this.id = id; this.dataset = {}; this.style = {}; this.children = [];
      this.attributes = {}; nodes.add(this);
      this.value = ''; this.isConnected = true; this.handlers = {};
      const classes = new Set();
      this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: (x, on) => { const value = on ?? !classes.has(x); if (value) classes.add(x); else classes.delete(x); return value; } };
    }
    set innerHTML(text) { this._html = text; this.children = parse(text); }
    get innerHTML() { return this._html || ''; }
    set textContent(text) { this._text = String(text); this._html = String(text); this.children = []; }
    get textContent() { return this._text || this.innerHTML.replace(/<[^>]*>/g, ''); }
    insertAdjacentHTML(where, text) { this.children.push(...parse(text)); }
    setAttribute(name, value) { this.attributes[name] = String(value); this[name] = value; if (name.startsWith('data-')) this.dataset[dataKey(name.slice(5))] = String(value); }
    getAttribute(name) { return this.attributes[name] ?? null; }
    hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    querySelectorAll(selector) {
      const data = selector.match(/^\[data-([^\]=]+)(?:="([^"]*)")?\]$/);
      if (data) return this.children.filter(e => Object.hasOwn(e.dataset, dataKey(data[1])) && (data[2] === undefined || e.dataset[dataKey(data[1])] === data[2]));
      if (selector.includes('button')) return this.children.filter(e => e.tag === 'button');
      if (selector.startsWith('.')) return this.children.filter(e => (e.attributes.class || '').split(/\s+/).includes(selector.slice(1)));
      if (/^[a-z][\w-]*$/i.test(selector)) return this.children.filter(e => e.tag === selector);
      return [];
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    focus() { document.activeElement = this; }
  }
  function element(id) { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); }
  function parse(text) {
    const nodes = [];
    for (const match of text.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
      const attrs = match[2], id = attrs.match(/\bid="([^"]+)"/)?.[1];
      const node = id ? element(id) : new Element(); node.tag = match[1]; node.tagName = match[1].toUpperCase();
      node.disabled = /\bdisabled\b/.test(attrs);
      for (const a of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) node.setAttribute(a[1], decode(a[2]));
      const value = attrs.match(/\bvalue="([^"]*)"/)?.[1]; if (value != null) node.value = decode(value);
      node._text = decode(text.slice(match.index + match[0].length).split('<')[0]);
      nodes.push(node);
    }
    return nodes;
  }
  const document = { body: new Element('body'), documentElement: new Element('html'), activeElement: null, getElementById: element, addEventListener: (name, fn) => listeners.set(`document:${name}`, fn) };
  document.querySelectorAll = selector => Element.prototype.querySelectorAll.call({ children: [...nodes] }, selector);
  document.querySelector = selector => document.querySelectorAll(selector)[0] || null;
  document.body.innerHTML = fs.readFileSync(path.join(__dirname, '../../dist/index.html'), 'utf8');
  element('weapon-slots').innerHTML = '<button data-weapon="sword"></button><button data-weapon="axe"></button><button data-weapon="spear"></button>';
  const location = { search: options.search || '', href: `https://example.test/game/${options.search || ''}` };
  const context = vm.createContext({
    console, Math, Date, JSON, performance, URL, URLSearchParams, document, location, navigator: { getGamepads: () => [] },
    history: { replaceState(_state, _title, href) { location.href = href; location.search = new URL(href).search; } },
    matchMedia: () => ({ matches: false }),
    localStorage: {
      getItem: key => { if (options.deniedStorage) throw new Error('Storage denied'); return storage.get(key) ?? null; },
      setItem: (key, value) => { if (options.deniedStorage) throw new Error('Storage denied'); storage.set(key, String(value)); },
    },
    setTimeout: () => 1, clearTimeout: () => {}, requestAnimationFrame: fn => { frameCallback = fn; },
    addEventListener: (name, fn) => listeners.set(name, fn),
  });
  vm.runInContext('window = globalThis;', context);
  for (const file of ['i18n.js', 'i18n-engine.js', 'i18n-ui.js']) {
    const target = path.join(__dirname, '../../dist', file);
    if (fs.existsSync(target)) vm.runInContext(fs.readFileSync(target, 'utf8'), context);
  }
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../dist/engine.js'), 'utf8'), context);
  vm.runInContext('CM.Engine = class extends CM.Engine { constructor(...args) { super(...args); globalThis.testEngine = this; } }; CM.Renderer = class { draw() {} drawTitle() {} };', context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../dist/app.js'), 'utf8'), context);
  const tick = () => { clock += 16; frameCallback(clock); };
  const click = id => { assert.equal(typeof element(id).onclick, 'function', `${id} is wired`); element(id).onclick({ preventDefault() {} }); };
  const changeLanguage = (language, id = 'language-select') => {
    const select = element(id); select.value = language;
    assert.equal(typeof select.onchange, 'function', `${id} is wired`);
    select.onchange({ target: select });
  };
  const chooseTrial = type => {
    const button = element('modal-content').children.find(e => e.dataset.trial === type);
    assert.ok(button, `trial ${type} is rendered`); button.onclick(); tick();
  };
  return { context, storage, original, tick, click, chooseTrial, changeLanguage, element, listeners, unchanged: () => assert.equal(storage.get(SAVE_KEY), original) };
}

module.exports = { boot, legacy, SAVE_KEY, TRIAL_KEY, LANGUAGE_KEY };
