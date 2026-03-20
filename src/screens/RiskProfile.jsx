// ─────────────────────────────────────────────────────────────
//  RideSure — Screen: Risk Profile + Premium
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { DS, RISK_META, P } from "../constants.js";
import { Logo, Bar, Card, GlowBtn, SectionLabel, Badge } from "../components/ui.jsx";
import { computePremium, computeMaxPayout, computeLoss, RazorpayMock, FirebaseMock } from "../lib/backend.js";

/* Parametric trigger table entries */
function triggerRows(daily) {
  return [
    { label: "Rainfall > 50 mm",     payout: computeLoss(daily, 4,   0.9), icon: "🌧️", color: DS.blue },
    { label: "Temperature > 40°C",   payout: computeLoss(daily, 2.5, 0.7), icon: "🌡️", color: DS.red },
    { label: "AQI > 300",            payout: computeLoss(daily, 3,   0.75),icon: "💨", color: DS.accent2 },
    { label: "Traffic congestion",   payout: computeLoss(daily, 2,   0.6), icon: "🚦", color: DS.accent },
    { label: "Platform downtime",    payout: computeLoss(daily, 3.5, 0.8), icon: "📵", color: "#A78BFA" },
  ];
}

export default function RiskProfile({ user, onActivate, onBack }) {
  const zone      = user.zone;
  const premium   = computePremium(zone, user.daily);
  const maxPayout = computeMaxPayout(user.daily);
  const rm        = RISK_META[zone.risk];
  const triggers  = triggerRows(user.daily);

  const [state, setState] = useState("idle"); // idle | paying | done

  const handleActivate = async () => {
    setState("paying");
    // Razorpay mock flow
    const order   = await RazorpayMock.createOrder(premium * 100);
    const payment = await RazorpayMock.capturePayment(order.id);

    // Persist policy to Firebase mock
    const policyId = `POL_${Date.now()}`;
    await FirebaseMock.savePolicy(policyId, {
      userId:    user.phone,
      zone:      zone.id,
      premium,
      maxPayout,
      orderId:   order.id,
      paymentId: payment.id,
      startDate: new Date().toISOString(),
    });

    setState("done");
    setTimeout(() => onActivate({ premium, maxPayout, policyId }), 1200);
  };

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "32px 20px 16px", flexShrink: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <Logo />
        </div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", fontFamily: DS.display, marginBottom: 4 }}>
          Your Risk Profile
        </h2>
        <p style={{ fontSize: "0.82rem", color: DS.muted }}>ML-computed · Zone-specific · Real-time adjusted</p>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, padding: "0 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Zone risk card */}
        <div style={{ borderRadius: 16, padding: 20, background: rm.bg, border: `1.5px solid ${rm.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: rm.text, marginBottom: 4 }}>
                Zone Risk Level
              </div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: "1.4rem", fontFamily: DS.display }}>{zone.name}</div>
              <div style={{ fontSize: "0.7rem", color: DS.muted, marginTop: 2 }}>Chennai, Tamil Nadu</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900, fontSize: "2.5rem", color: rm.text, fontFamily: DS.display, lineHeight: 1 }}>
                {zone.score}
              </div>
              <div style={{ fontSize: "0.68rem", color: DS.muted }}>/100 risk</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              ["Flood",      zone.flood, zone.flood > 60 ? DS.red : DS.accent2],
              ["Rain Impact",zone.rain,  zone.rain  > 60 ? DS.red : DS.accent2],
              ["AQI History",zone.aqi,   zone.aqi   > 60 ? DS.red : DS.green ],
            ].map(([l, v, c]) => (
              <div key={l}>
                <div style={{ fontSize: "0.65rem", color: DS.muted, marginBottom: 5 }}>{l}</div>
                <Bar val={v} color={c} />
                <div style={{ fontSize: "0.7rem", fontWeight: 700, marginTop: 4, color: c }}>{v}/100</div>
              </div>
            ))}
          </div>
        </div>

        {/* Premium card */}
        <Card style={{ background: `linear-gradient(135deg, ${DS.accent}18, ${DS.accent2}0a)`, border: `1.5px solid ${DS.accent}35` }}>
          <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", color: DS.accent, marginBottom: 8 }}>
            AI-Calculated Weekly Premium
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: "3rem", fontWeight: 900, color: "#fff", fontFamily: DS.display }}>₹{premium}</span>
            <span style={{ fontSize: "0.85rem", color: DS.muted, marginBottom: 8 }}>/week</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              ["Per day cost",  `₹${(premium / 7).toFixed(1)}`],
              ["Monthly total", `₹${(premium * 4)}`],
            ].map(([l, v]) => (
              <div key={l} style={{ borderRadius: 10, padding: 12, background: "rgba(0,0,0,0.2)" }}>
                <div style={{ fontSize: "0.68rem", color: DS.muted, marginBottom: 2 }}>{l}</div>
                <div style={{ fontWeight: 900, color: "#fff", fontFamily: DS.display }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "0.72rem", color: DS.muted }}>
            Factors: Zone ({zone.score}) · ₹{user.daily}/day · {zone.hist} disruptions/month
          </div>
        </Card>

        {/* Coverage + triggers */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <SectionLabel>Max Weekly Payout</SectionLabel>
              <div style={{ fontWeight: 900, fontSize: "1.8rem", color: DS.green, fontFamily: DS.display }}>
                ₹{maxPayout.toLocaleString("en-IN")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <SectionLabel>Coverage</SectionLabel>
              <div style={{ fontWeight: 900, fontSize: "1.8rem", color: "#fff", fontFamily: DS.display }}>65%</div>
            </div>
          </div>

          <SectionLabel>Parametric Triggers &amp; Payouts</SectionLabel>
          {triggers.map(t => (
            <div key={t.label} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "11px 0", borderBottom: `1px solid ${DS.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1rem" }}>{t.icon}</span>
                <span style={{ fontSize: "0.78rem", color: DS.muted }}>{t.label}</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: "0.88rem", color: DS.green }}>
                ₹{t.payout.toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </Card>

        {/* Payment section */}
        {state === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <GlowBtn onClick={handleActivate} color={DS.green}>
              🛡️ Activate Coverage — ₹{premium}/week
            </GlowBtn>
            <div style={{ textAlign: "center", fontSize: "0.72rem", color: DS.muted }}>
              Secured by <strong style={{ color: "#fff" }}>Razorpay</strong> · Test Mode
            </div>
          </div>
        )}

        {state === "paying" && (
          <Card style={{ textAlign: "center", border: `1.5px solid ${DS.accent}40` }}>
            <div className="rs-pulse" style={{ color: "#fff", fontWeight: 700, marginBottom: 6 }}>
              Processing payment via Razorpay…
            </div>
            <div style={{ fontSize: "0.72rem", color: DS.muted }}>
              Connecting to payment gateway
            </div>
          </Card>
        )}

        {state === "done" && (
          <Card style={{ textAlign: "center", background: `${DS.green}18`, border: `1.5px solid ${DS.green}40` }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>✅</div>
            <div style={{ fontWeight: 700, color: DS.green, marginBottom: 4 }}>Coverage Activated!</div>
            <div style={{ fontSize: "0.72rem", color: DS.muted }}>Loading your dashboard…</div>
          </Card>
        )}

        <div style={{ height: 8 }} />
      </div>

      {/* Back */}
      {state === "idle" && onBack && (
        <div style={{ padding: "0 20px 20px", flexShrink: 0 }}>
          <button onClick={onBack}
            style={{ background: "none", border: "none", color: DS.muted, cursor: "pointer", padding: 12, fontSize: "0.85rem", width: "100%" }}>
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
