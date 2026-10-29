// Search real input trajectories, using the shipping collision code, at minimum speed.
const assert = require('node:assert/strict');
const CM = require('../dist/engine.js');
function routeJump(roomIndex, fromIndex, toIndex, wings) {
  const room = CM.ROOMS[roomIndex], from = room.platforms[fromIndex], to = room.platforms[toIndex];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
  const launches = [...new Set([from.x + 5, from.x + from.w - 35,
    from.x + from.w / 2, to.x - 55, to.x + to.w + 25]
    .map(x => clamp(x, from.x + 2, from.x + from.w - 32)))];
  const targets = [to.x + 4, to.x + to.w / 2 - 15, to.x + to.w - 34];
  const escapes = to.y < from.y && to.x < from.x + from.w && to.x + to.w > from.x
    ? [null, { x: to.x - 40, until: 65 }, { x: to.x + to.w + 10, until: 65 }]
    : [null];
  for (const launchX of launches) for (const targetX of targets) for (const delay of [0, 8, 16, 24]) {
    for (const secondAt of (wings ? [-1, 30, 45, 60, 75] : [-1])) for (const escape of escapes) {
      const game = new CM.Engine({ stats: { speed: 1, power: 4, vitality: 7 } });
      game.loadRoom(roomIndex, launchX, from.y - 52);
      game.enemies = []; game.pickups = []; game.checkpointLit = true;
      game.player.doubleJump = wings; game.player.grounded = true;
      const initialDirection = Math.sign((escape ? escape.x : targetX) - launchX);
      game.player.vx = delay ? 0 : initialDirection * 232;
      for (let f = 0; f < 240; f++) {
        const p = game.player, dx = (escape && f < escape.until ? escape.x : targetX) - p.x;
        const moving = f >= delay && Math.abs(dx) > 8;
        const jump = f !== secondAt - 1;
        game.update(1 / 120, { left: moving && dx < 0, right: moving && dx > 0, jump });
        if (p.grounded && Math.abs(p.y + p.h - to.y) < 1 && p.x + p.w > to.x && p.x < to.x + to.w && f > 5) {
          return { launchX, targetX, delay, secondAt, escape, frames: f + 1 };
        }
        if (game.roomIndex !== roomIndex || game.dead || game.player.invulnerable > 0) break;
      }
    }
  }
  return null;
}
const routes = [
  { room: 0, wings: false, steps: [[0, 2], [2, 3], [3, 4], [4, 1]] },
  { room: 1, wings: false, steps: [[0, 2], [2, 3], [3, 4], [4, 1], [1, 5], [5, 6]] },
  { room: 0, wings: true, steps: [[1, 5], [5, 6], [6, 7]] },
  { room: 3, wings: true, steps: [[0, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 2], [2, 8], [8, 9]] },
  { room: 4, wings: true, steps: [[0, 2], [2, 3], [3, 4], [4, 1], [1, 5], [5, 6], [6, 7]] },
  { room: 6, wings: true, steps: [[0, 3], [3, 4], [4, 5], [5, 1], [1, 6], [6, 7], [7, 8], [8, 2], [2, 9]] },
  { room: 8, wings: true, steps: [[0, 3], [3, 4], [4, 5], [5, 1], [1, 6], [6, 7], [7, 8], [8, 2], [2, 9]] },
  { room: 10, wings: true, steps: [[0, 3], [3, 4], [4, 5], [5, 1], [1, 6], [6, 7], [7, 8], [8, 2], [2, 9], [9, 10]] },
];
let count = 0;
for (const route of routes) for (const [from, to] of route.steps) {
  const result = routeJump(route.room, from, to, route.wings);
  assert.ok(result, `Room ${route.room}: platform ${from} → ${to} is reachable (wings=${route.wings})`);
  count++;
}
assert.equal(routeJump(0, 6, 7, false), null, 'The high secret rewards returning with wings');
console.log(`${count} real-physics platform routes passed at speed=1; high secret requires wings.`);
