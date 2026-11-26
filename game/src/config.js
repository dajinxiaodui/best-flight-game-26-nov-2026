// config.js — every tuning number for Cloudrunner Courier lives here.
// One place to balance speed, fuel, difficulty and the look of the world.
export const CFG = {
  // Canvas (internal resolution; CSS scales it to the window).
  viewW: 960,
  viewH: 540,
  horizonY: 232, // screen y of the horizon when flying level
  camDepth: 430, // projection constant: screen scale = camDepth / distance

  // World geometry.
  segLen: 40, // world units per track segment
  drawSegs: 130, // how many segments ahead are drawn
  groundHalf: 760, // half-width of the drawn ground plane, world units
  runwayHalf: 95, // half-width of the runway strip, world units
  runwayLenSegs: 48, // segments per runway stretch
  runwayEverySegs: 950, // gap between runway starts, in segments
  firstRunwaySeg: 900, // segment index of the first runway

  // Flight model.
  maxSpeed: 265, // world units per second at full throttle
  minSpeed: 55,
  cruiseThrottle: 0.62,
  accel: 46, // speed change per second toward throttle target
  climbRate: 62, // altitude units per second at full pitch
  maxAlt: 240,
  maxBank: 0.95, // radians of visual bank at full steer
  turnRate: 52, // heading degrees per second at full bank and cruise speed
  lateralRate: 1.15, // sideways drift per unit of bank and speed
  playerXMax: 430, // lateral limit from the track centre, world units

  // Fuel.
  fuelMax: 100,
  fuelDrainBase: 0.35, // per second
  fuelDrainThrottle: 0.8, // extra per second at full throttle
  fuelRingGain: 30,
  lowFuelAt: 25,

  // Scoring.
  ringScore: 150,
  starScore: 50,
  fuelRingScore: 25,
  landingScore: 500,
  sortieScore: 1000,
  distanceScore: 0.02, // points per world unit flown

  // Items.
  ringRadius: 88,
  starRadius: 46,
  fuelRingRadius: 72,
  mountainHalfWidth: 95,
  balloonHalfWidth: 58,
  balloonHalfHeight: 72,
  stormHalfWidth: 84,
  stormHalfHeight: 62,

  // Lives and damage.
  livesStart: 3,
  invulnSecs: 3,
  crashShakeSecs: 0.6,

  // Difficulty per sortie level (level 1 = first sortie).
  obstacleBase: 0.055, // chance a free segment holds an obstacle
  obstaclePerLevel: 0.02,
};

// Sorties: each one is a delivery job with its own goal.
// level grows forever; the three jobs cycle and get harder each lap.
export const SORTIES = [
  {
    name: 'RING RUN',
    brief: 'Thread 8 sky rings over the valley.',
    goalKind: 'rings',
    goalCount: 8,
  },
  {
    name: 'STAR HARVEST',
    brief: 'Collect 12 stars, then land on the runway.',
    goalKind: 'stars',
    goalCount: 12,
    needsLanding: true,
  },
  {
    name: 'STORM FRONT',
    brief: 'Thread 12 rings through heavy weather.',
    goalKind: 'rings',
    goalCount: 12,
  },
];

// Ground palettes, one per region. Regions change every 500 segments.
export const REGIONS = [
  { name: 'meadow', ground: ['#7ec850', '#74bd47'], hill: '#5da23c', far: '#8fb8d8' },
  { name: 'fields', ground: ['#d9b45c', '#cfa64e'], hill: '#b08a3e', far: '#c9a86a' },
  { name: 'forest', ground: ['#4f9e57', '#478f4e'], hill: '#2f7038', far: '#7fae8e' },
  { name: 'coast', ground: ['#c9c27a', '#bdb46c'], hill: '#8fae9a', far: '#9fc4d4' },
];
