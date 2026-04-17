// ─────────────────────────────────────────────────────────────
//  RideSure — Worker Dashboard Enhancement Panels
//  Four new modular panels to add to DashboardWorker.jsx.
//
//  Usage (in DashboardWorker.jsx, inside the return):
//    import {
//      ActiveCoveragePanel,
//      EarningsProtectedPanel,
//      LastPayoutsPanel,
//      DisruptionAlertsPanel,
//    } from "../components/WorkerDashboardPanels.jsx";
//
//  Each panel is self-contained. Pass only what you already have.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { DS }                  from "../constants.js";
import { Card, SectionLabel }  from "../components/ui.jsx";
import { GlobalRisk }          from "../lib/globalRisk.js";
import { aggregateDisruptions } from "../lib/disruptionAggregator.js";
import { DB }                  from "../lib/firebase.js";

// ── Shared micro-styles ───────────────────────────────────────
const pill = (color) => ({
  fontSize: "0.6rem", fontWeight: 700, padding: "2px 7px",
  borderRadius: 99, background: `${color}18`,
  color, border: `1px solid ${color}35`,
  display: "inline-block",
});

const row = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", padding: "9px 0",
  borderBottom: "1px solid rgba(255,255,255,0.04)",
};

// ═════════════════════════════════════════════════════════════
//  1. ActiveCoveragePanel
//  Shows current policy status, cover window, and GlobalRisk
//  constraint summary in one glance.
// ═════════════════════════════════════════════════════════════
/**
 * @param {object} policy        - Active policy from Firestore / prop
 * @param {boolean} globalRiskOn - Admin heightened-risk toggle
 * @param {number}  premium      - Current effective weekly premium
 */
