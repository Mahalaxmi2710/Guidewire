// ─────────────────────────────────────────────────────────────
//  RideSure — Demand Disruption API
//  Simulates: low delivery demand, platform outages, regional slowdowns.
//  Primary export (disruptionAggregator):  fetchDemandData()
//    → { demandDrop: 0-1, platformStatus: "normal"|"down", region }
//  Extended export (triggerMonitor):       fetchDemandDisruption()
//    → full internal snapshot (backward-compatible)
//  Cache TTL: 10 minutes
// ─────────────────────────────────────────────────────────────

// Demand disruption event types and their trigger scores
export const DISRUPTION_TYPES = {
  DEMAND_CRASH:      { id: "DEMAND_CRASH",      label: "Demand Crash",       triggerScore: 85, payoutFactor: 0.80 },
  PLATFORM_OUTAGE:   { id: "PLATFORM_OUTAGE",   label: "Platform Outage",    triggerScore: 90, payoutFactor: 0.90 },
  STRIKE:            { id: "STRIKE",             label: "Rider Strike",       triggerScore: 75, payoutFactor: 0.70 },
  DEMAND_SURGE:      { id: "DEMAND_SURGE",       label: "Demand Surge",       triggerScore: 0,  payoutFactor: 0.00 }, // No payout on surge
  EVENT_DISRUPTION:  { id: "EVENT_DISRUPTION",   label: "City Event Closure", triggerScore: 70, payoutFactor: 0.65 },
  CURFEW:            { id: "CURFEW",             label: "Government Curfew",  triggerScore: 95, payoutFactor: 1.00 },
  FLOODING:          { id: "FLOODING",           label: "Road Flooding",      triggerScore: 88, payoutFactor: 0.85 },
  NORMAL:            { id: "NORMAL",             label: "Normal Operations",  triggerScore: 0,  payoutFactor: 0.00 },
};

// Zone-level demand baselines (orders/hour)
const ZONE_DEMAND_BASELINES = {
  velachery:  { ordersPerHour: 42, activeRiders: 52, cancellationRate: 0.08 },
  t_nagar:    { ordersPerHour: 51, activeRiders: 63, cancellationRate: 0.07 },
  anna_nagar: { ordersPerHour: 28, activeRiders: 38, cancellationRate: 0.06 },
  adyar:      { ordersPerHour: 35, activeRiders: 44, cancellationRate: 0.09 },
  perambur:   { ordersPerHour: 39, activeRiders: 48, cancellationRate: 0.10 },
  tambaram:   { ordersPerHour: 22, activeRiders: 29, cancellationRate: 0.07 },
};

// ── Cache ──────────────────────────────────────────────────────
const CACHE_TTL_MS = 10 * 60 * 1000;
const _cache = new Map();

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
  console.log(`[DemandCache] HIT for ${key}`);
  return entry.data;
}
function setCache(key, data) { _cache.set(key, { data, ts: Date.now() }); }

// ── Disruption Scorer ─────────────────────────────────────────
/**
 * Computes a 0–100 disruption score based on demand anomaly metrics.
 * High score = severe disruption = parametric trigger candidate.
 */
export function computeDisruptionScore({ ordersPerHour, activeRiders, cancellationRate, baseline }) {
  const demandDrop    = Math.max(0, (baseline.ordersPerHour - ordersPerHour) / baseline.ordersPerHour);
  const supplyDrop    = Math.max(0, (baseline.activeRiders   - activeRiders)   / baseline.activeRiders);
  const cancelSpike   = Math.max(0, cancellationRate - baseline.cancellationRate) * 5;
  const score = Math.min(100, Math.round((demandDrop * 40 + supplyDrop * 30 + cancelSpike * 30) * 100));
  return score;
}

/**
 * Classify disruption type from score + context flags.
 */
export function classifyDisruption(score, flags = {}) {
  if (flags.platformOutage)  return DISRUPTION_TYPES.PLATFORM_OUTAGE;
  if (flags.curfew)          return DISRUPTION_TYPES.CURFEW;
  if (flags.flooding)        return DISRUPTION_TYPES.FLOODING;
  if (flags.strike)          return DISRUPTION_TYPES.STRIKE;
  if (flags.cityEvent)       return DISRUPTION_TYPES.EVENT_DISRUPTION;
  if (score >= 85)           return DISRUPTION_TYPES.DEMAND_CRASH;
  if (score >= 60)           return DISRUPTION_TYPES.EVENT_DISRUPTION;
  return DISRUPTION_TYPES.NORMAL;
}

// ── Trigger Evaluator ─────────────────────────────────────────
/**
 * Returns true if disruption qualifies as a parametric trigger event.
 * Trigger threshold: disruption score >= 65
 */
export function isDemandTriggered(disruptionData) {
  return (
    disruptionData.disruptionScore >= 65 &&
    disruptionData.disruptionType.id !== "NORMAL" &&
    disruptionData.disruptionType.id !== "DEMAND_SURGE"
  );
}

