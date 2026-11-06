const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { boot, SAVE_KEY, TRIAL_KEY, LANGUAGE_KEY } = require('./helpers/app-harness.cjs');

function languageContext({ saved, search = '', denied = false } = {}) {
  const storage = new Map([[SAVE_KEY, 'untouched campaign']]);
  if (saved !== undefined) storage.set(LANGUAGE_KEY, saved);
  const location = { search, href: `https://example.test/game/${search}#play` };
  const replacements = [];
  const context = vm.createContext({
    console, URL, URLSearchParams, location, navigator: { language: 'en-US' },
    history: { replaceState(_state, _title, href) {
      replacements.push(href); location.href = href; location.search = new URL(href).search;
    } },
    localStorage: {
      getItem(key) { if (denied) throw new Error('Storage denied'); return storage.get(key) ?? null; },
      setItem(key, value) { if (denied) throw new Error('Storage denied'); storage.set(key, String(value)); },
    },
  });
  vm.runInContext('window = globalThis;', context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist/i18n.js'), 'utf8'), context);
  return { context, i18n: context.CM.I18N, storage, replacements, location };
}

function engineContext(locale = 'en') {
  const h = languageContext({ saved: locale });
  for (const file of ['i18n-engine.js', 'engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist', file), 'utf8'), h.context);
  }
  return { ...h, CM: h.context.CM };
}

test('French is the default; saved preference and explicit URL selection reload independently of campaign data', () => {
  assert.equal(languageContext().i18n.locale, 'fr', 'browser language does not silently change the default');
  assert.equal(languageContext({ saved: 'en' }).i18n.locale, 'en');
  const h = languageContext({ saved: 'fr', search: '?lang=en' });
  assert.equal(h.i18n.locale, 'en');
  assert.equal(h.storage.get(LANGUAGE_KEY), 'en');
  assert.equal(languageContext({ saved: h.storage.get(LANGUAGE_KEY) }).i18n.locale, 'en');
  assert.equal(languageContext({ saved: 'en', search: '?lang=fr' }).i18n.locale, 'fr');
  assert.equal(h.storage.get(SAVE_KEY), 'untouched campaign');
});

test('invalid locales are ignored and unavailable storage does not prevent switching languages', () => {
  assert.equal(languageContext({ saved: 'de', search: '?lang=xx' }).i18n.locale, 'fr');
  assert.equal(languageContext({ saved: 'en', search: '?lang=xx' }).i18n.locale, 'en');
  const h = languageContext({ denied: true });
  assert.equal(h.i18n.locale, 'fr');
  assert.equal(h.i18n.setLocale('en'), true);
  assert.equal(h.i18n.choose('Français', 'English'), 'English');
  assert.equal(h.i18n.setLocale('de'), false);
  assert.equal(h.i18n.locale, 'en');
  assert.equal(languageContext({ denied: true, search: '?lang=en' }).i18n.locale, 'en');
});

test('translation keeps case, whitespace and dynamic values without translating arbitrary name substrings', () => {
  const { i18n } = languageContext({ saved: 'en' });
  i18n.add({ 'Garde brisée': 'Guard broken', 'Charles': 'Not a player-name replacement' });
  i18n.addPattern(/^Parade réussie : (\d+)\/(\d+)\.$/, (hits, total) => `Successful parry: ${hits}/${total}.`);
  assert.equal(i18n.t('  GARDE BRISÉE  '), '  GUARD BROKEN  ');
  assert.equal(i18n.t('garde brisée'), 'guard broken');
  assert.equal(i18n.t('Parade réussie : 2/3.'), 'Successful parry: 2/3.');
  assert.equal(i18n.t('Charles ancien'), 'Charles ancien');
  i18n.setLocale('fr');
  assert.equal(i18n.t('Parade réussie : 2/3.'), 'Parade réussie : 2/3.');
});

test('language subscribers receive each actual transition once and can unsubscribe', () => {
  const { i18n, storage } = languageContext();
  const changes = [];
  const unsubscribe = i18n.subscribe(locale => changes.push(locale));
  i18n.setLocale('en'); i18n.setLocale('en'); i18n.setLocale('fr');
  assert.deepEqual(changes, ['en', 'fr']);
  assert.equal(storage.get(LANGUAGE_KEY), 'fr');
  unsubscribe(); i18n.setLocale('en');
  assert.deepEqual(changes, ['en', 'fr']);
});

