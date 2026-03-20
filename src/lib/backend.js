// ─────────────────────────────────────────────────────────────
//  RideSure — Backend / Core Logic Layer
//  Mirrors the Python (pandas + scikit-learn) ML pipeline
//  described in the use-case doc. Firebase calls are mocked
//  here — swap with real Firebase SDK in production.
// ─────────────────────────────────────────────────────────────

/* ════════════════════════════════════════════════════════════
   ML ENGINE  (ported from Python scikit-learn logic)
   ════════════════════════════════════════════════════════════ */

/**
 * computePremium
 * Mirrors the Python risk prediction + pricing model.
 * Inputs  → zone risk score, historical disruption rate, daily earnings
 * Output  → weekly premium in ₹
 */
export function computePremium(zone, dailyEarning) {
  const baseRates = { low: 20, medium: 30, high: 40 };
  const base = baseRates[zone.risk];

  // Earnings adjustment factor (simulates linear regression coefficient)
  const earningsFactor = dailyEarning > 800 ? 1.2 : dailyEarning > 600 ? 1.0 : 0.85;

  // Historical disruption multiplier (zone.hist = avg events/month)
  const histMultiplier = 1 + zone.hist / 50;

  // Zone score fine-tune (normalised 0–1 weight)
  const scoreFactor = 1 + (zone.score - 50) / 500;

  return Math.round(base * earningsFactor * histMultiplier * scoreFactor);
}

/**
 * computeMaxPayout
 * 65% of weekly earnings as maximum insurance payout.
 */
export function computeMaxPayout(dailyEarning) {
  return Math.round(dailyEarning * 7 * 0.65);
}

/**
 * computeLoss
 * Loss Estimation Engine formula from use-case doc:
 *   Loss = Hourly Income × Disruption Duration × Severity Factor
 */
export function computeLoss(dailyEarning, disruptionHours, severityFactor) {
  const hourlyRate = dailyEarning / 10; // 10 active hours/day
  return Math.round(hourlyRate * disruptionHours * severityFactor);
}

/**
 * computeZoneRiskScore
 * Derives a composite risk score from sub-indices.
 * Used for display + premium fine-tuning.
 */
export function computeZoneRiskScore(zone) {
  return Math.round((zone.flood * 0.4) + (zone.rain * 0.35) + (zone.aqi * 0.25));
}

/**
 * getTriggerStatus
 * Returns "safe" | "warning" | "critical" based on how close
 * the current value is to the parametric threshold.
 */
export function getTriggerStatus(value, threshold) {
  if (value >= threshold)              return "critical";
  if (value >= threshold * 0.75)       return "warning";
  return "safe";
}

/* ════════════════════════════════════════════════════════════
   FRAUD DETECTION ENGINE
   Mirrors the adversarial defense layer from the use-case doc.
   ════════════════════════════════════════════════════════════ */

/**
 * runFraudCheck
 * Lightweight anomaly detector. Returns { pass, reason, holdPct }.
 * In production: replace with behavioral ML model + graph analysis.
 */
export function runFraudCheck({ claimCount, intervalMs, locationConsistent }) {
  // Rule 1: Too many claims in short window
  if (claimCount > 3 && intervalMs < 60_000) {
    return { pass: false, reason: "High claim velocity detected", holdPct: 50 };
  }
  // Rule 2: Location inconsistency flag
  if (!locationConsistent) {
    return { pass: false, reason: "GPS pattern anomaly", holdPct: 30 };
  }
  return { pass: true, reason: "All checks passed", holdPct: 0 };
}

/* ════════════════════════════════════════════════════════════
   FIREBASE MOCK
   Replace these functions with real Firestore SDK calls.
   Collection structure:
     /users/{uid}
     /policies/{policyId}
     /claims/{claimId}
     /zones/{zoneId}
   ════════════════════════════════════════════════════════════ */

let _mockDb = { users: {}, policies: {}, claims: [] };

