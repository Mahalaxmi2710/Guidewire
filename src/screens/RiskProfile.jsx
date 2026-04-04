// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Screen: Risk Profile + Premium
//  Now uses real ML model (mlModel.js) and shows explainability
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { DS, RISK_META } from "../constants.js";
import { Logo, Bar, Card, GlowBtn, SectionLabel } from "../components/ui.jsx";
import { predictPremium, maxWeeklyPayout, estimateLoss } from "../lib/mlModel.js";
import { computeBreakEvenPremium } from "../lib/actuarial.js";
import { COVERED_EVENTS, POLICY_TERMS } from "../lib/exclusions.js";
import PremiumBreakdown from "../components/PremiumBreakdown.jsx";
import { DB, Razorpay } from "../lib/firebase.js";

function triggerRows(daily) {
  return [
    { label: "Rainfall > 50 mm",      payout: estimateLoss(daily, 4,   0.9),  emoji: "🌧️" },
    { label: "Temperature > 40°C",    payout: estimateLoss(daily, 2.5, 0.7),  emoji: "🌡️" },
    { label: "AQI > 300",             payout: estimateLoss(daily, 3,   0.75), emoji: "💨" },
    { label: "Traffic Congestion > 80",payout: estimateLoss(daily, 2,   0.6),  emoji: "🚦" },
    { label: "Platform Downtime",      payout: estimateLoss(daily, 3.5, 0.8),  emoji: "📵" },
    { label: "Zone Restriction",       payout: estimateLoss(daily, 2,   0.65), emoji: "🚫" },
  ];
}

