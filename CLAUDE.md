# Crown Siege

Fantasy single-lane strategy game in the style of Stick War, for one player (Oli), played mostly as an iPhone home-screen app in landscape. Siblings: `gym-log`, `hangeul-lab`, `news-pocket`, `t212-pocket`.

## What it is
Your castle keep on the left, the Horde's dark tower on the right; destroy theirs to win. Workers (dwarf miners / goblin diggers) carry gold from two mines to the keep, and tend a mana crystal in front of the keep. You train units and give the whole army one command: **Garrison** (shelter in the keep: they heal, add arrows, and miners keep working), **Defend** (hold a line in front of the base) or **Attack** (march on the tower). One spell: **lightning strike** (tap ⚡, then tap the battlefield; costs mana, then recharges). The computer plays the Horde on easy, normal or hard.

Factions: Kingdom (player; steel blues and golds) vs Horde of orcs and goblins (greens and rust). Both share the same stats in release 1; only names and looks differ.

| role | Kingdom | Horde | cost |
|---|---|---|---|
| worker | Dwarf Miner | Goblin Digger | 50 gold |
| melee | Footman | Orc Grunt | 75 gold |
| ranged | Elf Archer | Goblin Spear-thrower | 100 gold |
| tank | Shield Knight | Armoured Brute | 150 gold + 40 mana, 2 pop |

All art is procedural Canvas 2D: a skeleton rig with pose keyframes plus attached shapes (helmets, shields, capes, weapons). No art files.

## State of play (read this first)
- Release 1 built 2026-10-23. `npm test` passes 11 tests, among them headless AI-vs-AI battles and a scripted "sensible player" that beats easy every time and normal on at least 3 of 6 seeds (5/8 when probed; hard beat it 0/8).
- Checked in the browser preview at 844x390: title (with an AI-vs-AI battle playing behind it), training through the buttons, drag to pan, minimap jump, lightning aim and cast with a real click, a win on Easy and a loss on Normal (end screens and saved records), pause on going to the background, and the portrait "turn your phone" prompt. No console errors from the game.
- Not yet checked on a real iPhone: touch feel, audio unlock from the first tap, frame rate with a full army, safe-area insets, installing to the home screen. Published 2026-10-23: public repo https://github.com/guitarmanj55/crown-siege, live at https://guitarmanj55.github.io/crown-siege/ (GitHub Pages from `main`, root). The first Pages build stalled with no workflow run; `gh api -X POST repos/guitarmanj55/crown-siege/pages/builds` restarted it.
- Balance notes: lightning was nerfed (it wiped whole armies when units bunched up in the lane); the AI only aims it at soldiers, never at miners. A full normal game runs about 15–20 minutes and two careful sides can stall (see backlog).

## Rules
- **The simulation is pure.** `src/sim/` has no DOM, timers or `Math.random`: randomness comes from the world's seeded `rng`, so the same seed replays the same game (a test guards this). It runs at a fixed 60 Hz (`STEP`); the renderer only reads it.
- **Data, not code, for units.** Stats, costs and faction names and looks live in `src/sim/factions.js`; how a look is drawn lives in `src/render/parts.js` (`LOOKS`). Release 1 keeps both factions on the same `STATS`.
- **Sim events drive effects and sound.** The sim pushes `world.events` (hit, shoot, death, coin, spawn, buildingHit, spellCast, lightning, win) and `main.js` turns them into particles and sound. Do not call render or audio code from the sim.
- **No build step, no dependencies.** Plain ES modules served as-is; `npm test` uses Node's own test runner.
- **iPhone first.** Landscape only (portrait shows the rotate prompt), safe-area insets, touch targets at least 44px, devicePixelRatio capped at 2, `prefers-reduced-motion` turns off screen shake. Audio is unlocked on the first `pointerdown` (iOS needs a tap). Going to the background pauses the game and suspends audio.
- **Saved data:** `localStorage` key `crownsiege_v1` (`schema: 1`: difficulty, sound, win/loss record and fastest win per difficulty). Every access is wrapped in try/catch in `src/ui/store.js`. Do not change the key or shape without a migration in `loadSave()`.
- **Service worker:** network-first for the shell, cache-first for icons. Bump `CACHE` in `sw.js` every release and add any new file to `SHELL`.
- `window.__crown` exposes the world and camera for checks in the browser; the game does not use it.

## Layout
- `index.html`, `style.css`: the shell, HUD buttons and the title, help, pause and end screens (DOM over the canvas).
- `src/main.js`: game loop (fixed sim step, render every frame), modes (title / playing / paused / ended), wiring of HUD, input, events, effects and audio.
- `src/sim/` (pure, tested): `world.js` (map, create, step, win), `factions.js` (stats and costs as data), `economy.js` (gold, mana, population, training queue, mining loop), `combat.js` (targeting via a per-faction x-sorted index, swings, missiles, damage, buildings' arrows), `orders.js` (garrison / defend / attack), `spells.js` (lightning), `ai.js` (build order, composition, when to attack or fall back, lightning; easy/normal/hard).
- `src/render/`: `rig.js` (skeleton, poses: idle, walk, swing, bow, throw, mine, die), `parts.js` (attached shapes and the eight looks), `draw.js` (sky, parallax, ground, keep, tower, mines, crystals, units, missiles), `fx.js` (particles, bolts, coin pops, flash), `camera.js` (pan, fling, shake, minimap).
- `src/ui/`: `hud.js`, `input.js` (drag to pan, minimap, spell aiming), `menus.js`, `store.js`. `src/audio.js`: WebAudio synth effects.
- `test/sim.test.js`: sim tests. `scripts/make_icons.ps1` renders `icons/`.
- `.claude/launch.json` serves the folder on port 8131 with Python's `http.server`.

## Testing
`npm test` (Node 24). Then serve the folder (`.claude/launch.json`, or `python -m http.server 8131` with the full Python path from the global CLAUDE.md) and check at a phone landscape size (844x390): title, a game to a win and a loss, lightning aim, pan and minimap, pause, portrait prompt, console clean. Python's server lets the browser cache modules, so after edits unregister the service worker or hard-reload.

## Backlog (release 2 and later)
1. Check on the real iPhone (see State of play) and tune touch, frame rate and audio levels.
2. Pacing: shorten normal games (building HP 3000, attackers vs tower arrows) and break stalemates.
3. Mage unit: battle wizard (fireball, area damage) / shaman (chain lightning), costing mana.
4. Giant unit: stone golem / troll.
5. Hero: a paladin the player can take direct control of; respawns at the keep.
6. More spells: rally (speed and damage boost), heal wave.
7. Campaign of maps and upgrades (armour, mining speed, keep arrows); faction-specific stats.
8. Per-unit-type commands or a second lane, if the single army order feels too thin.

## Release routine
`npm test`, check in the browser preview as above, bump `CACHE` in `sw.js`, commit and `git push` (Pages redeploys from `main`; check the live URL).
