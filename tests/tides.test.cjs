const test = require('node:test');
const assert = require('node:assert/strict');
const CM = require('../dist/engine.js');
const legacy = require('./fixtures/legacy-v11.json');
const { runTidesRoute } = require('./tides-route.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
function step(game, seconds, input = {}) {
  for (let frame = 0; frame < Math.ceil(seconds * 120); frame++) game.update(1 / 120, input);
}
function revisionThree(won) {
  const save = clone(legacy.ongoing);
  Object.assign(save, {
    revision: 3, won, roomIndex: 11, checkpoint: { roomIndex: 11, x: 140, y: 598 },
    config: { ...save.config, difficulty: 'master', assist: false },
    showAttackZones: false, roomsVisited: Array.from({ length: 12 }, (_, n) => n),
    bossesDefeated: ['boss-warden', 'boss-king', 'boss-moth', 'boss-worm', ...(won ? ['boss-duelist'] : [])],
    ownedCharms: ['heart', 'wind', 'fang', 'mirror', 'moss', 'magnet'], equippedCharms: ['wind', 'mirror'],
  });
  save.player.flasks = 1;
  save.player.skills.restoration = true;
  return save;
}

for (const won of [false, true]) test(`revision-three ${won ? 'completed' : 'ongoing'} adventure preserves earned progress`, () => {
  const save = revisionThree(won), game = new CM.Engine(undefined, save);
  assert.equal(game.roomIndex, won ? 12 : 11);
  assert.equal(game.won, false);
  assert.equal(game.config.difficulty, 'master');
  assert.equal(game.showAttackZones, false);
  for (const key of ['stats', 'skills', 'weapon', 'doubleJump', 'bonusPower', 'bonusVitality']) {
    assert.deepEqual(game.player[key], save.player[key], key);
  }
  for (const key of ['shards', 'skillPoints', 'kills', 'deaths', 'time', 'collected', 'defeated', 'bossesDefeated', 'ownedCharms', 'equippedCharms', 'destroyedWalls']) {
    assert.deepEqual(game[key], save[key], key);
  }
  assert.ok(save.roomsVisited.every(index => game.roomsVisited.includes(index)));
  if (won) {
    assert.equal(game.atSanctuary(), true);
    assert.equal(game.checkpoint.roomIndex, 12);
  } else {
    assert.equal(game.player.hp, save.player.hp);
    assert.equal(game.player.flasks, 1);
  }
  const roundTrip = new CM.Engine(undefined, clone(game.snapshot()));
  assert.equal(roundTrip.roomIndex, game.roomIndex, 'migration does not repeat after saving');
  assert.equal(roundTrip.snapshot().revision, 4);
  assert.deepEqual(roundTrip.equippedCharms, save.equippedCharms);
});

test('the tide pearl improves ordinary and restored flasks without granting charges or a third charm slot', () => {
  for (const restoration of [false, true]) {
    const game = new CM.Engine({ stats: { speed: 1, power: 4, vitality: 7 } });
    game.ownedCharms = ['tide', 'anchor', 'heart'];
    if (restoration) { game.player.skills.restoration = true; game.recalculate(); }
    const charges = game.player.flasks;
    assert.equal(game.equipCharm('tide'), true);
    assert.equal(game.equipCharm('anchor'), true);
    assert.equal(game.equipCharm('heart'), false);
    assert.equal(game.player.flasks, charges);
    game.player.hp = 1;
    assert.equal(game.heal(), true);
    assert.equal(game.player.hp, restoration ? 91 : 66);
    assert.equal(game.player.flasks, charges - 1);
    assert.equal(game.equipCharm('tide'), true);
    assert.equal(game.player.hp, restoration ? 91 : 66, 'unequipping cannot remove restored health');
  }
});

test('the anchor accelerates recovery only while grounded and stacks correctly with Flow', () => {
  for (const flow of [false, true]) for (const airborne of [false, true]) {
    const rates = [];
    for (const anchor of [false, true]) {
      const game = new CM.Engine(); game.enemies = []; game.pickups = [];
      game.player.x = 300; game.player.y = airborne ? 300 : 598;
      game.player.grounded = !airborne; game.checkpointLit = true;
      if (flow) { game.player.skills.flow = true; game.recalculate(); }
      if (anchor) { game.ownedCharms = ['anchor']; game.equipCharm('anchor'); }
      game.player.stamina = 10;
      step(game, .1);
      rates.push(game.player.stamina - 10);
    }
    assert.ok(Math.abs(rates[1] / rates[0] - (airborne ? 1 : 1.2)) < 1e-8, `flow=${flow}, airborne=${airborne}`);
  }
});

function currentFixture(x = 600, difficulty = 'adventurer') {
  const game = new CM.Engine({ difficulty, stats: { speed: 1, power: 4, vitality: 7 } });
  game.loadRoom(12, x, 598); game.enemies = []; game.pickups = []; game.checkpointLit = true;
  return game;
}

test('currents lift the slowest hero, Down permits descent, and Master hidden warnings do not disable them', () => {
  for (const difficulty of ['adventurer', 'master']) {
    const game = currentFixture(600, difficulty);
    step(game, 1);
    assert.ok(game.player.y < 300, `${difficulty} current carries the hero above the low ledge`);
    assert.equal(game.player.hp, game.player.maxHp);
    step(game, 1.5, { down: true });
    assert.equal(game.player.y + game.player.h, 650);
    assert.equal(game.player.grounded, true);
    step(game, .3);
    assert.ok(game.player.y < 550, 'releasing Down re-enters the current');
    assert.equal(game.showAttackZones, difficulty !== 'master');
  }
  const outside = currentFixture(450);
  step(outside, 2);
  assert.equal(outside.player.y + outside.player.h, 650, 'the force has no effect outside its visible column');
});

test('currents leave double jumps available and never lift the hero outside the world', () => {
  const game = currentFixture(); game.player.doubleJump = true;
  step(game, 5);
  assert.ok(game.player.y >= 0);
  assert.equal(game.player.jumps, 0, 'the environment does not consume a jump');
  step(game, 1 / 120, { jump: true });
  assert.equal(game.player.jumps, 2, 'the normal aerial jump remains available after riding the current');
  assert.ok(game.player.vy < -330);
});

test('the slowest hero continuously traverses both tidal zones, collects both charms and breaks both high seals', () => {
  const { game, trace } = runTidesRoute();
  assert.equal(game.roomIndex, 14);
  assert.ok(trace.some(stop => stop.label === 'ride eastern Archive current'));
  assert.equal(game.player.bonusPower, 1);
  assert.equal(game.player.bonusVitality, 1);
});

test('Atlas requires repeated perfect parries and limits damage to 22 percent per opening', () => {
  for (const difficulty of ['adventurer', 'master']) {
    const game = new CM.Engine({ difficulty }); game.startTrial('titan');
    game.player.x = 850; game.player.y = 598; game.player.facing = 1;
    game.arenaLocked = true; game.checkpointLit = true;
    const boss = game.enemies.find(enemy => enemy.type === 'boss'), required = difficulty === 'master' ? 3 : 2;
    assert.equal(boss.maxPoise, required);
    for (let parry = 1; parry <= required; parry++) {
      step(game, .4);
      game.prepareTidalAttack(boss, 'clawSweep');
      step(game, boss.windupDuration - .08);
      step(game, .12, { block: true });
      assert.ok(game.events.some(event => event.type === 'parry'), `real input parry ${parry}`);
      game.events = [];
      assert.equal(boss.weakpoint.active, parry === required);
    }
    assert.equal(boss.poise, 0);
    assert.equal(boss.attackCount, 0);
    assert.ok(boss.platforms.every(platform => platform.active && platform.oneWay));
    const remaining = boss.vulnerabilityTimer;
    assert.equal(game.exposeBoss(boss), false, 'repeated opening calls cannot reset its deadline');
    assert.equal(boss.vulnerabilityTimer, remaining);
    const hp = boss.hp;
    game.damageEnemy(boss, 99999, 0, { weakpoint: true });
    assert.ok(Math.abs(hp - boss.hp - boss.maxHp * .22) < .0001);
    assert.equal(boss.weakpoint.active, false);
    assert.ok(boss.platforms.every(platform => !platform.active));
    assert.equal(game.damageEnemy(boss, 99999), false, 'closed armor cannot be damaged');
    for (let cycle = 1; cycle < 5; cycle++) {
      game.exposeBoss(boss);
      game.damageEnemy(boss, 99999, 0, { weakpoint: true });
      if (cycle < 4) assert.ok(boss.hp > 0);
    }
    assert.equal(boss.hp, 0);
    assert.equal(game.won, true);
    assert.equal(boss.cycles, 5);
  }
});

test('all three Atlas attacks can hurt the hero and can be avoided through movement or elevation', () => {
  for (const kind of ['tidalWave', 'pearlRain', 'clawSweep']) for (const evade of [false, true]) {
    const game = new CM.Engine(); game.startTrial('titan');
    game.player.x = kind === 'clawSweep' ? (evade ? 700 : 850) : kind === 'tidalWave' && evade ? 1000 : 700;
    game.player.y = 598; game.arenaLocked = true; game.checkpointLit = true;
    const boss = game.enemies.find(enemy => enemy.type === 'boss'), hp = game.player.hp;
    game.prepareTidalAttack(boss, kind);
    step(game, boss.windupDuration - .08, kind === 'pearlRain' && evade ? { left: true } : {});
    assert.equal(game.player.hp, hp, `${kind}: windup causes no damage`);
    step(game, 1.6);
    if (evade) assert.equal(game.player.hp, hp, `${kind}: avoidance succeeds`);
    else assert.ok(game.player.hp < hp, `${kind}: attack has a real damaging path`);
  }
});
