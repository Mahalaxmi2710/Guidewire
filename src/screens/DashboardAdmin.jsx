// ─────────────────────────────────────────────────────────────
//  RideSure — Dashboard: Admin Tab
// ─────────────────────────────────────────────────────────────
import { DS, ZONES, RISK_META } from "../constants.js";
import { Card, Bar, Badge, PulseDot, SectionLabel, StatBox } from "../components/ui.jsx";

const ML_PIPELINE = [
  { step: "Data Ingestion",        status: "Live",    note: "Weather · Traffic · Platform APIs" },
  { step: "Feature Engineering",   status: "Live",    note: "Zone score · Earning rate · Severity index" },
  { step: "Risk Prediction Model", status: "Live",    note: "scikit-learn · RF Classifier" },
  { step: "Loss Estimation Engine",status: "Live",    note: "Income × Duration × Severity" },
  { step: "Decision Engine",       status: "Live",    note: "Trigger eval · Fraud check · Payout calc" },
  { step: "Blockchain Audit Log",  status: "Sepolia", note: "Ethereum testnet · Tamper-proof records" },
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

const PREDICTIVE_ALERTS = [
  { zone: "Velachery",  msg: "Heavy rain 2–5 PM · 84% probability",  risk: "high" },
  { zone: "Perambur",   msg: "AQI likely to breach 260",              risk: "high" },
  { zone: "T. Nagar",   msg: "Peak traffic surge 6–8 PM",             risk: "medium" },
  { zone: "Adyar",      msg: "Mild heat advisory 12–3 PM",            risk: "medium" },
  { zone: "Anna Nagar", msg: "Conditions normal, low claim risk",     risk: "low" },
];

export default function AdminTab({ claimsCount = 0 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Header card */}
      <Card style={{ background: "linear-gradient(135deg, #1a1228, #13161F)" }} padding="16px">
        <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "#A78BFA", marginBottom: 4 }}>
          Admin · Analytics Dashboard
        </div>
        <div style={{ color: "#fff", fontWeight: 700 }}>RideSure Platform Overview</div>
        <div style={{ fontSize: "0.72rem", color: DS.muted, marginTop: 2 }}>
          Chennai Operations · {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </div>
      </Card>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatBox label="Active Policies"  value="1,284"          color={DS.blue}    sub="+12% WoW" />
        <StatBox label="Weekly Revenue"   value="₹38,520"        color={DS.green}   sub="₹30 avg premium" />
        <StatBox label="Claims Processed" value={String(claimsCount + 47)} color={DS.accent}  sub="Auto-approved" />
        <StatBox label="Loss Ratio"       value="34%"            color="#A78BFA"    sub="Healthy band" />
      </div>

      {/* Zone risk heatmap */}
      <Card>
        <SectionLabel>Zone Risk Heat Map</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ZONES.map(z => {
            const rm = RISK_META[z.risk];
            return (
              <div key={z.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: rm.text, flexShrink: 0 }} />
                <span style={{ fontSize: "0.78rem", color: "#fff", width: 90, flexShrink: 0 }}>{z.name}</span>
                <div style={{ flex: 1 }}>
                  <Bar val={z.score} color={rm.bar} />
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, width: 24, textAlign: "right", color: rm.text }}>{z.score}</span>
                <Badge label={`${z.hist}/mo`} color={rm.text} bg={rm.bg} border={rm.border} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Fraud detection */}
      <Card>
        <SectionLabel>🛡️ Fraud Detection Engine</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {FRAUD_CHECKS.map((f, i) => (
            <div key={f.check} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0",
              borderBottom: i < FRAUD_CHECKS.length - 1 ? `1px solid ${DS.border}` : "none",
            }}>
              <span style={{ fontSize: "0.78rem", color: DS.muted }}>{f.check}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: f.ok ? DS.green : DS.accent2 }}>
                {f.status}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Predictive alerts */}
      <Card>
        <SectionLabel>🔮 AI Predictive Alerts · Next 24h</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PREDICTIVE_ALERTS.map(a => {
            const rm = RISK_META[a.risk];
            return (
              <div key={a.zone} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                borderRadius: 10, padding: 12,
                background: rm.bg, border: `1px solid ${rm.border}`,
              }}>
                <PulseDot color={rm.text} />
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: rm.text }}>{a.zone}</div>
                  <div style={{ fontSize: "0.72rem", color: DS.muted, marginTop: 1 }}>{a.msg}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ML pipeline status */}
      <Card>
        <SectionLabel>🧠 AI/ML Pipeline Status</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ML_PIPELINE.map((m, i) => (
            <div key={m.step} style={{
              padding: "10px 0",
              borderBottom: i < ML_PIPELINE.length - 1 ? `1px solid ${DS.border}` : "none",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff", marginBottom: 2 }}>{m.step}</div>
                <div style={{ fontSize: "0.68rem", color: DS.muted }}>{m.note}</div>
              </div>
              <span style={{
                fontSize: "0.72rem", fontWeight: 700, flexShrink: 0, marginLeft: 8,
                color: m.status === "Live" ? DS.green : DS.blue,
              }}>{m.status}</span>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ height: 8 }} />
    </div>
  );
}
