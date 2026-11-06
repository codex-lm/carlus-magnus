// Shared by Node full-fight regressions and the development-only visual replay.
(function (root) {
  function createCombatBrain() {
    const state = { stage: 0, release: 0, opened: 0, climbTimes: [] };
    return { state, input(game) {
      const p = game.player, boss = game.enemies.find(e => e.type === 'boss');
      const type = boss.bossType, input = {};
      if (type === 'warden' || type === 'king') {
        const targets = type === 'warden' ? [{ x: 1080, y: 550 }, { x: 1160, y: 450 }] : [{ x: 1160, y: 550 }, { x: 1220, y: 450 }, { x: 1280, y: 350 }];
        if (boss.weakpoint.active) {
          if (!state.opened) { state.opened = game.time; state.stage = 0; state.release = 2; }
          if (state.stage < targets.length) {
            const target = targets[state.stage];
            input.left = p.x > target.x + 3; input.right = p.x < target.x - 3;
            if (p.grounded && Math.abs(p.y + p.h - target.y) < 5) {
              state.stage++; state.release = 2;
              if (state.stage === targets.length) state.climbTimes.push(game.time - state.opened);
            } else if (state.release > 0) state.release--;
            else input.jump = true;
          } else { input.attack = true; input.right = p.facing !== 1; }
        } else {
          state.opened = 0;
          const x = type === 'warden' ? 1080 : 1160;
          input.left = p.x > x + 3; input.right = p.x < x - 3;
          const sweep = boss.attackKind === 'sweep' || boss.attackKind === 'doubleSweep';
          if (boss.state === 'windup' && sweep && boss.timer < .11) { input.block = true; input.right = p.facing !== 1; input.left = false; }
          else if (boss.state === 'attack' && sweep) input.block = true;
        }
      } else if (type === 'titan') {
        if (p.hp < p.maxHp - 50) input.heal = true;
        if (boss.weakpoint.active) {
          if (!state.opened) { state.opened = game.time; state.stage = 0; }
          const target = p.y > 360 && p.x < 1120 ? 1040 : 1235;
          input.left = p.x > target + 3; input.right = p.x < target - 3;
          if (p.y < 390 && p.y + p.h > 325 && Math.abs(p.x - 1235) < 50) {
            if (!state.stage) { state.stage = 1; state.climbTimes.push(game.time - state.opened); }
            input.attack = true;
            if (p.facing !== 1) { input.right = true; input.left = false; }
          }
        } else {
          state.opened = 0;
          let target = 1000;
          if (boss.attackKind === 'pearlRain' && ['windup', 'attack'].includes(boss.state)) {
            const columns = boss.telegraphs || [];
            const candidates = [930, 1010, 1090, 800];
            target = candidates.find(x => columns.every(t => x + p.w < t.x - 10 || x > t.x + t.w + 10)) ?? 760;
          }
          input.left = p.x > target + 3; input.right = p.x < target - 3;
          if (game.projectiles.some(a => a.groundWave && Math.abs(a.x - p.x) < 160 && (a.x - p.x) * a.vx < 0)) input.jump = true;
        }
      } else {
        if (p.hp < 65) input.heal = true;
        if (boss.weakpoint.active) {
          const target = boss.weakpoint.x - 42;
          input.right = p.x < target - 4; input.left = p.x > target + 4;
          if (Math.abs(p.x - target) < 55) { input.attack = true; if (p.facing !== 1) { input.right = true; input.left = false; } }
        } else if (type === 'moth') {
          const near = game.projectiles.find(a => !a.groundWave && Math.hypot(a.x - p.x, a.y - p.y) < (game.config.difficulty === 'master' ? 55 : 80));
          if (near) { input.block = true; input.right = near.x > p.x; input.left = near.x < p.x; }
          if (boss.attackKind === 'dive' && boss.state === 'windup') { input.left = p.x < boss.targetX; input.right = !input.left; }
        } else if (type === 'worm') {
          if (boss.state === 'windup' && boss.attackKind !== 'bite') {
            const d = p.x + 15 - boss.targetX;
            if (Math.abs(d) < 160) {
              const right = boss.targetX + 160 < game.room.width - p.w - 35;
              const left = boss.targetX - 160 > game.room.bossGate.x + 15;
              input.right = right && (d >= 0 || !left); input.left = !input.right;
            }
          }
          if (boss.state === 'windup' && boss.attackKind === 'bite' && boss.timer < .12) { input.block = true; input.right = boss.x + boss.w / 2 > p.x + 15; input.left = !input.right; }
          if (boss.state === 'attack' && boss.attackKind === 'bite') input.block = true;
        } else {
          const d = boss.x + boss.w / 2 - p.x - 15;
          if (boss.state === 'attack' && Math.abs(d) < 130) { input.block = true; input.right = d > 0; input.left = d < 0; }
          else if (boss.state === 'windup' && Math.abs(d) > 150) { input.right = d > 0; input.left = d < 0; }
        }
        if (!boss.weakpoint.active && game.projectiles.some(a => a.groundWave && Math.abs(a.x - p.x) < 180 && (a.x - p.x) * a.vx < 0)) input.jump = true;
      }
      return input;
    } };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createCombatBrain };
  else root.createCombatBrain = createCombatBrain;
})(typeof globalThis !== 'undefined' ? globalThis : this);
