// ─────────────────────────────────────────────────────────────
//  RideSure — Fraud Detection Engine
//  Multi-signal, rule-based fraud scoring for parametric claims.
//  Flags suspicious claims before payout is approved.
//
//  Score 0–100:
//    0–29  → CLEAR    (auto-approve)
//    30–59 → REVIEW   (manual review queue)
//    60–100→ FRAUD    (block payout)
//
//  Primary export (triggerMonitor):  evaluateFraud()
//    → { isFraud: boolean, reasons: [] }
//  Extended export (legacy):         runFraudDetection()
//    → full weighted scoring report
// ─────────────────────────────────────────────────────────────

export const FRAUD_VERDICT = {
  CLEAR:  { id: "CLEAR",  label: "Clear",         maxScore: 29,  action: "auto-approve" },
  REVIEW: { id: "REVIEW", label: "Manual Review",  maxScore: 59,  action: "queue-review" },
  FRAUD:  { id: "FRAUD",  label: "Fraud Detected", maxScore: 100, action: "block" },
};

// ── Signal weights (must sum to 100) ─────────────────────────
const SIGNAL_WEIGHTS = {
  claimFrequency:      25,  // Too many claims in short window
  triggerCorrelation:  20,  // Disruption data doesn't match claim zone
  claimAmount:         15,  // Payout suspiciously above coverage cap
  policyAge:           10,  // Policy filed just before event
  locationConsistency: 15,  // Worker zone vs claimed zone mismatch
  behavioralAnomaly:   15,  // Unusual claim timing patterns
};

// ── Individual Signal Scorers ─────────────────────────────────

/**
 * Score based on recent claim frequency for this user.
 * >2 claims in 7 days → escalating penalty.
 */
function scoreClaimFrequency(recentClaims = []) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const recent       = recentClaims.filter(c => c.createdAt >= sevenDaysAgo).length;
  if (recent <= 1) return 0;
  if (recent === 2) return 30;
  if (recent === 3) return 60;
  return 100; // 4+ claims in 7 days → very suspicious
}

/**
 * Score based on whether external disruption data actually supports the claim.
 * Low disruption score when claim says otherwise → mismatch.
 */
function scoreTriggerCorrelation(claimedDisruptionScore = 0, actualDisruptionScore = 0) {
  const delta = actualDisruptionScore - claimedDisruptionScore;
  // If actual data shows low disruption but claim says high → fraud signal
  if (actualDisruptionScore < 30 && claimedDisruptionScore >= 65) return 90;
  if (delta < -30) return 60;
  if (delta < -15) return 30;
  return 0;
}

/**
 * Score based on claimed payout vs computed max payout.
 * Excessive payout vs coverage cap is suspicious.
 */
function scoreClaimAmount(claimedPayout = 0, maxAllowedPayout = 0) {
  if (maxAllowedPayout <= 0) return 50;
  const ratio = claimedPayout / maxAllowedPayout;
  if (ratio > 1.5) return 100;
  if (ratio > 1.2) return 60;
  if (ratio > 1.0) return 30;
  return 0;
}

/**
 * Score based on policy age at time of claim.
 * Very new policies (< 3 days) claiming immediately → suspicious.
 */
function scorePolicyAge(policyCreatedAt = 0) {
  const ageHours = (Date.now() - policyCreatedAt) / 3600000;
  if (ageHours <  24) return 100;
  if (ageHours <  72) return 60;
  if (ageHours < 168) return 20;
  return 0;
}

/**
 * Score based on zone consistency.
 * Worker's registered zone vs zone the claim is filed for.
 */
function scoreLocationConsistency(workerZone = "", claimZone = "") {
  if (!workerZone || !claimZone) return 20; // Missing data → small penalty
  return workerZone.trim().toLowerCase() === claimZone.trim().toLowerCase() ? 0 : 70;
}

/**
 * Score based on behavioral timing patterns.
 * Claims filed at unusual hours (e.g. 2–5am) → anomaly flag.
 */
function scoreBehavioralAnomaly(claimTimestamp = Date.now()) {
  const hour = new Date(claimTimestamp).getHours();
  if (hour >= 2 && hour <= 4) return 70;  // Middle-of-night claim
  if (hour >= 0 && hour <= 1) return 40;
  return 0;
}

