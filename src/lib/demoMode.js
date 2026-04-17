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
 * manually triggers the automated claim pipeline for all
 * active workers in that zone.
 * 
 * Flow:
 *   1. Set extreme weather override
 *   2. Fetch active policies for the region
 *   3. Evaluate policies against the "storm"
 *   4. Run Full Pipeline (Claim -> Fraud -> Payout -> Wallet -> Notify)
 * 
 * @param {string} zoneId - Region to hit (e.g. "velachery")
 * @returns {Promise<object>} Summary of demo execution
 */
export async function triggerFakeRainstorm(zoneId = "velachery") {
  // Ensure demo mode is on
  if (!isDemoMode) toggleDemoMode(true);

  console.log(`[DemoMode] 🌩️ Initiating Fake Rainstorm in ${zoneId.toUpperCase()}...`);

  // ── 1. Define extreme condition data ────────────────────────
  const stormWeatherData = {
    rainfall:    92,               // Extreme (threshold is 50mm)
    temperature: 24,
    aqi:         145,
    traffic:     95,               // Near gridlock
    source:      "demo-storm-generator"
  };

  // Unified snapshot used for evaluation and pipeline
  // Includes extreme traffic and demand drops to ensure multiple triggers
  const demoDisruption = {
    zoneId,
    fetchedAt: Date.now(),
    weather:   stormWeatherData,
    traffic:   { 
      severity: 0.95, 
      events: [{ label: "Demo Flash Flood", impact: "critical" }],
      congestionLevel: 95 
    },
    demand:    { 
      demandDrop: 0.75, 
      platformStatus: "down",
      disruptionType: { label: "Cyclone Shutdown", payoutFactor: 0.85 }
    },
    // Mirroring breakdown structure from disruptionAggregator
    breakdown: {
      weather: stormWeatherData,
      traffic: { severity: 0.95, congestionLevel: 95 },
      demand:  { platformStatus: "down" }
    }
  };

  // ── 2. Force Weather API Override ───────────────────────────
  // This ensures even the UI (RiskProfile, Dashboard) shows the storm
  setDemoWeather(zoneId, stormWeatherData);

  // ── 3. Find target policies ─────────────────────────────────
  let allPolicies = [];
  try {
    allPolicies = await DB.getActivePolicies();
  } catch (err) {
    console.error("[DemoMode] Failed to fetch policies:", err.message);
    return { success: false, error: err.message };
  }

  const targetPolicies = allPolicies.filter(p => 
    (p.zoneId === zoneId || p.zone === zoneId)
  );

  console.log(`[DemoMode] Targeting ${targetPolicies.length} active policies in ${zoneId}`);

  // ── 4. Process Claims (one by one for demo logging) ─────────
  const results = [];
  
  for (const policy of targetPolicies) {
    try {
      // Step A: Evaluate
      const evaluation = evaluatePolicy(policy, demoDisruption);
      
      if (!evaluation.triggered) {
        console.log(`[DemoMode] Worker ${policy.userId || policy.uid} not triggered (unexpected)`);
        continue;
      }

      console.log(`[DemoMode] ⚡ TRIGGER: Policy ${policy.policyId} | ₹${evaluation.totalPayout} payout estimated`);

      // Step B: Run the exact same pipeline used by triggerMonitor
      const outcome = await runClaimPipeline(
        policy, 
        evaluation, 
        demoDisruption,
        { earnings: policy.dailyEarning * 30 } // mock worker profile
      );

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
    zone:    zoneId,
    storm:   stormWeatherData,
    stats: {
      targeted:  targetPolicies.length,
      triggered: results.length,
      payouts:   results.filter(r => r.status === "paid").length
    },
    results
  };
}
