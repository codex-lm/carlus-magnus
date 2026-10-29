const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const legacyV11 = require('./fixtures/legacy-v11.json');
const legacyV1 = require('./fixtures/legacy-v1.json');

function create(config, saved) {
  const context = vm.createContext({ console, Math, Date, JSON, performance });
  const file = path.join(__dirname, '../dist/engine.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return { CM: context.CM, game: new context.CM.Engine(config, saved) };
}
const plain = value => JSON.parse(JSON.stringify(value));
function step(game, seconds, input = {}) {
  for (let frame = 0; frame < Math.ceil(seconds * 120); frame++) game.update(1 / 120, input);
}
function arena(config) {
  const result = create(config), g = result.game;
  g.room.platforms = [{ x: 0, y: 650, w: 2200, h: 100 }];
  g.room.hazards = []; g.enemies = []; g.pickups = []; g.secretWalls = [];
  g.player.x = 400; g.player.y = 598; g.checkpointLit = true;
  step(g, .1);
  return result;
}
function configure(game, { skill, charm } = {}) {
  if (skill) { game.player.skills[skill] = true; game.recalculate(); }
  if (charm) { game.ownedCharms.push(charm); assert.equal(game.equipCharm(charm), true); }
}
function targetAtPlayer(game, below = false) {
  const p = game.player;
  const enemy = game.makeEnemy({ id: 'test-target', type: 'crawler', x: below ? p.x - 6 : p.x + 55, y: 614 });
  enemy.hp = enemy.maxHp = 1000; game.enemies = [enemy];
  return enemy;
}
function damageWith(options = {}, down = false) {
  const { game } = arena(); configure(game, options);
  if (down) { game.player.y = 500; game.player.vy = 120; game.player.grounded = false; }
  const enemy = targetAtPlayer(game, down);
  step(game, .23, { attack: true, down });
  return enemy.maxHp - enemy.hp;
}

test('the expanded campaign preserves original room indices and declares all new content', () => {
  const { CM } = create();
  assert.equal(CM.ROOMS.length, 12);
  assert.deepEqual(plain(CM.ROOMS.slice(0, 6).map(r => r.id)), ['glade', 'roots', 'warden', 'aqueduct', 'forge', 'crown']);
  assert.deepEqual(plain(CM.BOSSES.map(b => b.id).sort()), ['duelist', 'king', 'moth', 'warden', 'worm']);
  assert.equal(CM.SKILLS.length, 12);
  assert.equal(new Set(CM.SKILLS.map(s => s.id)).size, 12);
  assert.equal(CM.CHARMS.length, 6);
  assert.equal(new Set(CM.CHARMS.map(s => s.id)).size, 6);
  for (const b of CM.BOSSES) assert.ok(CM.ROOMS[b.roomIndex].enemies.some(e => e.bossType === b.id));
});

for (const [label, saves] of [['v1', legacyV1], ['v1.1', legacyV11]]) {
  for (const kind of ['ongoing', 'dead', 'completed']) {
    test(`${label} ${kind} character migrates without losing earned progress`, () => {
      const save = saves[kind], { game } = create(undefined, save);
      for (const key of ['stats', 'skills', 'weapon', 'doubleJump', 'bonusPower', 'bonusVitality']) {
        assert.deepEqual(plain(game.player[key]), save.player[key]);
      }
      for (const key of ['shards', 'skillPoints', 'kills', 'deaths', 'time']) assert.equal(game[key], save[key]);
      for (const key of ['collected', 'defeated', 'bossesDefeated']) assert.deepEqual(plain(game[key]), save[key]);
      assert.deepEqual(plain(game.destroyedWalls), save.destroyedWalls || []);
      assert.equal(game.config.name, save.config.name);
      assert.equal(game.dead, false);
      assert.equal(game.won, false, 'old chapter-one completion unlocks continuation instead of ending the expanded game');
      if (kind === 'completed') {
        assert.equal(game.roomIndex, 6, 'continued character starts the new chapter');
        assert.equal(game.checkpoint.roomIndex, 6);
        assert.equal(game.atSanctuary(), true, 'migration lands safely at the new shrine');
        assert.ok(save.roomsVisited.every(index => game.roomsVisited.includes(index)));
      }
      assert.equal(game.snapshot().revision, 3);
      assert.ok(Array.isArray(game.ownedCharms));
      assert.ok(Array.isArray(game.equippedCharms));
      assert.ok(Number.isFinite(game.player.flasks));
      const restored = create(undefined, plain(game.snapshot())).game;
      assert.equal(restored.roomIndex, game.roomIndex, 'migration is not repeated on a current save');
      assert.deepEqual(plain(restored.player.skills), save.player.skills);
    });
  }
}

test('new final victory remains complete when a revision-three save is reloaded', () => {
  const { CM, game } = create();
  const end = CM.BOSSES.find(b => b.id === 'duelist');
  game.bossesDefeated = CM.BOSSES.map(b => `boss-${b.id}`);
  game.player.doubleJump = true;
  game.loadRoom(end.roomIndex, 800, 598); game.won = true;
  const restored = create(undefined, plain(game.snapshot())).game;
  assert.equal(restored.won, true);
  assert.equal(restored.roomIndex, end.roomIndex);
});

test('talismans require ownership, respect two slots, and cannot create health by swapping', () => {
  const { game } = arena();
  const max = game.player.maxHp;
  assert.equal(game.equipCharm('heart'), false);
  assert.equal(game.equipCharm('unknown'), false);
  game.ownedCharms = ['heart', 'wind', 'fang'];
  game.player.hp = 50;
  assert.equal(game.equipCharm('heart'), true);
  assert.equal(game.player.maxHp, max + 25);
  assert.equal(game.player.hp, 50);
  assert.equal(game.equipCharm('wind'), true);
  assert.equal(game.equipCharm('fang'), false);
  assert.equal(game.equippedCharms.length, 2);
  for (let n = 0; n < 4; n++) {
    assert.equal(game.equipCharm('heart'), true);
    assert.equal(game.player.maxHp, max);
    assert.equal(game.equipCharm('heart'), true);
    assert.equal(game.player.maxHp, max + 25);
    assert.equal(game.player.hp, 50);
  }
  assert.equal(new Set(game.equippedCharms).size, 2);
  const restored = create(undefined, plain(game.snapshot())).game;
  assert.deepEqual(plain(restored.ownedCharms), plain(game.ownedCharms));
  assert.deepEqual(plain(restored.equippedCharms), plain(game.equippedCharms));
  assert.equal(restored.player.maxHp, max + 25);
  assert.equal(restored.player.hp, 50);
});

test('limited healing preserves zero charges, never wastes at full life, and refills at shrines', () => {
  const { game } = arena();
  assert.equal(game.player.flasks, 1);
  assert.equal(game.heal(), false, 'full life does not consume a flask');
  assert.equal(game.player.flasks, 1);
  game.player.hp = 20;
  assert.equal(game.heal(), true);
  assert.equal(game.player.hp, 70);
  assert.equal(game.player.flasks, 0);
  assert.equal(game.heal(), false);
  assert.equal(game.player.hp, 70);
  const restored = create(undefined, plain(game.snapshot())).game;
  assert.equal(restored.player.flasks, 0, 'zero is a real saved value, not a missing default');
  restored.player.x = restored.room.checkpoint.x;
  restored.player.y = restored.room.checkpoint.y - restored.player.h;
  assert.equal(restored.interact(), true);
  assert.equal(restored.player.flasks, restored.player.maxFlasks);
  restored.dead = true; restored.player.hp = 10;
  const charges = restored.player.flasks;
  assert.equal(restored.heal(), false);
  assert.equal(restored.player.flasks, charges);
});

test('holding heal spends one flask and reserve/restoration talents have their stated effects', () => {
  const { game } = arena();
  game.player.skills.vigor = true; game.skillPoints = 10;
  assert.equal(game.buySkill('reserve'), true);
  assert.equal(game.player.maxFlasks, 2);
  game.player.x = game.room.checkpoint.x; game.player.y = 598; game.interact();
  game.player.x = 400; game.player.hp = 1;
  step(game, 2, { heal: true });
  assert.equal(game.player.flasks, 1, 'held key cannot drink both flasks');
  assert.equal(game.player.hp, 51);
  step(game, .1);
  step(game, .02, { heal: true });
  assert.equal(game.player.flasks, 0, 'a second press uses the remaining flask');
  assert.equal(game.player.hp, 101);
  assert.equal(game.buySkill('restoration'), true);
  game.player.flasks = 1; game.player.hp = 1;
  step(game, 2);
  assert.equal(game.heal(), true);
  assert.equal(game.player.hp, 76);
});

test('wind, fang, mirror, moss and magnet apply their described passive effects', () => {
  const normal = arena().game, wind = arena().game;
  configure(wind, { charm: 'wind' });
  step(normal, .6, { right: true }); step(wind, .6, { right: true });
  assert.ok(Math.abs(wind.player.vx / normal.player.vx - 1.1) < .001);
  assert.ok(wind.player.x > normal.player.x);
  assert.ok(Math.abs(damageWith({ charm: 'fang' }) / damageWith() - 1.12) < .001);

  const plainGuard = arena().game, mirror = arena().game;
  configure(mirror, { charm: 'mirror' });
  step(plainGuard, 1 / 120, { block: true }); step(mirror, 1 / 120, { block: true });
  assert.ok(Math.abs(mirror.player.parryTime - plainGuard.player.parryTime - .045) < .0001);

  const moss = arena().game; configure(moss, { charm: 'moss' }); moss.player.hp = 20;
  const enemy = targetAtPlayer(moss); enemy.hp = 1;
  step(moss, .23, { attack: true });
  assert.equal(moss.player.hp, 25);

  const magnet = arena().game; configure(magnet, { charm: 'magnet' });
  magnet.pickups = [{ id: 'distant-shard', type: 'shard', x: magnet.player.x + 90, y: 610, w: 26, h: 30 }];
  magnet.updatePickups();
  assert.equal(magnet.shards, 1);
  magnet.loadRoom(3, 1035, 263);
  magnet.updatePickups();
  assert.equal(magnet.collected.includes('a-secret'), false, 'magnet does not bypass a sealed secret');
});

test('pogo, parryheal and economy talents change actual combat outcomes', () => {
  assert.ok(Math.abs(damageWith({ skill: 'pogo' }, true) / damageWith({}, true) - 1.5) < .001);
  const { game } = arena(); configure(game, { skill: 'parryheal' }); game.player.hp = 20;
  const enemy = targetAtPlayer(game);
  step(game, 1 / 120, { block: true }); game.hurt(20, enemy);
  assert.equal(game.player.hp, 28);

  const normal = arena().game, economy = arena().game;
  configure(economy, { skill: 'economy' });
  const normalBefore = normal.player.stamina, economyBefore = economy.player.stamina;
  normal.attack(); economy.attack();
  assert.ok(Math.abs((economyBefore - economy.player.stamina) / (normalBefore - normal.player.stamina) - .75) < .001);
});

test('afterdash empowers the next timely strike once and expires when unused', () => {
  const base = damageWith();
  for (const late of [false, true]) {
    const { game } = arena(); configure(game, { skill: 'afterdash' });
    step(game, .2, { dash: true });
    if (late) step(game, 1.3);
    let target = targetAtPlayer(game);
    step(game, .23, { attack: true });
    const damage = target.maxHp - target.hp;
    assert.ok(Math.abs(damage / base - (late ? 1 : 1.5)) < .001);
    step(game, .6);
    target = targetAtPlayer(game);
    step(game, .23, { attack: true });
    assert.ok(Math.abs((target.maxHp - target.hp) / base - 1) < .001, 'buff is consumed by the first strike');
  }
});

test('difficulty changes damage and timing without inflating boss health', () => {
  const cases = [
    ['explorer', 11, .26, 8, 6.5],
    ['adventurer', 20, .18, 6.5, 5.5],
    ['master', 27, .14, 5.2, 4.4],
  ];
  let bossHp;
  for (const [difficulty, incoming, parry, giantWindow, mobileWindow] of cases) {
    const { game } = arena({ difficulty });
    const hp = game.player.hp;
    game.hurt(20, null, true);
    assert.equal(hp - game.player.hp, incoming, `${difficulty} damage`);
    step(game, 1 / 120, { block: true });
    assert.ok(Math.abs(game.player.parryTime - parry) < .0001, `${difficulty} parry timing`);
    game.startTrial('warden');
    let boss = game.enemies.find(e => e.type === 'boss');
    bossHp ??= boss.maxHp;
    assert.equal(boss.maxHp, bossHp, 'boss HP does not change with difficulty');
    game.exposeBoss(boss);
    assert.ok(Math.abs(boss.vulnerabilityTimer - giantWindow) < .0001);
    game.startTrial('moth'); boss = game.enemies.find(e => e.type === 'boss');
    game.openMobileBoss(boss);
    assert.ok(Math.abs(boss.vulnerabilityTimer - mobileWindow) < .0001);
    assert.equal(game.config.difficulty, difficulty);
    const restored = create(undefined, plain(game.snapshot())).game;
    assert.equal(restored.config.difficulty, difficulty);
  }
  assert.equal(create({ assist: true }).game.config.difficulty, 'explorer');
  assert.equal(create({ assist: true, difficulty: 'master' }).game.config.difficulty, 'master');
  assert.equal(create({ assist: true, difficulty: 'master' }).game.config.assist, false);
});

test('mobile guardians require repeated perfect parries before opening their guard', () => {
  for (const type of ['moth', 'worm', 'duelist']) for (const difficulty of ['adventurer', 'master']) {
    const { game } = create({ difficulty }); game.startTrial(type);
    const boss = game.enemies.find(e => e.type === 'boss');
    const required = difficulty === 'master' ? 3 : 2;
    assert.equal(boss.maxPoise, required);
    for (let n = 1; n <= required; n++) {
      game.parryBoss(boss);
      assert.equal(boss.weakpoint.active, n === required, `${type}/${difficulty} opens on parry ${required}`);
    }
    assert.equal(boss.poise, 0, 'a new opening resets the pressure meter');
  }
});

test('the moth visibly descends before its vulnerability countdown begins', () => {
  const { game } = create(); game.startTrial('moth'); game.arenaLocked = true;
  const boss = game.enemies.find(e => e.type === 'boss');
  const initialY = boss.y;
  game.openMobileBoss(boss);
  const window = boss.vulnerabilityTimer;
  game.updateBoss(boss, .2);
  assert.ok(boss.y > initialY && boss.y < 510, 'landing is interpolated rather than teleported');
  assert.equal(boss.vulnerabilityTimer, window);
  game.updateBoss(boss, .21);
  assert.equal(boss.y, 510);
  assert.equal(boss.state, 'exposed');
  assert.equal(boss.vulnerabilityTimer, window);
  game.updateBoss(boss, .1);
  assert.ok(boss.vulnerabilityTimer < window);
});

test('future attack zones default off in Master and the explicit preference survives reload', () => {
  for (const difficulty of ['explorer', 'adventurer', 'master']) {
    const { game } = create({ difficulty });
    assert.equal(game.showAttackZones, difficulty !== 'master');
    game.showAttackZones = !game.showAttackZones;
    const restored = create(undefined, plain(game.snapshot())).game;
    assert.equal(restored.showAttackZones, game.showAttackZones);
  }
  assert.equal(create({ difficulty: 'master', showAttackZones: true }).game.showAttackZones, true);
  assert.equal(create({ difficulty: 'adventurer', showAttackZones: false }).game.showAttackZones, false);
  const visible = arena({ showAttackZones: true }).game;
  const hidden = arena({ showAttackZones: false }).game;
  visible.hurt(20, null, true); hidden.hurt(20, null, true);
  assert.equal(hidden.player.hp, visible.player.hp, 'this is a display option, not damage immunity');
});

test('arena camera frames both fighters when they fit and protects the hero when they do not', () => {
  const { game } = create(); game.startTrial('moth'); game.arenaLocked = true;
  const boss = game.enemies.find(e => e.type === 'boss');
  game.player.x = 500; boss.x = 1350;
  for (let frame = 0; frame < 180; frame++) game.updateCamera(1 / 60);
  assert.ok(game.player.x - game.camera.x >= 79);
  assert.ok(boss.x + boss.w - game.camera.x <= 1201, 'the distant flying boss is also framed');
  game.player.x = 370; boss.x = 1700;
  for (let frame = 0; frame < 180; frame++) game.updateCamera(1 / 60);
  assert.ok(game.player.x - game.camera.x >= 79, 'hero remains away from the left screen edge');
  assert.ok(game.player.x + game.player.w - game.camera.x <= 1201);
  assert.ok(game.camera.x >= 0 && game.camera.x <= game.room.width - 1280, 'camera stays inside world bounds');
});
