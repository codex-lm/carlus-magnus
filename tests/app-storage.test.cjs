// Unit-test real application callbacks with a minimal DOM and in-memory storage.
const test = require('node:test');
const assert = require('node:assert/strict');
const { boot, legacy, SAVE_KEY, TRIAL_KEY } = require('./helpers/app-harness.cjs');

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
