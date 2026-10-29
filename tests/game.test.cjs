/* Runtime checks for the browser-independent game simulation. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const engineFile = path.join(__dirname, '..', 'dist', 'engine.js');
function load() {
  const context = vm.createContext({ console, Math, Date, JSON, performance });
  vm.runInContext(fs.readFileSync(engineFile, 'utf8'), context, { filename: engineFile });
  return context.CM;
}
function create(config, saved) {
  const CM = load();
  return { CM, game: new CM.Engine(config, saved) };
}
function step(game, seconds, input = {}) {
  for (let i = 0; i < Math.ceil(seconds * 120); i++) game.update(1 / 120, input);
}
function tap(game, name) {
  step(game, 1 / 120, { [name]: true });
  step(game, 1 / 120);
}
function assertFinitePlayer(game) {
  for (const key of ['x', 'y', 'vx', 'vy', 'hp', 'maxHp', 'stamina', 'maxStamina']) {
    assert.ok(Number.isFinite(game.player[key]), `${key} is finite`);
  }
}
function arena(config) {
  const data = create(config);
  const game = data.game;
  game.room.platforms = [{ x: 0, y: 650, w: game.room.width, h: 100 }];
  game.room.hazards = [];
  game.enemies = [];
  game.pickups = [];
  step(game, .1);
  game.events = [];
  return data;
}
function attacker(game) {
  return game.makeEnemy({ id: 'test-attacker', type: 'knight', x: game.player.x + 55, y: 590 });
}
function finishBossForProgressionCheck(game, boss) {
  for (let cycle = 0; cycle < 5 && boss.hp > 0; cycle++) {
    game.exposeBoss(boss);
    game.damageEnemy(boss, boss.maxHp, 0, { weakpoint: true });
  }
  assert.equal(boss.hp, 0);
}

test('new game exposes a playable campaign and three distinct weapons', () => {
  const { CM, game } = create();
  assert.ok(CM.ROOMS.length >= 5, 'campaign has at least five areas');
  assert.deepEqual(Object.keys(CM.WEAPONS).sort(), ['axe', 'spear', 'sword']);
  assert.ok(CM.SKILLS.length >= 3, 'there are at least three skills to earn');
  assert.ok(game.player.hp > 0);
  assert.equal(game.dead, false);
  assert.equal(game.won, false);
  assertFinitePlayer(game);
});

test('basic movement is responsive and stays finite', () => {
  const { game } = create();
  step(game, .3);
  const start = game.player.x;
  step(game, .35, { right: true });
  assert.ok(game.player.x > start + 20, 'right movement advances');
  assert.equal(game.player.facing, 1);
  step(game, .15, { left: true });
  assert.equal(game.player.facing, -1);
  assertFinitePlayer(game);
});

test('jump is edge-triggered and a held key does not repeatedly jump', () => {
  const { game } = create();
  step(game, .5);
  const groundY = game.player.y;
  step(game, .12, { jump: true });
  assert.ok(game.player.y < groundY - 10, 'jump rises');
  step(game, 2, { jump: true });
  assert.ok(Math.abs(game.player.y - groundY) < 2, 'held jump settles on ground');
  step(game, .03);
  step(game, .1, { jump: true });
  assert.ok(game.player.y < groundY - 10, 'releasing and pressing starts another jump');
});

test('save data is plain JSON and restores the hero and progression', () => {
  const { game } = create({ name: 'Charles', stats: { speed: 5, power: 2, vitality: 2 }, weapon: 'spear' });
  step(game, .2);
  game.shards = 17;
  game.skillPoints = 3;
  const saved = JSON.parse(JSON.stringify(game.snapshot()));
  const { game: restored } = create(undefined, saved);
  assert.equal(restored.shards, 17);
  assert.equal(restored.skillPoints, 3);
  assert.equal(restored.player.weapon, 'spear');
  assert.equal(restored.player.stats.speed, 5);
  assertFinitePlayer(restored);
});

test('weapon switching accepts the melee arsenal', () => {
  const { game } = create();
  for (const id of ['axe', 'spear', 'sword']) {
    game.setWeapon(id);
    assert.equal(game.player.weapon, id);
  }
});

test('speed, power, and vitality give the hero meaningful differences', () => {
  const slow = arena({ stats: { speed: 1, power: 1, vitality: 1 } }).game;
  const fast = arena({ stats: { speed: 7, power: 7, vitality: 7 } }).game;
  step(slow, .5, { right: true });
  step(fast, .5, { right: true });
  assert.ok(fast.player.x > slow.player.x + 40, 'speed changes travel');
  assert.ok(fast.player.maxHp > slow.player.maxHp + 40, 'vitality changes life');
  const s = attacker(slow), f = attacker(fast);
  slow.enemies = [s]; fast.enemies = [f];
  slow.player.facing = fast.player.facing = 1;
  step(slow, .2, { attack: true });
  step(fast, .2, { attack: true });
  assert.ok(f.hp < s.hp, 'power increases a successful melee hit');
});

test('a fresh directional guard parries, while a held guard spends endurance', () => {
  const { game } = arena();
  let source = attacker(game);
  const hp = game.player.hp;
  step(game, 1 / 120, { block: true });
  game.hurt(20, source);
  assert.equal(game.player.hp, hp);
  assert.ok(game.events.some(e => e.type === 'parry'));
  assert.equal(source.state, 'stunned');
  step(game, .5, { block: true });
  source = attacker(game);
  const stamina = game.player.stamina;
  game.hurt(20, source);
  assert.equal(game.player.hp, hp - 3, 'ordinary guard allows only chip damage');
  assert.ok(game.player.stamina < stamina, 'guard has an endurance cost');
  assert.ok(game.events.some(e => e.type === 'block'));
});

test('guard does not parry attacks from behind or ground shockwaves', () => {
  const { game } = arena();
  step(game, 1 / 120, { block: true });
  const hp = game.player.hp;
  const behind = attacker(game); behind.x = game.player.x - 100;
  game.hurt(20, behind);
  assert.equal(game.player.hp, hp - 20);
  assert.equal(game.events.some(e => e.type === 'parry'), false);
  game.player.invulnerable = 0;
  game.player.block = true; game.player.parryTime = .18;
  game.hurt(20, attacker(game), true);
  assert.equal(game.player.hp, hp - 40, 'unblockable waves punish staying on ground');
});

test('dash evades damage and holding dash cannot retrigger it', () => {
  const { game } = arena();
  const start = game.player.x, hp = game.player.hp;
  step(game, .05, { right: true, dash: true });
  assert.ok(game.player.dashTime > 0);
  game.hurt(30, attacker(game));
  assert.equal(game.player.hp, hp);
  step(game, .8, { dash: true });
  assert.ok(game.player.x > start + 90);
  assert.equal(game.events.filter(e => e.type === 'dash').length, 1);
});

test('double jump is an earned second jump, with no unlimited aerial jumps', () => {
  const { game } = arena();
  step(game, .12, { jump: true });
  step(game, .04);
  step(game, 1 / 120, { jump: true });
  assert.ok(game.player.vy > -400, 'second jump is unavailable initially');
  step(game, 1);
  game.player.doubleJump = true;
  step(game, .12, { jump: true });
  step(game, .04);
  step(game, 1 / 120, { jump: true });
  assert.ok(game.player.vy < -450, 'wings enable the second jump');
  assert.equal(game.player.jumps, 2);
  step(game, .04);
  step(game, 1 / 120, { jump: true });
  assert.ok(game.player.vy > -400, 'there is no third jump');
});

test('talents enforce cost, prerequisites, and single purchase', () => {
  const { game } = arena();
  assert.equal(game.buySkill('edge'), false);
  game.skillPoints = 3;
  assert.equal(game.buySkill('riposte'), false, 'requires its first-tier talent');
  assert.equal(game.buySkill('edge'), true);
  assert.equal(game.skillPoints, 2);
  assert.equal(game.buySkill('edge'), false);
  assert.equal(game.buySkill('riposte'), true);
  assert.equal(game.skillPoints, 0);
  game.skillPoints = 1;
  game.player.hp = 10;
  const maxHp = game.player.maxHp;
  assert.equal(game.buySkill('vigor'), true);
  assert.equal(game.player.maxHp, maxHp + 30);
  assert.equal(game.player.hp, game.player.maxHp);
});

test('five collected shards grant a talent and pickups do not duplicate on return', () => {
  const { game } = arena();
  const p = game.player;
  game.pickups = Array.from({ length: 5 }, (_, n) => ({ id: `qa-shard-${n}`, type: 'shard', x: p.x, y: p.y, w: 26, h: 30 }));
  game.updatePickups();
  assert.equal(game.shards, 5);
  assert.equal(game.skillPoints, 1);
  assert.equal(game.pickups.length, 0);
  game.updatePickups();
  assert.equal(game.shards, 5);
  game.loadRoom(1, 1550, 385);
  game.updatePickups();
  assert.equal(game.player.doubleJump, true);
  game.loadRoom(0, 140, 598);
  game.loadRoom(1, 1550, 385);
  assert.equal(game.pickups.some(item => item.id === 'wings'), false);
});

test('fatal damage returns to the latest sanctuary without losing earned upgrades', () => {
  const { game } = arena();
  game.loadRoom(1, 140, 598);
  game.interact();
  game.player.doubleJump = true;
  game.player.skills.edge = true;
  game.shards = 8;
  game.skillPoints = 2;
  game.player.invulnerable = 0;
  game.hurt(999, null, true);
  assert.equal(game.dead, true);
  assert.equal(game.deaths, 1);
  const saved = JSON.parse(JSON.stringify(game.snapshot()));
  const { game: restored } = create(undefined, saved);
  assert.equal(restored.dead, false, 'reloading a death save resumes at sanctuary');
  assert.equal(restored.roomIndex, 1);
  assert.equal(restored.player.hp, restored.player.maxHp);
  game.respawn();
  assert.equal(game.dead, false);
  assert.equal(game.roomIndex, 1);
  assert.equal(game.player.x, game.checkpoint.x);
  assert.equal(game.player.hp, game.player.maxHp);
  assert.equal(game.player.doubleJump, true);
  assert.equal(game.player.skills.edge, true);
  assert.equal(game.shards, 8);
  assert.equal(game.skillPoints, 2);
});

test('bosses have telegraphed attacks, reset after death, and persist after victory', () => {
  const { CM, game } = create();
  game.player.doubleJump = true;
  game.loadRoom(2, 140, 598);
  game.interact();
  game.player.x = 400;
  step(game, 1.2);
  let boss = game.enemies.find(e => e.type === 'boss');
  assert.equal(game.arenaLocked, true);
  assert.equal(boss.state, 'windup');
  assert.ok(boss.windupDuration >= .45, 'attacks provide reaction time');
  game.exposeBoss(boss);
  game.damageEnemy(boss, 100, 0, { weakpoint: true });
  game.player.invulnerable = 0;
  game.hurt(999, null, true);
  game.respawn();
  boss = game.enemies.find(e => e.type === 'boss');
  assert.equal(boss.hp, boss.maxHp, 'undefeated boss resets cleanly');
  finishBossForProgressionCheck(game, boss);
  assert.equal(game.arenaLocked, false);
  assert.ok(game.bossesDefeated.includes('boss-warden'));
  game.loadRoom(3, 140, 598);
  game.loadRoom(2, 140, 598);
  assert.equal(game.enemies.some(e => e.id === 'boss-warden'), false);
  game.loadRoom(5, 400, 598);
  const king = game.enemies.find(e => e.type === 'boss');
  finishBossForProgressionCheck(game, king);
  assert.equal(game.won, false, 'chapter one now leads into the expanded campaign');
  assert.equal(game.bossesDefeated.length, 2);
  const finalRoom = CM.BOSSES.find(b => b.id === 'duelist').roomIndex;
  game.loadRoom(finalRoom, 400, 598);
  finishBossForProgressionCheck(game, game.enemies.find(e => e.type === 'boss'));
  assert.equal(game.won, true);
  assert.ok(game.events.some(e => e.type === 'win'));
});

test('mandatory wings and undefeated bosses cannot be bypassed at room exits', () => {
  const { game } = create();
  game.loadRoom(1, 2290, 598);
  game.enemies = [];
  step(game, .2, { right: true });
  assert.equal(game.roomIndex, 1, 'wings are required before leaving the cloister');
  game.player.doubleJump = true;
  step(game, .2, { right: true });
  assert.equal(game.roomIndex, 2);
  game.player.x = game.room.width - game.player.w - 2;
  step(game, .2, { right: true });
  assert.equal(game.roomIndex, 2, 'the living boss seals the arena');
  const boss = game.enemies.find(e => e.type === 'boss');
  finishBossForProgressionCheck(game, boss);
  step(game, .5, { right: true });
  assert.equal(game.roomIndex, 3, 'defeating the boss opens the aqueduct');
});

test('standing inside a boss cannot evade its frontal swing', () => {
  const { game } = create();
  game.loadRoom(2, 400, 598);
  game.arenaLocked = true;
  const boss = game.enemies.find(e => e.type === 'boss');
  game.player.x = boss.x + boss.w / 2;
  game.player.invulnerable = 0;
  const hp = game.player.hp;
  game.prepareBossAttack(boss, 'sweep');
  game.executeBossAttack(boss);
  game.updateEnemies(1 / 120);
  assert.ok(game.player.hp < hp);
});

test('a perfect boss parry creates a usable counterattack opening', () => {
  const { game } = create();
  game.loadRoom(2, 400, 598);
  game.arenaLocked = true;
  const boss = game.enemies.find(e => e.type === 'boss');
  game.player.x = boss.x - 70; game.player.facing = 1;
  game.player.block = true; game.player.parryTime = .18;
  game.player.invulnerable = 0;
  game.hurt(23, boss);
  assert.equal(boss.state, 'exposed');
  step(game, .9);
  assert.equal(boss.state, 'exposed', 'the opening lasts long enough to start climbing');
  step(game, 5.8);
  assert.notEqual(boss.state, 'exposed', 'the boss eventually recovers');
});
