// ─────────────────────────────────────────────────────────────
//  RideSure — Traffic API
//  Simulates: road closures, heavy congestion, route blockages.
//  Primary export (disruptionAggregator):  fetchTrafficData()
//    → { severity: 0-1, events: [], location }
//  Extended export (triggerMonitor):       fetchTraffic()
//    → full internal snapshot (backward-compatible)
//  Cache TTL: 10 minutes
// ─────────────────────────────────────────────────────────────

const ZONE_TRAFFIC_BASELINES = {
  velachery:  { congestionLevel: 68, incidentCount: 2, avgSpeedKmh: 18, roadClosures: 0 },
  t_nagar:    { congestionLevel: 72, incidentCount: 3, avgSpeedKmh: 15, roadClosures: 1 },
  anna_nagar: { congestionLevel: 55, incidentCount: 1, avgSpeedKmh: 22, roadClosures: 0 },
  adyar:      { congestionLevel: 60, incidentCount: 2, avgSpeedKmh: 20, roadClosures: 0 },
  perambur:   { congestionLevel: 70, incidentCount: 2, avgSpeedKmh: 16, roadClosures: 0 },
  tambaram:   { congestionLevel: 48, incidentCount: 1, avgSpeedKmh: 25, roadClosures: 0 },
};

// Disruption severity bands
export const TRAFFIC_SEVERITY = {
  LOW:      { min: 0,  max: 50, label: "Normal",   color: "#10b981" },
  MODERATE: { min: 50, max: 70, label: "Moderate", color: "#f59e0b" },
  HIGH:     { min: 70, max: 85, label: "Heavy",    color: "#ef4444" },
  CRITICAL: { min: 85, max: 100,label: "Critical", color: "#7c3aed" },
};

// ── Cache ──────────────────────────────────────────────────────
const CACHE_TTL_MS = 10 * 60 * 1000;
const _cache       = new Map();

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); return null; }
  console.log(`[TrafficCache] HIT for ${key}`);
  return entry.data;
}
function setCache(key, data) { _cache.set(key, { data, ts: Date.now() }); }

// ── Severity Resolver ─────────────────────────────────────────
export function getTrafficSeverity(congestionLevel) {
  if (congestionLevel >= 85) return TRAFFIC_SEVERITY.CRITICAL;
  if (congestionLevel >= 70) return TRAFFIC_SEVERITY.HIGH;
  if (congestionLevel >= 50) return TRAFFIC_SEVERITY.MODERATE;
  return TRAFFIC_SEVERITY.LOW;
}

// ── Trigger Evaluator ─────────────────────────────────────────
/**
 * Returns true if traffic conditions warrant a parametric trigger.
 * Threshold: congestion >= 80 OR road closure active
 */
export function isTrafficTriggered(trafficData) {
  return trafficData.congestionLevel >= 80 || trafficData.roadClosures > 0;
}

// ── Mock Generator ────────────────────────────────────────────
function mockTraffic(zoneId) {
  const base = ZONE_TRAFFIC_BASELINES[zoneId] || ZONE_TRAFFIC_BASELINES.velachery;
  const jitter = (range) => Math.round((Math.random() - 0.5) * range);
  const congestionLevel = Math.min(100, Math.max(0, base.congestionLevel + jitter(20)));
  return {
    zoneId,
    congestionLevel,
    incidentCount:  Math.max(0, base.incidentCount + jitter(2)),
    avgSpeedKmh:    Math.max(5, base.avgSpeedKmh + jitter(8)),
    roadClosures:   Math.random() > 0.88 ? 1 : 0,
    severity:       getTrafficSeverity(congestionLevel).label,
    source:         "mock",
    fetchedAt:      Date.now(),
  };
}

// ── Real Fetch (TomTom / HERE stub — env-gated) ───────────────
async function fetchFromTrafficAPI(zoneId) {
  const API_KEY = import.meta.env.VITE_TRAFFIC_API_KEY;
  if (!API_KEY) throw new Error("No traffic API key configured");

  // Placeholder: replace with real TomTom / HERE / Google Routes call
  const ZONE_COORDS = {
    velachery:  { lat: 12.9780, lon: 80.2209 },
    t_nagar:    { lat: 13.0418, lon: 80.2341 },
    anna_nagar: { lat: 13.0849, lon: 80.2101 },
    adyar:      { lat: 13.0012, lon: 80.2565 },
    perambur:   { lat: 13.1162, lon: 80.2351 },
    tambaram:   { lat: 12.9249, lon: 80.1000 },
  };
  const { lat, lon } = ZONE_COORDS[zoneId] || ZONE_COORDS.velachery;
  const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lon}&key=${API_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`TrafficAPI error: ${res.status}`);
  const data = await res.json();
  const freeFlow    = data.flowSegmentData?.freeFlowSpeed    || 40;
  const currentFlow = data.flowSegmentData?.currentSpeed     || 25;
  const congestion  = Math.round(Math.max(0, Math.min(100, (1 - currentFlow / freeFlow) * 100)));
  return {
    zoneId,
    congestionLevel: congestion,
    incidentCount:   data.flowSegmentData?.incidents ?? 0,
    avgSpeedKmh:     currentFlow,
    roadClosures:    0,
    severity:        getTrafficSeverity(congestion).label,
    source:          "tomtom",
    fetchedAt:       Date.now(),
  };
}

// ── Main Export ───────────────────────────────────────────────
/**
 * fetchTraffic(zoneId)
 * Tries real API → falls back to mock. Cached 10 min.
 */
export async function fetchTraffic(zoneId = "velachery") {
  const cached = getCached(zoneId);
  if (cached) return cached;

  let result;
  try       { result = await fetchFromTrafficAPI(zoneId); }
  catch (_) { result = mockTraffic(zoneId); }
  setCache(zoneId, result);
  return result;
}

/**
 * fetchTrafficForZones(zoneIds[])
 * Fetches traffic for multiple zones in parallel.
 */
export async function fetchTrafficForZones(zoneIds = []) {
  return Promise.all(zoneIds.map(z => fetchTraffic(z)));
}

// ── Event Builder ─────────────────────────────────────────────
/**
 * Derives a list of discrete traffic events from a raw snapshot.
 * Each event has { type, label, impact } for human-readable display.
 */
function buildTrafficEvents(raw) {
  const events = [];
  if (raw.roadClosures > 0)
    events.push({ type: "road_closure",   label: "Road Closure Active",       impact: "high" });
  if (raw.congestionLevel >= 85)
    events.push({ type: "gridlock",        label: "Gridlock / Near-Standstill", impact: "critical" });
  else if (raw.congestionLevel >= 70)
    events.push({ type: "heavy_traffic",   label: "Heavy Congestion",          impact: "high" });
  else if (raw.congestionLevel >= 50)
    events.push({ type: "moderate_traffic",label: "Moderate Congestion",       impact: "medium" });
  if (raw.incidentCount >= 3)
    events.push({ type: "route_blockage",  label: `${raw.incidentCount} Route Incidents`, impact: "high" });
  if (raw.avgSpeedKmh <= 8)
    events.push({ type: "near_standstill", label: "Avg Speed ≤ 8 km/h",        impact: "critical" });
  return events;
}

/**
 * fetchTrafficData(zoneId)
 *
 * Primary export for disruptionAggregator.
 * Returns the standardised contract:
 *   { severity: number (0–1), events: [], location: string }
 *
 * severity 0 = no disruption, 1 = total blockage.
 */
export async function fetchTrafficData(zoneId = "velachery") {
  const raw      = await fetchTraffic(zoneId);
  const severity = Math.round((raw.congestionLevel / 100) * 10) / 10; // 0.0 – 1.0
  const events   = buildTrafficEvents(raw);
  return {
    severity,
    events,
    location:      zoneId,
    // Pass-through extras for consumers that want more detail
    congestionLevel: raw.congestionLevel,
    roadClosures:    raw.roadClosures,
    incidentCount:   raw.incidentCount,
    avgSpeedKmh:     raw.avgSpeedKmh,
    source:          raw.source,
    fetchedAt:       raw.fetchedAt,
  };
}
