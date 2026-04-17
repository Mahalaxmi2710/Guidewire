// ─────────────────────────────────────────────────────────────
//  RideSure — Admin Dashboard Enhancement Panels
//  Four new modular panels to add to DashboardAdmin.jsx.
//
//  Usage (in DashboardAdmin.jsx, inside the return):
//    import {
//      LossRatioPanel,
//      PredictiveClaimRiskPanel,
//      FraudAlertsPanel,
//      RegionalDisruptionPanel,
//    } from "../components/AdminDashboardPanels.jsx";
//
//  Imports only from already-existing modules.
//  Zero logic duplication with DashboardAdmin.jsx.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { DS, ZONES }                        from "../constants.js";
import { Card, SectionLabel, Bar }          from "../components/ui.jsx";
import {
  computeLossRatio,
  PLATFORM_STATS,
  HISTORICAL_DISRUPTION_DATA,
  computeBreakEvenPremium,
  getZoneRiskTier,
} from "../lib/actuarial.js";
import {
  predictPremium,
  extractFeatures,
  computeLocationRiskScore,
} from "../lib/mlModel.js";
import { getLedger }              from "../lib/paymentGateway.js";
import { getMonitorLogs }         from "../services/triggerMonitor.js";
import { aggregateForZones, summariseAggregates } from "../lib/disruptionAggregator.js";

// ── Shared micro-styles ───────────────────────────────────────
const pill = (color, bg) => ({
  fontSize: "0.6rem", fontWeight: 700, padding: "2px 7px",
  borderRadius: 99,
  background: bg ?? `${color}18`,
  color,
  border:  `1px solid ${color}35`,
  display: "inline-block",
  whiteSpace: "nowrap",
});

const tRow = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", padding: "8px 0",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
};

// ═════════════════════════════════════════════════════════════
//  1. LossRatioPanel
//  Deep loss ratio analysis: current ratio, trend band,
//  break-even reference, and per-zone expected payouts.
//  Uses: computeLossRatio, PLATFORM_STATS, computeBreakEvenPremium
// ═════════════════════════════════════════════════════════════
/**
 * @param {boolean} globalRiskOn   - Heightened risk toggle state
 * @param {number}  [claimsCount]  - Incremental claims from UI simulation
 */
