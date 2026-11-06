# Carlus Magnus — Shards of Dawn

Version 1.4.0, The Celestial Tides. An original, small browser platformer made for Charles, fully playable in English or French.

Use the **Français / English** selector in the header or open modal to switch languages without restarting your adventure. The choice is remembered separately from progress. Add `?lang=en` or `?lang=fr` to the game URL to select a language directly. Both languages are included in the standalone offline copy.

[Play on LOB7](https://lob7.com/games/bg_s_c676ba69-d9fe-474a-8ea4-512af4c7095e). Each edition links its exact source commit.

Version 1.2.1 draws at the displayed size and screen pixel density, up to native 3840×2160 pixels. Window resizing and density changes update automatically; the logical 1280×720 world, camera, gameplay and saves are unchanged. Boss previews also use an appropriate pixel density when opened.

Fifteen connected areas, six three-phase bosses, sword/axe/spear combat, parry, guard, dodge, double jump and downward attacks. Choose three archetypes or distribute twelve points. Find twelve talents and eight talismans; equip two talismans and refill healing flasks at sanctuaries.

Explorer, Adventurer and Master difficulties. Master hides advance attack zones by default; the pause menu can toggle them in every mode. Boss trials are independent of the saved adventure. Saves stay in the current browser and origin; they do not transfer automatically from another website.

The Celestial Tides adds Foamcliff Coast, the Sunken Archives and the Tidal Throne. Ride the visible currents to reach high secrets and Atlas’s heart; hold Down to descend or move sideways to leave a current. Atlas brings tidal waves, targeted pearls and claw attacks across three phases. The Pearl of the Tide adds 15 HP to each flask; the Foam Anchor improves grounded stamina recovery by 20%. Camera shake can be reduced in the pause menu, and weapon impacts now have distinct sounds.

Completed 1.3 saves on the same origin continue into chapter three with inventory intact. New LOB7 editions use distinct origins, so their browser saves do not transfer automatically.

## Run and edit

Serve this directory with `python -m http.server 4173`, then open `http://localhost:4173`. No installation, build step, external network calls or dependencies are needed. The JavaScript and CSS here are the editable sources, not minified bundles. `carlus-magnus.html` is a standalone offline copy.

- `i18n.js`, `i18n-engine.js`, `i18n-ui.js`: local language selection and complete French/English text.
- `engine.js`: simulation, levels, combat, progress and saves.
- `render.js`: original Canvas 2D graphics.
- `app.js`: menus, keyboard/gamepad/touch controls, storage and Web Audio.
- `index.html` and `style.css`: interface.

The `development` branch includes the test suite and standalone builder. Validation covers 112 tests, including language changes, save preservation and HiDPI rendering, 76 physics traversal routes and a continuous slow-hero route through the new chapter, and all six bosses in Adventurer and Master using normal inputs. Manual browser tests and slowed rendered replays complement the simulations; a full manual campaign is not claimed.

## Controls

Arrows / A-D / Q-D move; Space jumps; J or X attacks; Down descends inside a current; Down + attack performs an aerial downward strike; K or C guards/parries; Shift or L dodges; F heals; E uses a sanctuary; 1/2/3 selects a weapon; Tab opens talents; I opens talismans; M opens the map; Escape or P pauses. Gamepad and optional touch controls are also available.

## Credits and license

Cédric Bernadac: creative direction and feedback. Nilo (Codex): implementation, original art, synthesized audio and testing. Created for Charles. No third-party game code or assets copied.

Code: MIT. Original visual and audio artwork: CC BY-SA 4.0. See LICENSE and ASSETS-LICENSE.txt. Publisher declarations are recorded in LOB7-ATTRIBUTION.json.