test('changing an explicit URL language keeps the next reload consistent without changing unrelated URL data', () => {
  const h = languageContext({ search: '?lang=en&preview=1' });
  h.i18n.setLocale('fr');
  assert.equal(h.location.href, 'https://example.test/game/?lang=fr&preview=1#play');
  assert.equal(languageContext({ saved: h.storage.get(LANGUAGE_KEY), search: h.location.search }).i18n.locale, 'fr');
  const plain = languageContext({ search: '?preview=1' });
  plain.i18n.setLocale('en');
  assert.equal(plain.replacements.length, 0, 'ordinary navigation gains no language query');
  assert.equal(plain.storage.get(SAVE_KEY), 'untouched campaign');
});

test('all player-facing engine metadata translates without mutating source data or game progress', () => {
  const { CM, i18n } = engineContext();
  const groups = ['ROOMS', 'BOSSES', 'SKILLS', 'CHARMS', 'WEAPONS', 'ARCHETYPES'];
  const fields = new Set(['name', 'shortName', 'description', 'subtitle', 'tip', 'hint', 'label', 'weakpointLabel', 'openingLabel']);
  const original = JSON.stringify(groups.map(key => CM[key]));
  const strings = new Set();
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (fields.has(key) && typeof item === 'string') strings.add(item);
      else visit(item);
    }
  }
  groups.forEach(key => visit(CM[key]));
  assert.ok(strings.size > 100, 'the audit covers all zones, bosses, weapons, skills and charms');
  for (const source of strings) assert.notEqual(i18n.t(source), source, `missing English metadata: ${source}`);
  assert.equal(i18n.t(CM.WEAPONS.sword.name), 'Dawn Sword');
  assert.equal(i18n.t(CM.CHARMS.find(charm => charm.id === 'heart').name), 'Jade Heart');
  assert.equal(JSON.stringify(groups.map(key => CM[key])), original);
  const game = new CM.Engine({ name: 'Charles ancien', stats: { speed: 1, power: 4, vitality: 7 } });
  const before = JSON.stringify(game.snapshot());
  i18n.setLocale('fr');
  for (const source of strings) assert.equal(i18n.t(source), source);
  i18n.setLocale('en'); i18n.setLocale('fr');
  assert.equal(JSON.stringify(game.snapshot()), before);
  assert.equal(game.config.name, 'Charles ancien');
});

test('real boss pressure, parry and recovery hints retain their dynamic counts in English and French', () => {
  const { CM, i18n } = engineContext();
  const game = new CM.Engine({ difficulty: 'master' });
  game.startTrial('worm');
  const boss = game.enemies[0];
  game.parryBoss(boss);
  const parry = boss.actionHint;
  assert.equal(i18n.t(parry), 'Successful parry: 1/3. Keep up the pressure!');
  assert.equal(i18n.t(game.message.text), 'Its guard is cracking');
  game.finishMobileSequence(boss);
  const recovery = boss.actionHint;
  assert.equal(i18n.t(recovery), 'It is tiring: 1/3 exchanges. Keep dodging or parry!');
  assert.equal(i18n.t('PRESSION 2/3'), 'PRESSURE 2/3');
  i18n.setLocale('fr');
  assert.equal(i18n.t(parry), parry);
  assert.equal(i18n.t(recovery), recovery);
  assert.equal(boss.poise, 1);
  assert.equal(boss.attackCount, 1);
});

test('English title, accessibility labels and all five trial cards render through actual UI callbacks', () => {
  const app = boot('ongoing', { locale: 'en' });
  const doc = app.context.document;
  assert.equal(doc.documentElement.lang, 'en');
  assert.equal(doc.title, 'Carlus Magnus — Shards of Dawn');
  assert.equal(doc.querySelector('[data-i18n="Commencer l’aventure"]').textContent, 'Begin the adventure');
  assert.equal(app.element('world').getAttribute('aria-label'), 'Carlus Magnus world, a 2D platforming game');
  assert.equal(app.element('language-select').getAttribute('aria-label'), 'Game language');
  app.click('trial-button');
  assert.match(app.element('modal-content').innerHTML, /Five guardians\. Five ways to win\./);
  for (const boss of app.context.CM.BOSSES) {
    assert.ok(app.element('modal-content').innerHTML.includes(app.context.CM.I18N.t(boss.name)));
  }
  assert.doesNotMatch(app.element('modal-content').innerHTML, /Affronter ce gardien|aucun record|TROIS PHASES/);
  app.unchanged();
});

