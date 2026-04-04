// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Global Risk Switch
//  Admin-controlled toggle for heightened risk mode.
//  Persists to localStorage. Components can subscribe to changes.
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
};