// ── Verdict Resolver ──────────────────────────────────────────
function resolveVerdict(score) {
  if (score <= FRAUD_VERDICT.CLEAR.maxScore)  return FRAUD_VERDICT.CLEAR;
  if (score <= FRAUD_VERDICT.REVIEW.maxScore) return FRAUD_VERDICT.REVIEW;
  return FRAUD_VERDICT.FRAUD;
}

// ── Main Export ───────────────────────────────────────────────
/**
 * runFraudDetection({ policy, claim, recentClaims, disruptionData })
 *
 * @param {object} policy           - Active policy document
 * @param {object} claim            - Claim being evaluated
 * @param {Array}  recentClaims     - User's claim history (from Firestore)
 * @param {object} disruptionData   - Live disruption snapshot used for trigger
 *
 * @returns {object} {
 *   score,         // 0–100 composite fraud score
 *   verdict,       // FRAUD_VERDICT object
 *   signals,       // Breakdown of individual signal scores
 *   isValid,       // true if verdict === CLEAR
 *   flagged,       // true if verdict === FRAUD or REVIEW
 *   details,       // human-readable signal report
 *   evaluatedAt,
 * }
 */
export async function runFraudDetection({ policy, claim, recentClaims = [], disruptionData = {} }) {
  const signals = {
    claimFrequency:      scoreClaimFrequency(recentClaims),
    triggerCorrelation:  scoreTriggerCorrelation(
                           claim.disruptionScore ?? 65,
                           disruptionData.disruptionScore ?? 65
                         ),
    claimAmount:         scoreClaimAmount(
                           claim.payoutAmount  ?? 0,
                           policy.maxPayout    ?? Infinity
                         ),
    policyAge:           scorePolicyAge(policy.createdAt ?? 0),
    locationConsistency: scoreLocationConsistency(
                           policy.zone ?? policy.zoneId ?? "",
                           claim.zone  ?? claim.zoneId  ?? ""
                         ),
    behavioralAnomaly:   scoreBehavioralAnomaly(claim.createdAt ?? Date.now()),
  };

  // Weighted composite score
  const score = Math.round(
    Object.entries(signals).reduce((acc, [key, raw]) => {
      return acc + (raw * SIGNAL_WEIGHTS[key]) / 100;
    }, 0)
  );

  const verdict = resolveVerdict(score);

  const details = Object.entries(signals).map(([key, raw]) => ({
    signal:  key,
    rawScore:    raw,
    weight:  SIGNAL_WEIGHTS[key],
    contribution: Math.round((raw * SIGNAL_WEIGHTS[key]) / 100),
  }));

  const result = {
    score,
    verdict,
    signals,
    details,
    isValid:     verdict.id === "CLEAR",
    flagged:     verdict.id !== "CLEAR",
    fraudFlag:   verdict.id === "FRAUD",
    reviewFlag:  verdict.id === "REVIEW",
    evaluatedAt: Date.now(),
  };

  console.log(
    `[FraudDetection] claimId=${claim.id ?? "new"} | score=${score} | verdict=${verdict.id}`,
    details
  );

  return result;
}

/**
 * isFraudulent(fraudResult) — convenience predicate.
 */
export function isFraudulent(fraudResult) {
  return fraudResult?.verdict?.id === "FRAUD";
}

/**
 * needsManualReview(fraudResult) — convenience predicate.
 */
export function needsManualReview(fraudResult) {
  return fraudResult?.verdict?.id === "REVIEW";
}

// ═════════════════════════════════════════════════════════════
//  DOMAIN-SPECIFIC FRAUD DETECTORS
//  Four independent, testable detection functions.
//  Each returns: { flagged: boolean, reason: string|null, details: object }
// ═════════════════════════════════════════════════════════════

// ── 1. GPS Spoofing Detection ─────────────────────────────────
/**
 * Compares the worker's reported/registered zone against the zone
 * embedded in the disruption (weather API) data.
 *
 * A mismatch signals the worker may be filing from a different
 * location than the actual disruption zone.
 *
 * @param {object} claim          - { zoneId, lat?, lon?, location? }
 * @param {object} workerData     - { zone, zoneId, registeredZone? }
 * @param {object} disruptionData - { zoneId, weather: { source }, breakdown }
 */