// ── Mock Generator ────────────────────────────────────────────
function mockDemand(zoneId) {
  const base = ZONE_DEMAND_BASELINES[zoneId] || ZONE_DEMAND_BASELINES.velachery;
  const jitter      = (v, r) => Math.max(0, v + Math.round((Math.random() - 0.5) * r));
  const rand        = Math.random();

  // ~15% chance of a notable disruption event
  const flags = {
    platformOutage: rand < 0.03,
    curfew:         rand < 0.01,
    flooding:       rand < 0.05,
    strike:         rand < 0.04,
    cityEvent:      rand < 0.08,
  };

  let ordersPerHour    = jitter(base.ordersPerHour, 14);
  let activeRiders     = jitter(base.activeRiders,   10);
  let cancellationRate = Math.max(0, base.cancellationRate + (Math.random() - 0.5) * 0.06);

  // Simulate a real crash when flags are set
  if (flags.platformOutage || flags.curfew) {
    ordersPerHour    = Math.round(base.ordersPerHour * 0.15);
    activeRiders     = Math.round(base.activeRiders   * 0.20);
    cancellationRate = 0.60;
  } else if (flags.flooding || flags.strike) {
    ordersPerHour    = Math.round(base.ordersPerHour * 0.40);
    activeRiders     = Math.round(base.activeRiders   * 0.35);
    cancellationRate = 0.35;
  }

  const disruptionScore = computeDisruptionScore({ ordersPerHour, activeRiders, cancellationRate, baseline: base });
  const disruptionType  = classifyDisruption(disruptionScore, flags);

  return {
    zoneId,
    ordersPerHour,
    activeRiders,
    cancellationRate: Math.round(cancellationRate * 100) / 100,
    demandSupplyRatio: activeRiders > 0 ? Math.round((ordersPerHour / activeRiders) * 10) / 10 : 0,
    disruptionScore,
    disruptionType,
    flags,
    isTriggered: isDemandTriggered({ disruptionScore, disruptionType }),
    source:      "mock",
    fetchedAt:   Date.now(),
  };
}

// ── Real Fetch Stub ───────────────────────────────────────────
async function fetchFromPlatformAPI(zoneId) {
  // Wire up to your internal platform analytics endpoint when available
  const API_URL = import.meta.env.VITE_PLATFORM_API_URL;
  if (!API_URL) throw new Error("No platform API URL configured");
  const res  = await fetch(`${API_URL}/demand/${zoneId}`);
  if (!res.ok) throw new Error(`DemandAPI error: ${res.status}`);
  const raw  = await res.json();
  const base = ZONE_DEMAND_BASELINES[zoneId] || ZONE_DEMAND_BASELINES.velachery;
  const disruptionScore = computeDisruptionScore({ ...raw, baseline: base });
  const disruptionType  = classifyDisruption(disruptionScore, raw.flags || {});
  return {
    zoneId,
    ...raw,
    disruptionScore,
    disruptionType,
    isTriggered: isDemandTriggered({ disruptionScore, disruptionType }),
    source: "platform-api",
    fetchedAt: Date.now(),
  };
}

// ── Main Exports ──────────────────────────────────────────────
/**
 * fetchDemandDisruption(zoneId)
 * Real API → mock fallback. Cached 10 min.
 */
export async function fetchDemandDisruption(zoneId = "velachery") {
  const cached = getCached(zoneId);
  if (cached) return cached;

  let result;
  try       { result = await fetchFromPlatformAPI(zoneId); }
  catch (_) { result = mockDemand(zoneId); }
  setCache(zoneId, result);
  return result;
}

/**
 * fetchDemandForZones(zoneIds[])
 * Parallel fetch for multiple zones.
 */
export async function fetchDemandForZones(zoneIds = []) {
  return Promise.all(zoneIds.map(z => fetchDemandDisruption(z)));
}

// ── Normalised Contract ───────────────────────────────────────
/**
 * fetchDemandData(zoneId)
 *
 * Primary export for disruptionAggregator.
 * Returns the standardised contract:
 *   {
 *     demandDrop:     number (0–1)  — 0 = no drop, 1 = total demand loss
 *     platformStatus: "normal" | "down"
 *     region:         string
 *   }
 *
 * Also passes through enriched fields for consumers that need them.
 */
export async function fetchDemandData(zoneId = "velachery") {
  const raw = await fetchDemandDisruption(zoneId);

  // demandDrop: ratio of how far orders fell below baseline
  const BASELINES = {
    velachery: 42, t_nagar: 51, anna_nagar: 28,
    adyar: 35,    perambur: 39, tambaram: 22,
  };
  const baseline   = BASELINES[zoneId] ?? 40;
  const demandDrop = Math.min(1, Math.max(0,
    Math.round(((baseline - raw.ordersPerHour) / baseline) * 100) / 100
  ));

  // platformStatus: down if PLATFORM_OUTAGE or CURFEW type triggered
  const downTypes   = ["PLATFORM_OUTAGE", "CURFEW"];
  const platformStatus =
    raw.flags?.platformOutage || downTypes.includes(raw.disruptionType?.id)
      ? "down"
      : "normal";

  return {
    demandDrop,
    platformStatus,
    region: zoneId,
    // Pass-through extras for enriched consumers
    disruptionScore:  raw.disruptionScore,
    disruptionType:   raw.disruptionType,
    ordersPerHour:    raw.ordersPerHour,
    cancellationRate: raw.cancellationRate,
    isTriggered:      raw.isTriggered,
    source:           raw.source,
    fetchedAt:        raw.fetchedAt,
  };
}
