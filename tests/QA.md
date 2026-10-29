# Acceptance — v1.2, Les Royaumes oubliés

Run from the project directory:

```powershell
node --test tests/*.test.cjs
node tests/routes.cjs
```

Final automated result: **75 tests pass; 56 platform-to-platform routes pass**.

## What the tests verify

- **17 core checks:** movement and stats, jump/dash input, double jump, weapons, parry/guard, stamina, talents, pickups, sanctuary respawn, save restoration, boss gates and completion.
- **12 first-expansion checks:** original v1 fixtures, secret walls, travel restrictions, pogo, giant armor and seals, timed openings, three phases, one-way limbs and trial restart.
- **19 new-expansion checks:** 12 zones with stable original indices, genuine v1 and v1.1 migration fixtures, continuation after chapter one, final victory persistence, six talisman effects and two slots, no healing exploit through equipment swaps, zero-flask persistence, healing input/refill, all six new talent effects, difficulty scaling, repeated-parry openings, moth landing, attack-zone preference and arena camera framing.
- **9 application checks:** real app callbacks in a mocked DOM and in-memory storage, including all five trial entries, campaign isolation through death/retry/exit/victory, separate Master records, equipment persistence, F/heal button and the attack-zone toggle.
- **8 attack-consistency checks:** ordinary enemy warning/hit/miss behavior, hopper contact, spitter trajectories, giant sweep range, every phase and direction of the duelist dash, the complete moth dive path, worm emergence/bite and the buried-worm no-hit/no-pogo rule.
- **10 complete boss-fight simulations:** every boss on Adventurer and Master, driven solely by ordinary controls.

The full fights use speed 1, power 4 and vitality 7, with no talents or talismans. The mobile-boss controller can drink its legitimate flask. No positions, health, damage, invulnerability or vulnerability openings are injected during these fights. It parries, climbs where needed, evades, attacks and completes all three phases. The controller reads game state precisely, so these wins demonstrate mechanical feasibility; they are not evidence of a human completing Master mode from visual cues.

The 56 traversal searches use the shipping physics at 120 Hz, minimum speed and no dash. They cover mandatory wings, the original secret routes, both aqueduct gaps and all three new exploration areas. Enemies and pickups are removed for individual route searches; their behavior is checked separately. No uninterrupted full-campaign playthrough is claimed.

## Development-only visual replay

`tests/replay.html` loads the actual engine and renderer and shares `tests/bot-controls.js` with the complete-fight regressions. It supports all bosses and modes, pause, one simulation step, 0.25×, 0.5×, 1× and 4× playback, predictive zones and collision overlays. It never saves campaign progress and is not included in the shipped `dist/` site.

To serve it from the project directory:

```powershell
python -m http.server 4174 --bind 127.0.0.1
```

Open `http://127.0.0.1:4174/tests/replay.html`. This is automated gameplay rendered in the browser, not manual play.

## Manual browser checks recorded by the main agent

- Before the final mobile-boss pacing adjustment, actual jump/attack inputs reached moth phase II; feathers and dive attacks hit the player, and the flask was used.
- In the tuned worm fight, emergence and an initial dodge were observed. Mistimed attacks/bites reduced HP from 130 to 29 over about 16 seconds; an actual F press restored 29 to 79 and consumed the only flask.
- In Master campaign play, a crawler dealt 30 damage. The heart talisman was collected/equipped, increasing maximum HP from 130 to 155 without increasing current HP. F restored 64 to 114 and charges changed from 1 to 0. A real page reload preserved 114/155 HP, zero flasks and the equipped talisman.
- Master future attack zones were hidden by default; enabling them in pause visibly restored them.
- Earlier checks covered both Veilleur ankle seals opening the heart, climbing/jumping on the boss, character allocation, menus, pause and trial entry.

These observations are distinct from the mocked-DOM tests and full simulated victories. No complete manual boss victory is claimed here. Physical gamepad and touch hardware have not been exercised. Hosting status is recorded separately by the main agent.

In the rendered automated replay, the main agent observed a moth victory at 39.21 seconds after phase three, six openings and four incoming hits. Feather projectile/collision alignment was inspected at 0.25× playback. Master duelist replay completed at 37.26 seconds, phase three, six openings and one incoming hit, with future attack zones hidden. At the same paused 4.94-second windup, toggling zones added/removed the ground rectangle while gestures, the attack tell and characters remained. This browser replay uses the shared test controller; these are rendered automated fights, not manual victories.

## Concrete attack inconsistencies corrected

The phase-three duelist dash could extend beyond its warning; the warning now derives from movement distance plus blade reach. The moth formerly warned only its landing area; its warning now covers the full damaging flight path. A fully buried worm formerly still accepted armor hits and pogo contact at its invisible body; buried bodies now ignore those hits. The visual replay also exposed a flying boss nearing the screen edge; the arena camera now frames both fighters when they fit and keeps the player safely visible when they do not. Matching regressions pass.
