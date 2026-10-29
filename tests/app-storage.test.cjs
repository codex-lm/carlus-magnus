// Unit-test the real app callbacks with a minimal DOM and in-memory storage.
// This is not a browser substitute and makes no layout/rendering assertions.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const legacy = require('./fixtures/legacy-v1.json');
const SAVE_KEY = 'carlus-magnus:aurore:v1';
const TRIAL_KEY = 'carlus-magnus:trials:v1';

function boot(saveName = 'ongoing') {
  const elements = new Map(), listeners = new Map(), storage = new Map();
  const original = JSON.stringify({ version: 1, config: legacy[saveName].config, snapshot: legacy[saveName], savedAt: 1 });
  storage.set(SAVE_KEY, original);
  let frameCallback, clock = 100;
  class Element {
    constructor(id = '') {
      this.id = id; this.dataset = {}; this.style = {}; this.children = [];
      this.value = ''; this.isConnected = true; this.handlers = {};
      const classes = new Set();
      this.classList = { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: (x, on) => { const value = on ?? !classes.has(x); if (value) classes.add(x); else classes.delete(x); return value; } };
    }
    set innerHTML(text) { this._html = text; this.children = parse(text); }
    get innerHTML() { return this._html || ''; }
    insertAdjacentHTML(where, text) { this.children.push(...parse(text)); }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, fn) { this.handlers[name] = fn; }
    querySelectorAll(selector) {
      const data = selector.match(/^\[data-([^\]]+)\]$/);
      if (data) return this.children.filter(e => Object.hasOwn(e.dataset, data[1]));
      if (selector.includes('button')) return this.children.filter(e => e.tag === 'button');
      return [];
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    focus() { document.activeElement = this; }
  }
  function element(id) { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); }
  function parse(text) {
    const nodes = [];
    for (const match of text.matchAll(/<(button|select|input|canvas|a)\b([^>]*)>/g)) {
      const attrs = match[2], id = attrs.match(/\bid="([^"]+)"/)?.[1];
      const node = id ? element(id) : new Element(); node.tag = match[1];
      node.disabled = /\bdisabled\b/.test(attrs);
      for (const a of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)) node.dataset[a[1]] = a[2];
      const value = attrs.match(/\bvalue="([^"]*)"/)?.[1]; if (value != null) node.value = value;
      nodes.push(node);
    }
    return nodes;
  }
  const document = { body: new Element('body'), activeElement: null, getElementById: element, addEventListener: (name, fn) => listeners.set(`document:${name}`, fn) };
  element('weapon-slots').innerHTML = '<button data-weapon="sword"></button><button data-weapon="axe"></button><button data-weapon="spear"></button>';
  const context = vm.createContext({
    console, Math, Date, JSON, performance, document, navigator: { getGamepads: () => [] },
    matchMedia: () => ({ matches: false }),
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) },
    setTimeout: () => 1, clearTimeout: () => {}, requestAnimationFrame: fn => { frameCallback = fn; },
    addEventListener: (name, fn) => listeners.set(name, fn),
  });
  vm.runInContext('window = globalThis;', context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist/engine.js'), 'utf8'), context);
  vm.runInContext('CM.Engine = class extends CM.Engine { constructor(...args) { super(...args); globalThis.testEngine = this; } }; CM.Renderer = class { draw() {} drawTitle() {} };', context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist/app.js'), 'utf8'), context);
  const tick = () => { clock += 16; frameCallback(clock); };
  const click = id => { assert.equal(typeof element(id).onclick, 'function', `${id} is wired`); element(id).onclick({ preventDefault() {} }); };
  const chooseTrial = type => {
    const button = element('modal-content').children.find(e => e.dataset.trial === type);
    assert.ok(button, `trial ${type} is rendered`); button.onclick(); tick();
  };
  return { context, storage, original, tick, click, chooseTrial, element, listeners, unchanged: () => assert.equal(storage.get(SAVE_KEY), original) };
}

test('trial pause, pagehide, death, retry and exit never overwrite an existing campaign', () => {
  const app = boot();
  app.click('trial-button'); app.chooseTrial('warden'); app.unchanged();
  app.listeners.get('pagehide')(); app.unchanged();
  app.click('pause-button'); app.unchanged();
  app.click('resume-button');
  const trial = app.context.testEngine;
  trial.player.invulnerable = 0; trial.hurt(99999, null, true); app.tick();
  assert.equal(app.context.CarlusMagnus.status().modal, 'dead'); app.unchanged();
  app.click('retry-button'); app.tick(); app.unchanged();
  app.click('pause-button'); app.click('pause-title'); app.tick();
  assert.equal(app.context.CarlusMagnus.status().screen, 'title'); app.unchanged();
});

test('trial wins use separate records and selecting another colossus does not reopen the old win', () => {
  const app = boot('completed');
  app.click('trial-button'); app.chooseTrial('warden');
  app.context.testEngine.won = true; app.context.testEngine.time = 50; app.tick();
  assert.equal(app.context.CarlusMagnus.status().modal, 'win');
  assert.equal(JSON.parse(app.storage.get(TRIAL_KEY)).warden.best, 50); app.unchanged();
  app.tick(); app.tick();
  assert.equal(JSON.parse(app.storage.get(TRIAL_KEY)).warden.wins, 1, 'one win is recorded once');
  app.click('trial-other'); app.tick();
  assert.equal(app.context.CarlusMagnus.status().modal, 'trials');
  app.click('modal-close'); app.tick();
  assert.equal(app.context.CarlusMagnus.status().modal, null);
  assert.equal(app.context.CarlusMagnus.status().screen, 'title'); app.unchanged();
  app.click('trial-button'); app.chooseTrial('king');
  app.context.testEngine.won = true; app.tick();
  app.click('trial-retry'); app.tick();
  assert.equal(app.context.CarlusMagnus.status().won, false); app.unchanged();
});

test('continuing after a trial still loads the original custom campaign character', () => {
  const app = boot();
  app.click('trial-button'); app.chooseTrial('king');
  app.click('pause-button'); app.click('pause-title'); app.unchanged();
  app.click('continue-game');
  const restored = app.context.testEngine;
  assert.equal(restored.config.name, legacy.ongoing.config.name);
  assert.equal(restored.player.weapon, legacy.ongoing.player.weapon);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.player.skills)), legacy.ongoing.player.skills);
  assert.equal(restored.shards, legacy.ongoing.shards);
  assert.equal(restored.trial, false);
});