export function LossRatioPanel({ globalRiskOn, claimsCount = 0 }) {
  // Effective totals — bake in any UI-sim claims
  const simPayouts  = claimsCount * 280;       // avg ₹280/simulated claim
  const totalPrem   = PLATFORM_STATS.totalPremiumsMonth * (globalRiskOn ? 1.5 : 1);
  const totalPayout = PLATFORM_STATS.totalPayoutsMonth + simPayouts;
  const lr          = computeLossRatio(totalPrem, totalPayout);

  // Health band
  const BANDS = [
    { label: "Under-priced",  min: 0,   max: 39,  color: DS.accent2 },
    { label: "Healthy",       min: 40,  max: 70,  color: DS.green   },
    { label: "Watch",         min: 70,  max: 80,  color: DS.accent  },
    { label: "Unsustainable", min: 80,  max: 999, color: DS.red     },
  ];
  const band       = BANDS.find(b => lr >= b.min && lr < b.max) ?? BANDS[1];
  const lrBarWidth = Math.min(100, lr);

  // Break-even premiums per zone (avg earning ₹600)
  const zones = Object.keys(HISTORICAL_DISRUPTION_DATA);
  const breakEvens = zones.map(z => ({
    zone:      z.replace("_", " "),
    breakEven: computeBreakEvenPremium(z, 600),
    current:   Math.round(PLATFORM_STATS.avgWeeklyPremium * (globalRiskOn ? 1.5 : 1)),
  }));

  return (
    <Card>
      <SectionLabel>📊 Loss Ratio Analysis</SectionLabel>

      {/* Gauge */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: "0.72rem", color: DS.muted }}>
            Loss Ratio — {band.label}
          </span>
          <span style={{ fontWeight: 900, fontSize: "1.1rem", color: band.color, fontFamily: "monospace" }}>
            {lr}%
          </span>
        </div>

        {/* Segmented bar */}
        <div style={{ position: "relative", height: 10, borderRadius: 99,
          background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0,
            height: "100%", width: `${lrBarWidth}%`,
            background: `linear-gradient(90deg,${DS.green},${band.color})`,
            borderRadius: 99, transition: "width 0.5s ease" }} />
          {/* 40% and 70% markers */}
          {[40, 70, 80].map(mark => (
            <div key={mark} style={{
              position: "absolute", top: 0, left: `${mark}%`,
              height: "100%", width: 1.5,
              background: "rgba(255,255,255,0.25)",
            }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between",
          fontSize: "0.55rem", color: DS.muted, marginTop: 4 }}>
          <span>0%  Under-priced</span>
          <span>40%  Healthy</span>
          <span>70%  Watch</span>
          <span>80%+ Unsustainable</span>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 14 }}>
        {[
          { label: "Premiums",   value: `₹${(totalPrem  / 1000).toFixed(0)}K`, color: DS.green  },
          { label: "Payouts",    value: `₹${(totalPayout / 1000).toFixed(0)}K`, color: DS.accent },
          { label: "Margin",     value: `₹${((totalPrem - totalPayout) / 1000).toFixed(0)}K`,
            color: totalPrem > totalPayout ? DS.blue : DS.red },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: "center", padding: "8px 4px",
            borderRadius: 9, background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: "0.86rem", fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: "0.6rem",  color: DS.muted, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Break-even table */}
      <div style={{ fontSize: "0.67rem", color: DS.muted, marginBottom: 8 }}>
        Break-even premium vs current (₹600/day avg):
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {breakEvens.map(({ zone, breakEven, current }) => {
          const gap    = current - breakEven;
          const color  = gap < 0 ? DS.red : gap < 5 ? DS.accent2 : DS.green;
          return (
            <div key={zone} style={tRow}>
              <span style={{ fontSize: "0.72rem", color: "#fff", textTransform: "capitalize", width: 85 }}>
                {zone}
              </span>
              <span style={{ fontSize: "0.7rem", color: DS.muted }}>B/E: ₹{breakEven}</span>
              <span style={{ fontSize: "0.7rem", color: DS.muted }}>Now: ₹{current}</span>
              <span style={pill(color)}>{gap >= 0 ? "+" : ""}{gap}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
//  2. PredictiveClaimRiskPanel
//  ML-based per-zone claim risk forecast using the GBDT model.
//  Uses: predictPremium, extractFeatures, getZoneRiskTier, ZONES
// ═════════════════════════════════════════════════════════════
/**
 * @param {string} selectedZone    - Currently selected zone id
 * @param {number} selectedEarning - Daily earning for preview
 */
export function PredictiveClaimRiskPanel({ selectedZone, selectedEarning = 600 }) {
  // Compute ML risk scores for all zones
  const zoneRisks = ZONES.map(z => {
    const pred = predictPremium(z, selectedEarning, "both");
    const tier  = getZoneRiskTier(z.id);
    const features = extractFeatures(z, selectedEarning, "both");

    // Predict claim probability from vulnerability score (0–1 → 0%–100%)
    const claimProb = Math.min(99, Math.round(features.vulnerabilityScore * 120 + 10));

    return {
      zoneId:       z.id,
      zoneName:     z.name,
      premium:      pred.premium,
      claimProb,
      tier:         tier?.tier ?? z.risk,
      eventsPerMo:  tier?.totalEventsPerMonth ?? 0,
      dominantRisk: tier?.dominantRisk ?? "weather",
      confidence:   pred.confidence,
      importances:  pred.importances,
    };
  }).sort((a, b) => b.claimProb - a.claimProb);

  const TIER_COLOR = { high: DS.red, medium: DS.accent2, low: DS.green };

  const selected = zoneRisks.find(z => z.zoneId === selectedZone) ?? zoneRisks[0];

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <SectionLabel>🤖 Predictive Claim Risk (GBDT v1.2)</SectionLabel>
        <span style={pill("#A78BFA")}>ML Live</span>
      </div>

      {/* Zone risk table */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 14 }}>
        {zoneRisks.map(z => (
          <div key={z.zoneId}
            style={{ ...tRow, background: z.zoneId === selectedZone ? "rgba(249,115,22,0.06)" : "transparent",
              borderRadius: 7, padding: "8px 6px" }}>
            {/* Zone name + tier */}
            <div style={{ width: 90, flexShrink: 0 }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#fff", textTransform: "capitalize" }}>
                {z.zoneName}
              </div>
              <span style={pill(TIER_COLOR[z.tier])}>
                {z.tier} · {z.eventsPerMo}/mo
              </span>
            </div>

            {/* Claim prob bar + value */}
            <div style={{ flex: 1, padding: "0 10px" }}>
              <div style={{ width: "100%", height: 5, borderRadius: 99,
                background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99,
                  width: `${z.claimProb}%`,
                  background: TIER_COLOR[z.tier],
                  transition: "width 0.4s ease" }} />
              </div>
              <div style={{ fontSize: "0.58rem", color: DS.muted, marginTop: 2 }}>
                Claim prob: {z.claimProb}% · Dominant: {z.dominantRisk}
              </div>
            </div>

            {/* Premium */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: DS.accent }}>₹{z.premium}</div>
              <div style={{ fontSize: "0.58rem", color: DS.muted }}>/ week</div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature importance breakdown for selected zone */}
      {selected && (
        <>
          <div style={{ fontSize: "0.67rem", color: DS.muted, marginBottom: 8 }}>
            Feature importances — {selected.zoneName} (confidence: {selected.confidence}%):
          </div>
          {Object.entries(selected.importances).map(([feat, score]) => (
            <div key={feat} style={{ marginBottom: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                fontSize: "0.67rem", color: DS.muted, marginBottom: 2 }}>
                <span>{feat}</span><span>{score}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${score}%`, borderRadius: 99,
                  background: `linear-gradient(90deg,${DS.accent},${DS.blue})`,
                  transition: "width 0.4s ease" }} />
              </div>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
//  3. FraudAlertsPanel
//  Live fraud feed from paymentGateway ledger + monitor logs.
//  Surfaces blocked claims, REVIEW-queued payouts, and
//  PLATFORM_STATS.fraudFlaggedThisWeek summary.
//  Uses: getLedger, getMonitorLogs, PLATFORM_STATS
// ═════════════════════════════════════════════════════════════
export function FraudAlertsPanel() {
  const [ledger, setLedger] = useState([]);
  const [logs,   setLogs]   = useState([]);

  const refresh = useCallback(() => {
    try { setLedger(getLedger()); }    catch (_) {}
    try { setLogs(getMonitorLogs()); } catch (_) {}
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000); // auto-refresh every 30s
    return () => clearInterval(id);
  }, [refresh]);

  // Blocked / review entries from ledger
  const failedTxns = ledger.filter(t => t.status === "failed" || t.status === "reversed");

  // Fraud events from monitor log
  const fraudLogs  = logs
    .filter(l => l.level === "warn" && l.message?.includes("BLOCKED"))
    .slice(-5)
    .reverse();

  const FRAUD_RULES = [
    { check: "GPS Spoofing Detection",     ok: true  },
    { check: "Fake Weather Cross-check",   ok: true  },
    { check: "Claim Frequency Monitor",    ok: true  },
    { check: "Activity Mismatch Detector", ok: true  },
    {
      check: `Flagged Claims This Week`,
      status: `${PLATFORM_STATS.fraudFlaggedThisWeek} flagged`,
      ok: PLATFORM_STATS.fraudFlaggedThisWeek === 0,
    },
    {
      check: "Failed / Reversed Payouts",
      status: `${failedTxns.length} transactions`,
      ok: failedTxns.length === 0,
    },
  ];

  return (
    <Card border={PLATFORM_STATS.fraudFlaggedThisWeek > 0 ? `1.5px solid ${DS.red}40` : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
        <SectionLabel>🔍 Fraud Alerts</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%",
            background: DS.green,
            boxShadow: `0 0 6px ${DS.green}`,
            animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "0.65rem", color: DS.green }}>Live</span>
          <button onClick={refresh}
            style={{ fontSize: "0.6rem", padding: "2px 7px", borderRadius: 5,
              background: DS.surface, border: `1px solid ${DS.border}`,
              color: DS.muted, cursor: "pointer" }}>↺</button>
        </div>
      </div>

      {/* Rule status checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 12 }}>
        {FRAUD_RULES.map(({ check, status, ok }) => (
          <div key={check} style={tRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: "0.75rem" }}>{ok ? "✅" : "⚠️"}</span>
              <span style={{ fontSize: "0.72rem", color: ok ? "#fff" : DS.accent2 }}>{check}</span>
            </div>
            <span style={pill(ok ? DS.green : DS.accent2)}>
              {status ?? "Active"}
            </span>
          </div>
        ))}
      </div>

      {/* Live blocked claims from monitor */}
      {fraudLogs.length > 0 && (
        <>
          <div style={{ fontSize: "0.67rem", color: DS.muted, marginBottom: 7 }}>
            Recent Blocked Claims (monitor log):
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fraudLogs.map((l, i) => (
              <div key={i} style={{ padding: "7px 10px", borderRadius: 8,
                background: `${DS.red}0C`, border: `1px solid ${DS.red}25`,
                fontSize: "0.68rem", color: DS.accent2, lineHeight: 1.4 }}>
                <span style={{ color: DS.red, fontWeight: 700 }}>FRAUD BLOCKED · </span>
                {l.message?.replace("[TriggerMonitor]", "").trim()}
                <div style={{ fontSize: "0.58rem", color: DS.muted, marginTop: 2 }}>
                  {new Date(l.ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Failed transactions */}
      {failedTxns.length > 0 && (
        <>
          <div style={{ fontSize: "0.67rem", color: DS.muted, margin: "10px 0 7px" }}>
            Failed / Reversed Transactions:
          </div>
          {failedTxns.slice(0, 3).map((t, i) => (
            <div key={i} style={{ ...tRow }}>
              <span style={{ fontSize: "0.7rem", color: "#fff" }}>{t.txnId?.slice(-12) ?? "—"}</span>
              <span style={{ fontSize: "0.7rem", color: DS.muted }}>₹{t.amount}</span>
              <span style={pill(DS.red)}>{t.status}</span>
            </div>
          ))}
        </>
      )}

      {fraudLogs.length === 0 && failedTxns.length === 0 && (
        <div style={{ textAlign: "center", padding: "8px 0",
          fontSize: "0.72rem", color: DS.green }}>
          ✅ No active fraud alerts
        </div>
      )}
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
//  4. RegionalDisruptionPanel
//  Live multi-zone disruption snapshot using disruptionAggregator.
//  Shows riskScore, triggered zones, and per-signal breakdown.
//  Uses: aggregateForZones, summariseAggregates, ZONES
// ═════════════════════════════════════════════════════════════
/**
 * @param {string[]} [zoneIds] - Defaults to all 6 Chennai zones
 */
export function RegionalDisruptionPanel({ zoneIds }) {
  const ALL_ZONES = ZONES.map(z => z.id);
  const zones     = zoneIds ?? ALL_ZONES;

  const [snapshots,  setSnapshots]  = useState([]);
  const [summary,    setSummary]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [lastFetch,  setLastFetch]  = useState(null);

  const RISK_COLOR = { Low: DS.green, Moderate: DS.accent2, High: DS.red, Critical: "#7c3aed" };

  const refresh = useCallback(() => {
    setLoading(true);
    aggregateForZones(zones)
      .then(snaps => {
        setSnapshots(snaps);
        setSummary(summariseAggregates(snaps));
        setLastFetch(Date.now());
      })
      .catch(console.warn)
      .finally(() => setLoading(false));
  }, [zones.join(",")]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5 * 60 * 1000); // re-fetch every 5 min
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
        <SectionLabel>🗺️ Regional Disruption Analytics</SectionLabel>
        <button onClick={refresh} disabled={loading}
          style={{ fontSize: "0.65rem", padding: "3px 9px", borderRadius: 6,
            background: DS.surface, border: `1px solid ${DS.border}`,
            color: DS.muted, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "…" : "↺ Refresh"}
        </button>
      </div>

      {/* Fleet summary */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, marginBottom: 14 }}>
          {[
            { label: "Avg Risk",     value: `${summary.avgRiskScore}`,       color: RISK_COLOR[summary.highestRiskZone?.riskLabel ?? "Low"] ?? DS.muted },
            { label: "Peak Zone",    value: summary.highestRiskZone?.zone?.replace("_", " ") ?? "—", color: DS.accent2 },
            { label: "Triggered",    value: `${summary.triggeredZones.length} / ${zones.length}`, color: summary.triggeredZones.length > 0 ? DS.red : DS.green },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: "center", padding: "8px 4px",
              borderRadius: 9, background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.86rem", fontWeight: 800, color, textTransform: "capitalize" }}>{value}</div>
              <div style={{ fontSize: "0.6rem", color: DS.muted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-zone rows */}
      {loading && snapshots.length === 0 && (
        <div style={{ textAlign: "center", padding: 18, color: DS.muted, fontSize: "0.72rem" }}>
          Fetching live disruption data…
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {snapshots.map(snap => {
          const riskColor = RISK_COLOR[snap.riskLabel] ?? DS.muted;
          const { weather, traffic, demand } = snap.breakdown ?? {};
          return (
            <div key={snap.zone} style={{ padding: "10px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)" }}>

              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  {snap.triggered && (
                    <div style={{ width: 7, height: 7, borderRadius: "50%",
                      background: DS.red, boxShadow: `0 0 6px ${DS.red}` }} />
                  )}
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff",
                    textTransform: "capitalize" }}>
                    {snap.zone.replace("_", " ")}
                  </span>
                  {snap.triggered && (
                    <span style={pill(DS.red, `${DS.red}18`)}>⚡ TRIGGERED</span>
                  )}
                </div>
                <span style={{ fontWeight: 800, fontSize: "0.82rem", color: riskColor,
                  fontFamily: "monospace" }}>
                  {snap.riskScore} <span style={{ fontSize: "0.6rem", color: DS.muted, fontWeight: 400 }}>/ 100</span>
                </span>
              </div>

              {/* Risk bar */}
              <div style={{ width: "100%", height: 5, borderRadius: 99,
                background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 5 }}>
                <div style={{ height: "100%", borderRadius: 99,
                  width: `${snap.riskScore}%`,
                  background: riskColor,
                  transition: "width 0.4s ease" }} />
              </div>

              {/* Per-signal mini row */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {weather && (
                  <span style={{ fontSize: "0.6rem", color: DS.muted }}>
                    🌧️ {weather.rainfall ?? 0}mm
                    &nbsp;🌡️ {weather.temperature ?? "—"}°C
                    &nbsp;💨 AQI {weather.aqi ?? "—"}
                  </span>
                )}
                {traffic && (
                  <span style={{ fontSize: "0.6rem", color: DS.muted }}>
                    🚦 {Math.round((traffic.severity ?? 0) * 100)}% congestion
                    {traffic.events?.length > 0 && ` · ${traffic.events.length} event${traffic.events.length > 1 ? "s" : ""}`}
                  </span>
                )}
                {demand && (
                  <span style={{ fontSize: "0.6rem", color: DS.muted }}>
                    📦 {demand.platformStatus === "down" ? "⚠️ Platform down" : `${Math.round((demand.demandDrop ?? 0) * 100)}% demand drop`}
                  </span>
                )}
              </div>

              {/* Score breakdown */}
              {snap.scores && (
                <div style={{ display: "flex", gap: 8, marginTop: 5 }}>
                  {[
                    { label: "wx", score: snap.scores.weather, color: DS.blue   },
                    { label: "tr", score: snap.scores.traffic, color: DS.accent },
                    { label: "dm", score: snap.scores.demand,  color: DS.green  },
                  ].map(({ label, score, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: "0.55rem", color: DS.muted }}>{label}</span>
                      <div style={{ width: 36, height: 3, borderRadius: 99,
                        background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${score}%`,
                          background: color, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: "0.55rem", color }}>{score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {lastFetch && (
        <div style={{ marginTop: 8, fontSize: "0.6rem", color: DS.muted, textAlign: "right" }}>
          Last updated {new Date(lastFetch).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      )}
    </Card>
  );
}
