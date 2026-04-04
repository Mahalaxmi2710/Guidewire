// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Weekly Dynamic Pricing Card
//  Displays the formula-driven premium breakdown on dashboard.
//  Formula: premium = base_rate × earnings_factor × risk_multiplier
// ─────────────────────────────────────────────────────────────
import { DS } from "../constants.js";
import { Card, Bar, SectionLabel } from "./ui.jsx";

export default function WeeklyPricingCard({ result, globalRiskOn = false }) {
  if (!result) return null;
  const {
    premium: rawPremium, baseRate, earningsFactor, riskMultiplier,
    locationRiskScore, weeklyAvgEarnings, zoneName, zoneRisk,
  } = result;

  // Apply global risk surcharge if mode is ON
  const finalPremium   = globalRiskOn ? Math.round(rawPremium * 1.5) : rawPremium;
  const riskColor      = locationRiskScore > 65 ? DS.red : locationRiskScore > 38 ? DS.accent2 : DS.green;
  const earningsColor  = earningsFactor > 1.1 ? DS.red : earningsFactor < 0.9 ? DS.green : DS.accent2;

  return (
    <Card style={{ border: `1.5px solid ${DS.blue}35` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <SectionLabel>📊 Weekly Dynamic Pricing</SectionLabel>
          <div style={{ fontSize: "0.67rem", color: DS.muted, marginTop: -4, lineHeight: 1.5 }}>
            Recalculated weekly · {zoneName}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "0.6rem", color: DS.muted, marginBottom: 2 }}>This week</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: globalRiskOn ? DS.red : DS.accent, fontFamily: DS.display, lineHeight: 1 }}>
            ₹{finalPremium}
          </div>
          {globalRiskOn && (
            <div style={{ fontSize: "0.58rem", color: DS.red, marginTop: 2 }}>+50% risk mode</div>
          )}
        </div>
      </div>

      {/* Formula chip */}
      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: "9px 12px", marginBottom: 12, border: `1px solid ${DS.border}` }}>
        <div style={{ fontSize: "0.58rem", color: DS.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Pricing Formula
        </div>
        <div style={{ fontSize: "0.77rem", color: "#fff", fontWeight: 700, fontFamily: DS.display, wordBreak: "break-word" }}>
          ₹{baseRate} × {earningsFactor} × {riskMultiplier}
          {globalRiskOn ? ` × 1.5` : ""}
          {" = "}
          <span style={{ color: globalRiskOn ? DS.red : DS.accent }}>₹{finalPremium}/wk</span>
        </div>
        <div style={{ fontSize: "0.58rem", color: DS.muted, marginTop: 2 }}>
          base_rate × earnings_factor × risk_multiplier{globalRiskOn ? " × risk_surcharge" : ""}
        </div>
      </div>

      {/* Breakdown rows */}
      {[
        {
          label: "Base Rate",
          value: `₹${baseRate}`,
          sub: `${zoneRisk}-risk zone base`,
          color: "#fff",
          barVal: null,
        },
        {
          label: "Earnings Factor",
          value: `×${earningsFactor}`,
          sub: `₹${(weeklyAvgEarnings || 0).toLocaleString("en-IN")}/wk avg earnings`,
          color: earningsColor,
          barVal: Math.round(((earningsFactor - 0.7) / 0.7) * 100),
          barColor: earningsColor,
        },
        {
          label: "Risk Multiplier",
          value: `×${riskMultiplier}`,
          sub: `Location risk score: ${locationRiskScore}/100`,
          color: riskColor,
          barVal: locationRiskScore,
          barColor: riskColor,
        },
        globalRiskOn && {
          label: "Risk Mode Surcharge",
          value: "×1.5",
          sub: "Admin-activated heightened risk mode",
          color: DS.red,
          barVal: null,
        },
        {
          label: "Weekly Premium",
          value: `₹${finalPremium}`,
          sub: "Auto-charged every Sunday",
          color: globalRiskOn ? DS.red : DS.accent,
          barVal: null,
          bold: true,
        },
      ].filter(Boolean).map((row, i, arr) => (
        <div key={row.label} style={{
          padding: "9px 0",
          borderBottom: i < arr.length - 1 ? `1px solid ${DS.border}` : "none",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: row.barVal != null ? 5 : 0 }}>
            <div>
              <div style={{ fontSize: "0.78rem", color: "#fff", fontWeight: row.bold ? 800 : 600 }}>{row.label}</div>
              <div style={{ fontSize: "0.63rem", color: DS.muted }}>{row.sub}</div>
            </div>
            <div style={{ fontWeight: row.bold ? 900 : 800, fontSize: row.bold ? "1rem" : "0.9rem", color: row.color, fontFamily: DS.display, flexShrink: 0, marginLeft: 8 }}>
              {row.value}
            </div>
          </div>
          {row.barVal != null && <Bar val={row.barVal} color={row.barColor} />}
        </div>
      ))}
    </Card>
  );
}
