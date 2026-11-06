// Continuous minimum-speed geometry replay. Enemies are removed to isolate traversal;
// platforms, hazards, collectibles, walls, movement and damage use the real engine.
const assert = require('node:assert/strict');
const CM = require('../dist/engine.js');
function runTidesRoute() {
  const game = new CM.Engine({ stats: { speed: 1, power: 4, vitality: 7 } });
  game.loadRoom(12, 140, 598); game.player.doubleJump = true; game.enemies = []; game.checkpointLit = true;
  const trace = [];
  const steer = x => ({ left: game.player.x > x + 3, right: game.player.x < x - 3 });
  function until(label, goal, input, seconds = 6) {
    for (let frame = 0; frame < seconds * 120; frame++) {
      game.update(1 / 120, input(frame));
      assert.equal(game.dead, false, label);
      assert.equal(game.events.some(event => event.type === 'hurt'), false, `${label}: hazardous route at x=${game.player.x}, y=${game.player.y}`);
      game.events = [];
      if (goal()) { trace.push({ label, room: game.roomIndex, x: Math.round(game.player.x), y: Math.round(game.player.y), time: +game.time.toFixed(2) }); return; }
    }
    assert.fail(`${label}: timed out at room=${game.roomIndex}, x=${game.player.x}, y=${game.player.y}, grounded=${game.player.grounded}`);
  }
  const walk = x => until(`walk ${x}`, () => Math.abs(game.player.x - x) <= 4, () => steer(x), 12);
  const land = y => until(`land ${y}`, () => game.player.grounded && Math.abs(game.player.y + game.player.h - y) < 1, () => ({}));
  const jump = (x, y) => {
    game.update(1 / 120, {});
    until(`jump ${x}/${y}`, () => game.player.grounded && Math.abs(game.player.y + game.player.h - y) < 1 && Math.abs(game.player.x - x) < 20,
      frame => ({ ...steer(x), jump: frame !== 34 }), 4);
  };
  walk(600);
  until('ride Foamcliff current', () => game.player.y < 245, () => ({}));
  walk(820); land(355);
  assert.ok(game.ownedCharms.includes('tide'), 'the tide charm is collected along the real route');
  jump(1015, 205);
  until('break Foamcliff seal', () => game.secretWalls[0].broken, () => ({ attack: true, right: game.player.facing !== 1 }));
  walk(1080);
  assert.ok(game.collected.includes('t-relic'));
  walk(1300); land(650);
  walk(1580); jump(1800, 520); jump(2000, 450);
  walk(2200); land(650);
  until('enter Archives', () => game.roomIndex === 13, () => ({ right: true }), 8);
  game.enemies = []; game.checkpointLit = true;
  walk(620); jump(760, 530); jump(1010, 435);
  walk(1240);
  until('ride Archive current', () => game.player.y < 210, () => ({}));
  walk(1450); land(340);
  jump(1640, 200);
  assert.ok(game.ownedCharms.includes('anchor'), 'the anchor is collected by reaching its high terrace');
  walk(1920); land(425);
  walk(2100); land(650);
  walk(2320);
  until('ride eastern Archive current', () => game.player.y < 290, () => ({}));
  walk(2510); land(375);
  until('break Archive seal', () => game.secretWalls[0].broken, () => ({ attack: true, right: game.player.facing !== 1 }));
  walk(2580);
  assert.ok(game.collected.includes('u-relic'));
  until('enter Tidal Throne', () => game.roomIndex === 14, () => ({ right: true }), 8);
  assert.equal(game.player.hp, game.player.maxHp, 'traversal needs no damage boost or healing');
  assert.deepEqual(game.ownedCharms, ['tide', 'anchor']);
  return { game, trace };
}
module.exports = { runTidesRoute };
if (require.main === module) console.log(JSON.stringify(runTidesRoute().trace, null, 2));