export const FirebaseMock = {
  /** Create or update user document in /users/{uid} */
  saveUser(uid, data) {
    _mockDb.users[uid] = { ...data, createdAt: Date.now(), uid };
    console.log("[Firebase] users/", uid, "→ saved", data);
    return Promise.resolve({ uid, ...data });
  },

  /** Write policy to /policies/{policyId} */
  savePolicy(policyId, data) {
    _mockDb.policies[policyId] = { ...data, policyId, createdAt: Date.now(), status: "active" };
    console.log("[Firebase] policies/", policyId, "→ saved", data);
    return Promise.resolve(_mockDb.policies[policyId]);
  },

  /** Append a claim document to /claims */
  saveClaim(claim) {
    const id = `CLM_${Date.now()}`;
    const doc = { ...claim, id, timestamp: Date.now(), status: "auto-approved" };
    _mockDb.claims.push(doc);
    console.log("[Firebase] claims/", id, "→ saved", doc);
    return Promise.resolve(doc);
  },

  /** Read all claims for a user */
  getUserClaims(uid) {
    return Promise.resolve(_mockDb.claims.filter(c => c.uid === uid));
  },

  /** Dump entire mock DB (for debugging) */
  dump() { return _mockDb; },
};

/* ════════════════════════════════════════════════════════════
   RAZORPAY MOCK
   Simulates Razorpay test-mode order creation + payment capture.
   In production: use Razorpay JS SDK with real key_id.
   ════════════════════════════════════════════════════════════ */

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export const RazorpayMock = {
  /**
   * createOrder — mirrors Razorpay Orders API POST /v1/orders
   * Returns a mock order object.
   */
  createOrder(amountInPaise, currency = "INR") {
    return new Promise(resolve => {
      setTimeout(() => resolve({
        id:        randomId("order"),
        amount:    amountInPaise,
        currency,
        receipt:   randomId("rcpt"),
        status:    "created",
        createdAt: Date.now(),
      }), 400);
    });
  },

  /**
   * capturePayment — simulates payment success callback
   * Returns payment object with status "captured".
   */
  capturePayment(orderId) {
    return new Promise(resolve => {
      setTimeout(() => resolve({
        id:        randomId("pay"),
        orderId,
        status:    "captured",
        method:    "upi",
        captured:  true,
        paidAt:    Date.now(),
      }), 800);
    });
  },

  /**
   * processPayout — simulates instant payout to worker UPI
   * Returns a payout confirmation.
   */
  processPayout(contactId, amountInPaise, purpose = "insurance_claim") {
    return new Promise(resolve => {
      setTimeout(() => resolve({
        id:        randomId("pout"),
        contactId,
        amount:    amountInPaise,
        purpose,
        status:    "processed",
        utr:       randomId("UTR"),
        paidAt:    Date.now(),
      }), 600);
    });
  },
};

/* ════════════════════════════════════════════════════════════
   WEATHER API MOCK
   Replace with real OpenWeatherMap / IMD API calls.
   ════════════════════════════════════════════════════════════ */

export const WeatherMock = {
  /** Returns mock current conditions for a Chennai zone */
  getCurrent(zoneId) {
    const base = {
      velachery:  { rainfall: 34, temp: 35, aqi: 142 },
      t_nagar:    { rainfall: 22, temp: 36, aqi: 155 },
      anna_nagar: { rainfall: 10, temp: 34, aqi: 110 },
      adyar:      { rainfall: 18, temp: 35, aqi: 130 },
      perambur:   { rainfall: 28, temp: 37, aqi: 168 },
      tambaram:   { rainfall: 12, temp: 34, aqi: 108 },
    };
    const data = base[zoneId] || base.velachery;
    // Add small random jitter to simulate live feed
    return Promise.resolve({
      rainfall:    data.rainfall + Math.round((Math.random() - 0.5) * 4),
      temperature: data.temp    + Math.round((Math.random() - 0.5) * 2),
      aqi:         data.aqi     + Math.round((Math.random() - 0.5) * 20),
      traffic:     38           + Math.round((Math.random() - 0.5) * 10),
      fetchedAt:   Date.now(),
    });
  },
};
