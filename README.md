# Carlus Magnus — Les éclats d’Aurore

Version 1.2.0, Les Royaumes oubliés. An original, small browser platformer made for Charles, with French in-game text.

Twelve connected areas, five three-phase bosses, sword/axe/spear combat, parry, guard, dodge, double jump and downward attacks. Choose three archetypes or distribute twelve points. Find twelve talents and six talismans; equip two talismans and refill healing flasks at sanctuaries.

Explorer, Adventurer and Master difficulties. Master hides advance attack zones by default; the pause menu can toggle them in every mode. Boss trials are independent of the saved adventure. Saves stay in the current browser and origin; they do not transfer automatically from another website.

## Run and edit

Serve this directory with `python -m http.server 4173`, then open `http://localhost:4173`. No installation, build step, external network calls or dependencies are needed. The JavaScript and CSS here are the editable sources, not minified bundles. `carlus-magnus.html` is a standalone offline copy.

- `engine.js`: simulation, levels, combat, progress and saves.
- `render.js`: original Canvas 2D graphics.
- `app.js`: menus, keyboard/gamepad/touch controls, storage and Web Audio.
- `index.html` and `style.css`: interface.

The `development` branch includes the test suite and standalone builder. Validation covers 75 tests, 56 physics traversal routes, and all five bosses in Adventurer and Master using normal inputs. Manual browser tests and slowed rendered replays complement the simulations; a full manual campaign is not claimed.

## Controls

Arrows / A-D / Q-D move; Space jumps; J or X attacks; Down + attack performs an aerial downward strike; K or C guards/parries; Shift or L dodges; F heals; E uses a sanctuary; 1/2/3 selects a weapon; Tab opens talents; I opens talismans; M opens the map; Escape or P pauses. Gamepad and optional touch controls are also available.

## Credits and license

Cédric Bernadac: creative direction and feedback. Nilo (Codex): implementation, original art, synthesized audio and testing. Created for Charles. No third-party game code or assets copied.

Code: MIT. Original visual and audio artwork: CC BY-SA 4.0. See LICENSE and ASSETS-LICENSE.txt. Publisher declarations are recorded in LOB7-ATTRIBUTION.json.
