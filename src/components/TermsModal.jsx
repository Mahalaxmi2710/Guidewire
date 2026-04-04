// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Terms & Conditions Modal
//  Shown during sign-up. User must accept to proceed.
//  Covers: war/conflict, pandemic, dynamic pricing,
//          risk-based disclosure, platform liability limits.
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { DS } from "../constants.js";
import { EXCLUSIONS, POLICY_TERMS, POLICY_VERSION } from "../lib/exclusions.js";

const FORCE_MAJEURE = EXCLUSIONS.filter(e => e.category === "Force Majeure" || e.category === "Public Health" || e.category === "Natural Catastrophe");

const DYNAMIC_PRICING_TERMS = [
  {
    id: "DP-01",
    title: "Dynamic Pricing Policy",
    detail: "Weekly premiums are recalculated every Sunday based on your average earnings from the prior week and a composite location risk score derived from live AQI, weather, and traffic data. Premiums may increase or decrease week-over-week.",
  },
  {
    id: "DP-02",
    title: "Risk-Based Premium Disclosure",
    detail: "Your base premium is determined by an ML model (GBDT v1.2) trained on historical disruption data. High-risk zones (Velachery, Perambur) attract higher premiums than low-risk zones (Anna Nagar, Tambaram). The full pricing breakdown is displayed on your dashboard.",
  },
  {
    id: "DP-03",
    title: "Platform Liability Limits",
    detail: "RideSure's maximum liability per claim is capped at 65% of your declared weekly income. The platform is not liable for losses arising from excluded events (war, pandemic, vehicle breakdown). Total annual liability is capped at ₹5,00,000 per policyholder.",
  },
  {
    id: "DP-04",
    title: "Heightened Risk Mode",
    detail: "In the event of a declared national emergency or systemic risk event, RideSure may activate Heightened Risk Mode, applying a premium surcharge of up to 50%, reducing coverage to 50% of declared income, and limiting claims to 2 per week. Users will be notified in-app.",
  },
];

function Section({ title, items }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em",
        color: DS.accent2, fontWeight: 700, marginBottom: 10,
      }}>
        {title}
      </div>
      {items.map((item, i) => (
        <div key={item.id || i} style={{
          background: "rgba(255,255,255,0.03)", borderRadius: 10,
          border: `1px solid ${DS.border}`, padding: "10px 13px", marginBottom: 8,
        }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            {item.id && <span style={{ color: DS.muted, marginRight: 6, fontSize: "0.65rem" }}>{item.id}</span>}
            {item.title}
          </div>
          <div style={{ fontSize: "0.71rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
            {item.detail}
          </div>
          {item.severity === "absolute" && (
            <div style={{ marginTop: 6, fontSize: "0.6rem", padding: "2px 7px", borderRadius: 4, display: "inline-block",
              background: `${DS.red}18`, color: DS.red, fontWeight: 700, border: `1px solid ${DS.red}30` }}>
              ABSOLUTE EXCLUSION — Non-waivable
            </div>
          )}
          {item.severity === "conditional" && (
            <div style={{ marginTop: 6, fontSize: "0.6rem", padding: "2px 7px", borderRadius: 4, display: "inline-block",
              background: `${DS.accent2}18`, color: DS.accent2, fontWeight: 700, border: `1px solid ${DS.accent2}30` }}>
              CONDITIONAL — Partial coverage may apply
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function TermsModal({ onAccept, onDecline }) {
  const [checked,  setChecked]  = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 40) setScrolled(true);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "stretch", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: 430,
        background: DS.card, display: "flex", flexDirection: "column",
        borderLeft: `1px solid ${DS.border}`, borderRight: `1px solid ${DS.border}`,
      }}>

        {/* Header */}
        <div style={{
          padding: "20px 20px 14px", borderBottom: `1px solid ${DS.border}`,
          background: "linear-gradient(135deg,#1a1228,#13161F)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: "1.4rem" }}>📜</div>
            <div>
              <div style={{ fontWeight: 900, color: "#fff", fontSize: "1rem" }}>Terms & Conditions</div>
              <div style={{ fontSize: "0.62rem", color: DS.muted }}>Policy {POLICY_VERSION} · IRDAI Compliant</div>
            </div>
          </div>
          <div style={{
            fontSize: "0.7rem", color: DS.accent2, background: `${DS.accent2}12`,
            borderRadius: 8, padding: "7px 10px", border: `1px solid ${DS.accent2}25`,
          }}>
            ⚠️ Please read all sections before accepting. Scroll to the bottom to enable the accept button.
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}
        >
          <Section title="War, Conflict & Terrorism Exclusions" items={FORCE_MAJEURE} />
          <Section title="Dynamic Pricing & Premium Policy" items={DYNAMIC_PRICING_TERMS} />

          {/* Policy Terms Summary */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: DS.accent2, fontWeight: 700, marginBottom: 10 }}>
              Policy Terms Summary
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, border: `1px solid ${DS.border}`, padding: "10px 13px" }}>
              {Object.entries(POLICY_TERMS).map(([key, value]) => (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${DS.border}` }}>
                  <span style={{ fontSize: "0.71rem", color: DS.muted }}>
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                  </span>
                  <span style={{ fontSize: "0.71rem", color: "#fff", fontWeight: 600, maxWidth: "55%", textAlign: "right" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 10 }} />
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px 24px", borderTop: `1px solid ${DS.border}`, background: DS.card, flexShrink: 0 }}>
          {!scrolled && (
            <div style={{ fontSize: "0.67rem", color: DS.muted, textAlign: "center", marginBottom: 10 }}>
              ↓ Scroll through all terms to enable acceptance
            </div>
          )}
          {scrolled && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 14 }}>
              <input
                type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)}
                style={{ marginTop: 2, accentColor: DS.accent, flexShrink: 0 }}
              />
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
                I have read and understood all Terms & Conditions, exclusions, and the dynamic pricing policy. I consent to risk-based premium adjustments.
              </span>
            </label>
          )}
          <button
            onClick={onAccept}
            disabled={!scrolled || !checked}
            style={{
              width: "100%", padding: "14px", borderRadius: 14, fontWeight: 800,
              fontSize: "0.9rem", border: "none", marginBottom: 9, cursor: (!scrolled || !checked) ? "not-allowed" : "pointer",
              background: (!scrolled || !checked) ? "rgba(255,255,255,0.08)" : `linear-gradient(135deg,${DS.accent},${DS.accent2})`,
              color: (!scrolled || !checked) ? DS.muted : "#fff",
              boxShadow: (!scrolled || !checked) ? "none" : `0 4px 20px ${DS.accent}40`,
              transition: "all 0.2s",
            }}
          >
            ✓ Accept & Continue
          </button>
          <button
            onClick={onDecline}
            style={{
              width: "100%", padding: "11px", borderRadius: 12, border: `1px solid ${DS.border}`,
              background: "transparent", color: DS.muted, cursor: "pointer", fontSize: "0.83rem", fontWeight: 600,
            }}
          >
            Decline — Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
