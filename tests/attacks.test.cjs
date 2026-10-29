const test = require('node:test');
const assert = require('node:assert/strict');
const CM = require('../dist/engine.js');
function step(game, seconds, input = {}) {
  for (let n = 0; n < Math.ceil(seconds * 120); n++) game.update(1 / 120, input);
}
function arena() {
  const game = new CM.Engine();
  game.room.platforms = [{ x: 0, y: 650, w: 2200, h: 100 }];
  game.room.hazards = []; game.secretWalls = []; game.pickups = []; game.enemies = [];
  game.player.x = 500; game.player.y = 598; game.checkpointLit = true;
  return game;
}
function enemyArena(type, playerX) {
  const game = arena(); game.player.x = playerX;
  const e = game.makeEnemy({ id: `range-${type}`, type, x: 700, y: 600 });
  e.y = 650 - e.h; game.enemies = [e];
  return { game, enemy: e };
}
function bossArena(type, x = 1000) {
  const game = new CM.Engine(); game.startTrial(type);
  game.player.x = x; game.player.invulnerable = 0; game.arenaLocked = true;
  return { game, boss: game.enemies.find(e => e.type === 'boss') };
}
function contains(outer, inner) {
  const eps = .02;
  return inner.x >= outer.x - eps && inner.y >= outer.y - eps &&
    inner.x + inner.w <= outer.x + outer.w + eps && inner.y + inner.h <= outer.y + outer.h + eps;
}

test('ordinary melee attacks visibly wind up, hit nearby targets and miss distant ones', () => {
  for (const type of ['crawler', 'knight', 'flyer']) {
    for (const near of [true, false]) {
      const { game, enemy } = enemyArena(type, near ? 660 : 400);
      const duration = type === 'knight' ? .68 : type === 'flyer' ? .48 : .46;
      game.startWindup(enemy, 'swing', duration);
      const hp = game.player.hp;
      step(game, duration - .08);
      assert.equal(game.player.hp, hp, `${type} does not damage during its warning`);
      assert.equal(enemy.state, 'windup');
      step(game, .16);
      if (near) assert.ok(game.player.hp < hp, `${type} can actually land its attack`);
      else assert.equal(game.player.hp, hp, `${type} misses outside melee range`);
    }
  }
});

test('the hopper lands on a nearby hero after its warning and misses a distant hero', () => {
  for (const near of [true, false]) {
    const { game, enemy } = enemyArena('hopper', near ? 600 : 300);
    game.startWindup(enemy, 'hop', .5);
    const hp = game.player.hp;
    step(game, .4);
    assert.equal(game.player.hp, hp);
    step(game, .8);
    if (near) assert.ok(game.player.hp < hp, 'the hopping body deals contact damage');
    else assert.equal(game.player.hp, hp, 'the hop has finite reach');
  }
});

test('spitter projectiles hit on their path but do not damage a hero outside it', () => {
  for (const evade of [false, true]) {
    const { game, enemy } = enemyArena('spitter', 500);
    game.startWindup(enemy, 'spit', .7);
    const hp = game.player.hp;
    step(game, .6); assert.equal(game.player.hp, hp);
    step(game, .15); assert.ok(game.projectiles.length > 0);
    enemy.state = 'recover'; enemy.timer = 20;
    if (evade) { game.player.x = 1200; game.player.y = 200; }
    step(game, 1.3);
    if (evade) assert.equal(game.player.hp, hp);
    else assert.ok(game.player.hp < hp);
  }
});

test('giant sweeps hit within their announced area and miss beyond it', () => {
  for (const type of ['warden', 'king']) {
    for (const near of [true, false]) {
      const { game, boss } = bossArena(type, near ? 1100 : 380);
      game.prepareBossAttack(boss, 'sweep');
      const hp = game.player.hp;
      step(game, boss.windupDuration - .08);
      assert.equal(game.player.hp, hp, 'windup is non-damaging');
      step(game, .16);
      if (near) assert.ok(game.player.hp < hp);
      else assert.equal(game.player.hp, hp);
    }
  }
});

test('the duelist dash hitbox stays within the warning at every speed and facing', () => {
  for (const phase of [1, 2, 3]) for (const facing of [-1, 1]) {
    const { game, boss } = bossArena('duelist', facing < 0 ? 800 : 1650);
    boss.hp = boss.maxHp * (phase === 1 ? 1 : phase === 2 ? .5 : .2); boss.phase = phase;
    game.prepareMobileAttack(boss, 'dashSlash');
    const warning = boss.telegraphs.find(t => t.kind === 'dashSlash');
    assert.ok(warning);
    game.executeMobileAttack(boss);
    for (let n = 0; n < 57 && boss.state === 'attack'; n++) {
      game.updateMobileBoss(boss, 1 / 120);
      const hitbox = { x: boss.facing > 0 ? boss.x : boss.x - 45, y: boss.y, w: boss.w + 45, h: boss.h };
      assert.ok(contains(warning, hitbox), `phase ${phase}, facing ${facing}, frame ${n} is announced`);
    }
  }
});

test('the moth dive warning contains its entire damaging flight path', () => {
  const { game, boss } = bossArena('moth', 800);
  game.prepareMobileAttack(boss, 'dive');
  const warning = boss.telegraphs.find(t => t.kind === 'dive');
  game.executeMobileAttack(boss);
  for (let n = 0; n < 58 && boss.state === 'attack'; n++) {
    game.updateMobileBoss(boss, 1 / 120);
    assert.ok(contains(warning, boss), `dive body is announced at frame ${n}`);
  }
});

test('worm emergence and bite hit their warning areas and miss outside them', () => {
  for (const kind of ['burrow', 'bite']) for (const near of [true, false]) {
    const { game, boss } = bossArena('worm', 1100);
    game.prepareMobileAttack(boss, kind);
    const warning = boss.telegraphs[0], hp = game.player.hp;
    game.player.x = near ? warning.x + warning.w / 2 : warning.x - 100;
    game.player.y = 598;
    step(game, boss.windupDuration - .08);
    assert.equal(game.player.hp, hp);
    step(game, .16);
    if (near) assert.ok(game.player.hp < hp, `${kind} lands inside its warning`);
    else assert.equal(game.player.hp, hp, `${kind} misses outside its warning`);
  }
});

test('a fully buried worm cannot be struck or used as an invisible pogo surface', () => {
  const { game, boss } = bossArena('worm');
  game.prepareMobileAttack(boss, 'burrow');
  game.events = [];
  game.player.x = boss.x; game.player.y = boss.y - game.player.h;
  game.player.attackDown = true; game.player.pogoBounced = false;
  game.player.attackVictims = []; game.player.vy = 100;
  game.hitBoss(boss, { x: boss.x, y: boss.y, w: boss.w, h: 40 }, 20);
  assert.equal(game.events.length, 0);
  assert.equal(game.player.pogoBounced, false);
  assert.equal(game.player.vy, 100);
});
