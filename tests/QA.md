# Acceptance — current and historical checks

## Version 1.4.0 — The Celestial Tides, 6 November 2026

Final local `npm test`: **112 tests pass; 76 platform-to-platform routes pass**. This includes the prior 98-test/56-route baseline, two complete Atlas fights, migration and tidal mechanics, preference handling, renderer checks, and 20 additional routes. The standalone/source parity assertion passes, including all six scripts and versioned asset URLs.

The slowest legal hero (speed 1, power 4, vitality 7) continuously traverses Foamcliff Coast and the Sunken Archives into the Tidal Throne in **29.32 seconds**. This input replay rides all three exploration currents, collects both new charms, breaks both high secret seals and collects their relics. There is no position injection after its starting fixture, no dash, no damage, no healing, and no injected skills. Enemies are removed to isolate traversal; the actual platforms, hazards, collectibles, walls, gravity and collision code remain active. `node tests/tides-route.cjs` prints every waypoint. Its normal inputs are also part of the automated suite.

That continuous replay exposed a genuine geometry defect: the eastern Archive current was covered by a solid ledge, trapping the ascending hero against its underside at y=544. The engine change makes that ledge a one-way landing surface. The same uninterrupted route now reaches the high relic and exits safely. Down suppresses current lift; one-way ledges still support a descending hero, who can step sideways to descend farther.

The shared combat controller completes every boss on Adventurer and Master using ordinary controls only, with no talents or equipped charms. New Atlas results:

| Mode | Victory time | Openings | Phases | Connected strikes | Damage taken | Flasks used |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| Adventurer | 43.75 s | 5 | I, II, III | 10 | 0 | 0 |
| Master | 59.22 s | 5 | I, II, III | 10 | 0 | 0 |

These fights evade waves, targeted pearls and claws, ride the currents and reach the high heart during every opening. The bot reads exact game state; a no-hit result establishes mechanical feasibility, not human difficulty or a human Master victory. Separate actual-input parry tests confirm that two perfect parries open Atlas on Adventurer and three on Master. Attack checks establish that each of the three attack types causes damage in its path, causes none during windup, and can be avoided. An opening cannot be extended by repeated calls and deals at most 22% of maximum boss health.

Additional checks preserve all original twelve room indices, old king completion into room 6, version 1.3 duelist completion into room 12, unfinished adventures, inventory, skill allocation, counters and charm equipment. Version 1.4 Atlas completion remains complete on reload. The new pearl restores 65 HP, or 90 with Pure Spring; the anchor increases grounded stamina recovery by 20% and does not affect airborne recovery. Two equipment slots and legitimate flask charges remain enforced.

Camera-shake preferences respect the operating system default, survive reload, merge with sound and unrelated stored preferences, and work when storage is unavailable. Reduced motion removes an existing shake immediately without modifying gameplay. Both physical Atlas currents remain drawn in Master when predictive attack zones are hidden. The existing localization traversal covers all new engine metadata, and all six trial cards are exercised through real app callbacks.

The main agent separately observed the rendered Master Atlas victory at **59.22 s**, phase III, five openings and zero incoming hits, after inspecting the shared replay at 0.25× and then 4× with future attack zones hidden. This is a rendered automated victory. Manual browser checks also confirmed that a current lifts the hero, an enemy attack takes 23 HP, and pause/help/English labels work. The browser exposed stale script caching on the unchanged local origin; versioned script and stylesheet URLs now keep the edition consistent, and the corresponding source-order/parity test passes.

For the development replay use `tests/replay.html?boss=titan&difficulty=master&speed=0.25` on the development server. It loads the real engine and renderer, has no campaign writes and is excluded from the shipped site.

Coverage limits: no complete uninterrupted human campaign, physical gamepad session or physical touch-device session was performed for this version. The continuous exploration replay removes enemies; the full fights run separately. Publication status is recorded by the main agent and is not implied by these local results.

## Historical baseline — v1.2, Les Royaumes oubliés

Version 1.2.1 HiDPI check: 9 renderer tests and 9 app/storage tests pass. They cover 4K at DPR 1, 1920×1080 at DPR 2, 2560×1440 at DPR 1.5, the physical 4K cap, exact 16:9 sizing for wide/portrait/fractional boxes, cover previews, CSS/DPR changes, hidden canvases and 180 stable frames without buffer resets. Real renderer title/game draws preserve the engine snapshot and camera. Browser DOM measurements confirm the standalone changed from 1280×720 to 3840×2160 at a 3840×2160 viewport (DPR 1), then to 1920×1080 within a 1920×1200 viewport, then back to 4K without reloading. A boss preview uses cover sizing; the live trial and pause UI render without console warnings/errors. Native-size detail capture: `artifacts/4k-detail-after.jpg`. Fractional/DPR 2 cases were tested in Node, not by changing the physical monitor. The mechanics/traversal suite below is the prior 1.2 baseline; no new full campaign run is claimed.

LOB7 publication check, 29 October 2026: release `br_s_d3bbbd57-8fc4-4195-a5d5-39cb2f030cfe`, public commit `9f5a3dba3528250ef34f7c339f092566932293c5`. After replacing IIFEs with strict lexical blocks and spacing 31 decimal ternaries, the full suite below passed again. The engine, renderer and app bodies otherwise remained unchanged. LOB7 passed policy, Semgrep, Chromium startup and malware checks. A keyboard-driven test in the public LOB7 player entered the Master moth trial, moved, jumped and attacked; HP fell from 130 to 100, then F restored 130 and consumed the single flask. The moth landed and exposed its heart, Master attack zones were unchecked, and the trial was left paused. Browser console inspection returned no warnings or errors. This was a short hosted smoke test, not a complete boss victory or campaign.

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

## Version 1.3.0 — French and English

The final local build passes 98 tests and all 56 physics routes. Fourteen localization tests cover stored language and URL selection, unavailable storage, complete engine metadata, dynamic boss messages, actual app menu callbacks, custom names and allocation, campaign preservation, trial difficulty and record isolation, canvas labels, and exact standalone/source parity. French remains the default; language is stored separately from campaign progress.

The main agent checked English title, character creation, all five trial cards, moth HUD, pause, help and skills in the browser. Switching French → English preserved a custom name, 5/3/4 attributes, spear selection and Master difficulty; switching in the trial menu preserved Master. A short fight accepted normal movement, jump and attack inputs without reported console errors. Final title and help screenshots confirmed the corrected subtitle layout and both styled language selectors. These checks supplement the automated suite; they are not a complete manual campaign or a physical controller test. Publication results are recorded separately.
