// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Screen: Policy Management
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { DS, RISK_META } from "../constants.js";
import { Card, GlowBtn, SectionLabel, Badge, Logo } from "../components/ui.jsx";
import { EXCLUSIONS, COVERED_EVENTS, POLICY_TERMS, POLICY_VERSION } from "../lib/exclusions.js";
import { computeBreakEvenPremium, computeExpectedMonthlyPayout } from "../lib/actuarial.js";

function StatusPill({ active }) {
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 700, padding: "4px 10px", borderRadius: 99,
      background: active ? `${DS.green}20` : `${DS.red}20`,
      color: active ? DS.green : DS.red,
      border: `1px solid ${active ? DS.green : DS.red}40`,
    }}>
      {active ? "● Active" : "● Paused"}
    </span>
  );
}

export default function PolicyManagement({ user, policy, onBack }) {
  const [paused,      setPaused]      = useState(false);
  const [showExcl,    setShowExcl]    = useState(false);
  const [showTerms,   setShowTerms]   = useState(false);
  const [confirmPause,setConfirmPause]= useState(false);
  const [tab,         setTab]         = useState("overview");

  const rm          = RISK_META[user.zone.risk];
  const breakEven   = computeBreakEvenPremium(user.zone.id, user.daily);
  const expPayout   = computeExpectedMonthlyPayout(user.zone.id, user.daily);
  const activeSince = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const expiresOn   = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)
    .toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "28px 20px 14px", flexShrink: 0 }}>
        <div style={{ marginBottom: 18 }}><Logo /></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", fontFamily: DS.display }}>
              Policy Management
            </h2>
            <p style={{ fontSize: "0.75rem", color: DS.muted, marginTop: 2 }}>
              {POLICY_VERSION}
            </p>
          </div>
          <StatusPill active={!paused} />
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, padding: "0 20px", marginBottom: 12 }}>
        {[["overview", "Overview"], ["coverage", "Coverage"], ["exclusions", "Exclusions"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              flex: 1, padding: "9px 4px", fontSize: "0.78rem", fontWeight: 700,
              fontFamily: DS.font, cursor: "pointer", border: "none",
              borderBottom: `2px solid ${tab === k ? DS.accent : "transparent"}`,
              background: "transparent",
              color: tab === k ? DS.accent : DS.muted,
              transition: "all 0.2s",
            }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: "0 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <>
            {/* Policy card */}
            <Card style={{ background: `linear-gradient(135deg, ${DS.accent}14, ${DS.surface})` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <SectionLabel>Policy ID</SectionLabel>
                  <div style={{ color: "#fff", fontWeight: 800, fontSize: "0.9rem", fontFamily: DS.display }}>
                    {policy.policyId || "POL_" + Date.now().toString().slice(-8)}
                  </div>
                </div>
                <Badge label={user.zone.name} color={rm.text} bg={rm.bg} border={rm.border} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["Active Since",  activeSince],
                  ["Expires On",    expiresOn],
                  ["Weekly Premium",`₹${policy.premium}`],
                  ["Max Payout",    `₹${policy.maxPayout.toLocaleString("en-IN")}`],
                ].map(([l, v]) => (
                  <div key={l} style={{ borderRadius: 10, padding: 11, background: "rgba(0,0,0,0.2)" }}>
                    <div style={{ fontSize: "0.65rem", color: DS.muted, marginBottom: 3 }}>{l}</div>
                    <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.88rem", fontFamily: DS.display }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Actuarial insight */}
            <Card>
              <SectionLabel>📊 Actuarial Insight</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["Break-even Premium",    `₹${breakEven}/wk`,  DS.accent2],
                  ["Your Premium",          `₹${policy.premium}/wk`, DS.green],
                  ["Exp. Monthly Payout",   `₹${expPayout.toLocaleString("en-IN")}`, DS.blue],
                  ["Coverage Ratio",        "65%", "#A78BFA"],
                ].map(([l, v, c]) => (
                  <div key={l} style={{ borderRadius: 10, padding: 11, background: DS.surface }}>
                    <div style={{ fontSize: "0.65rem", color: DS.muted, marginBottom: 3 }}>{l}</div>
                    <div style={{ fontWeight: 800, color: c, fontSize: "0.88rem", fontFamily: DS.display }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Pause / Resume */}
            <Card>
              <SectionLabel>Policy Controls</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <GlowBtn
                  onClick={() => setConfirmPause(true)}
                  color={paused ? DS.green : DS.accent2}
                >
                  {paused ? "▶ Resume Coverage" : "⏸ Pause Coverage"}
                </GlowBtn>
                <p style={{ fontSize: "0.7rem", color: DS.muted, textAlign: "center" }}>
                  {paused
                    ? "Coverage is paused. No claims will be processed. Resume anytime."
                    : "Pausing stops new claims. Existing pending claims are unaffected."}
                </p>
              </div>
            </Card>

            {/* Renewal history */}
            <Card>
              <SectionLabel>Renewal History</SectionLabel>
              {[
                { period: "This week",       premium: policy.premium, status: "Active" },
                { period: "Last week",       premium: policy.premium - 2, status: "Expired" },
                { period: "2 weeks ago",     premium: policy.premium - 2, status: "Expired" },
              ].map((r, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: i < 2 ? `1px solid ${DS.border}` : "none",
                }}>
                  <div>
                    <div style={{ color: "#fff", fontSize: "0.83rem", fontWeight: 600 }}>{r.period}</div>
                    <div style={{ color: DS.muted, fontSize: "0.7rem" }}>₹{r.premium} premium</div>
                  </div>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                    background: r.status === "Active" ? `${DS.green}20` : "rgba(255,255,255,0.06)",
                    color: r.status === "Active" ? DS.green : DS.muted,
                  }}>{r.status}</span>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* ── COVERAGE TAB ── */}
        {tab === "coverage" && (
          <>
            <Card>
              <SectionLabel>✅ What's Covered</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {COVERED_EVENTS.map((e, i) => (
                  <div key={i} style={{
                    padding: "12px 0",
                    borderBottom: i < COVERED_EVENTS.length - 1 ? `1px solid ${DS.border}` : "none",
                  }}>
                    <div style={{ color: DS.green, fontWeight: 700, fontSize: "0.82rem", marginBottom: 3 }}>
                      {e.trigger}
                    </div>
                    <div style={{ color: DS.muted, fontSize: "0.75rem", lineHeight: 1.5 }}>
                      {e.description}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <SectionLabel>📋 Key Policy Terms</SectionLabel>
              {Object.entries(POLICY_TERMS).map(([k, v]) => (
                <div key={k} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "9px 0", borderBottom: `1px solid ${DS.border}`,
                }}>
                  <span style={{ fontSize: "0.75rem", color: DS.muted, flex: 1, textTransform: "capitalize" }}>
                    {k.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 600, flex: 1, textAlign: "right" }}>
                    {v}
                  </span>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* ── EXCLUSIONS TAB ── */}
        {tab === "exclusions" && (
          <>
            <div style={{ padding: "10px 14px", borderRadius: 12, background: `${DS.red}12`, border: `1px solid ${DS.red}35`, marginBottom: 4 }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: DS.red, marginBottom: 3 }}>
                ⚠️ Important: What is NOT covered
              </div>
              <div style={{ fontSize: "0.72rem", color: DS.muted, lineHeight: 1.5 }}>
                The following events are explicitly excluded from this policy as per IRDAI guidelines for income protection products.
              </div>
            </div>

            {EXCLUSIONS.map(ex => (
              <Card key={ex.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
                  <div>
                    <div style={{ fontSize: "0.6rem", color: DS.muted, marginBottom: 2 }}>{ex.id} · {ex.category}</div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>{ex.title}</div>
                  </div>
                  <span style={{
                    fontSize: "0.6rem", fontWeight: 700, padding: "2px 6px", borderRadius: 5, flexShrink: 0, marginLeft: 8,
                    background: ex.severity === "absolute" ? `${DS.red}20` : `${DS.accent2}20`,
                    color: ex.severity === "absolute" ? DS.red : DS.accent2,
                  }}>
                    {ex.severity === "absolute" ? "Absolute" : "Conditional"}
                  </span>
                </div>
                <div style={{ fontSize: "0.75rem", color: DS.muted, lineHeight: 1.6 }}>{ex.detail}</div>
              </Card>
            ))}
          </>
        )}

        <div style={{ height: 8 }} />
      </div>

      {/* Back button */}
      <div style={{ padding: "0 20px 20px", flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "none", color: DS.muted, cursor: "pointer", padding: 12, fontSize: "0.83rem", width: "100%" }}>
          ← Back to Dashboard
        </button>
      </div>

      {/* Pause confirm modal */}
      {confirmPause && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, background: DS.card, border: `1px solid ${DS.border}` }}>
            <div style={{ fontSize: "1.4rem", textAlign: "center", marginBottom: 10 }}>{paused ? "▶️" : "⏸️"}</div>
            <div style={{ fontWeight: 900, color: "#fff", fontSize: "1.05rem", textAlign: "center", marginBottom: 7, fontFamily: DS.display }}>
              {paused ? "Resume your coverage?" : "Pause your coverage?"}
            </div>
            <div style={{ fontSize: "0.78rem", color: DS.muted, textAlign: "center", marginBottom: 20, lineHeight: 1.5 }}>
              {paused
                ? "Your coverage will resume immediately. Disruption monitoring restarts."
                : "No new claims will be processed while paused. Existing claims continue normally."}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <GlowBtn color={paused ? DS.green : DS.accent2} onClick={() => { setPaused(p => !p); setConfirmPause(false); }}>
                {paused ? "Yes, Resume" : "Yes, Pause"}
              </GlowBtn>
              <button onClick={() => setConfirmPause(false)}
                style={{ width: "100%", padding: "12px", borderRadius: 13, cursor: "pointer", background: "transparent", color: DS.muted, fontWeight: 600, fontSize: "0.88rem", fontFamily: DS.font, border: `1px solid ${DS.border}` }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
