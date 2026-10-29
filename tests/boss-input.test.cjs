// Complete fights share their input controller with the visual slow-motion replay.
const test = require('node:test');
const assert = require('node:assert/strict');
const CM = require('../dist/engine.js');
const { createCombatBrain } = require('./bot-controls.js');
for (const type of ['warden', 'king', 'moth', 'worm', 'duelist']) for (const difficulty of ['adventurer', 'master']) {
  test(`${type}, ${difficulty}: normal inputs complete all phases with the slowest hero`, () => {
    const game = new CM.Engine({ difficulty, stats: { speed: 1, power: 4, vitality: 7 } });
    game.startTrial(type);
    const boss = game.enemies.find(e => e.type === 'boss'), brain = createCombatBrain();
    const phases = new Set(), damageLog = [];
    let hits = 0, parries = 0;
    for (let frame = 0; frame < 120 * 150 && !game.dead && !game.won; frame++) {
      phases.add(boss.phase);
      const hp = boss.hp;
      game.update(1 / 120, brain.input(game));
      if (boss.hp < hp) hits++;
      parries += game.events.filter(e => e.type === 'parry').length;
      for (const event of game.events.filter(e => e.type === 'hurt')) damageLog.push({ time: Number(game.time.toFixed(2)), damage: event.damage, attack: boss.attackKind, x: Math.round(game.player.x), hp: game.player.hp });
      game.events = [];
    }
    assert.equal(game.dead, false, `${type}/${difficulty}: died after ${game.time.toFixed(2)}s; boss hp ${boss.hp}; ${JSON.stringify(damageLog)}`);
    assert.equal(game.won, true, `fight incomplete; boss hp ${boss.hp}`);
    assert.deepEqual([...phases].sort(), [1, 2, 3]);
    const giant = type === 'warden' || type === 'king';
    assert.ok(boss.cycles >= (giant ? 3 : 5));
    assert.ok(hits >= 3);
    if (giant) {
      assert.ok(parries >= 3);
      assert.ok(brain.state.climbTimes.length >= 3);
      assert.ok(brain.state.climbTimes.every(seconds => seconds < 5));
    }
    assert.equal(Object.keys(game.player.skills).length, 0);
    assert.equal(game.equippedCharms.length, 0);
  });
}
