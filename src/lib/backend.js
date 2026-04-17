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

/* ════════════════════════════════════════════════════════════
   AUTOMATED CLAIM PIPELINE
   Compatible with triggerMonitor.js orchestration flow:
     trigger detected
     → createClaim()   auto-creates + fraud check
     → approveClaim()  approves + triggers payout
     → updateWallet()  credits worker Firestore wallet
     → notifyWorker()  in-app + console notification

   All functions are async, handle their own errors, and return
   structured result objects safe for triggerMonitor to log.
   ════════════════════════════════════════════════════════════ */

import { DB }                from "./firebase.js";
import { processPayout }     from "./paymentGateway.js";
import { evaluateFraud }     from "./fraudDetection.js";

// ── Internal ID generator ─────────────────────────────────────
const _pid = (p) =>
  `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// ── 1. createClaim ────────────────────────────────────────────
/**
 * Auto-creates a parametric claim from a trigger event, runs fraud
 * detection, and persists it to Firestore with the correct initial status.
 *
 * Called by: triggerMonitor.processClaim()
 *
 * @param {object} policy          - Active policy document from Firestore
 * @param {object} evaluation      - evaluatePolicy() result
 *   { triggered, triggers[], totalPayout, disruptionScore }
 * @param {object} disruptionData  - Unified snapshot from disruptionAggregator
 * @param {object} [workerData]    - Worker profile + earnings (for fraud check)
 *
 * @returns {Promise<object>} Persisted claim document with status set
 */
export async function createClaim(policy, evaluation, disruptionData, workerData = {}) {
  const claimId  = _pid("CLM");
  const workerId = policy.userId ?? policy.uid;

  // ── Draft claim ─────────────────────────────────────────────
  const draft = {
    id:              claimId,
    policyId:        policy.policyId,
    uid:             workerId,
    zoneId:          policy.zoneId ?? policy.zone ?? disruptionData?.zoneId ?? "unknown",
    zone:            policy.zoneId ?? policy.zone ?? disruptionData?.zoneId ?? "unknown",
    triggers:        evaluation.triggers  ?? [],
    payoutAmount:    evaluation.totalPayout ?? 0,
    disruptionLabel:    evaluation.triggers[0]?.label ?? "Parametric Claim",
    triggerExplanation: evaluation.triggers.map(t => t.label).join(", "),
    createdAt:       Date.now(),
    status:          "pending",
  };


  // ── Fraud detection ─────────────────────────────────────────
  let recentClaims = [];
  try { recentClaims = await DB.getUserClaims(workerId); } catch (_) {}

  const fraud = evaluateFraud(
    draft,
    { ...workerData, recentClaims },
    disruptionData ?? {}
  );

  draft.fraudScore   = fraud.isFraud ? 80 : 10;
  draft.fraudReasons = fraud.reasons;
  draft.fraudChecks  = fraud.checks;

  if (fraud.isFraud) {
    draft.status   = "fraud-blocked";
    draft.fraudFlag = true;
    console.warn(`[Backend] createClaim BLOCKED ${claimId} | reasons:`, fraud.reasons);
  } else {
    draft.status   = "created";
    draft.fraudFlag = false;
  }

  // ── Persist to Firestore ────────────────────────────────────
  try {
    await DB.saveClaim(draft);
    console.log(`[Backend] createClaim ✓ ${claimId} | status=${draft.status}`);
  } catch (dbErr) {
    console.error(`[Backend] createClaim Firestore error:`, dbErr.message);
  }

  return draft;
}

// ── 2. approveClaim ───────────────────────────────────────────
/**
 * Approves a created claim (status must be "created"), triggers the
 * payout via paymentGateway, and updates the claim status in Firestore.
 *
 * Called by: triggerMonitor.processClaim() after createClaim()
 *
 * @param {object} claim  - Draft claim from createClaim()
 *
 * @returns {Promise<object>} {
 *   claim,          // updated claim document
 *   receipt,        // payout receipt { transactionId, status, amount, method, timestamp }
 *   approved: bool,
 * }
 */
export async function approveClaim(claim) {
  if (claim.status === "fraud-blocked") {
    console.warn(`[Backend] approveClaim skipped — claim ${claim.id} is fraud-blocked`);
    return { claim, receipt: null, approved: false };
  }

  if (!claim.payoutAmount || claim.payoutAmount <= 0) {
    console.warn(`[Backend] approveClaim skipped — zero payout for claim ${claim.id}`);
    return { claim, receipt: null, approved: false };
  }

  // ── Mark as approved ────────────────────────────────────────
  claim.status     = "approved";
  claim.approvedAt = Date.now();

  // ── Trigger payout ──────────────────────────────────────────
  let receipt = null;
  try {
    receipt = await processPayout(claim);       // claim-aware: { transactionId, status, amount, method, timestamp }
    claim.txnId        = receipt.transactionId;
    claim.payoutStatus = receipt.status;
    claim.payoutMethod = receipt.method;
    claim.status       = receipt.status === "success" ? "paid" : "payout-pending";

    console.log(
      `[Backend] approveClaim payout ✓ ${receipt.transactionId} | ₹${receipt.amount} via ${receipt.method}`
    );
  } catch (payErr) {
    claim.status      = "payout-failed";
    claim.payoutError = payErr.message;
    console.error(`[Backend] approveClaim payout FAILED ${claim.id}:`, payErr.message);
  }

  // ── Update Firestore status ─────────────────────────────────
  try {
    await DB.updateClaimStatus(claim.id, claim.status);
  } catch (dbErr) {
    console.warn(`[Backend] approveClaim Firestore update failed:`, dbErr.message);
  }

  return { claim, receipt, approved: claim.status === "paid" };
}

// ── 3. updateWallet ───────────────────────────────────────────
/**
 * Credits the worker's Firestore wallet with the payout amount.
 * Creates the wallet document if it doesn't exist.
 * Appends a transaction entry to the history array (capped at 50).
 *
 * Called by: triggerMonitor after approveClaim() returns receipt
 *
 * @param {string} workerId
 * @param {number} amount       - INR credit amount
 * @param {string} claimId
 * @param {string} txnId        - From payout receipt
 *
 * @returns {Promise<object>} Updated wallet document
 */
export async function updateWallet(workerId, amount, claimId, txnId) {
  if (!workerId || !amount || amount <= 0) {
    console.warn(`[Backend] updateWallet skipped — invalid params`, { workerId, amount });
    return null;
  }

  try {
    // Read existing wallet (graceful if not found)
    const existing = await DB.getWallet?.(workerId).catch(() => null);
    const prevBalance = existing?.balance ?? 0;
    const newBalance  = prevBalance + amount;

    const walletDoc = {
      workerId,
      balance:     newBalance,
      lastCredit:  amount,
      lastClaimId: claimId,
      lastTxnId:   txnId,
      updatedAt:   Date.now(),
      history: [
        ...(existing?.history ?? []).slice(-49),   // rolling 50-entry window
        { type: "credit", amount, claimId, txnId, ts: Date.now() },
      ],
    };

    await DB.saveWallet?.(workerId, walletDoc);
    console.log(
      `[Backend] updateWallet ✓ ${workerId} | +₹${amount} | balance=₹${newBalance}`
    );
    return walletDoc;
  } catch (err) {
    console.error(`[Backend] updateWallet error for ${workerId}:`, err.message);
    return null;
  }
}

// ── 4. notifyWorker (internal helper) ────────────────────────
/**
 * Sends an in-app notification to the worker after claim resolution.
 * In production: POST to FCM / OneSignal push endpoint.
 * Currently: persists to Firestore /notifications/{uid} and logs.
 *
 * @param {string} workerId
 * @param {object} claim   - Resolved claim
 * @param {object} receipt - Payout receipt (may be null for blocked claims)
 */
export async function notifyWorker(workerId, claim, receipt = null) {
  const isPaid    = claim.status === "paid";
  const isBlocked = claim.status === "fraud-blocked";

  const notification = {
    id:        _pid("NOTIF"),
    uid:       workerId,
    type:      isPaid ? "payout_credited" : isBlocked ? "claim_blocked" : "claim_update",
    title:     isPaid
                 ? `₹${receipt?.amount ?? claim.payoutAmount} Payout Credited`
                 : isBlocked
                 ? "Claim Flagged for Review"
                 : `Claim ${claim.status}`,
    body:      isPaid
                 ? `Your parametric claim ${claim.id} has been approved and ₹${receipt?.amount} sent via ${receipt?.method ?? "wallet"}.`
                 : isBlocked
                 ? `Claim ${claim.id} was flagged: ${(claim.fraudReasons ?? []).join("; ")}`
                 : `Your claim ${claim.id} status: ${claim.status}.`,
    claimId:   claim.id,
    amount:    receipt?.amount ?? claim.payoutAmount ?? 0,
    method:    receipt?.method ?? null,
    read:      false,
    createdAt: Date.now(),
  };

  try {
    await DB.saveNotification?.(workerId, notification);
  } catch (_) {}

  console.log(
    `[Backend] notifyWorker → ${workerId} | type=${notification.type} | "${notification.title}"`
  );

  return notification;
}

// ── Full Pipeline Runner ──────────────────────────────────────
/**
 * runClaimPipeline(policy, evaluation, disruptionData, workerData?)
 *
 * Convenience orchestrator used by triggerMonitor.processClaim()
 * to run the complete automated pipeline in one call.
 *
 * Steps:
 *   1. createClaim   – fraud check + persist
 *   2. approveClaim  – approve + payout
 *   3. updateWallet  – credit Firestore wallet
 *   4. notifyWorker  – push notification
 *
 * @returns {Promise<object>} { claim, receipt, wallet, notification }
 */
export async function runClaimPipeline(policy, evaluation, disruptionData, workerData = {}) {
  // Step 1
  const claim = await createClaim(policy, evaluation, disruptionData, workerData);

  // Short-circuit if fraud-blocked
  if (claim.status === "fraud-blocked") {
    const notification = await notifyWorker(claim.uid, claim, null);
    return { claim, receipt: null, wallet: null, notification };
  }

  // Step 2
  const { claim: approvedClaim, receipt } = await approveClaim(claim);

  /* Removed redundant wallet update — handled by processPayout() internally */


  // Step 4
  const notification = await notifyWorker(approvedClaim.uid, approvedClaim, receipt);

  return { claim: approvedClaim, receipt, wallet, notification };
}
