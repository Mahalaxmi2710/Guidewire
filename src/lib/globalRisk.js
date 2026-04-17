// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Global Risk Switch
//  Admin-controlled toggle for heightened risk mode.
//  Persists to localStorage. Components can subscribe to changes.
//  Phase 3 extension: evaluateExternalSignals() ingests live
//  weather / traffic / demand data into risk scoring.
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "ridesure_global_risk_on";

// Constraints applied when heightened risk mode is ON
export const HEIGHTENED_CONSTRAINTS = {
  premiumMultiplier:   1.5,          // 50% surcharge on all premiums
  maxClaimsPerWeek:    2,            // reduced from 3
  coverageRatio:       0.50,         // reduced from 0.65
  riderAvailability:   "restricted",
  activatedExclusions: ["EX-01", "EX-02", "EX-03"],  // war + terrorism + pandemic
  message: "⚠️ Heightened Risk Mode: Premium +50% · Coverage 50% · Max 2 claims/week",
};

// Normal baseline constraints
export const NORMAL_CONSTRAINTS = {
  premiumMultiplier:   1.0,
  maxClaimsPerWeek:    3,
  coverageRatio:       0.65,
  riderAvailability:   "normal",
  activatedExclusions: [],
  message: null,
};

let _listeners = [];

export const GlobalRisk = {
  isOn() {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; }
    catch { return false; }
  },

  setOn(value) {
    try { localStorage.setItem(STORAGE_KEY, value ? "true" : "false"); }
    catch {}
    const bool = Boolean(value);
    _listeners.forEach(fn => fn(bool));
  },

  toggle() { this.setOn(!this.isOn()); },

  getConstraints() {
    return this.isOn() ? { ...HEIGHTENED_CONSTRAINTS } : { ...NORMAL_CONSTRAINTS };
  },

  /** subscribe — returns unsubscribe fn */
  subscribe(fn) {
    _listeners.push(fn);
    return () => { _listeners = _listeners.filter(l => l !== fn); };
  },

  /** Apply premium multiplier */
  applyToPremium(premium) {
    return Math.round(premium * this.getConstraints().premiumMultiplier);
  },

  /** Apply coverage ratio to compute max payout */
  applyToMaxPayout(weeklyEarnings) {
    return Math.round(weeklyEarnings * this.getConstraints().coverageRatio);
  },

  // ── Phase 3: External Signal Evaluation ───────────────────

  /**
   * evaluateExternalSignals({ weather, traffic, demand })
   *
   * Ingests a live snapshot from disruptionAggregator (or raw API calls)
   * and returns an enriched risk assessment object.
   *
   * @param {object} weather  - { rainfall, temperature, aqi, traffic }
   * @param {object} traffic  - { severity: 0-1, events: [], location }
   * @param {object} demand   - { demandDrop: 0-1, platformStatus, region }
   *
   * @returns {object} {
   *   externalRiskScore,   // 0–100 composite
   *   heightenedBySignals, // true if signals suggest heightened risk
   *   signalBreakdown,     // per-source scores
   *   recommendation,      // suggested action string
   * }
   */
  evaluateExternalSignals({ weather = null, traffic = null, demand = null } = {}) {
    const wScore = computeSignalScore_weather(weather);
    const tScore = computeSignalScore_traffic(traffic);
    const dScore = computeSignalScore_demand(demand);

    // Weighted composite (same weights as disruptionAggregator)
    const externalRiskScore = Math.round(
      wScore * 0.40 + tScore * 0.35 + dScore * 0.25
    );

    const heightenedBySignals = externalRiskScore >= 60;

    let recommendation = "No action required";
    if (externalRiskScore >= 80) recommendation = "Activate Heightened Risk Mode immediately";
    else if (externalRiskScore >= 60) recommendation = "Consider activating Heightened Risk Mode";
    else if (externalRiskScore >= 40) recommendation = "Monitor signals — conditions deteriorating";

    return {
      externalRiskScore,
      heightenedBySignals,
      signalBreakdown: { weather: wScore, traffic: tScore, demand: dScore },
      recommendation,
      evaluatedAt: Date.now(),
    };
  },

  /**
   * applySignalMultiplier(premium, externalRiskScore)
   *
   * Blends the admin toggle multiplier with a live signal multiplier.
   * Formula: premium × adminMultiplier × signalMultiplier
   * Signal multiplier: 1.0 (score < 40) → 1.35 (score >= 80)
   */
  applySignalMultiplier(premium, externalRiskScore = 0) {
    const adminMult  = this.getConstraints().premiumMultiplier;
    const signalMult = externalRiskScore >= 80 ? 1.35
                     : externalRiskScore >= 60 ? 1.20
                     : externalRiskScore >= 40 ? 1.10
                     : 1.0;
    return Math.round(premium * adminMult * signalMult);
  },
};

// ── Standalone Helpers (importable without GlobalRisk object) ──

/** @internal */
function computeSignalScore_weather(weather) {
  if (!weather) return 0;
  const rain = Math.min(100, (weather.rainfall    ?? 0) / 80  * 100);
  const temp = Math.min(100, Math.max(0, ((weather.temperature ?? 30) - 30) / 15 * 100));
  const aqi  = Math.min(100, (weather.aqi         ?? 0) / 400 * 100);
  const traf = Math.min(100, (weather.traffic      ?? 0) / 100 * 100);
  return Math.round(rain * 0.40 + temp * 0.25 + aqi * 0.20 + traf * 0.15);
}

/** @internal */
function computeSignalScore_traffic(traffic) {
  if (!traffic) return 0;
  const base  = Math.round((traffic.severity ?? 0) * 100);
  const boost = Math.min(20, (traffic.events?.length ?? 0) * 7);
  return Math.min(100, base + boost);
}

/** @internal */
function computeSignalScore_demand(demand) {
  if (!demand) return 0;
  const drop    = Math.round((demand.demandDrop ?? 0) * 100);
  const outage  = demand.platformStatus === "down" ? 30 : 0;
  return Math.min(100, drop + outage);
}

/**
 * computeExternalRiskScore({ weather, traffic, demand })
 * Standalone export — useful for components that don't need the full GlobalRisk object.
 */
export function computeExternalRiskScore({ weather = null, traffic = null, demand = null } = {}) {
  return Math.round(
    computeSignalScore_weather(weather) * 0.40 +
    computeSignalScore_traffic(traffic) * 0.35 +
    computeSignalScore_demand(demand)   * 0.25
  );
}
