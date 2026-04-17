// ─────────────────────────────────────────────────────────────
//  RideSure — Trigger Monitor (Core Automation Engine)
//  Polls every 5 minutes for parametric trigger conditions.
//
//  Flow per cycle:
//    1. Fetch weather + traffic + demand disruption data
//    2. Load active policies from Firestore
//    3. Evaluate each policy against parametric triggers
//    4. If triggered → auto-create claim
//    5. Run fraud detection
//    6. If valid → approve claim → disburse payout → update wallet
//    7. Persist all decisions to Firestore
//    8. Log every action with structured events
//
//  Exports:
//    startTriggerMonitor()  — starts the polling loop
//    stopTriggerMonitor()   — gracefully halts the loop
//    evaluatePolicy()       — pure evaluator (testable)
//    processClaim()         — full claim lifecycle handler
//    getMonitorLogs()       — returns structured event log
// ─────────────────────────────────────────────────────────────

import { DB }                                   from "../lib/firebase.js";
import { fetchWeather, evaluateTriggers }        from "../lib/weatherApi.js";
import { fetchTraffic, isTrafficTriggered }      from "../lib/trafficApi.js";
import { fetchDemandDisruption, isDemandTriggered } from "../lib/demandApi.js";
import { GlobalRisk }                            from "../lib/globalRisk.js";
import { runFraudDetection }                     from "../lib/fraudDetection.js";
import { processPayout, updateWorkerWallet }     from "../lib/paymentGateway.js";

// ── Constants ────────────────────────────────────────────────
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MODULE_TAG       = "[TriggerMonitor]";

// ── Internal State ────────────────────────────────────────────
let _intervalId   = null;
let _isRunning    = false;
let _cycleCount   = 0;
const _eventLog   = [];   // structured event journal, kept in memory

// ── Logger ────────────────────────────────────────────────────
/**
 * Appends a structured log event.
 * @param {"info"|"warn"|"error"|"trigger"|"claim"|"payout"} level
 * @param {string} message
 * @param {object} [data]
 */
function log(level, message, data = {}) {
  const entry = {
    ts:       Date.now(),
    isoTime:  new Date().toISOString(),
    level,
    message:  `${MODULE_TAG} ${message}`,
    ...data,
  };
  _eventLog.push(entry);
  if (_eventLog.length > 500) _eventLog.shift(); // rolling window

  const consoleFn = level === "error" ? console.error
                  : level === "warn"  ? console.warn
                  : console.log;
  consoleFn(entry.message, data);
}

/** Returns a copy of the structured event log. */
export function getMonitorLogs() { return [..._eventLog]; }

// ── Disruption Aggregator ─────────────────────────────────────
/**
 * Fetches weather + traffic + demand for a given zone.
 * Returns a unified disruption snapshot.
 */
async function fetchDisruptionSnapshot(zoneId) {
  const [weather, traffic, demand] = await Promise.allSettled([
    fetchWeather(zoneId),
    fetchTraffic(zoneId),
    fetchDemandDisruption(zoneId),
  ]);

  const w = weather.status === "fulfilled" ? weather.value : null;
  const t = traffic.status === "fulfilled" ? traffic.value : null;
  const d = demand.status  === "fulfilled" ? demand.value  : null;

  if (weather.status === "rejected") log("warn", `Weather fetch failed for ${zoneId}`, { err: weather.reason?.message });
  if (traffic.status === "rejected") log("warn", `Traffic fetch failed for ${zoneId}`, { err: traffic.reason?.message });
  if (demand.status  === "rejected") log("warn", `Demand fetch failed for ${zoneId}`,  { err: demand.reason?.message  });

  return { weather: w, traffic: t, demand: d, zoneId, fetchedAt: Date.now() };
}

// ── Policy Fetcher ────────────────────────────────────────────
/**
 * Fetches all "active" policies from Firestore.
 * Falls back gracefully if DB layer is unavailable.
 */
