// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Dashboard: Admin Tab
//  Sensitivity table, actuarial depth, real DB indicator
//  Global Risk Switch + Platform Activity Data
// ─────────────────────────────────────────────────────────────
import { DS, ZONES, RISK_META, GLOBAL_RISK_CONSTRAINTS } from "../constants.js";
import { Card, Bar, Badge, PulseDot, SectionLabel, StatBox } from "../components/ui.jsx";
import { runSensitivityAnalysis, PLATFORM_STATS, computeLossRatio } from "../lib/actuarial.js";
import { DB } from "../lib/firebase.js";
import { getAllPlatformSummary } from "../lib/dataSchema.js";
import { getCacheStats } from "../lib/weatherApi.js";

const ML_PIPELINE = [
  { step: "Data Ingestion",         status: "Live",    note: "Weather · Traffic · Platform APIs" },
  { step: "Feature Engineering",    status: "Live",    note: "Zone score · Earning rate · Severity index" },
  { step: "Risk Prediction Model",  status: "GBDT v1.2",note: "3-tree gradient boosted decision tree" },
  { step: "Loss Estimation Engine", status: "Live",    note: "Income × Duration × Severity" },
  { step: "Decision Engine",        status: "Live",    note: "Trigger eval · Fraud check · Payout calc" },
  { step: "Blockchain Audit Log",   status: "Sepolia", note: "Ethereum testnet · Tamper-proof records" },
];

const FRAUD_CHECKS = [
  { check: "GPS Spoofing Detection",    status: "Active",    ok: true },
  { check: "Motion Pattern Analysis",   status: "Active",    ok: true },
  { check: "Network Triangulation",     status: "Active",    ok: true },
  { check: "Coordinated Claim Monitor", status: "Active",    ok: true },
  { check: "Graph Anomaly Detector",    status: "Active",    ok: true },
  { check: "Flagged Claims This Week",  status: "3 flagged", ok: false },
  { check: "Partial-hold Payouts",      status: "2 pending", ok: false },
];

const ALERTS = [
  { zone: "Velachery",  msg: "Heavy rain 2–5 PM · 84% probability",  risk: "high" },
  { zone: "Perambur",   msg: "AQI likely to breach 260",              risk: "high" },
  { zone: "T. Nagar",   msg: "Peak traffic surge 6–8 PM",             risk: "medium" },
  { zone: "Adyar",      msg: "Mild heat advisory 12–3 PM",            risk: "medium" },
  { zone: "Anna Nagar", msg: "Conditions normal, low claim risk",     risk: "low" },
];

