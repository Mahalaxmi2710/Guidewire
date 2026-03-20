// ─────────────────────────────────────────────────────────────
//  RideSure — Screen: Landing
// ─────────────────────────────────────────────────────────────
import { DS } from "../constants.js";
import { Logo, GlowBtn } from "../components/ui.jsx";

const DISRUPTION_CHIPS = [
  ["🌧️", "Heavy Rain"],
  ["🌡️", "Extreme Heat"],
  ["💨", "High AQI"],
  ["🚦", "Traffic Lock"],
  ["📵", "App Downtime"],
  ["🚫", "Zone Curfew"],
];

const STAT_PILLS = [
  ["₹20",     "per week"],
  ["0 clicks","to claim"],
  ["< 2 min", "payout"],
];

export default function Landing({ onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

      {/* ── Ambient background — radial glows only, no grid ── */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* top-right warm glow */}
        <div style={{
          position: "absolute", top: -80, right: -80,
          width: 380, height: 380, borderRadius: "50%", opacity: 0.13,
          background: `radial-gradient(circle, ${DS.accent}, transparent 70%)`,
        }} />
        {/* bottom-left cool glow */}
        <div style={{
          position: "absolute", bottom: -120, left: -80,
          width: 420, height: 420, borderRadius: "50%", opacity: 0.08,
          background: `radial-gradient(circle, ${DS.blue}, transparent 70%)`,
        }} />
        {/* subtle mid-screen glow */}
        <div style={{
          position: "absolute", top: "40%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 300, height: 200, opacity: 0.05,
          background: `radial-gradient(ellipse, ${DS.accent2}, transparent 70%)`,
        }} />
        {/* bottom accent line */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 1, opacity: 0.25,
          background: `linear-gradient(90deg, transparent, ${DS.accent}, transparent)`,
        }} />
      </div>

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, padding: "48px 24px 32px" }}>

        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          <Logo size="lg" />
        </div>

        {/* Body */}
        <div style={{ flex: 1 }}>
          {/* tech badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              fontSize: "0.68rem", padding: "5px 12px", borderRadius: 99,
              fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              background: `${DS.accent}20`, color: DS.accent, border: `1px solid ${DS.accent}40`,
            }}>
              Powered by AI · Firebase · Razorpay
            </span>
          </div>

          {/* Hero headline */}
          <h1 style={{
            fontSize: "3rem", fontWeight: 900, lineHeight: 1.05,
            color: "#fff", marginBottom: 20, fontFamily: DS.display,
          }}>
            Earn More.<br />
            <span style={{ color: DS.accent }}>Fear Less.</span>
          </h1>

          <p style={{ fontSize: "0.95rem", lineHeight: 1.7, color: DS.muted, marginBottom: 32 }}>
            India's first AI-powered parametric income protection for Swiggy &amp; Zomato delivery partners.
            Zero paperwork. Auto-payouts in under 2 minutes.
          </p>

          {/* Stat pills */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
            {STAT_PILLS.map(([v, l]) => (
              <div key={l} style={{
                borderRadius: 16, padding: 16, textAlign: "center",
                background: DS.surface, border: `1px solid ${DS.border}`,
              }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", fontFamily: DS.display, marginBottom: 2 }}>{v}</div>
                <div style={{ fontSize: "0.68rem", color: DS.muted }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Disruption chips */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: DS.muted, marginBottom: 10 }}>
              Covers income loss from
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {DISRUPTION_CHIPS.map(([e, l]) => (
                <span key={l} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", borderRadius: 10,
                  fontSize: "0.78rem", fontWeight: 500,
                  background: DS.surface, color: "rgba(255,255,255,0.55)",
                  border: `1px solid ${DS.border}`,
                }}>
                  {e} {l}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div>
          <GlowBtn onClick={onStart}>Get Protected — Start Free →</GlowBtn>
          <p style={{ textAlign: "center", fontSize: "0.72rem", marginTop: 12, color: DS.muted }}>
            No health / life / vehicle coverage · Income loss only · Weekly billing
          </p>
        </div>
      </div>
    </div>
  );
}
