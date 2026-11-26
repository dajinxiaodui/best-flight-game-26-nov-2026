// main.js — Cloudrunner Courier: state, flight model, collisions, sorties.
// Wires input, world, audio and render together and runs the game loop.
import { CFG, SORTIES } from './config.js';
import { createWorld, ensureSegments, segmentAt, trackDxAt, crossedSegments } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { render } from './render.js';

const WORLD_SEED = 20261126;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

function loadBest() {
  try {
    return Number(window.localStorage.getItem('cloudrunner-best') || 0) || 0;
  } catch (err) {
    return 0;
  }
}

function saveBest(v) {
  try {
    window.localStorage.setItem('cloudrunner-best', String(Math.floor(v)));
  } catch (err) {
    /* best score is a nicety, never a failure */
  }
}

const G = {
  world: createWorld(WORLD_SEED),
  player: {
    x: 0, alt: 130, z: 0, speed: 0, throttle: CFG.cruiseThrottle,
    bank: 0, pitchVis: 0, heading: 0, fuel: CFG.fuelMax, lives: CFG.livesStart, score: 0,
  },
  state: 'title', // title | fly | landed | sortie | over | paused
  stateT: 0,
  time: 0,
  msgs: [],
  best: loadBest(),
  sortieIndex: 0,
  sortie: SORTIES[0],
  progress: 0,
  goalReady: false,
  sortiesDone: 0,
  camX: 0,
  camZ: -140,
  cx: CFG.viewW / 2,
  horizon: CFG.horizonY,
  regionNow: 0,
  shakeT: 0,
  flashT: 0,
  invulnT: 0,
  lastZ: 0,
  runCount: 0,
};

function pushMsg(text, color) {
  G.msgs.push({ text, color: color || '#ffffff', t: G.time });
  if (G.msgs.length > 4) G.msgs.shift();
}

function setState(s) {
  G.state = s;
  G.stateT = 0;
}

function resetFlight() {
  const p = G.player;
  p.x = 0;
  p.alt = 130;
  p.z = 0;
  p.speed = 120;
  p.throttle = CFG.cruiseThrottle;
  p.bank = 0;
  p.pitchVis = 0;
  p.heading = 0;
  p.fuel = CFG.fuelMax;
  p.lives = CFG.livesStart;
  p.score = 0;
  G.progress = 0;
  G.goalReady = false;
  G.sortiesDone = 0;
  G.sortieIndex = 0;
  G.sortie = SORTIES[0];
  G.world.level = 1;
  G.invulnT = 0;
  G.shakeT = 0;
  G.flashT = 0;
  G.msgs = [];
  G.lastZ = 0;
}

function startGame() {
  G.runCount += 1;
  G.world = createWorld(WORLD_SEED + (G.runCount - 1));
  resetFlight();
  ensureSegments(G.world, CFG.drawSegs + 10);
  setState('fly');
  pushMsg(`${G.sortie.name} — ${G.sortie.brief}`, '#7df9ff');
  audio.unlock();
}

function sortieComplete() {
  G.player.score += CFG.sortieScore;
  G.sortiesDone += 1;
  setState('sortie');
  audio.ring();
}

function nextSortie() {
  G.sortieIndex = (G.sortieIndex + 1) % SORTIES.length;
  G.sortie = SORTIES[G.sortieIndex];
  G.world.level = G.sortiesDone + 1;
  G.progress = 0;
  G.goalReady = false;
  setState('fly');
  pushMsg(`${G.sortie.name} — ${G.sortie.brief}`, '#7df9ff');
}

function landPlane() {
  const p = G.player;
  p.score += CFG.landingScore;
  p.fuel = CFG.fuelMax;
  p.lives = Math.min(CFG.livesStart, p.lives + 1);
  pushMsg('DELIVERED +500 — REFUELLED', '#37e08a');
  audio.fuel();
  if (G.sortie.needsLanding && G.goalReady) {
    sortieComplete();
    return;
  }
  setState('landed');
}

function crash(reason) {
  if (G.invulnT > 0 || G.state !== 'fly') return;
  const p = G.player;
  p.lives -= 1;
  G.flashT = 1;
  G.shakeT = 1;
  audio.crash();
  audio.setEngine(0, false);
  if (p.lives <= 0) {
    if (p.score > G.best) {
      G.best = Math.floor(p.score);
      saveBest(G.best);
    }
    setState('over');
    return;
  }
  pushMsg(reason === 'ground' ? 'CRASHED INTO THE GROUND!' : 'HIT! ONE PLANE DOWN', '#ff5a4a');
  // Put the plane back in the air, clear of the hazard that just hit it.
  p.alt = 130;
  p.speed = 140;
  p.x = 0;
  p.bank = 0;
  G.invulnT = CFG.invulnSecs;
  const seg = Math.floor(p.z / CFG.segLen);
  for (let i = seg - 2; i <= seg + 10; i++) {
    const s = segmentAt(G.world, i);
    if (s) for (const it of s.items) it.taken = true;
  }
}