test('language round trips rerender skills, charms, map, help and pause without changing the campaign', () => {
  const app = boot(); app.click('continue-game'); app.click('pause-button');
  const game = app.context.testEngine;
  const before = JSON.stringify(game.snapshot()), saved = app.storage.get(SAVE_KEY);
  for (const [button, french, english] of [
    ['pause-button', 'La lumière t’attendra.', 'The light will wait for you.'],
    ['skills-button', 'Les talents de l’Aurore.', 'Skills of the Dawn.'],
    ['charms-button', 'Deux talismans. Ta façon de jouer.', 'Two talismans. Your way to play.'],
    ['map-button', 'Chaque détour est une découverte.', 'Every detour is a discovery.'],
    ['help-button', 'Un peu d’instinct. Le bon timing.', 'A little instinct. The right timing.'],
  ]) {
    app.click(button);
    assert.ok(app.element('modal-content').innerHTML.includes(french));
    const savedForModal = app.storage.get(SAVE_KEY);
    app.changeLanguage('en', 'modal-language-select');
    assert.ok(app.element('modal-content').innerHTML.includes(english));
    if (button === 'map-button') assert.doesNotMatch(app.element('modal-content').innerHTML, /Un nouveau chemin t’attend/);
    assert.equal(app.storage.get(SAVE_KEY), savedForModal, 'localizing an open menu does not resave the campaign');
    app.changeLanguage('fr');
    assert.ok(app.element('modal-content').innerHTML.includes(french));
    assert.equal(app.context.testEngine, game);
    assert.equal(JSON.stringify(game.snapshot()), before);
  }
  assert.equal(JSON.parse(app.storage.get(SAVE_KEY)).snapshot.config.name, JSON.parse(saved).snapshot.config.name);
  assert.equal(app.element('hero-name').textContent, `${game.config.name} · Explorateur`);
});

test('custom name, point allocation, selected weapon and difficulty survive language changes and reload', () => {
  const app = boot(); app.click('new-game');
  app.element('hero-cards').children.find(e => e.dataset.hero === '3').onclick();
  const name = 'Épée & <Charles>';
  app.element('custom-name').value = name;
  app.element('custom-name').handlers.input({ target: app.element('custom-name') });
  const adjust = (stat, step) => app.element('custom-controls').children.find(e => e.dataset.stat === stat && e.dataset.step === String(step)).onclick();
  adjust('power', -1); adjust('speed', 1);
  app.element('weapon-select').value = 'spear'; app.element('difficulty-select').value = 'master';
  app.element('custom-name').focus();
  for (const language of ['en', 'fr', 'en']) {
    app.changeLanguage(language);
    assert.equal(app.element('custom-name').value, name);
    assert.equal(app.element('weapon-select').value, 'spear');
    assert.equal(app.element('difficulty-select').value, 'master');
    assert.equal(app.context.document.activeElement.id, 'custom-name');
  }
  app.click('begin-game');
  const game = app.context.testEngine;
  assert.equal(game.config.name, name);
  assert.deepEqual(JSON.parse(JSON.stringify(game.config.stats)), { speed: 5, power: 3, vitality: 4 });
  assert.equal(game.player.weapon, 'spear');
  assert.equal(game.config.difficulty, 'master');
  assert.equal(app.element('hero-name').textContent, `${name} · Master`);
  const restored = boot('ongoing', { original: app.storage.get(SAVE_KEY), storage: app.storage });
  restored.click('continue-game');
  assert.equal(restored.context.CM.I18N.locale, 'en');
  assert.equal(restored.context.testEngine.config.name, name);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.context.testEngine.config.stats)), { speed: 5, power: 3, vitality: 4 });
});

test('translating trial selection preserves difficulty and translating its win never records another victory', () => {
  const app = boot(); app.click('trial-button');
  app.element('trial-difficulty').value = 'master';
  app.changeLanguage('en', 'modal-language-select');
  assert.equal(app.element('trial-difficulty').value, 'master');
  app.chooseTrial('duelist');
  const game = app.context.testEngine; game.time = 42; game.won = true; app.tick();
  const records = app.storage.get(TRIAL_KEY);
  assert.equal(JSON.parse(records)['master:duelist'].wins, 1);
  assert.match(app.element('modal-content').innerHTML, /The Eclipse Knight is defeated\./);
  app.changeLanguage('fr', 'modal-language-select');
  assert.match(app.element('modal-content').innerHTML, /Le Chevalier de l’Éclipse est vaincu\./);
  app.changeLanguage('en'); app.tick();
  assert.equal(app.storage.get(TRIAL_KEY), records);
  assert.equal(app.context.testEngine, game);
  app.unchanged();
});

test('the localized app still works when the browser denies local storage', () => {
  const app = boot('ongoing', { deniedStorage: true });
  app.changeLanguage('en'); app.click('new-game');
  app.element('weapon-select').value = 'sword'; app.element('difficulty-select').value = 'adventurer';
  app.click('begin-game');
  assert.equal(app.context.CarlusMagnus.status().screen, 'game');
  assert.match(app.element('save-indicator').textContent, /Saving is unavailable/);
  app.click('pause-button'); app.changeLanguage('fr', 'modal-language-select');
  assert.equal(app.context.CarlusMagnus.status().language, 'fr');
  assert.match(app.element('save-indicator').textContent, /Sauvegarde indisponible/);
});

test('canvas labels, boss warnings, pressure effects and shrine prompts use the current language on each draw', () => {
  const { CM, context, i18n } = engineContext();
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../dist/render.js'), 'utf8'), context);
  const labels = [];
  const gradient = () => ({ addColorStop() {} });
  const ctx = new Proxy({
    globalAlpha: 1, fillText: text => labels.push(text),
    createLinearGradient: gradient, createRadialGradient: gradient,
    measureText: text => ({ width: String(text).length * 7 }),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  const renderer = new CM.Renderer({ width: 1280, height: 720, getContext: () => ctx });
  const game = new CM.Engine();
  game.player.x = game.room.checkpoint.x;
  function drawLabels() {
    labels.length = 0;
    renderer.draw(game, 0);
    const boss = { x: 400, y: 300, w: 300, h: 340, weakpoint: { x: 500, y: 350, w: 80, h: 90, active: true }, vulnerabilityTimer: 3 };
    renderer.bossCore(boss, true);
    renderer.livingWeakpoint(boss, 'worm');
    renderer.bossTelegraph({ ...boss, attackKind: 'feathers' });
    renderer.effect({ type: 'text', text: 'PRESSION 2/3', x: 100, y: 100, life: 1 });
  }
  const before = JSON.stringify(game.snapshot());
  drawLabels();
  for (const label of ['E · Rest', 'CROWN EXPOSED', 'THROAT EXPOSED', 'FEATHERS · PARRY', 'PRESSURE 2/3']) assert.ok(labels.includes(label), label);
  i18n.setLocale('fr'); drawLabels();
  for (const label of ['E · Se reposer', 'COURONNE OUVERTE', 'GORGE EXPOSÉE', 'PLUMES · PAREZ', 'PRESSION 2/3']) assert.ok(labels.includes(label), label);
  assert.equal(JSON.stringify(game.snapshot()), before);
});

test('the offline build includes current language modules before gameplay and requires no external scripts or styles', () => {
  const directory = path.join(__dirname, '../dist');
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
  assert.deepEqual(files, ['i18n.js', 'i18n-engine.js', 'i18n-ui.js', 'engine.js', 'render.js', 'app.js']);
  const standalone = fs.readFileSync(path.join(directory, 'carlus-magnus.html'), 'utf8');
  assert.doesNotMatch(standalone, /<script\b[^>]*\bsrc\s*=|<link\b[^>]*rel="stylesheet"/i);
  assert.doesNotMatch(standalone, /url\(\s*['"]?https?:/i);
  const scripts = [...standalone.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.equal(scripts.length, files.length);
  files.forEach((file, index) => {
    const source = fs.readFileSync(path.join(directory, file), 'utf8').trim().replace(/\r\n/g, '\n');
    assert.ok(scripts[index].trim().replace(/\r\n/g, '\n').replace(/<\\\/script/gi, '</script') === source, `offline ${file} must match current source; regenerate the standalone build`);
    assert.doesNotThrow(() => new vm.Script(scripts[index], { filename: file }));
  });
});