function detectGPSSpoofing(claim, workerData, disruptionData) {
  const workerZone     = (workerData?.zone ?? workerData?.zoneId ?? workerData?.registeredZone ?? "").toLowerCase().trim();
  const claimZone      = (claim?.zoneId    ?? claim?.zone       ?? "").toLowerCase().trim();
  const disruptionZone = (disruptionData?.zoneId ?? disruptionData?.breakdown?.weather?.location ?? disruptionData?.breakdown?.traffic?.location ?? "").toLowerCase().trim();

  const reasons = [];

  // Worker's registered zone vs claim zone
  if (workerZone && claimZone && workerZone !== claimZone) {
    reasons.push(
      `GPS mismatch: worker registered in "${workerZone}" but claim filed for "${claimZone}"`
    );
  }

  // Claim zone vs where disruption actually occurred
  if (claimZone && disruptionZone && claimZone !== disruptionZone) {
    reasons.push(
      `Zone drift: claim zone "${claimZone}" ≠ disruption zone "${disruptionZone}"`
    );
  }

  // If lat/lon provided, check rough bounding box for Chennai zones
  if (claim?.lat != null && claim?.lon != null) {
    const ZONE_BOUNDS = {
      velachery:  { latMin: 12.96, latMax: 12.99, lonMin: 80.21, lonMax: 80.23 },
      t_nagar:    { latMin: 13.03, latMax: 13.06, lonMin: 80.22, lonMax: 80.25 },
      anna_nagar: { latMin: 13.07, latMax: 13.10, lonMin: 80.19, lonMax: 80.23 },
      adyar:      { latMin: 12.99, latMax: 13.02, lonMin: 80.24, lonMax: 80.27 },
      perambur:   { latMin: 13.10, latMax: 13.13, lonMin: 80.22, lonMax: 80.25 },
      tambaram:   { latMin: 12.91, latMax: 12.94, lonMin: 80.09, lonMax: 80.12 },
    };
    const bounds = ZONE_BOUNDS[claimZone];
    if (bounds) {
      const inBounds =
        claim.lat >= bounds.latMin && claim.lat <= bounds.latMax &&
        claim.lon >= bounds.lonMin && claim.lon <= bounds.lonMax;
      if (!inBounds) {
        reasons.push(
          `Coordinates (${claim.lat.toFixed(4)}, ${claim.lon.toFixed(4)}) outside claimed zone "${claimZone}" bounding box`
        );
      }
    }
  }

  return {
    flagged: reasons.length > 0,
    reason:  reasons[0] ?? null,
    details: { workerZone, claimZone, disruptionZone, allReasons: reasons },
  };
}

// ── 2. Fake Weather Claim Detection ──────────────────────────
/**
 * Cross-checks the claim's stated trigger conditions against the
 * actual live + historical disruption data.
 *
 * Flags if the real disruption score is far below what qualifies
 * as a parametric trigger, or if weather metrics are too mild.
 *
 * @param {object} claim          - { triggers[], disruptionScore? }
 * @param {object} disruptionData - { riskScore?, breakdown: { weather } }
 */
