// world.js — the endless valley: track segments, terrain, rings, stars,
// fuel rings, mountains, balloons and storm clouds, plus the runways.
// Segments are pure functions of (seed, index) except the gentle track
// curve, which accumulates as segments are generated in order.
import { CFG } from './config.js';
import { rngFor, range } from './random.js';

export function createWorld(seed) {
  return {
    seed,
    level: 1,
    segs: [],
    // A screenshot preset may force a runway to appear at this z.
    runwayOverrideAt: -1,
  };
}

// Gentle meander of the track centre, in world units per segment.
function curveAt(seed, i) {
  const off = (seed % 97) * 0.13;
  return (
    5.4 * Math.sin(i * 0.004 + off) +
    3.2 * Math.sin(i * 0.0113 + 1.7 + off) +
    1.6 * Math.sin(i * 0.027 + 4.2)
  );
}

function hillAt(i, phase) {
  const v = 34 * Math.sin(i * 0.021 + phase) + 22 * Math.sin(i * 0.047 + phase * 2.3);
  return Math.max(0, Math.min(72, v + 8));
}

function isRunwaySeg(world, i) {
  if (world.runwayOverrideAt >= 0) {
    const from = Math.floor(world.runwayOverrideAt / CFG.segLen);
    if (i >= from && i < from + CFG.runwayLenSegs) return true;
  }
  const k = i - CFG.firstRunwaySeg;
  if (k < 0) return false;
  const within = k % CFG.runwayEverySegs;
  return within < CFG.runwayLenSegs;
}

function nearRunway(world, i, margin) {
  for (let d = -margin; d <= margin; d++) {
    if (isRunwaySeg(world, i + d)) return true;
  }
  return false;
}

// Ring clusters: four rings, six segments apart, every 110 segments.
function ringAt(i) {
  if (i < 150) return null;
  const rel = (i - 150) % 110;
  if (rel % 6 !== 0 || rel > 18) return null;
  const step = rel / 6;
  return {
    kind: 'ring',
    x: 170 * Math.sin(i * 0.05 + step * 0.9),
    y: 118 + 52 * Math.sin(i * 0.09 + step * 1.3),
    r: CFG.ringRadius,
    taken: false,
  };
}

// Star arcs: five stars in a row, every 130 segments.
function starAt(i) {
  if (i < 60) return null;
  const rel = (i - 60) % 130;
  if (rel % 4 !== 0 || rel > 16) return null;
  const step = rel / 4;
  return {
    kind: 'star',
    x: 210 * Math.sin(i * 0.07 + step * 0.7),
    y: 96 + 58 * Math.sin(i * 0.13 + step),
    r: CFG.starRadius,
    taken: false,
  };
}

function fuelRingAt(i) {
  if (i < 150 || i % 300 !== 150) return null;
  return { kind: 'fuel', x: 120 * Math.sin(i * 0.03), y: 120, r: CFG.fuelRingRadius, taken: false };
}

function obstacleAt(world, i) {
  if (isRunwaySeg(world, i) || nearRunway(world, i, 30)) return null;
  if (ringAt(i) || starAt(i) || fuelRingAt(i)) return null;
  // Keep the sky clear near rings and stars so a collect never forces a hit.
  for (let d = 1; d <= 10; d++) {
    if (ringAt(i - d) || ringAt(i + d) || starAt(i - d) || starAt(i + d)) return null;
  }
  const rng = rngFor(world.seed, i);
  const p = CFG.obstacleBase + CFG.obstaclePerLevel * (world.level - 1);
  if (rng() >= p) return null;
  const roll = rng();
  if (roll < 0.42) {
    return {
      kind: 'mountain',
      x: range(rng, -330, 330),
      y: range(rng, 95, 195), // peak height above the ground
      r: CFG.mountainHalfWidth,
      taken: false,
    };
  }
  if (roll < 0.72) {
    return {
      kind: 'balloon',
      x: range(rng, -300, 300),
      y: range(rng, 60, 190),
      r: CFG.balloonHalfWidth,
      hue: Math.floor(range(rng, 0, 360)),
      taken: false,
    };
  }
  return {
    kind: 'storm',
    x: range(rng, -280, 280),
    y: range(rng, 80, 200),
    r: CFG.stormHalfWidth,
    taken: false,
  };
}

export function generateSegment(world, i) {
  const prev = i > 0 ? world.segs[i - 1] : null;
  const dx = prev ? prev.dx + curveAt(world.seed, i - 1) : 0;
  const region = Math.floor(i / 500) % 4;
  const runway = isRunwaySeg(world, i);
  const items = [];
  if (!runway) {
    const ring = ringAt(i);
    if (ring) items.push(ring);
    const star = starAt(i);
    if (star) items.push(star);
    const fuel = fuelRingAt(i);
    if (fuel) items.push(fuel);
    const obs = obstacleAt(world, i);
    if (obs) items.push(obs);
  }
  return {
    i,
    dx,
    curve: curveAt(world.seed, i),
    region,
    checker: (i >> 1) % 2,
    hillL: runway ? 0 : hillAt(i, 2.1),
    hillR: runway ? 0 : hillAt(i, 5.6),
    runway,
    items,
  };
}

// Generate every segment up to (and including) index n.
export function ensureSegments(world, n) {
  while (world.segs.length <= n) {
    world.segs.push(generateSegment(world, world.segs.length));
  }
}

export function segmentAt(world, i) {
  if (i < 0) return null;
  ensureSegments(world, i);
  return world.segs[i];
}

// Track-centre lateral offset at a z position (interpolated).
export function trackDxAt(world, z) {
  const f = z / CFG.segLen;
  const i = Math.floor(f);
  const a = segmentAt(world, i);
  const b = segmentAt(world, i + 1);
  const t = f - i;
  return a.dx + (b.dx - a.dx) * t;
}

// Items in the segments the plane just crossed, for collision checks.
export function crossedSegments(world, zFrom, zTo) {
  const out = [];
  const i0 = Math.max(0, Math.floor(zFrom / CFG.segLen));
  const i1 = Math.floor(zTo / CFG.segLen);
  for (let i = i0; i <= i1; i++) out.push(segmentAt(world, i));
  return out;
}