export function ActiveCoveragePanel({ policy, globalRiskOn, premium }) {
  const constraints = GlobalRisk.getConstraints();
  const coverageEnd = policy?.endDate
    ? new Date(policy.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : "Active this week";

  const badges = [
    { label: "Coverage Active",                     color: DS.green  },
    { label: globalRiskOn ? "⚠️ Heightened Risk" : "Normal Risk",
                                                    color: globalRiskOn ? DS.red : DS.green },
    { label: `${Math.round(constraints.coverageRatio * 100)}% payout ratio`, color: DS.blue },
  ];

  return (
    <Card style={{ background: `linear-gradient(135deg,${DS.accent}10,${DS.surface})` }}>
      <SectionLabel>🛡️ Active Coverage</SectionLabel>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {badges.map(b => <span key={b.label} style={pill(b.color)}>{b.label}</span>)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {[
          { label: "Policy ID",       value: policy?.policyId ?? "—" },
          { label: "Cover Period",    value: coverageEnd },
          { label: "Zone",            value: (policy?.zone ?? policy?.zoneId ?? "—").replace("_", " ") },
          { label: "Weekly Premium",  value: `₹${premium ?? policy?.premium ?? "—"}` },
          { label: "Max Payout",      value: `₹${(policy?.maxPayout ?? 0).toLocaleString("en-IN")}` },
          { label: "Claims Left",     value: `${constraints.maxClaimsPerWeek} / week` },
        ].map(({ label, value }) => (
          <div key={label} style={row}>
            <span style={{ fontSize: "0.73rem", color: DS.muted }}>{label}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff" }}>{value}</span>
          </div>
        ))}
      </div>

      {globalRiskOn && (
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8,
          background: `${DS.red}10`, border: `1px solid ${DS.red}25`,
          fontSize: "0.67rem", color: DS.red, lineHeight: 1.6 }}>
          ⚠️ Heightened Risk: +50% premium · 50% max payout · max 2 claims/week
        </div>
      )}
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
//  2. EarningsProtectedPanel
//  Shows weekly avg earnings, how much is insured, and the
//  coverage gap — sourced from dataSchema + actuarial layer.
// ═════════════════════════════════════════════════════════════
/**
 * @param {number} weeklyAvgEarnings - From getWeeklyAvgEarnings(uid)
 * @param {object} policy            - For maxPayout
 * @param {number} premiumsPaid      - Total premiums paid to date
 * @param {number} claimsPaid        - Total payouts received
 */
export function EarningsProtectedPanel({ weeklyAvgEarnings, policy, premiumsPaid = 0, claimsPaid = 0 }) {
  const maxPayout     = policy?.maxPayout ?? 0;
  const coverageRatio = GlobalRisk.getConstraints().coverageRatio;
  const effectiveCap  = Math.round(weeklyAvgEarnings * coverageRatio);
  const coverageGap   = Math.max(0, weeklyAvgEarnings - effectiveCap);
  const netBenefit    = claimsPaid - premiumsPaid;

  const pct = weeklyAvgEarnings > 0
    ? Math.min(100, Math.round((effectiveCap / weeklyAvgEarnings) * 100))
    : 0;

  return (
    <Card>
      <SectionLabel>💰 Earnings Protected</SectionLabel>

      {/* Progress arc bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "0.7rem", color: DS.muted }}>Protected earnings</span>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: DS.green }}>
            ₹{effectiveCap.toLocaleString("en-IN")}
            <span style={{ fontSize: "0.6rem", color: DS.muted, fontWeight: 400 }}> / week</span>
          </span>
        </div>
        <div style={{ width: "100%", height: 7, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99,
            background: `linear-gradient(90deg,${DS.green},${DS.blue})`,
            transition: "width 0.4s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: "0.6rem", color: DS.muted }}>Coverage: {pct}%</span>
          <span style={{ fontSize: "0.6rem", color: DS.accent2 }}>Gap: ₹{coverageGap.toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {[
          { label: "Weekly avg earnings",  value: `₹${weeklyAvgEarnings.toLocaleString("en-IN")}`, color: "#fff"    },
          { label: "Max insured payout",   value: `₹${maxPayout.toLocaleString("en-IN")}`,         color: DS.green  },
          { label: "Premiums paid (total)",value: `₹${premiumsPaid.toLocaleString("en-IN")}`,      color: DS.accent },
          { label: "Payouts received",     value: `₹${claimsPaid.toLocaleString("en-IN")}`,        color: DS.blue   },
          { label: "Net benefit",          value: `${netBenefit >= 0 ? "+" : ""}₹${Math.abs(netBenefit).toLocaleString("en-IN")}`,
            color: netBenefit >= 0 ? DS.green : DS.red },
        ].map(({ label, value, color }) => (
          <div key={label} style={row}>
            <span style={{ fontSize: "0.72rem", color: DS.muted }}>{label}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color }}>{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
//  3. LastPayoutsPanel
//  Renders the last N payouts from DB with method badge + UTR.
//  Loads from Firestore via DB.getUserClaims().
// ═════════════════════════════════════════════════════════════
/**
 * @param {string} uid          - Worker's user ID
 * @param {Array}  [claims]     - Pass if already loaded (avoids re-fetch)
 * @param {number} [limit=5]    - Max payouts to show
 */
export function LastPayoutsPanel({ uid, claims: propClaims, limit = 5 }) {
  const [fetchedClaims, setFetchedClaims] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If parent doesn't provide claims or it's empty, fetch them ourselves
    if (!propClaims || propClaims.length === 0) {
      setLoading(true);
      DB.getUserClaims(uid)
        .then(all => setFetchedClaims(all))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [uid, propClaims]);

  const claims = propClaims ?? fetchedClaims;

  const METHOD_COLORS = { razorpay: DS.blue, stripe: DS.accent, upi: DS.green, mock: DS.muted };
  const STATUS_COLORS = { paid: DS.green, "payout-failed": DS.red, approved: DS.accent2, "auto-approved": DS.green, created: DS.muted, "payout-pending": DS.accent2, "partial-hold": DS.accent2 };

  if (loading && !propClaims) {
    return (
      <Card>
        <SectionLabel>💳 Last Payouts</SectionLabel>
        <div style={{ textAlign: "center", padding: 20, color: DS.muted, fontSize: "0.72rem" }}>Loading…</div>
      </Card>
    );
  }

  // Ensure demo claims and actual paid claims show up on dashboard
  const activeClaims = claims
    .filter(c => ["paid", "approved", "auto-approved", "payout-pending", "partial-hold"].includes(c.status))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);

  return (
    <Card style={{ marginTop: 10 }}>

      {activeClaims.length === 0 ? (
        <div style={{ textAlign: "center", padding: "14px 0", color: DS.muted, fontSize: "0.72rem" }}>
          No payouts yet — coverage is active.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {activeClaims.map(c => {
            const method  = c.payoutMethod ?? c.gateway ?? "mock";
            const trigger = Array.isArray(c.triggers) ? c.triggers[0]?.label : c.label ?? "Parametric Trigger";
            const time    = c.approvedAt ?? c.createdAt;
            return (
              <div key={c.id} style={{ ...row, gap: 10 }}>
                {/* Icon */}
                <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: `${DS.green}12`, border: `1px solid ${DS.green}25`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem" }}>
                  💸
                </div>

                {/* Label */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#fff",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {trigger}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span style={pill(METHOD_COLORS[method] ?? DS.muted)}>
                      {method.toUpperCase()}
                    </span>
                    {c.txnId && (
                      <span style={{ fontSize: "0.58rem", color: DS.muted,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>
                        {c.txnId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount + time */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.87rem",
                    color: STATUS_COLORS[c.status] ?? DS.green }}>
                    +₹{(Number(c.payoutAmount) || Number(c.amount) || 0).toLocaleString("en-IN")}
                  </div>

                  <div style={{ fontSize: "0.6rem", color: DS.muted }}>
                    {time ? new Date(time).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
//  4. DisruptionAlertsPanel
//  Fetches live disruption snapshot for the worker's zone and
//  shows actionable alerts. Uses disruptionAggregator.js.
// ═════════════════════════════════════════════════════════════
/**
 * @param {string} zoneId     - Worker's registered zone
 * @param {object} [snapshot] - Pass pre-fetched aggregateDisruptions() result
 */
export function DisruptionAlertsPanel({ zoneId, snapshot: propSnapshot }) {
  const [snapshot, setSnapshot] = useState(propSnapshot ?? null);
  const [loading,  setLoading]  = useState(!propSnapshot);
  const [lastFetch,setLastFetch]= useState(null);

  const refresh = () => {
    setLoading(true);
    aggregateDisruptions(zoneId ?? "velachery")
      .then(s  => { setSnapshot(s); setLastFetch(Date.now()); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (!propSnapshot) refresh(); }, [zoneId]);

  const RISK_COLORS = { Low: DS.green, Moderate: DS.accent2, High: DS.red, Critical: "#7c3aed" };
  const riskColor   = snapshot ? (RISK_COLORS[snapshot.riskLabel] ?? DS.muted) : DS.muted;

  // Build human-readable alert items from breakdown
  const alerts = [];
  if (snapshot) {
    const { weather, traffic, demand } = snapshot.breakdown ?? {};
    if (weather?.rainfall  >= 50) alerts.push({ emoji: "🌧️", msg: `Heavy rain: ${weather.rainfall}mm (threshold 50mm)`,  severity: "high"   });
    if (weather?.temperature >= 38) alerts.push({ emoji: "🌡️", msg: `Heat advisory: ${weather.temperature}°C`,           severity: "medium" });
    if (weather?.aqi        >= 200) alerts.push({ emoji: "💨", msg: `Air quality poor: AQI ${weather.aqi}`,               severity: "medium" });
    if (traffic?.events?.length > 0)
      traffic.events.forEach(e => alerts.push({ emoji: "🚦", msg: e.label, severity: e.impact === "critical" ? "high" : "medium" }));
    if (demand?.platformStatus === "down")
      alerts.push({ emoji: "📵", msg: "Platform outage detected", severity: "high" });
    if (demand?.demandDrop >= 0.5)
      alerts.push({ emoji: "📉", msg: `Demand dropped ${Math.round(demand.demandDrop * 100)}% below baseline`, severity: "medium" });
  }

  const SEV_COLOR = { high: DS.red, medium: DS.accent2, low: DS.green };

  return (
    <Card border={snapshot?.triggered ? `1.5px solid ${DS.red}50` : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <SectionLabel>⚡ Disruption Alerts</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {snapshot && (
            <span style={pill(riskColor)}>{snapshot.riskLabel} Risk {snapshot.riskScore}</span>
          )}
          <button onClick={refresh} disabled={loading}
            style={{ fontSize: "0.65rem", padding: "3px 8px", borderRadius: 6,
              background: DS.surface, border: `1px solid ${DS.border}`,
              color: DS.muted, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "…" : "↺"}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 14, color: DS.muted, fontSize: "0.72rem" }}>
          Fetching live data…
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0",
          color: DS.green, fontSize: "0.73rem" }}>
          <span>✅</span> All conditions normal — no alerts for {(zoneId ?? "your zone").replace("_", " ")}.
        </div>
      )}

      {!loading && alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "8px 10px",
              borderRadius: 9, background: `${SEV_COLOR[a.severity]}0D`,
              border: `1px solid ${SEV_COLOR[a.severity]}25` }}>
              <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>{a.emoji}</span>
              <span style={{ fontSize: "0.73rem", color: "#fff", lineHeight: 1.4 }}>{a.msg}</span>
              <span style={{ ...pill(SEV_COLOR[a.severity]), marginLeft: "auto", flexShrink: 0 }}>
                {a.severity}
              </span>
            </div>
          ))}
        </div>
      )}

      {snapshot?.triggered && (
        <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8,
          background: `${DS.red}10`, border: `1px solid ${DS.red}30`,
          fontSize: "0.68rem", color: DS.red, fontWeight: 700 }}>
          ⚡ Parametric trigger conditions met — auto-claim evaluation in progress
        </div>
      )}

      {lastFetch && (
        <div style={{ marginTop: 8, fontSize: "0.6rem", color: DS.muted, textAlign: "right" }}>
          Updated {new Date(lastFetch).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </Card>
  );
}