test('campaign death snapshots persist recent loot for reload at the sanctuary', () => {
  const app = boot(); app.click('continue-game');
  const game = app.context.testEngine;
  game.shards += 4; game.player.invulnerable = 0; game.hurt(99999, null, true); app.tick();
  const saved = JSON.parse(app.storage.get(SAVE_KEY)).snapshot;
  assert.equal(saved.dead, true);
  assert.equal(saved.shards, legacy.ongoing.shards + 4);
});

test('all five trial buttons enter the requested fight without changing the campaign', () => {
  for (const type of ['warden', 'king', 'moth', 'worm', 'duelist']) {
    const app = boot(); app.click('trial-button'); app.chooseTrial(type);
    assert.equal(app.context.testEngine.trial, type);
    assert.ok(app.context.testEngine.enemies.some(e => e.bossType === type));
    app.unchanged();
    app.click('pause-button'); app.click('pause-title'); app.unchanged();
  }
});

test('Master trial records remain separate from Adventurer and Explorer does not replace either', () => {
  const app = boot();
  for (const [difficulty, time] of [['master', 60], ['adventurer', 50], ['explorer', 10]]) {
    app.click('trial-button'); app.element('trial-difficulty').value = difficulty; app.chooseTrial('king');
    assert.equal(app.context.testEngine.config.difficulty, difficulty);
    app.context.testEngine.time = time; app.context.testEngine.won = true; app.tick();
    app.click('trial-home'); app.unchanged();
  }
  const records = JSON.parse(app.storage.get(TRIAL_KEY));
  assert.equal(records.king.best, 50);
  assert.equal(records['master:king'].best, 60);
  assert.equal(records.king.wins, 1);
  assert.equal(records['master:king'].wins, 1);
});

test('talismans menu toggles owned equipment, enforces slots, and persists its choice', () => {
  const app = boot(); app.click('continue-game');
  const game = app.context.testEngine;
  game.ownedCharms = ['heart', 'wind', 'fang'];
  app.click('charms-button');
  const pick = id => app.element('modal-content').children.find(e => e.dataset.charm === id);
  pick('heart').onclick(); pick('wind').onclick();
  assert.equal(game.equippedCharms.length, 2);
  assert.equal(pick('fang').disabled, true);
  pick('heart').onclick(); pick('fang').onclick();
  assert.deepEqual(JSON.parse(JSON.stringify(game.equippedCharms)), ['wind', 'fang']);
  assert.deepEqual(JSON.parse(app.storage.get(SAVE_KEY)).snapshot.equippedCharms, ['wind', 'fang']);
});

test('the heal button and F input are wired, and holding F does not drink twice', () => {
  const app = boot(); app.click('continue-game');
  const game = app.context.testEngine; game.enemies = [];
  game.player.hp = 1; game.player.flasks = 1;
  app.click('heal-button');
  assert.equal(game.player.hp, 51); assert.equal(game.player.flasks, 0);
  game.player.skills.reserve = true; game.recalculate(); game.player.flasks = 2; game.player.hp = 1;
  for (let n = 0; n < 130; n++) app.tick();
  const key = { code: 'KeyF', repeat: false, preventDefault() {} };
  app.listeners.get('keydown')(key); app.tick();
  for (let n = 0; n < 130; n++) app.tick();
  assert.equal(game.player.flasks, 1);
  assert.equal(game.player.hp, 51);
  app.listeners.get('keyup')(key);
  app.tick(); app.listeners.get('keydown')(key); app.tick();
  assert.equal(game.player.flasks, 0);
});

test('the pause attack-zone toggle persists in campaign but does not overwrite it from a trial', () => {
  const app = boot(); app.click('continue-game'); app.click('pause-button');
  const campaign = app.context.testEngine;
  assert.equal(campaign.showAttackZones, true);
  app.click('pause-zones');
  assert.equal(campaign.showAttackZones, false);
  assert.equal(JSON.parse(app.storage.get(SAVE_KEY)).snapshot.showAttackZones, false);
  app.click('pause-title');
  const preserved = app.storage.get(SAVE_KEY);
  app.click('trial-button'); app.element('trial-difficulty').value = 'master'; app.chooseTrial('moth');
  assert.equal(app.context.testEngine.showAttackZones, false);
  app.click('pause-button'); app.click('pause-zones');
  assert.equal(app.context.testEngine.showAttackZones, true);
  assert.equal(app.storage.get(SAVE_KEY), preserved);
});
