const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const legacy = require('./fixtures/legacy-v1.json');

function create(config, saved) {
  const context = vm.createContext({ console, Math, Date, JSON, performance });
  const file = path.join(__dirname, '..', 'dist', 'engine.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return { CM: context.CM, game: new context.CM.Engine(config, saved) };
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
function step(game, seconds, input = {}) {
  for (let frame = 0; frame < Math.ceil(seconds * 120); frame++) game.update(1 / 120, input);
}
function bossArena(type = 'warden', config = {}) {
  const { CM, game } = create(config);
  game.loadRoom(type === 'king' ? 5 : 2, 1000, 598);
  game.arenaLocked = true;
  game.player.doubleJump = true;
  game.checkpointLit = true;
  const boss = game.enemies.find(e => e.type === 'boss');
  return { CM, game, boss };
}

for (const name of ['ongoing', 'dead', 'completed']) {
  test(`real pre-expansion v1 ${name} save preserves the existing character`, () => {
    const save = legacy[name];
    const { game } = create(undefined, save);
    assert.equal(game.config.name, save.config.name);
    assert.equal(game.config.assist, save.config.assist);
    for (const key of ['stats', 'skills', 'weapon', 'doubleJump', 'bonusPower', 'bonusVitality']) {
      assert.deepEqual(plain(game.player[key]), save.player[key], `player.${key} preserved`);
    }
    for (const key of ['shards', 'skillPoints', 'kills', 'deaths', 'time']) {
      assert.equal(game[key], save[key], `${key} preserved`);
    }
    for (const key of ['bossesDefeated', 'collected', 'defeated']) {
      assert.deepEqual(plain(game[key]), save[key], `${key} preserved`);
    }
    assert.equal(game.dead, false, 'a death save resumes alive at the sanctuary');
    assert.equal(game.roomIndex, name === 'completed' ? 6 : name === 'dead' ? save.checkpoint.roomIndex : save.roomIndex);
    assert.ok(save.roomsVisited.every(index => game.roomsVisited.includes(index)));
    if (name !== 'completed') assert.deepEqual(plain(game.checkpoint), save.checkpoint);
    if (name === 'dead') assert.equal(game.player.hp, game.player.maxHp);
    else assert.equal(game.player.hp, save.player.hp);
    if (name === 'completed') {
      assert.equal(game.won, false, 'the completed first chapter continues into the new lands');
      assert.equal(game.bossesDefeated.includes('boss-king'), true, 'finished bosses stay finished');
    }
    const roundTrip = create(undefined, plain(game.snapshot())).game;
    assert.deepEqual(plain(roundTrip.player.stats), save.player.stats);
    assert.deepEqual(plain(roundTrip.player.skills), save.player.skills);
    assert.equal(roundTrip.won, false);
  });
}

test('new secret seals respect already collected legacy rewards', () => {
  const { game } = create(undefined, legacy.ongoing);
  assert.deepEqual(plain(game.destroyedWalls), []);
  for (const roomIndex of [0, 3]) {
    game.loadRoom(roomIndex, 140, 598);
    assert.equal(game.secretWalls[0].broken, true);
    assert.equal(game.pickups.some(p => p.id === game.secretWalls[0].rewardId), false);
  }
});

test('sanctuary travel only reaches visited areas from a safe sanctuary', () => {
  const { game } = create();
  game.roomsVisited = [0, 1, 3];
  game.player.hp = 10;
  assert.equal(game.travelTo(1), true);
  assert.equal(game.roomIndex, 1);
  assert.equal(game.checkpoint.roomIndex, 1);
  assert.equal(game.player.hp, game.player.maxHp);
  assert.equal(game.travelTo(5), false, 'unvisited destination stays locked');
  game.player.x = 500;
  assert.equal(game.travelTo(0), false, 'travel is unavailable away from a sanctuary');
  game.player.x = game.room.checkpoint.x;
  for (const flag of ['arenaLocked', 'dead', 'won', 'trial']) {
    game[flag] = true;
    assert.equal(game.travelTo(0), false, `${flag} prevents travel`);
    game[flag] = false;
  }
  for (const invalid of [-1, 99, 1.5, NaN, '1']) assert.equal(game.travelTo(invalid), false);
  assert.equal(game.travelTo(3), true);
});

test('secret walls block their relic, take one hit per swing, and stay broken', () => {
  const { game } = create();
  game.loadRoom(3, 1035, 263);
  game.enemies = [];
  game.checkpointLit = true;
  const wall = game.secretWalls[0];
  const reward = game.pickups.find(p => p.id === wall.rewardId);
  game.player.x = reward.x; game.player.y = reward.y;
  game.updatePickups();
  assert.equal(game.collected.includes(reward.id), false, 'sealed reward cannot be grabbed through geometry');
  game.player.x = 1035; game.player.y = 263;
  step(game, .4, { right: true });
  assert.ok(game.player.x + game.player.w <= wall.x + .001, 'wall is solid');
  step(game, .13, { attack: true });
  assert.equal(wall.hp, 2);
  step(game, .08, { attack: true });
  assert.equal(wall.hp, 2, 'active attack frames do not multiply seal damage');
  step(game, .5);
  step(game, .2, { attack: true });
  step(game, .5);
  step(game, .2, { attack: true });
  assert.equal(wall.broken, true);
  assert.equal(game.destroyedWalls.filter(id => id === wall.id).length, 1);
  const power = game.player.bonusPower;
  step(game, .5, { right: true });
  assert.equal(game.collected.includes(reward.id), true);
  assert.equal(game.player.bonusPower, power + 1);
  const restored = create(undefined, plain(game.snapshot())).game;
  assert.equal(restored.secretWalls[0].broken, true);
  assert.equal(restored.pickups.some(p => p.id === reward.id), false);
  restored.loadRoom(0, 140, 598);
  restored.loadRoom(3, 1035, 263);
  assert.equal(restored.secretWalls[0].broken, true);
});

test('a downward aerial hit bounces once and normal attacks do not', () => {
  for (const weapon of ['sword', 'axe', 'spear']) {
    const { game } = create({ weapon });
    game.room.platforms = [{ x: 0, y: 650, w: 2200, h: 100 }];
    game.room.hazards = []; game.secretWalls = []; game.pickups = [];
    game.player.x = 400; game.player.y = 500; game.player.vy = 120;
    game.player.doubleJump = true; game.player.jumps = 2;
    game.checkpointLit = true;
    const target = game.makeEnemy({ id: `pogo-${weapon}`, type: 'crawler', x: 394, y: 614 });
    game.enemies = [target];
    step(game, .23, { down: true, attack: true });
    assert.ok(target.hp < target.maxHp, `${weapon} strikes downward`);
    assert.ok(game.player.vy < 0, `${weapon} bounces on contact`);
    assert.equal(game.player.pogoBounced, true);
    assert.ok(game.player.jumps < 2, 'pogo restores an aerial jump');
  }
  const { game } = create();
  game.enemies = []; game.pickups = []; game.player.x = 300; game.player.y = 400;
  step(game, .23, { down: true, attack: true });
  assert.ok(game.player.vy > 0, 'swinging downward in empty air does not bounce');
  step(game, 1);
  step(game, .05, { down: true, attack: true });
  assert.equal(game.player.attackDown, false, 'grounded down+attack remains a normal attack');
});

test('armor prevents ordinary damage and each ankle seal requires distinct swings', () => {
  const { game, boss } = bossArena();
  const hp = boss.hp;
  assert.equal(game.damageEnemy(boss, 99999), false);
  assert.equal(boss.hp, hp);
  boss.timer = 99;
  for (const seal of boss.seals) {
    game.player.x = seal.x - 65;
    game.player.y = 598;
    game.player.facing = 1;
    game.player.attackTime = 0; game.attackCooldown = 0;
    step(game, .13, { attack: true });
    assert.equal(seal.hp, 1);
    step(game, .08, { attack: true });
    assert.equal(seal.hp, 1);
    step(game, .5);
    step(game, .2, { attack: true });
    assert.equal(seal.hp, 0);
    step(game, .3);
  }
  assert.equal(boss.weakpoint.active, true);
  assert.equal(boss.armored, false);
  assert.ok(boss.platforms.every(p => p.active && p.oneWay));
  assert.equal(boss.hp, hp, 'breaking armor does not damage the heart directly');
});

test('exposure closes, resets seals, and cannot be prolonged by repeated calls', () => {
  const { game, boss } = bossArena();
  assert.equal(game.exposeBoss(boss), true);
  step(game, 2);
  const remaining = boss.vulnerabilityTimer;
  assert.equal(game.exposeBoss(boss), false);
  assert.equal(boss.vulnerabilityTimer, remaining);
  step(game, 4.6);
  assert.equal(boss.weakpoint.active, false);
  assert.equal(boss.armored, true);
  assert.ok(boss.seals.every(s => s.active && s.hp === s.maxHp));
  assert.ok(boss.platforms.every(p => !p.active));
});

test('bosses require three vulnerability cycles and have three attack phases', () => {
  for (const type of ['warden', 'king']) {
    const { game, boss } = bossArena(type);
    const phases = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      game.updateBoss(boss, 1 / 120);
      phases.push(boss.phase);
      game.exposeBoss(boss);
      game.damageEnemy(boss, 99999, 0, { weakpoint: true });
      if (cycle < 2) assert.ok(boss.hp > 0, 'a single huge hit cannot skip remaining cycles');
    }
    assert.deepEqual(phases, [1, 2, 3]);
    assert.equal(boss.hp, 0);
    assert.equal(boss.cycles, 3);
    assert.equal(game.bossesDefeated.filter(id => id === boss.id).length, 1);
  }
});

test('limbs are one-way landing surfaces and disappear when the boss recovers', () => {
  const { game, boss } = bossArena();
  game.exposeBoss(boss);
  const limb = boss.platforms[0];
  const body = { x: limb.x + 40, y: limb.y + 12, w: 30, h: 52, vx: 0, vy: -300 };
  game.moveBody(body, .08);
  assert.equal(body.vy, -300, 'rising through the underside does not collide');
  body.y = limb.y - body.h - 10; body.vy = 300;
  game.moveBody(body, .08);
  assert.equal(body.grounded, true);
  assert.equal(body.y + body.h, limb.y);
  game.closeBoss(boss);
  body.vy = 100;
  game.moveBody(body, .08);
  assert.ok(body.y + body.h > limb.y, 'the recovered boss no longer supports the player');
});

test('replay trials start locally with wings and respawn inside the same boss challenge', () => {
  for (const type of ['warden', 'king']) {
    const { game } = create();
    assert.equal(game.startTrial(type), true);
    assert.equal(game.player.doubleJump, true);
    assert.equal(game.trial, type);
    const trialRoom = game.roomIndex;
    step(game, .05);
    assert.equal(game.arenaLocked, true);
    game.player.invulnerable = 0;
    game.hurt(99999, null, true);
    game.respawn();
    assert.equal(game.roomIndex, trialRoom);
    assert.equal(game.trial, type);
    assert.ok(game.enemies.some(e => e.bossType === type && e.hp === e.maxHp));
    const boss = game.enemies.find(e => e.type === 'boss');
    for (let cycle = 0; cycle < 3; cycle++) {
      game.exposeBoss(boss);
      game.damageEnemy(boss, 99999, 0, { weakpoint: true });
    }
    assert.equal(game.won, true, 'either challenge ends in a trial victory');
  }
});
