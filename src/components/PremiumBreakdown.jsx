// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Premium Explainability Panel
//  Shows exactly how the ML model computed the premium.
//  Directly addresses judge feedback on ML explainability.
// ─────────────────────────────────────────────────────────────
import { DS } from "../constants.js";
import { Card, Bar, SectionLabel } from "../components/ui.jsx";

export default function PremiumBreakdown({ result, zone }) {
  if (!result) return null;
  const { premium, breakdown, importances, confidence, modelVersion } = result;

  return (
    <Card style={{ border: `1.5px solid ${DS.accent}35` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <SectionLabel>🧠 ML Premium Breakdown</SectionLabel>
          <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", fontFamily: DS.display, lineHeight: 1 }}>
            ₹{premium}
            <span style={{ fontSize: "0.85rem", color: DS.muted, fontWeight: 400 }}>/week</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.6rem", color: DS.muted, marginBottom: 3 }}>Model confidence</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 900, color: DS.green, fontFamily: DS.display }}>
            {confidence}%
          </div>
          <div style={{ fontSize: "0.58rem", color: DS.muted }}>{modelVersion}</div>
        </div>
      </div>

      {/* Breakdown rows */}
      <SectionLabel>How it was calculated</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {breakdown.map((b, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "9px 0", borderBottom: i < breakdown.length - 1 ? `1px solid ${DS.border}` : "none",
          }}>
            <div>
              <div style={{ fontSize: "0.78rem", color: "#fff", fontWeight: 600 }}>{b.label}</div>
              <div style={{ fontSize: "0.67rem", color: DS.muted }}>{b.reason}</div>
            </div>
            <div style={{ fontWeight: 800, fontSize: "0.88rem", fontFamily: DS.display, flexShrink: 0, marginLeft: 8,
              color: b.value !== null ? DS.accent : b.delta > 0 ? DS.red : b.delta < 0 ? DS.green : DS.muted,
            }}>
              {b.value !== null ? `₹${b.value}` : b.delta > 0 ? `+₹${b.delta}` : b.delta < 0 ? `-₹${Math.abs(b.delta)}` : "—"}
            </div>
          </div>
        ))}
        {/* Final */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0 0", marginTop: 4 }}>
          <div style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 800 }}>Final Premium</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 900, color: DS.accent, fontFamily: DS.display }}>₹{premium}/wk</div>
        </div>
      </div>

      {/* Feature importances */}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${DS.border}` }}>
        <SectionLabel>Feature Importances (GBDT Model)</SectionLabel>
        {Object.entries(importances).map(([feature, score]) => (
          <div key={feature} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "0.72rem", color: DS.muted }}>{feature}</span>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: DS.accent2 }}>{score}%</span>
            </div>
            <Bar val={score} color={DS.accent2} />
          </div>
        ))}
      </div>
    </Card>
  );
}
