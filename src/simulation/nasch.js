/**
 * Nagel-Schreckenberg (NaSch) Cellular Automaton Traffic Model
 * with Mixed Human-Driven Vehicles (HDV) and Autonomous Vehicles (AV).
 *
 * 1 cell ≈ 7.5 meters, 1 time step = 1 second.
 * Therefore 1 cell/step = 7.5 m/s = 27 km/h.
 */

export const CELL_METERS = 7.5;
export const STEP_SECONDS = 1.0;
export const CELL_SPEED_TO_KMH = 27.0;

/**
 * Deterministic PRNG (Mulberry32) for reproducible experiments
 */
export function createRng(seed = 42) {
  let a = seed >>> 0;
  return function rng() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Initialize a ring road of length L with density rho and AV fraction avShare.
 */
export function initSimulation({
  roadLength = 300,
  density = 0.28,
  vMax = 5,
  avShare = 0.0,
  pHuman = 0.30,
  pAv = 0.02,
  avCooperative = true,
  seed = Date.now(),
} = {}) {
  const rng = createRng(seed);
  const numVehicles = Math.max(1, Math.min(roadLength - 1, Math.round(density * roadLength)));
  const numAv = Math.round(numVehicles * avShare);

  // Pick unique positions around the ring
  const positions = Array.from({ length: roadLength }, (_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const chosenPositions = positions.slice(0, numVehicles).sort((a, b) => a - b);

  // Assign AV flags evenly or randomly
  const avFlags = Array.from({ length: numVehicles }, (_, i) => i < numAv);
  for (let i = avFlags.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [avFlags[i], avFlags[j]] = [avFlags[j], avFlags[i]];
  }

  const vehicles = chosenPositions.map((pos, idx) => ({
    id: idx,
    pos,
    vel: Math.min(vMax, Math.floor(rng() * (vMax + 1))),
    isAV: avFlags[idx],
  }));

  return {
    roadLength,
    density: numVehicles / roadLength,
    numVehicles,
    numAv,
    vMax,
    avShare,
    pHuman,
    pAv,
    avCooperative,
    stepCount: 0,
    vehicles,
    rng,
  };
}

/**
 * Advance simulation by 1 discrete time step (parallel synchronous update).
 */
export function stepSimulation(state) {
  const { roadLength, vMax, pHuman, pAv, avCooperative, vehicles, rng } = state;
  const n = vehicles.length;
  const nextVelocities = new Array(n);

  for (let i = 0; i < n; i++) {
    const cur = vehicles[i];
    const lead = vehicles[(i + 1) % n];
    const gap = (lead.pos - cur.pos - 1 + roadLength) % roadLength;

    let v = cur.vel;

    // 1. Acceleration
    if (cur.isAV && avCooperative) {
      // Cooperative / Jam-absorbing AV: avoids racing into a slowing queue
      if (gap > v + 2) {
        v = Math.min(v + 1, vMax);
      } else if (lead.vel < v && gap <= v + 2) {
        v = Math.max(0, Math.min(v, Math.max(lead.vel, gap - 1)));
      } else {
        v = Math.min(v + 1, vMax);
      }
    } else {
      v = Math.min(v + 1, vMax);
    }

    // 2. Braking (collision avoidance)
    v = Math.min(v, gap);

    // 3. Randomization (stochastic dawdling / reaction delay)
    const p = cur.isAV ? pAv : pHuman;
    if (v > 0 && rng() < p) {
      v = Math.max(v - 1, 0);
    }

    nextVelocities[i] = v;
  }

  // 4. Motion
  for (let i = 0; i < n; i++) {
    vehicles[i].vel = nextVelocities[i];
    vehicles[i].pos = (vehicles[i].pos + nextVelocities[i]) % roadLength;
  }

  state.stepCount += 1;
  return computeMetrics(state);
}

/**
 * Compute macroscopic traffic metrics from current state.
 */
export function computeMetrics(state) {
  const { vehicles, roadLength, numVehicles } = state;
  let sumV = 0;
  let stoppedCount = 0;
  let slowCount = 0;

  for (let i = 0; i < numVehicles; i++) {
    const v = vehicles[i].vel;
    sumV += v;
    if (v === 0) stoppedCount++;
    if (v <= 1) slowCount++;
  }

  const avgSpeed = sumV / numVehicles;
  const avgSpeedKmh = avgSpeed * CELL_SPEED_TO_KMH;
  const density = numVehicles / roadLength;
  const flow = density * avgSpeed; // vehicles per cell per second
  const flowPerHour = flow * 3600; // vehicles per hour

  let sqDiff = 0;
  for (let i = 0; i < numVehicles; i++) {
    const d = vehicles[i].vel - avgSpeed;
    sqDiff += d * d;
  }
  const speedStd = Math.sqrt(sqDiff / numVehicles);

  return {
    step: state.stepCount,
    avgSpeed,
    avgSpeedKmh,
    density,
    flow,
    flowPerHour,
    stoppedRatio: stoppedCount / numVehicles,
    jamRatio: slowCount / numVehicles,
    speedStd,
    travelTime5kmMin: avgSpeedKmh > 0.5 ? (5.0 / avgSpeedKmh) * 60 : 99.9,
  };
}

/**
 * Run a batch experiment for a given configuration and return averaged steady-state metrics.
 */
export function runBatchExperiment({
  roadLength = 300,
  density = 0.28,
  vMax = 5,
  avShare = 0.0,
  pHuman = 0.30,
  pAv = 0.02,
  avCooperative = true,
  warmupSteps = 400,
  measureSteps = 1000,
  seeds = 10,
} = {}) {
  let totalAvgSpeed = 0;
  let totalFlowPerHour = 0;
  let totalJamRatio = 0;
  let totalStoppedRatio = 0;
  let totalSpeedStd = 0;

  for (let s = 0; s < seeds; s++) {
    const sim = initSimulation({
      roadLength,
      density,
      vMax,
      avShare,
      pHuman,
      pAv,
      avCooperative,
      seed: 1000 + s * 7919,
    });

    for (let t = 0; t < warmupSteps; t++) {
      stepSimulation(sim);
    }

    let sumSpeed = 0;
    let sumFlow = 0;
    let sumJam = 0;
    let sumStopped = 0;
    let sumStd = 0;

    for (let t = 0; t < measureSteps; t++) {
      const m = stepSimulation(sim);
      sumSpeed += m.avgSpeedKmh;
      sumFlow += m.flowPerHour;
      sumJam += m.jamRatio;
      sumStopped += m.stoppedRatio;
      sumStd += m.speedStd;
    }

    totalAvgSpeed += sumSpeed / measureSteps;
    totalFlowPerHour += sumFlow / measureSteps;
    totalJamRatio += sumJam / measureSteps;
    totalStoppedRatio += sumStopped / measureSteps;
    totalSpeedStd += sumStd / measureSteps;
  }

  return {
    density,
    avShare,
    avgSpeedKmh: totalAvgSpeed / seeds,
    flowPerHour: totalFlowPerHour / seeds,
    jamPercent: (totalJamRatio / seeds) * 100,
    stoppedPercent: (totalStoppedRatio / seeds) * 100,
    speedStd: totalSpeedStd / seeds,
    travelTime5kmMin: (5.0 / (totalAvgSpeed / seeds)) * 60,
  };
}