function collectItem(seg, it) {
  const p = G.player;
  const playerTrackDx = trackDxAt(G.world, p.z);
  const relDx = seg.dx + it.x - (playerTrackDx + p.x);
  const relDy = p.alt - it.y;
  if (it.kind === 'ring' || it.kind === 'fuel') {
    const r = it.r * 0.85;
    if (Math.abs(relDx) < r && Math.abs(relDy) < r) {
      it.taken = true;
      if (it.kind === 'ring') {
        p.score += CFG.ringScore;
        if (G.sortie.goalKind === 'rings') G.progress += 1;
        pushMsg(`RING +${CFG.ringScore}`, '#ffd94a');
        audio.ring();
      } else {
        p.fuel = Math.min(CFG.fuelMax, p.fuel + CFG.fuelRingGain);
        p.score += CFG.fuelRingScore;
        pushMsg(`FUEL +${CFG.fuelRingGain}`, '#37e08a');
        audio.fuel();
      }
    }
  } else if (it.kind === 'star') {
    if (Math.abs(relDx) < CFG.starRadius && Math.abs(relDy) < CFG.starRadius) {
      it.taken = true;
      p.score += CFG.starScore;
      if (G.sortie.goalKind === 'stars') G.progress += 1;
      pushMsg(`STAR +${CFG.starScore}`, '#ffd94a');
      audio.star();
    }
  } else if (it.kind === 'mountain') {
    if (Math.abs(relDx) < CFG.mountainHalfWidth && p.alt < it.y) crash('mountain');
  } else if (it.kind === 'balloon') {
    if (Math.abs(relDx) < CFG.balloonHalfWidth && Math.abs(relDy) < CFG.balloonHalfHeight) crash('balloon');
  } else if (it.kind === 'storm') {
    if (Math.abs(relDx) < CFG.stormHalfWidth && Math.abs(relDy) < CFG.stormHalfHeight) crash('storm');
  }
}

function updateFly(dt) {
  const p = G.player;
  const a = input.axis();

  // Throttle: Shift up, Control down, mouse hold boosts; else hold.
  p.throttle = Math.max(0.15, Math.min(1, p.throttle + a.throttle * 0.55 * dt));
  if (p.fuel <= 0) p.throttle = Math.min(p.throttle, 0.2);
  const targetSpeed = Math.max(CFG.minSpeed, p.throttle * CFG.maxSpeed);
  const accel = targetSpeed > p.speed ? CFG.accel : CFG.accel * 1.6;
  p.speed += Math.max(-accel * dt, Math.min(accel * dt, targetSpeed - p.speed));

  // Bank, turn and lateral drift.
  const bankTarget = a.steer * CFG.maxBank;
  p.bank += (bankTarget - p.bank) * Math.min(1, dt * 6);
  const speedNorm = p.speed / CFG.maxSpeed;
  p.heading += (p.bank / CFG.maxBank) * CFG.turnRate * dt * (0.35 + 0.65 * speedNorm);
  p.x += Math.sin(p.bank) * p.speed * CFG.lateralRate * dt;
  p.x = Math.max(-CFG.playerXMax, Math.min(CFG.playerXMax, p.x));

  // Pitch and altitude.
  p.pitchVis += (a.pitch - p.pitchVis) * Math.min(1, dt * 5);
  p.alt += a.pitch * CFG.climbRate * dt * (0.45 + 0.55 * speedNorm);
  if (p.fuel <= 0 && p.alt > 0) p.alt -= 14 * dt; // out of fuel: glide down
  p.alt = Math.max(0, Math.min(CFG.maxAlt, p.alt));

  // Fuel burn.
  p.fuel -= (CFG.fuelDrainBase + CFG.fuelDrainThrottle * p.throttle) * dt;
  if (p.fuel < 0) p.fuel = 0;

  // Advance.
  const prevZ = p.z;
  p.z += p.speed * dt;
  p.score += p.speed * dt * CFG.distanceScore;

  ensureSegments(G.world, Math.floor(p.z / CFG.segLen) + CFG.drawSegs + 10);
  for (const seg of crossedSegments(G.world, prevZ, p.z)) {
    for (const it of seg.items) {
      if (!it.taken) collectItem(seg, it);
      if (G.state !== 'fly') return; // a crash or landing changed state
    }
  }

  // Ground contact.
  if (p.alt <= 0) {
    const seg = segmentAt(G.world, Math.floor(p.z / CFG.segLen));
    if (seg && seg.runway && p.speed <= 105) landPlane();
    else crash('ground');
    if (G.state !== 'fly') return;
  }

  // Sortie goal.
  if (G.sortie.goalKind === 'rings' || G.sortie.goalKind === 'stars') {
    if (G.progress >= G.sortie.goalCount && !G.goalReady) {
      G.goalReady = true;
      if (G.sortie.needsLanding) {
        pushMsg('GOAL DONE — LAND ON THE RUNWAY', '#7df9ff');
      } else {
        sortieComplete();
      }
    }
  }

  audio.setEngine(speedNorm, true);
}

