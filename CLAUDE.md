# Crown Siege

Fantasy single-lane strategy game in the style of Stick War, for one player (Oli), played mostly as an iPhone home-screen app in landscape. Siblings: `gym-log`, `hangeul-lab`, `news-pocket`, `t212-pocket`.

## What it is
Your castle keep on the left, the Horde's dark tower on the right; destroy theirs to win. Workers (dwarf miners / goblin diggers) carry gold from two mines to the keep, and tend a mana crystal in front of the keep. Workers and soldiers share one live population cap of 40 (`POP_CAP`; the dead and dismissed free their place). The button with the red minus beside the miner sends one home: a queued miner is cancelled for a full refund, otherwise the miner nearest the keep walks back and leaves, refunding half its cost (`dismissWorker`). You train units and give the whole army one command: **Garrison** (shelter in the keep: they heal, add arrows, and miners keep working), **Defend** (hold a line in front of the base) or **Attack** (march on the tower). One spell: **lightning strike** (tap ⚡, then tap the battlefield; costs mana, then recharges). The computer plays the Horde on easy, normal or hard.

Factions: Kingdom (player; steel blues and golds) vs Horde of orcs and goblins (greens and rust). Both share the same stats in release 1; only names and looks differ.

| role | Kingdom | Horde | cost |
|---|---|---|---|
| worker | Dwarf Miner | Goblin Digger | 50 gold |
| melee | Footman | Orc Grunt | 75 gold |
| ranged | Elf Archer | Goblin Spear-thrower | 100 gold |
| tank | Shield Knight | Armoured Brute | 150 gold + 40 mana, 2 pop |
| mage | Battle Wizard | Orc Shaman | 125 gold + 30 mana |
| giant | Stone Golem | Cave Troll | 250 gold + 80 mana, 3 pop |

**Crowns, quests and the shop** (release 5, `src/progress.js`, pure): every battle pays crowns (win/loss: easy 10/3, normal 20/5, hard 35/8); the first battle of each day pays a streak bonus (10, +5 per day in a row, up to 40); three **daily quests** a day, picked from the date (same three all day, reset at local midnight); one-time **achievements** read from the saved totals and record (also paid on the menu, so older saves get theirs). The **Shop** sells four upgrades of three tiers (Royal Treasury +40 starting gold, Deep Veins +5% income, Stout Walls +8% keep HP, Storm Lore -10% lightning recharge), with an Upgrades on/off switch, and banner colours for the Kingdom's cloth (looks only). Upgrades reach the sim as `createWorld({ boons: { kingdom: {...} } })`.

All art is procedural Canvas 2D: a skeleton rig with pose keyframes plus attached shapes (helmets, shields, capes, weapons). No art files.

## State of play (read this first)
- Release 5 (2026-10-26): **gamification**: crowns, daily quests, achievements, a play streak and a shop (see above). Title gets a crown count and Quests (badge: quests left today) and Shop buttons; the end screen lists the crowns earned. Sim: `boons` option, `stats.byType`, `stats.spellKills`, `stats.casts`, `f.spellCdMul`; the AI's income multiplier now stacks (`*=`). Save schema 2 (same key) with a migration from schema 1 (wins counted from the record). Probe, 8 seeds, scripted player with mages and giants: no upgrades, normal 8/8 (7-15 min), hard 5/8; every upgrade maxed (about 1,860 crowns, weeks of play), normal 8/8 (6-9 min), hard 7/8. `npm test` passes 23 tests. Checked in the preview at 844x390 and 667x375 (title, quests, shop, buying, banner colours in a game, end screen rewards); not checked on a real iPhone (scrolling the achievements column by touch especially). `scripts/serve.py` now honours `PORT`, so the preview works when 8131 is taken.
- Release 4 (2026-10-26): **Stone Golem / Cave Troll** giant (250 gold + 80 mana, 3 pop, key 6; 720 HP, armour 3, slow, 38 damage and every blow stomps 50% onto foes within 44 units; front of the line). The AI trains giants (10% of its mix). Probe with the scripted player (mage and giant in its mix), 8 seeds: easy 8/8 (3.5 min), normal 8/8 (7-15 min), hard 5/8 (several 30-minute stalls); hard used to be 0/8, so hard may now be a little soft against a good player. `npm test` passes 15 tests. Fixed a stray non-UTF-8 byte in `fx.js` from release 3 (Python on Windows: always pass `encoding='utf-8'` when editing files). Checked in the preview at 667x375 (six train buttons fit); not checked on a real iPhone. The `/next-release` skill lives in `~/.claude/skills/next-release`.
- Release 3 (2026-10-26): **Battle Wizard / Orc Shaman** (125 gold + 30 mana, key 5; slow orb that ignores armour and splashes 60% to foes within 48 units; fragile, stands behind the line), and pacing: buildings 2400 HP, plus a **siege ramp** (from 8:00 buildings take +100% damage per further 2 minutes, `siegeMul` in `combat.js`, with a "walls begin to crack" message) so stalemates end. The AI trains mages (13% of its mix). Probe over 8 seeds with a scripted player using mages: beats easy 8/8 (3.5 min), normal 8/8 (7–21 min; before, 5/8 with three 30-minute stalls); hard 0/8 (mostly stalls, since the probe's lightning kills Horde miners). `npm test` passes 14 tests. Also guards `drawSky` against a non-finite frame while resizing (it threw and would stop the loop). Checked in the preview at 844x390 and 667x375 (five train buttons fit); not checked on a real iPhone.
- Release 2 (2026-10-25): compact two-column title panel for short landscape screens (about 180px tall instead of 300), and sending miners home. Checked in the preview at 844x390 and 667x375.
- Release 1 built 2026-10-23. `npm test` passes 12 tests, among them headless AI-vs-AI battles and a scripted "sensible player" that beats easy every time and normal on at least 3 of 6 seeds (5/8 when probed; hard beat it 0/8).
- Checked in the browser preview at 844x390: title (with an AI-vs-AI battle playing behind it), training through the buttons, drag to pan, minimap jump, lightning aim and cast with a real click, a win on Easy and a loss on Normal (end screens and saved records), pause on going to the background, and the portrait "turn your phone" prompt. No console errors from the game.
- Not yet checked on a real iPhone: touch feel, audio unlock from the first tap, frame rate with a full army, safe-area insets, installing to the home screen. Published 2026-10-23: public repo https://github.com/guitarmanj55/crown-siege, live at https://guitarmanj55.github.io/crown-siege/ (GitHub Pages from `main`, root). The first Pages build stalled with no workflow run; `gh api -X POST repos/guitarmanj55/crown-siege/pages/builds` restarted it.
- Balance notes: lightning was nerfed (it wiped whole armies when units bunched up in the lane); the AI only aims it at soldiers, never at miners. A full normal game runs about 15–20 minutes and two careful sides can stall (see backlog).

## Rules
- **The simulation is pure.** `src/sim/` has no DOM, timers or `Math.random`: randomness comes from the world's seeded `rng`, so the same seed replays the same game (a test guards this). It runs at a fixed 60 Hz (`STEP`); the renderer only reads it.
- **Data, not code, for units.** Stats, costs and faction names and looks live in `src/sim/factions.js`; how a look is drawn lives in `src/render/parts.js` (`LOOKS`). Release 1 keeps both factions on the same `STATS`.
- **Sim events drive effects and sound.** The sim pushes `world.events` (hit, shoot, death, coin, spawn, buildingHit, spellCast, lightning, win) and `main.js` turns them into particles and sound. Do not call render or audio code from the sim.
- **No build step, no dependencies.** Plain ES modules served as-is; `npm test` uses Node's own test runner.
- **iPhone first.** Landscape only (portrait shows the rotate prompt), safe-area insets, touch targets at least 44px, devicePixelRatio capped at 2, `prefers-reduced-motion` turns off screen shake. Audio is unlocked on the first `pointerdown` (iOS needs a tap). Going to the background pauses the game and suspends audio.
- **Saved data:** `localStorage` key `crownsiege_v1` (`schema: 2`: difficulty, sound, win/loss record and fastest win per difficulty; crowns, upgrades, useUpgrades, banners, banner, daily, streak, totals, achieved). Every access is wrapped in try/catch in `src/ui/store.js`. Do not change the key or shape without a migration in `loadSave()`.
- **Service worker:** network-first for the shell, cache-first for icons. Bump `CACHE` in `sw.js` every release and add any new file to `SHELL`.
- `window.__crown` exposes the world and camera for checks in the browser; the game does not use it.

## Layout
- `index.html`, `style.css`: the shell, HUD buttons and the title, help, pause and end screens (DOM over the canvas).
- `src/main.js`: game loop (fixed sim step, render every frame), modes (title / playing / paused / ended), wiring of HUD, input, events, effects and audio.
- `src/sim/` (pure, tested): `world.js` (map, create, step, win), `factions.js` (stats and costs as data), `economy.js` (gold, mana, population, training queue, mining loop), `combat.js` (targeting via a per-faction x-sorted index, swings, missiles, damage, buildings' arrows), `orders.js` (garrison / defend / attack), `spells.js` (lightning), `ai.js` (build order, composition, when to attack or fall back, lightning; easy/normal/hard).
- `src/render/`: `rig.js` (skeleton, poses: idle, walk, swing, bow, throw, mine, die), `parts.js` (attached shapes and the eight looks), `draw.js` (sky, parallax, ground, keep, tower, mines, crystals, units, missiles), `fx.js` (particles, bolts, coin pops, flash), `camera.js` (pan, fling, shake, minimap).
- `src/ui/`: `hud.js`, `input.js` (drag to pan, minimap, spell aiming), `menus.js` (also quests and shop screens), `store.js`. `src/progress.js` (pure): crowns, daily quests, achievements, streak, shop catalogue, `boonsFor`. `src/audio.js`: WebAudio synth effects.
- `test/sim.test.js`: sim tests. `test/progress.test.js`: quests, shop, boons, save migration. `scripts/make_icons.ps1` renders `icons/`.
- `.claude/launch.json` serves the folder on port 8131 with `scripts/serve.py` (Python's `http.server` with `Cache-Control: no-store`).

## Testing
`npm test` (Node 24). Then serve the folder (`.claude/launch.json`, or `scripts/serve.py` with the full Python path from the global CLAUDE.md) and check at a phone landscape size (844x390): title, a game to a win and a loss, lightning aim, pan and minimap, pause, portrait prompt, console clean. The dev server sends no-store, but unregister the service worker after edits. While the browser pane is in the background its frames stop, so the HUD and world freeze; check `window.__crown.world` rather than the HUD then.

## Backlog (release 2 and later)
1. Check on the real iPhone (see State of play) and tune touch, frame rate and audio levels.
2. Pacing: partly done in release 3 (siege ramp, 2400 HP). Hard still stalls against a lightning-spamming player; consider hard AI rebuilding miners faster.
3. (done in release 3: mage.) Possible follow-ups: chain lightning for the shaman, mage AI spell targeting.
4. (done in release 4: giant.) Possible follow-ups: giants throw boulders, AI keeps giants back until 2+ are ready.
5. Hero: a paladin the player can take direct control of; respawns at the keep.
6. More spells: rally (speed and damage boost), heal wave.
7. Campaign of maps and upgrades (armour, mining speed, keep arrows); faction-specific stats.
8. Per-unit-type commands or a second lane, if the single army order feels too thin.
9. (done in release 5: quests and shop.) Possible follow-ups: weekly quest with a bigger prize, more cosmetics (keep skins, lightning colour), a reroll for one daily quest, unit upgrades (armour) once faction stats split.

## Release routine
`npm test`, check in the browser preview as above, bump `CACHE` in `sw.js`, commit and `git push` (Pages redeploys from `main`; check the live URL).