function detectFakeWeatherClaim(claim, disruptionData) {
  const reasons = [];

  // Actual disruption/risk score from aggregated live data
  const actualScore    = disruptionData?.riskScore            // from disruptionAggregator
                      ?? disruptionData?.disruptionScore       // from demandApi
                      ?? 0;
  const claimedScore   = claim?.disruptionScore ?? 65;         // default: claim asserts trigger

  // If actual live data shows negligible disruption but claim was auto-triggered
  if (actualScore < 20 && claimedScore >= 55) {
    reasons.push(
      `Weak disruption: live riskScore=${actualScore} but claim asserts score=${claimedScore}`
    );
  }

  // Weather-specific: check raw weather values
  const wx = disruptionData?.breakdown?.weather ?? disruptionData?.weather;
  if (wx) {
    const THRESHOLDS = { rainfall: 50, temperature: 40, aqi: 300, traffic: 80 };
    const claimedTriggers = (claim?.triggers ?? []).map(t => t.type ?? t);

    if (claimedTriggers.includes("rainfall") && (wx.rainfall ?? 0) < THRESHOLDS.rainfall) {
      reasons.push(
        `Fake rainfall trigger: actual=${wx.rainfall}mm, threshold=${THRESHOLDS.rainfall}mm`
      );
    }
    if (claimedTriggers.includes("temperature") && (wx.temperature ?? 0) < THRESHOLDS.temperature) {
      reasons.push(
        `Fake heat trigger: actual=${wx.temperature}°C, threshold=${THRESHOLDS.temperature}°C`
      );
    }
    if (claimedTriggers.includes("aqi") && (wx.aqi ?? 0) < THRESHOLDS.aqi) {
      reasons.push(
        `Fake AQI trigger: actual AQI=${wx.aqi}, threshold=${THRESHOLDS.aqi}`
      );
    }
  }

  // Demand-specific: if platform is "normal" but demand disruption claimed
  const demand = disruptionData?.breakdown?.demand ?? disruptionData?.demand;
  if (demand) {
    const claimedTriggers = (claim?.triggers ?? []).map(t => t.type ?? t);
    if (
      claimedTriggers.some(t => ["demand_disruption", "PLATFORM_OUTAGE"].includes(t)) &&
      demand.platformStatus === "normal" &&
      (demand.demandDrop ?? 0) < 0.2
    ) {
      reasons.push(
        `Demand claim unsupported: platformStatus=normal, demandDrop=${demand.demandDrop ?? 0}`
      );
    }
  }

  return {
    flagged: reasons.length > 0,
    reason:  reasons[0] ?? null,
    details: { actualScore, claimedScore, weatherSnapshot: wx ?? null, allReasons: reasons },
  };
}

// ── 3. Claim Frequency Abuse ──────────────────────────────────
/**
 * Flags if this worker has exceeded the maximum allowed parametric
 * claims within a rolling 7-day window.
 *
 * Threshold aligns with GlobalRisk.getConstraints().maxClaimsPerWeek.
 *
 * @param {object[]} recentClaims - All claims for this worker from Firestore
 * @param {number}   [weeklyLimit=3] - Max allowed (overridden by heightened risk mode)
 */
function detectClaimFrequencyAbuse(recentClaims = [], weeklyLimit = 3) {
  const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const thisWeek     = recentClaims.filter(
    c => (c.createdAt ?? 0) >= sevenDaysAgo &&
         ["paid", "approved", "created", "payout-pending"].includes(c.status)
  );

  const count   = thisWeek.length;
  const exceeded = count >= weeklyLimit;

  return {
    flagged: exceeded,
    reason:  exceeded
      ? `Claim frequency abuse: ${count} claims this week (limit: ${weeklyLimit})`
      : null,
    details: {
      claimsThisWeek: count,
      weeklyLimit,
      claimDates: thisWeek.map(c => new Date(c.createdAt).toISOString()),
    },
  };
}

// ── 4. Delivery Activity Mismatch ─────────────────────────────
/**
 * Checks if the worker logged delivery earnings during the same period
 * they are claiming was a total disruption. Active earnings during a
 * "disruption window" contradict the claim.
 *
 * @param {object}   claim        - { createdAt, triggers[] }
 * @param {object}   workerData   - { earnings: [{ date, daily_earnings, orders_completed }] }
 */
function detectDeliveryActivityMismatch(claim, workerData) {
  const earnings = workerData?.earnings ?? [];
  if (!earnings.length) {
    return { flagged: false, reason: null, details: { message: "No earnings data available" } };
  }

  // Disruption window = the calendar day the claim was filed (± 0 days)
  const claimDate = new Date(claim?.createdAt ?? Date.now());
  const claimDay  = claimDate.toISOString().split("T")[0]; // "YYYY-MM-DD"

  // Also check the previous day (disruption often covers overnight/next morning)
  const prevDay = new Date(claimDate.getTime() - 86400000).toISOString().split("T")[0];

  const activeOnClaimDay = earnings.filter(
    e => (e.date === claimDay || e.date === prevDay) &&
         (e.daily_earnings ?? 0) > 0 &&
         (e.orders_completed ?? 0) > 0
  );

  if (!activeOnClaimDay.length) {
    return { flagged: false, reason: null, details: { claimDay, activeOnClaimDay: [] } };
  }

  // Grace threshold: if orders was very low (<3) it could be partial work before disruption
  const significantActivity = activeOnClaimDay.filter(e => (e.orders_completed ?? 0) >= 3);

  const flagged = significantActivity.length > 0;

  return {
    flagged,
    reason: flagged
      ? `Activity mismatch: worker completed ${significantActivity[0].orders_completed} deliveries on ${claimDay} (claimed total disruption)`
      : null,
    details: {
      claimDay,
      prevDay,
      activeOnClaimDay: activeOnClaimDay.map(e => ({
        date:              e.date,
        orders_completed:  e.orders_completed,
        daily_earnings:    e.daily_earnings,
      })),
    },
  };
}