function updateAttract(dt) {
  // Title screen: the valley scrolls past on autopilot.
  const p = G.player;
  p.speed = 130;
  p.throttle = CFG.cruiseThrottle;
  p.z += p.speed * dt;
  p.x += (0 - p.x) * Math.min(1, dt * 1.2);
  p.alt = 130 + 18 * Math.sin(G.time * 0.3);
  p.bank = Math.sin(G.time * 0.22) * 0.25;
  p.heading += p.bank * 8 * dt;
  ensureSegments(G.world, Math.floor(p.z / CFG.segLen) + CFG.drawSegs + 10);
  audio.setEngine(0.3, false);
}

function update(dt) {
  G.time += dt;
  G.stateT += dt;
  if (G.shakeT > 0) G.shakeT = Math.max(0, G.shakeT - dt / CFG.crashShakeSecs);
  if (G.flashT > 0) G.flashT = Math.max(0, G.flashT - dt * 1.4);
  if (G.invulnT > 0) G.invulnT -= dt;
  G.msgs = G.msgs.filter((m) => G.time - m.t < 2.2);

  // Shared camera values for the renderer.
  const p = G.player;
  G.camX = trackDxAt(G.world, p.z) + p.x;
  G.camZ = p.z - 140; // camera rides just behind the plane
  G.horizon = CFG.horizonY + p.pitchVis * 22;
  const seg = segmentAt(G.world, Math.floor(p.z / CFG.segLen));
  G.regionNow = seg ? seg.region : 0;

  if (G.state === 'fly') updateFly(dt);
  else if (G.state === 'title') updateAttract(dt);
  else if (G.state === 'landed') {
    p.speed = Math.max(0, p.speed - 60 * dt);
    p.z += p.speed * dt;
    if (G.stateT > 2.2) {
      p.alt = 2;
      p.speed = 70;
      p.throttle = CFG.cruiseThrottle;
      setState('fly');
      pushMsg('TAKEOFF — BACK ON THE JOB', '#7df9ff');
    }
  } else if (G.state === 'sortie') {
    p.z += p.speed * dt * 0.4;
    if (G.stateT > 2.6) nextSortie();
  }
}

function handleKeys() {
  if (input.wasPressed('KeyM')) {
    const muted = audio.toggleMute();
    pushMsg(muted ? 'SOUND OFF' : 'SOUND ON', '#cfeeff');
  }
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
    if (G.state === 'fly') setState('paused');
    else if (G.state === 'paused') setState('fly');
  }
  const startKey =
    input.wasPressed('Enter') || input.wasPressed('Space') || input.wasPressed('PointerDown');
  if (startKey) {
    audio.unlock();
    if (G.state === 'title') startGame();
    else if (G.state === 'over') startGame();
    else if (G.state === 'paused') setState('fly');
  }
  if (input.wasPressed('KeyR')) {
    if (G.state === 'fly' || G.state === 'over' || G.state === 'paused') startGame();
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  handleKeys();
  update(dt);
  render(ctx, G, now / 1000);
  requestAnimationFrame(frame);
}

// Screenshot presets: ?shot=title|play|land|over — real renders of the
// game in a chosen state, for the entry's screenshots. Default is the title.
function applyShotPreset() {
  const shot = new URLSearchParams(window.location.search).get('shot') || 'title';
  ensureSegments(G.world, CFG.drawSegs + 10);
  if (shot === 'play') {
    startGame();
    const p = G.player;
    p.z = 150 * CFG.segLen - 600; // first ring cluster just ahead
    p.alt = 140;
    p.speed = 185;
    p.throttle = 0.7;
    p.fuel = 78;
    p.score = 1250;
    G.progress = 3;
    G.lastZ = p.z;
    ensureSegments(G.world, Math.floor(p.z / CFG.segLen) + CFG.drawSegs + 10);
  } else if (shot === 'land') {
    startGame();
    G.sortieIndex = 1;
    G.sortie = SORTIES[1];
    const p = G.player;
    p.z = CFG.firstRunwaySeg * CFG.segLen - 500; // runway 500 units ahead
    p.alt = 26;
    p.speed = 82;
    p.throttle = 0.35;
    p.fuel = 64;
    p.score = 3420;
    G.progress = 12;
    G.goalReady = true;
    G.lastZ = p.z;
    G.msgs = []; // drop the sortie-1 intro startGame() just pushed
    pushMsg('GOAL DONE — LAND ON THE RUNWAY', '#7df9ff');
    ensureSegments(G.world, Math.floor(p.z / CFG.segLen) + CFG.drawSegs + 10);
  } else if (shot === 'over') {
    startGame();
    G.player.score = 2840;
    G.best = 2840;
    G.player.lives = 0;
    setState('over');
  }
  // 'title' needs nothing: the attract mode is already running.
}

applyShotPreset();
requestAnimationFrame(frame);
