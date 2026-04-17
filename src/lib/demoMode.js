// ─────────────────────────────────────────────────────────────
//  RideSure — Demo Mode Controller
//  Allows admins to simulation extreme conditions and force
//  automated claim workflows for testing/demo purposes.
// ─────────────────────────────────────────────────────────────
import { DB }           from "./firebase.js";
import { 
  setDemoWeather, 
  clearDemoWeather 
}                       from "./weatherApi.js";
import { 
  runClaimPipeline 
}                       from "./backend.js";
import { 
  evaluatePolicy 
}                       from "../services/triggerMonitor.js";

/** 
 * isDemoMode
 * Global toggle exported to UI to show "DEBUG" badges.
 */
export let isDemoMode = false;

/**
 * toggleDemoMode
 * Switches demo state and clears any leftover weather overrides.
 */
export function toggleDemoMode(val) {
  isDemoMode = val === undefined ? !isDemoMode : val;
  if (!isDemoMode) {
    clearDemoWeather();
    console.log("[DemoMode] Disabling demo mode — clearing overrides.");
  } else {
    console.log("[DemoMode] Enabling demo mode — ready for triggers.");
  }
  return isDemoMode;
}

/**
 * triggerFakeRainstorm
 * Simulates an extreme weather event in a specific region,
 * forces the weather API to return stormy data, and 
 * triggerDemoDisruption
 * Simulates an extreme event in a specific region,
 * forces the weather API to return stormy data (if applicable), and 
 * manually triggers the automated claim pipeline for all
 * active workers in that zone.
 * 
 * Flow:
 *   1. Set extreme condition data
 *   2. Fetch active policies for the region
 *   3. Evaluate policies against the disruption
 *   4. Run Full Pipeline (Claim -> Fraud -> Payout -> Wallet -> Notify)
 * 
 * @param {string} zoneId - Region to hit (e.g. "velachery")
 * @param {string} type - Event type ("storm", "gridlock", "outage")
 * @returns {Promise<object>} Summary of demo execution
 */
export async function triggerDemoDisruption(zoneId = "velachery", type = "storm") {
  // Ensure demo mode is on
  if (!isDemoMode) toggleDemoMode(true);

  console.log(`[DemoMode] 💥 Initiating Fake ${type.toUpperCase()} in ${zoneId.toUpperCase()}...`);

  // ── 1. Define extreme condition data ────────────────────────
  let snapshot = {
    zoneId,
    fetchedAt: Date.now(),
    weather: { rainfall: 0, temperature: 35, aqi: 120, traffic: 60, source: "demo" },
    traffic: { severity: 0.2, events: [], congestionLevel: 45 },
    demand:  { demandDrop: 0, platformStatus: "normal", disruptionType: { label: "Normal Operations", payoutFactor: 0 } },
    breakdown: {}
  };

  if (type === "storm") {
    snapshot.weather = { rainfall: 92, temperature: 24, aqi: 145, traffic: 95, source: "demo" };
    snapshot.traffic = { severity: 0.95, events: [{ label: "Demo Flash Flood", impact: "critical" }], congestionLevel: 95 };
    snapshot.demand  = { demandDrop: 0.75, platformStatus: "down", disruptionType: { label: "Cyclone Shutdown", payoutFactor: 0.85 } };
  } else if (type === "gridlock") {
    snapshot.traffic = { severity: 0.98, events: [{ label: "Citywide Gridlock", impact: "critical" }, { label: "Accident Blockage", impact: "high" }], congestionLevel: 98 };
  } else if (type === "outage") {
    snapshot.demand  = { demandDrop: 1.0, platformStatus: "down", disruptionType: { label: "Platform Sever Outage", payoutFactor: 0.90 } };
  }

  // Mirroring breakdown structure from disruptionAggregator
  snapshot.breakdown = { weather: snapshot.weather, traffic: snapshot.traffic, demand: snapshot.demand };

  // ── 2. Force Weather API Override (if storm) ────────────────
  if (type === "storm") setDemoWeather(zoneId, snapshot.weather);

  // ── 3. Find target policies ─────────────────────────────────
  let allPolicies = [];
  try {
    allPolicies = await DB.getActivePolicies();
  } catch (err) {
    console.error("[DemoMode] Failed to fetch policies:", err.message);
    return { success: false, error: err.message };
  }

  const targetPolicies = allPolicies.filter(p => (p.zoneId === zoneId || p.zone === zoneId));

  console.log(`[DemoMode] Targeting ${targetPolicies.length} active policies in ${zoneId}`);

  // ── 4. Process Claims (one by one for demo logging) ─────────
  const results = [];
  for (const policy of targetPolicies) {
    try {
      const evaluation = evaluatePolicy(policy, snapshot);
      if (!evaluation.triggered) continue;

      console.log(`[DemoMode] ⚡ TRIGGER: Policy ${policy.policyId} | ₹${evaluation.totalPayout} payout estimated`);
      const outcome = await runClaimPipeline(policy, evaluation, snapshot, { earnings: policy.dailyEarning * 30 });

      results.push({
        workerId: policy.userId || policy.uid,
        claimId:  outcome.claim.id,
        status:   outcome.claim.status,
        amount:   outcome.receipt?.amount ?? 0,
        txnId:    outcome.receipt?.transactionId ?? "N/A"
      });
    } catch (policyErr) {
      console.error(`[DemoMode] Error processing policy ${policy.policyId}:`, policyErr.message);
    }
  }

  console.log(`[DemoMode] ✅ Demo complete. ${results.length} claims processed.`);

  return {
    success: true,
    zone: zoneId,
    type: type,
    stats: { 
      targeted: targetPolicies.length, 
      triggered: results.length, 
      payouts: results.filter(r => r.status === "paid" || r.status === "auto-approved").length 
    },
    results
  };
}

// Keep original function export explicitly to not break existing imports
export async function triggerFakeRainstorm(zoneId = "velachery") {
  return triggerDemoDisruption(zoneId, "storm");
}