// ── Sensitivity Table ─────────────────────────────────────────
function SensitivityTable({ zoneId, dailyEarning, premium, globalRiskOn }) {
  const currentPremium = globalRiskOn ? Math.round(premium * 1.5) : premium;
  const rows = runSensitivityAnalysis(zoneId, dailyEarning, currentPremium);
  return (
    <Card>
      <SectionLabel>📉 Sensitivity Analysis — Disruption Frequency</SectionLabel>
      <div style={{ fontSize: "0.67rem", color: DS.muted, marginBottom: 10, lineHeight: 1.5 }}>
        How loss ratio changes if disruption frequency shifts. Healthy band: 40–75%.
        {globalRiskOn && <span style={{ color: DS.red, marginLeft: 4 }}>(50% surcharge applied)</span>}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
          <thead>
            <tr>
              {["Scenario", "Exp. Payout/wk", "Loss Ratio", "Viable"].map(h => (
                <th key={h} style={{ padding: "6px 4px", color: DS.muted, fontWeight: 700, textAlign: "left", borderBottom: `1px solid ${DS.border}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: r.multiplier === 1 ? "rgba(249,115,22,0.07)" : "transparent" }}>
                <td style={{ padding: "8px 4px", color: r.multiplier === 1 ? DS.accent : "#fff", fontWeight: r.multiplier === 1 ? 700 : 400 }}>
                  {r.label}
                </td>
                <td style={{ padding: "8px 4px", color: "#fff" }}>₹{r.weeklyPayout}</td>
                <td style={{ padding: "8px 4px" }}>
                  <span style={{ fontWeight: 700, color: r.lossRatio > 80 ? DS.red : r.lossRatio > 60 ? DS.accent2 : DS.green }}>
                    {r.lossRatio}%
                  </span>
                </td>
                <td style={{ padding: "8px 4px" }}>
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                    background: r.viable ? `${DS.green}18` : `${DS.red}18`,
                    color: r.viable ? DS.green : DS.red }}>
                    {r.viable ? "✓ Yes" : "✕ No"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function AdminTab({ claimsCount = 0, selectedZone, selectedEarning, selectedPremium, globalRiskOn, onToggleGlobalRisk }) {
  const zone    = selectedZone    || "velachery";
  const earning = selectedEarning || 600;
  const premium = selectedPremium || 38;
  
  const currentPremium = globalRiskOn ? Math.round(premium * 1.5) : premium;
  const lr      = computeLossRatio(PLATFORM_STATS.totalPremiumsMonth, PLATFORM_STATS.totalPayoutsMonth);
  const platformSummary = getAllPlatformSummary();
  const cache = getCacheStats();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>

      {/* Header */}
      <Card style={{ background: "linear-gradient(135deg,#1a1228,#13161F)" }} padding="15px">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#A78BFA", marginBottom: 4 }}>Admin · Analytics</div>
            <div style={{ color: "#fff", fontWeight: 700 }}>RideSure Platform Overview</div>
            <div style={{ fontSize: "0.7rem", color: DS.muted, marginTop: 2 }}>
              Chennai · {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, padding: "4px 9px", borderRadius: 8,
                background: DB.isLive() ? `${DS.green}18` : `${DS.accent2}18`,
                color: DB.isLive() ? DS.green : DS.accent2,
                border: `1px solid ${DB.isLive() ? DS.green : DS.accent2}40` }}>
                {DB.isLive() ? "🟢 Firebase Live" : "🟡 Mock DB"}
            </div>
            <div style={{ fontSize: "0.55rem", color: DS.muted }}>Cache Hit Rate: {cache.hitRate}%</div>
          </div>
        </div>
      </Card>

      {/* Global Risk Toggle */}
      <Card border={`1.5px solid ${globalRiskOn ? DS.red : DS.border}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
                <SectionLabel>⚠️ Heightened Risk Mode</SectionLabel>
                <div style={{ fontSize: "0.65rem", color: DS.muted, marginTop: -4 }}>
                    Stricter pricing & coverage constraints
                </div>
            </div>
            <button 
                onClick={onToggleGlobalRisk}
                style={{
                    width: 50, height: 26, borderRadius: 13, cursor: "pointer",
                    background: globalRiskOn ? DS.red : DS.surface,
                    border: `1px solid ${globalRiskOn ? DS.red : DS.border}`,
                    position: "relative", transition: "all 0.3s"
                }}>
                <div style={{
                    width: 20, height: 20, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 2, left: globalRiskOn ? 26 : 2,
                    transition: "all 0.3s"
                }} />
            </button>
        </div>
        {globalRiskOn && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: `${DS.red}10`, fontSize: "0.68rem", color: DS.red, lineHeight: 1.5 }}>
                • Premium multiplier: 1.5x applied<br/>
                • Max claims: 2 per week cap<br/>
                • Coverage ratio: 50% max payout
            </div>
        )}
      </Card>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <StatBox label="Active Policies"  value={PLATFORM_STATS.activePolicies.toLocaleString()} color={DS.blue}    sub="+12% WoW" />
        <StatBox label="Weekly Revenue"   value={`₹${(PLATFORM_STATS.avgWeeklyPremium * PLATFORM_STATS.activePolicies / 1000).toFixed(0)}K`} color={DS.green} sub="₹31.4 avg" />
        <StatBox label="Claims Processed" value={String(claimsCount + PLATFORM_STATS.claimsThisWeek)} color={DS.accent} sub="Auto-approved" />
        <StatBox label="Loss Ratio"       value={`${lr}%`} color={lr < 50 ? DS.green : lr < 70 ? DS.accent2 : DS.red} sub={lr < 70 ? "Healthy" : "Monitor"} />
      </div>

      {/* Sensitivity Analysis */}
      <SensitivityTable zoneId={zone} dailyEarning={earning} premium={premium} globalRiskOn={globalRiskOn} />

      {/* Platform Activity */}
      <Card>
          <SectionLabel>📊 City Platform Activity (7d avg)</SectionLabel>
          <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
                  <thead>
                      <tr style={{ color: DS.muted, borderBottom: `1px solid ${DS.border}` }}>
                          <th style={{ textAlign: "left", padding: "6px 2px" }}>City</th>
                          <th style={{ textAlign: "right", padding: "6px 2px" }}>Orders</th>
                          <th style={{ textAlign: "right", padding: "6px 2px" }}>Riders</th>
                          <th style={{ textAlign: "right", padding: "6px 2px" }}>D/S Ratio</th>
                          <th style={{ textAlign: "right", padding: "6px 2px" }}>Time</th>
                      </tr>
                  </thead>
                  <tbody>
                      {platformSummary.map(p => (
                          <tr key={p.city} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                              <td style={{ padding: "8px 2px", color: "#fff", fontWeight: 700, textTransform: "capitalize" }}>{p.city.replace("_", " ")}</td>
                              <td style={{ padding: "8px 2px", textAlign: "right", color: DS.blue }}>{p.avgOrders}</td>
                              <td style={{ padding: "8px 2px", textAlign: "right", color: "#fff" }}>{p.avgRiders}</td>
                              <td style={{ padding: "8px 2px", textAlign: "right", color: p.avgRatio > 8 ? DS.red : p.avgRatio > 6 ? DS.accent2 : DS.green }}>{p.avgRatio}</td>
                              <td style={{ padding: "8px 2px", textAlign: "right", color: DS.muted }}>{p.avgTime}m</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </Card>

      {/* Zone heatmap */}
      <Card>
        <SectionLabel>Zone Risk Heat Map</SectionLabel>
        {ZONES.map(z => {
          const rm = RISK_META[z.risk];
          return (
            <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: rm.text, flexShrink: 0 }} />
              <span style={{ fontSize: "0.76rem", color: "#fff", width: 85, flexShrink: 0 }}>{z.name}</span>
              <div style={{ flex: 1 }}><Bar val={z.score} color={rm.bar} /></div>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, width: 22, textAlign: "right", color: rm.text }}>{z.score}</span>
              <Badge label={`${z.hist}/mo`} color={rm.text} bg={rm.bg} border={rm.border} />
            </div>
          );
        })}
      </Card>

      <div style={{ height: 8 }} />
    </div>
  );
}
