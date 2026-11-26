# Cloudrunner Courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/dajinxiaodui/best-flight-game-26-nov-2026/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/dajinxiaodui/best-flight-game-26-nov-2026/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![make.fun · best-flight-game-20261126-0057 rank](https://make.fun/badge/best-flight-game-20261126-0057/rank/dajinxiaodui/best-flight-game-26-nov-2026.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![make.fun · best-flight-game-20261126-0057 reward](https://make.fun/badge/best-flight-game-20261126-0057/reward/dajinxiaodui/best-flight-game-26-nov-2026.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A chase-view valley delivery flight. You are the pilot of a small red courier
plane: thread golden sky rings, scoop up stars, dodge mountains, hot-air
balloons and storm clouds, mind your fuel, and put her down on the runway to
refuel, repair and complete the delivery. Three sorties, rising weather and
traffic, three lives — and a best score to chase.

## How to play

- **Steer:** Left / Right arrows or A / D (or move the mouse / drag on touch)
- **Climb / descend:** Up / Down arrows or W / S
- **Throttle:** hold Shift to speed up, hold Ctrl to slow down (hold mouse to boost)
- **Pause:** P or Esc · **Restart:** R · **Sound:** M
- **Start:** Enter, Space, click or tap

The HUD shows altitude (feet), speed (knots) and heading on a compass tape,
plus an attitude indicator, fuel gauge, throttle bar, lives and the current
sortie's goal. Fly a gold ring for +150, a star for +50, a green fuel ring
for +30 fuel. Land on the runway (slow, under 105 knots) for +500, a full
tank and a repaired plane. Sortie 2 only counts once you land after
collecting its 12 stars. Run out of fuel and you glide down — find a green
ring or a runway, fast.

## Run it

No build step, no network. Serve the `game/` folder with any static server
and open `index.html` in a desktop browser:

```sh
cd game
python3 -m http.server 8080
# open http://localhost:8080
```

or with Node:

```sh
npx serve game
```

## Layout

- `game/index.html` — page, canvas, error trap
- `game/src/main.js` — state, flight model, collisions, sorties, game loop
- `game/src/world.js` — procedural valley: segments, terrain, rings, runway
- `game/src/render.js` — all canvas drawing: sky, ground, plane, HUD, screens
- `game/src/config.js` — tuning numbers and sortie definitions
- `game/src/random.js` — seeded random helpers
- `game/src/input.js` — keyboard, mouse and touch
- `game/src/audio.js` — synthesised engine hum and chimes (WebAudio, no files)
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes the dossier
- `screenshots/` — three captures of the game itself (title, mid-flight, landing)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

Everything is drawn with canvas paths and synthesised in code. There are no
images, fonts, sounds or libraries, and the game makes zero network requests.

Entered on [make.fun](https://make.fun/?ref=qtgxrqfw&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards
