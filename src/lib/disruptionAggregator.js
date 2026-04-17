// ─────────────────────────────────────────────────────────────
//  RideSure — Disruption Aggregator
//  Combines weather + traffic + demand signals into a single
//  unified disruption snapshot used by triggerMonitor and UI.
//
//  Return contract:
//  {
//    riskScore: number (0–100),
//    riskLabel: "Low" | "Moderate" | "High" | "Critical",
//    triggered: boolean,
//    breakdown: { weather, traffic, demand },
//    zone: string,
//    aggregatedAt: number,
//  }
// ─────────────────────────────────────────────────────────────

import { fetchWeather }     from "./weatherApi.js";
import { fetchTrafficData } from "./trafficApi.js";
import { fetchDemandData }  from "./demandApi.js";

// ── Signal Weights (sum = 100) ────────────────────────────────
const WEIGHTS = {
  weather: 40,
  traffic: 35,
  demand:  25,
};

// ── Risk Label Bands ──────────────────────────────────────────
export const RISK_BANDS = [
  { label: "Low",      min: 0,  max: 30,  color: "#10b981" },
  { label: "Moderate", min: 30, max: 55,  color: "#f59e0b" },
  { label: "High",     min: 55, max: 75,  color: "#ef4444" },
  { label: "Critical", min: 75, max: 100, color: "#7c3aed" },
];

export function getRiskBand(score) {
  return RISK_BANDS.find(b => score >= b.min && score < b.max) ?? RISK_BANDS[RISK_BANDS.length - 1];
}

// ── Weather → 0–100 Normaliser ────────────────────────────────
/**
 * Converts raw weather snapshot into a 0–100 risk score.
 * Weights: rainfall 40% | temperature 25% | AQI 20% | traffic-proxy 15%
 */
function normaliseWeather(weather) {
  if (!weather) return 0;
  const rainfallScore  = Math.min(100, (weather.rainfall    / 80)  * 100); // 80mm = max
  const tempScore      = Math.min(100, Math.max(0, (weather.temperature - 30) / 15 * 100)); // 30–45°C range
  const aqiScore       = Math.min(100, (weather.aqi         / 400) * 100); // 400 AQI = max
  const trafficProxy   = Math.min(100, (weather.traffic     / 100) * 100);
  return Math.round(rainfallScore * 0.40 + tempScore * 0.25 + aqiScore * 0.20 + trafficProxy * 0.15);
}

// ── Traffic → 0–100 Normaliser ────────────────────────────────
/**
 * Converts fetchTrafficData() output { severity: 0-1 } → 0–100 score.
 * Boosts score if discrete events are present.
 */
function normaliseTraffic(traffic) {
  if (!traffic) return 0;
  const base       = Math.round((traffic.severity ?? 0) * 100);
  const eventBoost = Math.min(20, (traffic.events?.length ?? 0) * 7);
  return Math.min(100, base + eventBoost);
}

// ── Demand → 0–100 Normaliser ────────────────────────────────
/**
 * Converts fetchDemandData() output { demandDrop: 0-1, platformStatus } → 0–100 score.
 * Platform outage adds a fixed +30 penalty.
 */
function normaliseDemand(demand) {
  if (!demand) return 0;
  const dropScore    = Math.round((demand.demandDrop ?? 0) * 100);
  const outagePenalty = demand.platformStatus === "down" ? 30 : 0;
  return Math.min(100, dropScore + outagePenalty);
}

// ── Composite Score ───────────────────────────────────────────
function computeRiskScore(wScore, tScore, dScore) {
  return Math.round(
    (wScore * WEIGHTS.weather + tScore * WEIGHTS.traffic + dScore * WEIGHTS.demand) / 100
  );
}

// ── Trigger Threshold ─────────────────────────────────────────
// Aggregate risk score >= 55 → monitoring system considers it triggered
const TRIGGER_THRESHOLD = 55;

// ─────────────────────────────────────────────────────────────
//  aggregateDisruptions(zoneId)
//  Fetches all three data sources in parallel and returns
//  the unified disruption snapshot.
// ─────────────────────────────────────────────────────────────
/**
 * @param {string} zoneId  - Zone identifier (e.g. "velachery")
 * @returns {Promise<object>} Unified disruption snapshot
 */
export async function aggregateDisruptions(zoneId = "velachery") {
  const [weatherResult, trafficResult, demandResult] = await Promise.allSettled([
    fetchWeather(zoneId),
    fetchTrafficData(zoneId),
    fetchDemandData(zoneId),
  ]);

  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
  const traffic = trafficResult.status === "fulfilled" ? trafficResult.value : null;
  const demand  = demandResult.status  === "fulfilled" ? demandResult.value  : null;

  const wScore = normaliseWeather(weather);
  const tScore = normaliseTraffic(traffic);
  const dScore = normaliseDemand(demand);

  const riskScore = computeRiskScore(wScore, tScore, dScore);
  const band      = getRiskBand(riskScore);

  const snapshot = {
    riskScore,
    riskLabel:   band.label,
    riskColor:   band.color,
    triggered:   riskScore >= TRIGGER_THRESHOLD,
    zone:        zoneId,
    aggregatedAt: Date.now(),

    // Individual normalised scores (0–100)
    scores: {
      weather: wScore,
      traffic: tScore,
      demand:  dScore,
    },

    // Raw breakdown — full objects for downstream consumers
    breakdown: {
      weather: weather
        ? {
            rainfall:    weather.rainfall,
            temperature: weather.temperature,
            aqi:         weather.aqi,
            traffic:     weather.traffic,
            source:      weather.source,
          }
        : null,

      traffic: traffic
        ? {
            severity: traffic.severity,     // 0–1
            events:   traffic.events,        // []
            location: traffic.location,
            congestionLevel: traffic.congestionLevel,
            roadClosures:    traffic.roadClosures,
          }
        : null,

      demand: demand
        ? {
            demandDrop:     demand.demandDrop,      // 0–1
            platformStatus: demand.platformStatus,  // "normal" | "down"
            region:         demand.region,
            disruptionType: demand.disruptionType?.label ?? "Normal",
          }
        : null,
    },

    // Diagnostic fetch errors if any
    fetchErrors: {
      weather: weatherResult.status === "rejected" ? weatherResult.reason?.message : null,
      traffic: trafficResult.status === "rejected" ? trafficResult.reason?.message : null,
      demand:  demandResult.status  === "rejected" ? demandResult.reason?.message  : null,
    },
  };

  console.log(
    `[DisruptionAggregator] zone=${zoneId} | riskScore=${riskScore} | label=${band.label}`,
    { wScore, tScore, dScore }
  );

  return snapshot;
}

// ─────────────────────────────────────────────────────────────
//  aggregateForZones(zoneIds[])
//  Runs aggregation for multiple zones in parallel.
// ─────────────────────────────────────────────────────────────
/**
 * @param {string[]} zoneIds
 * @returns {Promise<object[]>} Array of snapshots, one per zone
 */
export async function aggregateForZones(zoneIds = []) {
  return Promise.all(zoneIds.map(z => aggregateDisruptions(z)));
}

// ─────────────────────────────────────────────────────────────
//  summariseAggregates(snapshots[])
//  Produces a fleet-wide summary across multiple zone snapshots.
// ─────────────────────────────────────────────────────────────
/**
 * @param {object[]} snapshots - Results from aggregateForZones()
 * @returns {object} { avgRiskScore, maxRiskScore, triggeredZones, highestRiskZone }
 */
export function summariseAggregates(snapshots = []) {
  if (!snapshots.length) return { avgRiskScore: 0, maxRiskScore: 0, triggeredZones: [], highestRiskZone: null };

  const scores         = snapshots.map(s => s.riskScore);
  const avgRiskScore   = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const maxRiskScore   = Math.max(...scores);
  const triggeredZones = snapshots.filter(s => s.triggered).map(s => s.zone);
  const highestRiskZone= snapshots.find(s => s.riskScore === maxRiskScore) ?? null;

  return { avgRiskScore, maxRiskScore, triggeredZones, highestRiskZone };
}
