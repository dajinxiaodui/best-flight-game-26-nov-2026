// random.js — small deterministic random helpers.
// mulberry32 is a tiny seeded generator: the same seed always deals the
// same world, which keeps screenshots reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A generator dedicated to one segment index, so a segment's contents
// depend only on the world seed and its own index.
export function rngFor(seed, index) {
  return mulberry32((seed ^ Math.imul(index + 1, 2654435761)) >>> 0);
}

export function range(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}