async function fetchActivePolicies() {
  try {
    // DB.getAllActivePolicies is defined below as an extension to firebase.js
    // For now we use getUserPolicies via a sentinel UID reserved for system queries.
    // You can replace this with a Firestore collection group query.
    const policies = await DB.getActivePolicies?.() ?? [];
    log("info", `Fetched ${policies.length} active policies`);
    return policies;
  } catch (err) {
    log("error", "Failed to fetch active policies", { err: err.message });
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
//  evaluatePolicy
//  Pure function — no side effects.
//  Returns { triggered: bool, triggers: [], disruptionScore: number }
// ─────────────────────────────────────────────────────────────
/**
 * Evaluates a single policy against current disruption data.
 *
 * @param {object} policy          - Firestore policy document
 * @param {object} disruptionData  - { weather, traffic, demand, zoneId }
 * @returns {object} evaluation result
 */
export function evaluatePolicy(policy, disruptionData) {
  const { weather, traffic, demand } = disruptionData;
  const constraints = GlobalRisk.getConstraints();

  const activeTriggers = [];
  
  // Safe extraction of daily earnings, defaulting to 600 INR
  const safeDailyEarning = policy.dailyEarning || (policy.weeklyEarnings ? policy.weeklyEarnings / 7 : 600);
  const safeHourlyRate = safeDailyEarning / 10;

  // ── 1. Weather triggers ────────────────────────────────────
  if (weather) {
    const weatherTriggers = evaluateTriggers(weather, safeDailyEarning);
    activeTriggers.push(
      ...weatherTriggers.map(t => ({ ...t, source: "weather" }))
    );
  }

  // ── 2. Traffic trigger ─────────────────────────────────────
  if (traffic && isTrafficTriggered(traffic)) {
    activeTriggers.push({
      type:    "traffic_lockdown",
      label:   traffic.events?.[0]?.label ?? `Traffic: ${traffic.severity}`,
      payout:  Math.round(safeHourlyRate * 2 * 0.6),
      source:  "traffic",
      details: traffic,
    });
  }

  // ── 3. Demand trigger ──────────────────────────────────────
  if (demand && isDemandTriggered(demand)) {
    const factor = demand.disruptionType?.payoutFactor ?? 0.70;
    activeTriggers.push({
      type:    "demand_disruption",
      label:   demand.disruptionType?.label ?? "Demand Disruption",
      payout:  Math.round(safeHourlyRate * 4 * factor),
      source:  "demand",
      details: demand,
    });
  }

  if (activeTriggers.length === 0) {
    return { triggered: false, triggers: [], totalPayout: 0, constraints };
  }

  // Apply GlobalRisk coverage ratio cap
  const rawTotal   = activeTriggers.reduce((sum, t) => sum + (t.payout ?? 0), 0);
  const cappedMax  = GlobalRisk.applyToMaxPayout(policy.weeklyEarnings ?? policy.dailyEarning * 7 ?? 4200);
  const totalPayout = Math.min(rawTotal, cappedMax);

  // Aggregate disruption score (0–100) for fraud detection reference
  const disruptionScore = Math.round(
    (activeTriggers.length / 3) * 100
    + (demand?.disruptionScore ?? 0) * 0.1
    + (weather?.rainfall       ?? 0) * 0.2
    + (traffic?.congestionLevel ?? 0) * 0.1
  );

  return {
    triggered:      true,
    triggers:       activeTriggers,
    totalPayout,
    disruptionScore: Math.min(100, Math.round(disruptionScore)),
    constraints,
  };
}

// ─────────────────────────────────────────────────────────────
//  processClaim
//  Full claim lifecycle: create → fraud check → approve → pay
// ─────────────────────────────────────────────────────────────
/**
 * @param {object} policy          - The active policy that triggered
 * @param {object} disruptionData  - Live disruption snapshot
 * @param {object} evaluation      - Result from evaluatePolicy()
 * @returns {object} Final claim document with payout receipt
 */
export async function processClaim(policy, disruptionData, evaluation) {
  const claimId   = `CLM_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const workerId  = policy.userId ?? policy.uid;
  const zoneId    = policy.zoneId ?? policy.zone ?? disruptionData.zoneId;

  log("claim", `Creating claim ${claimId} for policy ${policy.policyId}`, {
    claimId, workerId, triggers: evaluation.triggers.length, totalPayout: evaluation.totalPayout,
  });

  // ── Step 1: Build draft claim ──────────────────────────────
  const draftClaim = {
    id:              claimId,
    policyId:        policy.policyId,
    uid:             workerId,
    zoneId,
    triggers:        evaluation.triggers,
    payoutAmount:    evaluation.totalPayout,
    disruptionScore: evaluation.disruptionScore,
    zone:            zoneId,
    createdAt:       Date.now(),
    status:          "pending",
    source:          "auto-trigger",
    weather:         disruptionData.weather  ?? null,
    traffic:         disruptionData.traffic  ?? null,
    demand:          disruptionData.demand   ?? null,
  };

  // ── Step 2: Fetch user's recent claims for fraud context ───
  let recentClaims = [];
  try { recentClaims = await DB.getUserClaims(workerId); } catch (_) {}

  // ── Step 3: Fraud Detection ────────────────────────────────
  log("info", `Running fraud detection for ${claimId}`);
  const fraudResult = await runFraudDetection({
    policy,
    claim:         draftClaim,
    recentClaims,
    disruptionData: disruptionData.demand ?? {},
  });

  draftClaim.fraudScore   = fraudResult.score;
  draftClaim.fraudVerdict = fraudResult.verdict.id;
  draftClaim.fraudDetails = fraudResult.details;

  if (fraudResult.fraudFlag) {
    // Full fraud — block payout, persist blocked claim
    draftClaim.status = "fraud-blocked";
    log("warn", `Fraud BLOCKED: ${claimId}`, { score: fraudResult.score, verdict: fraudResult.verdict.id });
    await DB.saveClaim({ ...draftClaim, fraudFlag: true });
    return draftClaim;
  }

  if (fraudResult.reviewFlag) {
    // Needs human review — hold payout
    draftClaim.status = "manual-review";
    log("warn", `Fraud REVIEW queued: ${claimId}`, { score: fraudResult.score });
    await DB.saveClaim({ ...draftClaim, fraudFlag: false });
    return draftClaim;
  }

  // ── Step 4: Approve Claim ──────────────────────────────────
  log("info", `Claim ${claimId} APPROVED — initiating payout ₹${evaluation.totalPayout}`);
  draftClaim.status    = "approved";
  draftClaim.approvedAt = Date.now();

  // ── Step 5: Trigger Payout ─────────────────────────────────
  let payoutReceipt;
  try {
    payoutReceipt = await processPayout({
      workerId,
      amount: evaluation.totalPayout,
      meta:   { claimId, policyId: policy.policyId, zoneId },
    });
    draftClaim.txnId        = payoutReceipt.txnId;
    draftClaim.payoutStatus = payoutReceipt.status;
    draftClaim.payoutGateway= payoutReceipt.gateway;
    draftClaim.status       = "paid";

    log("payout", `Payout SUCCESS: ${payoutReceipt.txnId} | ₹${evaluation.totalPayout}`, { workerId });
  } catch (payErr) {
    draftClaim.status       = "payout-failed";
    draftClaim.payoutError  = payErr.message;
    log("error", `Payout FAILED for ${claimId}`, { err: payErr.message });
  }

  // ── Step 6: Persist Claim to Firestore ─────────────────────
  try {
    await DB.saveClaim(draftClaim);
    log("info", `Claim ${claimId} persisted to Firestore`, { status: draftClaim.status });
  } catch (dbErr) {
    log("error", `Firestore persist failed for ${claimId}`, { err: dbErr.message });
  }

  // ── Step 7: Update Worker Wallet ───────────────────────────
  if (draftClaim.status === "paid" && payoutReceipt) {
    try {
      await updateWorkerWallet({
        db: DB,
        workerId,
        amount:  evaluation.totalPayout,
        claimId,
        txnId:   payoutReceipt.txnId,
      });
      log("payout", `Wallet updated: ${workerId} +₹${evaluation.totalPayout}`);
    } catch (walletErr) {
      log("error", `Wallet update failed for ${workerId}`, { err: walletErr.message });
    }
  }

  return draftClaim;
}

// ─────────────────────────────────────────────────────────────
//  Monitor Cycle
// ─────────────────────────────────────────────────────────────
async function runCycle() {
  _cycleCount++;
  const cycleId = `CYCLE_${_cycleCount}`;
  log("info", `▶ Cycle ${cycleId} started`);

  const cycleStart   = Date.now();
  let   processed    = 0;
  let   triggered    = 0;
  let   paid         = 0;
  let   blocked      = 0;

  try {
    // ── 1. Load active policies ──────────────────────────────
    const policies = await fetchActivePolicies();
    if (!policies.length) {
      log("info", `Cycle ${cycleId}: No active policies — skipping`);
      return;
    }

    // ── 2. Deduplicate zones across policies ─────────────────
    const zones = [...new Set(policies.map(p => p.zoneId ?? p.zone ?? "velachery"))];
    log("info", `Cycle ${cycleId}: Fetching disruption data for zones: ${zones.join(", ")}`);

    // ── 3. Fetch disruption data per zone (parallel) ─────────
    const snapshotResults = await Promise.allSettled(
      zones.map(z => fetchDisruptionSnapshot(z))
    );
    const snapshots = {};
    zones.forEach((z, i) => {
      if (snapshotResults[i].status === "fulfilled") {
        snapshots[z] = snapshotResults[i].value;
      } else {
        log("warn", `Snapshot failed for zone ${z}`, { err: snapshotResults[i].reason?.message });
      }
    });

    // ── 4. Evaluate each policy ──────────────────────────────
    for (const policy of policies) {
      try {
        processed++;
        const zoneId          = policy.zoneId ?? policy.zone ?? "velachery";
        const disruptionData  = snapshots[zoneId];

        if (!disruptionData) {
          log("warn", `No disruption data for zone=${zoneId}, policyId=${policy.policyId}`);
          continue;
        }

        const evaluation = evaluatePolicy(policy, disruptionData);

        if (!evaluation.triggered) {
          log("info", `Policy ${policy.policyId} — No trigger`);
          continue;
        }

        triggered++;
        log("trigger", `Policy ${policy.policyId} TRIGGERED`, {
          policyId:  policy.policyId,
          zoneId,
          triggers:  evaluation.triggers.map(t => t.type),
          payout:    evaluation.totalPayout,
        });

        const claim = await processClaim(policy, disruptionData, evaluation);

        if (claim.status === "paid")           paid++;
        if (claim.status === "fraud-blocked")  blocked++;

      } catch (policyErr) {
        log("error", `Policy processing error: ${policy.policyId}`, { err: policyErr.message });
      }
    }

  } catch (cycleErr) {
    log("error", `Cycle ${cycleId} fatal error`, { err: cycleErr.message });
  } finally {
    const duration = Date.now() - cycleStart;
    log("info", `✓ Cycle ${cycleId} done in ${duration}ms`, {
      processed, triggered, paid, blocked, cycleId,
    });
  }
}

// ─────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────

/**
 * startTriggerMonitor()
 * Starts the 5-minute polling loop. Safe to call multiple times —
 * will not create duplicate intervals.
 *
 * @param {object} [options]
 * @param {boolean} [options.runImmediately=true]  - Run first cycle immediately on start
 * @param {number}  [options.intervalMs]           - Override poll interval (default: 5 min)
 * @returns {{ stop: function, status: function }}
 */
export function startTriggerMonitor(options = {}) {
  if (_isRunning) {
    log("warn", "Monitor already running — ignoring duplicate startTriggerMonitor() call");
    return { stop: stopTriggerMonitor, status: getMonitorStatus };
  }

  const intervalMs     = options.intervalMs ?? POLL_INTERVAL_MS;
  const runImmediately = options.runImmediately !== false;

  _isRunning = true;
  log("info", `🚀 Trigger Monitor started (interval: ${intervalMs / 1000}s)`);

  if (runImmediately) runCycle();

  _intervalId = setInterval(runCycle, intervalMs);

  return { stop: stopTriggerMonitor, status: getMonitorStatus };
}

/**
 * stopTriggerMonitor()
 * Clears the polling interval and marks monitor as stopped.
 */
export function stopTriggerMonitor() {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
  _isRunning = false;
  log("info", "🛑 Trigger Monitor stopped");
}

/**
 * getMonitorStatus()
 * Returns current runtime state of the monitor.
 */
export function getMonitorStatus() {
  return {
    isRunning:   _isRunning,
    cycleCount:  _cycleCount,
    logEntries:  _eventLog.length,
    lastLog:     _eventLog[_eventLog.length - 1] ?? null,
  };
}