export default function RiskProfile({ user, onActivate, onBack }) {
  const zone       = user.zone;
  const rm         = RISK_META[zone.risk];
  const mlResult   = predictPremium(zone, user.daily, user.peakShift);
  const { premium } = mlResult;
  const maxPayout  = maxWeeklyPayout(user.daily);
  const breakEven  = computeBreakEvenPremium(zone.id, user.daily);
  const triggers   = triggerRows(user.daily);
  const [payState, setPayState]   = useState("idle");
  const [showExcl, setShowExcl]   = useState(false);

  const handleActivate = async () => {
    setPayState("paying");
    const order  = await Razorpay.createOrder(premium * 100);
    const pay    = await Razorpay.capturePayment(order.id);
    const polId  = `POL_${Date.now()}`;

    await DB.savePolicy(polId, {
      userId:    user.phone,
      zone:      zone.id,
      premium,
      maxPayout,
      orderId:   order.id,
      paymentId: pay.id,
      mlVersion: mlResult.modelVersion,
      startDate: new Date().toISOString(),
    });

    setPayState("done");
    setTimeout(() => onActivate({ premium, maxPayout, policyId: polId }), 1100);
  };

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "28px 20px 14px", flexShrink: 0 }}>
        <div style={{ marginBottom: 18 }}><Logo /></div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", fontFamily: DS.display, marginBottom: 3 }}>
          Your Risk Profile
        </h2>
        <p style={{ fontSize: "0.78rem", color: DS.muted }}>
          ML-computed · GBDT Model · {mlResult.confidence}% confidence
        </p>
      </div>

      <div style={{ flex: 1, padding: "0 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 13 }}>

        {/* Zone risk card */}
        <div style={{ borderRadius: 16, padding: 18, background: rm.bg, border: `1.5px solid ${rm.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.12em", color: rm.text, marginBottom: 4 }}>Zone Risk Level</div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: "1.3rem", fontFamily: DS.display }}>{zone.name}</div>
              <div style={{ fontSize: "0.67rem", color: DS.muted }}>Chennai, Tamil Nadu</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900, fontSize: "2.3rem", color: rm.text, fontFamily: DS.display, lineHeight: 1 }}>{zone.score}</div>
              <div style={{ fontSize: "0.65rem", color: DS.muted }}>/100 risk</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
            {[
              ["Flood", zone.flood, zone.flood > 60 ? DS.red : DS.accent2],
              ["Rain",  zone.rain,  zone.rain  > 60 ? DS.red : DS.accent2],
              ["AQI",   zone.aqi,   zone.aqi   > 60 ? DS.red : DS.green ],
            ].map(([l, v, c]) => (
              <div key={l}>
                <div style={{ fontSize: "0.62rem", color: DS.muted, marginBottom: 5 }}>{l}</div>
                <Bar val={v} color={c} />
                <div style={{ fontSize: "0.67rem", fontWeight: 700, marginTop: 3, color: c }}>{v}/100</div>
              </div>
            ))}
          </div>
        </div>

        {/* ML Premium Breakdown — new in Phase 2 */}
        <PremiumBreakdown result={mlResult} zone={zone} />

        {/* Actuarial context */}
        <Card>
          <SectionLabel>📊 Actuarial Context</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {[
              ["Your Premium",       `₹${premium}/wk`,     DS.accent],
              ["Break-even Rate",    `₹${breakEven}/wk`,   DS.accent2],
              ["Max Weekly Payout",  `₹${maxPayout.toLocaleString("en-IN")}`, DS.green],
              ["Coverage Ratio",     "65%",                 DS.blue],
            ].map(([l, v, c]) => (
              <div key={l} style={{ borderRadius: 10, padding: 11, background: DS.surface }}>
                <div style={{ fontSize: "0.62rem", color: DS.muted, marginBottom: 3 }}>{l}</div>
                <div style={{ fontWeight: 900, fontSize: "0.92rem", color: c, fontFamily: DS.display }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 9, background: premium <= breakEven ? `${DS.green}10` : `${DS.accent}10`, border: `1px solid ${premium <= breakEven ? DS.green : DS.accent}30` }}>
            <div style={{ fontSize: "0.72rem", color: premium <= breakEven ? DS.green : DS.accent, fontWeight: 600 }}>
              {premium <= breakEven
                ? `✓ Your premium (₹${premium}) is at or below break-even — fairly priced for your zone.`
                : `ℹ Your premium (₹${premium}) is ₹${premium - breakEven} above break-even — includes loading for admin costs.`}
            </div>
          </div>
        </Card>

        {/* Coverage triggers */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SectionLabel>Parametric Triggers &amp; Payouts</SectionLabel>
            <span style={{ fontSize: "0.65rem", color: DS.green, fontWeight: 700 }}>6 triggers</span>
          </div>
          {triggers.map((t, i) => (
            <div key={t.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < triggers.length - 1 ? `1px solid ${DS.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: "0.9rem" }}>{t.emoji}</span>
                <span style={{ fontSize: "0.76rem", color: DS.muted }}>{t.label}</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: DS.green }}>₹{t.payout.toLocaleString("en-IN")}</span>
            </div>
          ))}
        </Card>

        {/* Exclusions reminder */}
        <button onClick={() => setShowExcl(s => !s)}
          style={{ width: "100%", textAlign: "left", background: "none", border: `1px solid ${DS.border}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", color: DS.muted, fontWeight: 600 }}>⚠️ What's NOT covered (exclusions)</span>
            <span style={{ color: DS.muted, fontSize: "0.75rem" }}>{showExcl ? "▲" : "▼"}</span>
          </div>
          {showExcl && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
              {["War & Armed Conflict", "Terrorism & Riots", "Pandemic & Epidemic", "Vehicle Breakdown", "Personal Illness/Injury", "Voluntary Work Stoppage", "Platform Suspension/Ban"].map(e => (
                <div key={e} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ color: DS.red, fontSize: "0.75rem" }}>✕</span>
                  <span style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.5)" }}>{e}</span>
                </div>
              ))}
            </div>
          )}
        </button>

        {/* Activate */}
        {payState === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            <GlowBtn onClick={handleActivate} color={DS.green}>
              🛡️ Activate Coverage — ₹{premium}/week
            </GlowBtn>
            <div style={{ textAlign: "center", fontSize: "0.7rem", color: DS.muted }}>
              Secured by <strong style={{ color: "#fff" }}>Razorpay</strong> · Test Mode · {DB.isLive() ? "🟢 Firebase Live" : "🟡 Local Mock"}
            </div>
          </div>
        )}
        {payState === "paying" && (
          <Card style={{ textAlign: "center", border: `1.5px solid ${DS.accent}40` }}>
            <div className="rs-pulse" style={{ color: "#fff", fontWeight: 700, marginBottom: 5 }}>Processing via Razorpay…</div>
            <div style={{ fontSize: "0.7rem", color: DS.muted }}>Saving policy to Firebase</div>
          </Card>
        )}
        {payState === "done" && (
          <Card style={{ textAlign: "center", background: `${DS.green}18`, border: `1.5px solid ${DS.green}40` }}>
            <div style={{ fontSize: "1.4rem", marginBottom: 5 }}>✅</div>
            <div style={{ fontWeight: 700, color: DS.green }}>Coverage Activated!</div>
            <div style={{ fontSize: "0.7rem", color: DS.muted, marginTop: 3 }}>Loading your dashboard…</div>
          </Card>
        )}

        <div style={{ height: 6 }} />
      </div>

      {payState === "idle" && onBack && (
        <div style={{ padding: "0 20px 18px", flexShrink: 0 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: DS.muted, cursor: "pointer", padding: 11, fontSize: "0.83rem", width: "100%" }}>← Back</button>
        </div>
      )}
    </div>
  );
}