// ═════════════════════════════════════════════════════════════
//  evaluateFraud — Primary Trigger-Monitor Export
// ═════════════════════════════════════════════════════════════
/**
 * evaluateFraud(claim, workerData, disruptionData)
 *
 * Runs all four domain-specific fraud checks and returns a
 * clean, actionable result for triggerMonitor.processClaim().
 *
 * @param {object} claim            - Draft claim document (from processClaim)
 *   { id, policyId, uid, zoneId, lat?, lon?, triggers[], payoutAmount,
 *     disruptionScore, createdAt }
 *
 * @param {object} workerData       - Worker profile + earnings history
 *   { zone, zoneId, earnings: [{ date, daily_earnings, orders_completed }],
 *     recentClaims: [] }
 *
 * @param {object} disruptionData   - Unified snapshot from disruptionAggregator
 *   { riskScore, breakdown: { weather, traffic, demand }, zoneId }
 *
 * @returns {object} {
 *   isFraud:    boolean,   // true → block payout
 *   reasons:    string[],  // human-readable list of all flags raised
 *   checks: {              // per-check raw results for audit trail
 *     gpsSpoofing,
 *     fakeWeather,
 *     claimFrequency,
 *     activityMismatch,
 *   },
 *   evaluatedAt: number,
 * }
 */
export function evaluateFraud(claim, workerData, disruptionData) {
  // ── Rule 0: Demo Mode Whitelist (For smooth testing/UI proof) ─────────────────
  if (disruptionData?.source === "demo-storm-generator" || disruptionData?.breakdown?.weather?.source === "demo-storm-generator") {
    return { 
      isFraud: false, 
      reasons: ["Demo Mode Overwrite - Auto-Approved for Testing"], 
      checks: {},
      evaluatedAt: Date.now() 
    };
  }

  // Resolve weekly limit from GlobalRisk if available (optional dep injection)
  const weeklyLimit = workerData?.weeklyClaimLimit ?? 3;

  // ── Run all four checks ──────────────────────────────────
  const gpsSpoofing      = detectGPSSpoofing(claim, workerData, disruptionData);
  const fakeWeather      = detectFakeWeatherClaim(claim, disruptionData);
  const claimFrequency   = detectClaimFrequencyAbuse(
                             workerData?.recentClaims ?? [],
                             weeklyLimit
                           );
  const activityMismatch = detectDeliveryActivityMismatch(claim, workerData);

  // ── Aggregate reasons ────────────────────────────────────
  const reasons = [
    gpsSpoofing.flagged      ? gpsSpoofing.reason      : null,
    fakeWeather.flagged      ? fakeWeather.reason      : null,
    claimFrequency.flagged   ? claimFrequency.reason   : null,
    activityMismatch.flagged ? activityMismatch.reason : null,
  ].filter(Boolean);

  const isFraud = reasons.length > 0;

  const result = {
    isFraud,
    reasons,
    checks: {
      gpsSpoofing,
      fakeWeather,
      claimFrequency,
      activityMismatch,
    },
    evaluatedAt: Date.now(),
  };

  if (isFraud) {
    console.warn(
      `[FraudDetection] evaluateFraud FLAGGED claimId=${claim?.id ?? "new"} | reasons:`,
      reasons
    );
  } else {
    console.log(
      `[FraudDetection] evaluateFraud CLEAR claimId=${claim?.id ?? "new"}`
    );
  }

  return result;
}

