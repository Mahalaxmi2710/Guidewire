// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Screen: Claims Management
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { DS } from "../constants.js";
import { Card, GlowBtn, SectionLabel, Logo } from "../components/ui.jsx";
import { computeWorkerROI } from "../lib/actuarial.js";
import { DB } from "../lib/firebase.js";

// ── Claim Progress Bar (zero-touch UX) ───────────────────────
function ClaimProgressBar({ claim }) {
  const steps = [
    { label: "Detected",   done: true },
    { label: "Validating", done: !["pending", "created"].includes(claim.status) },
    { label: "Fraud Check",done: ["paid", "auto-approved", "payout-pending"].includes(claim.status) },
    { label: "Credited",   done: ["paid", "auto-approved"].includes(claim.status) },
  ];

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "0.65rem",
                fontWeight: 800, flexShrink: 0,
                background: s.done ? DS.green : "rgba(255,255,255,0.08)",
                color: s.done ? "#fff" : DS.muted,
                border: `2px solid ${s.done ? DS.green : "rgba(255,255,255,0.15)"}`,
              }}>
                {s.done ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: "0.55rem", color: s.done ? DS.green : DS.muted, whiteSpace: "nowrap" }}>
                {s.label}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginBottom: 14, marginLeft: 2, marginRight: 2,
                background: s.done ? DS.green : "rgba(255,255,255,0.08)",
                transition: "background 0.5s",
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────
function ClaimStatusBadge({ status }) {
  const cfg = {
    "paid":           { color: DS.green,   bg: `${DS.green}18`,   label: "Credited" },
    "auto-approved":  { color: DS.green,   bg: `${DS.green}18`,   label: "Credited" },
    "payout-pending": { color: DS.accent2, bg: `${DS.accent2}18`, label: "Processing" },
    "fraud-blocked":  { color: DS.red,     bg: `${DS.red}18`,     label: "Fraud Blocked" },
    "pending":        { color: DS.blue,    bg: `${DS.blue}18`,    label: "Validating" },
    "created":        { color: DS.muted,   bg: `${DS.surface}18`, label: "Created" },
    "rejected":       { color: DS.red,     bg: `${DS.red}18`,     label: "Rejected" },
  };
  const c = cfg[status] || cfg.created;
  return (
    <span style={{ fontSize: "0.68rem", fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

export default function ClaimsManagement({ user, policy, onBack }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("history");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await DB.getUserClaims(user.phone);

      // Seed with demo claims if none exist
      if (!data || data.length === 0) {
        const demo = [
          { id: "CLM_001", label: "Heavy Rainfall",   trigger: "68mm > 50mm threshold",      amount: 216, emoji: "🌧️", color: DS.blue,    status: "auto-approved", time: "2:14 PM", payoutId: "UTR_A3B2C1", createdAt: Date.now() - 2 * 86400000, uid: user.phone },
          { id: "CLM_002", label: "Traffic Lockdown", trigger: "Congestion index 88 > 80",   amount: 132, emoji: "🚦", color: DS.accent,  status: "auto-approved", time: "6:45 PM", payoutId: "UTR_D4E5F6", createdAt: Date.now() - 4 * 86400000, uid: user.phone },
          { id: "CLM_003", label: "Severe Pollution", trigger: "AQI 312 > 300 threshold",    amount: 180, emoji: "💨", color: DS.accent2, status: "partial-hold",  time: "11:20 AM",payoutId: null,          createdAt: Date.now() - 5 * 86400000, uid: user.phone },
        ];
        setClaims(demo);
      } else {
        setClaims(data);
      }
      setLoading(false);
    })();
  }, []);

  const [displayLimit, setDisplayLimit] = useState(10);
  
  const totalPaid      = (claims || [])
    .filter(c => ["paid", "auto-approved"].includes(c.status))
    .reduce((a, c) => a + (Number(c.payoutAmount ?? c.amount ?? 0) || 0), 0);
  
  const totalPremiums  = (Number(policy?.premium) || 38) * 4;  // Month view
  const roi            = computeWorkerROI(totalPremiums, totalPaid);

  // Filter and sort claims: Newest first
  const sortedClaims = [...claims].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const visibleClaims = sortedClaims.slice(0, displayLimit);

  const renderHistoryContent = () => {
    if (loading) {
      return <div style={{ textAlign: "center", color: DS.muted, padding: 40 }}>Loading claims…</div>;
    }
    
    if (claims.length === 0) {
      return (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: "2rem", marginBottom: 10 }}>🎉</div>
          <div style={{ color: "#fff", fontWeight: 700 }}>No disruptions yet</div>
          <div style={{ color: DS.muted, fontSize: "0.78rem", marginTop: 6 }}>Your coverage is active and monitoring</div>
        </Card>
      );
    }

    return (
      <>
        {visibleClaims.map(c => (
          <Card key={c.id} style={{ cursor: "pointer", border: selected?.id === c.id ? `1.5px solid ${DS.accent}` : `1px solid ${DS.border}` }}
            onClick={() => setSelected(selected?.id === c.id ? null : c)}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${c.color || DS.blue}18`, border: `1px solid ${c.color || DS.blue}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>{c.emoji || "💸"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.92rem" }}>
                    {c.disruptionLabel || c.label || "Parametric Payout"}
                  </div>
                  <ClaimStatusBadge status={c.status} />
                </div>
                <div style={{ fontSize: "0.72rem", color: DS.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.triggerExplanation || c.trigger || "Weather condition threshold reached"}
                </div>
              </div>
            </div>

            {/* Expanded detail */}
            {selected?.id === c.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${DS.border}` }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    ["Amount", `₹${Math.round(c.payoutAmount ?? c.amount ?? 0).toLocaleString("en-IN")}`],
                    ["Time",   c.time || (c.createdAt ? new Date(c.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "--:--")],
                    ["Claim ID", (c.id || "---").slice(0, 12)],
                    ["UTR / Ref", c.payoutId || c.txnId || "Processing..."],
                  ].map(([l, v]) => (
                    <div key={l} style={{ borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: "0.6rem", color: DS.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{l}</div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff", wordBreak: "break-all" }}>{v}</div>
                    </div>
                  ))}
                </div>
                
                <ClaimProgressBar claim={c} />
                
                {c.status === "payout-pending" && (
                  <div style={{ marginTop: 10, padding: 10, borderRadius: 9, background: `${DS.accent2}12`, border: `1px solid ${DS.accent2}30` }}>
                    <div style={{ fontSize: "0.72rem", color: DS.accent2, fontWeight: 600 }}>
                      ⚠️ Automated Payout in Progress
                    </div>
                    <div style={{ fontSize: "0.68rem", color: DS.muted, marginTop: 3 }}>
                      Claim verified by ML edge node. Payout is being processed via Gateway.
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
        
        {claims.length > displayLimit && (
          <button 
            onClick={() => setDisplayLimit(d => d + 20)}
            style={{ 
              padding: "14px", borderRadius: 12, background: DS.surface, 
              border: `1px solid ${DS.border}`, color: DS.accent, 
              fontWeight: 700, cursor: "pointer", marginTop: 4,
              fontFamily: DS.font, width: "100%"
            }}>
            View More ({claims.length - displayLimit} remaining)
          </button>
        )}
      </>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "28px 20px 14px", flexShrink: 0 }}>
        <div style={{ marginBottom: 18 }}><Logo /></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", fontFamily: DS.display, marginBottom: 4 }}>
              Claims Management
            </h2>
            <p style={{ fontSize: "0.75rem", color: DS.muted }}>Your income protection history</p>
          </div>
          <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 10, background: DS.surface, border: `1px solid ${DS.border}`, color: DS.muted, cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", padding: "0 20px", marginBottom: 12 }}>
        {[["history", "History"], ["roi", "ROI Summary"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{
              flex: 1, padding: "9px 4px", fontSize: "0.78rem", fontWeight: 700,
              fontFamily: DS.font, cursor: "pointer", border: "none",
              borderBottom: `2px solid ${tab === k ? DS.accent : "transparent"}`,
              background: "transparent", color: tab === k ? DS.accent : DS.muted,
            }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: "0 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 30 }}>

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
              {[
                ["Total Claims", claims.length, "#fff"],
                ["Total Paid", `₹${totalPaid.toLocaleString("en-IN")}`, DS.green],
                ["Pending", claims.filter(c => c.status === "partial-hold").length, DS.accent2],
              ].map(([l, v, c]) => (
                <Card key={l} padding="12px">
                  <div style={{ fontSize: "0.62rem", color: DS.muted, marginBottom: 3 }}>{l}</div>
                  <div style={{ fontWeight: 900, fontSize: "1.1rem", color: c, fontFamily: DS.display }}>{v}</div>
                </Card>
              ))}
            </div>

            {renderHistoryContent()}
          </>
        )}

        {/* ── ROI TAB ── */}
        {tab === "roi" && (
          <>
            <Card style={{ background: roi.positive ? `${DS.green}12` : `${DS.red}10`, border: `1.5px solid ${roi.positive ? DS.green : DS.red}40` }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: 6 }}>{roi.positive ? "💚" : "📊"}</div>
                <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: roi.positive ? DS.green : DS.muted, marginBottom: 6 }}>
                  Net Benefit This Month
                </div>
                <div style={{ fontSize: "2.8rem", fontWeight: 900, color: roi.positive ? DS.green : DS.red, fontFamily: DS.display }}>
                  {roi.positive ? "+" : ""}₹{Math.abs(roi.netBenefit).toLocaleString("en-IN")}
                </div>
                <div style={{ fontSize: "0.78rem", color: DS.muted, marginTop: 6 }}>
                  {roi.positive ? "You received more than you paid" : "You paid more than you received"}
                </div>
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Premiums Paid",    `₹${totalPremiums}`,                DS.accent],
                ["Payouts Received", `₹${totalPaid.toLocaleString("en-IN")}`, DS.green],
                ["Return on Premium", `${roi.roiPct}%`,                   roi.roiPct > 0 ? DS.green : DS.red],
                ["Claims Filed",     claims.length,                       "#fff"],
              ].map(([l, v, c]) => (
                <Card key={l} padding="14px">
                  <div style={{ fontSize: "0.65rem", color: DS.muted, marginBottom: 4 }}>{l}</div>
                  <div style={{ fontWeight: 900, fontSize: "1.2rem", color: c, fontFamily: DS.display }}>{v}</div>
                </Card>
              ))}
            </div>

            <Card>
              <SectionLabel>Value Breakdown</SectionLabel>
              <div style={{ fontSize: "0.8rem", color: DS.muted, lineHeight: 1.7 }}>
                You paid <strong style={{ color: "#fff" }}>₹{totalPremiums}</strong> in premiums over 3 weeks.
                {totalPaid > 0
                  ? <> Your disruptions triggered <strong style={{ color: DS.green }}>₹{totalPaid.toLocaleString("en-IN")}</strong> in payouts — a return of <strong style={{ color: DS.green }}>{roi.roiPct}%</strong> on your insurance spend.</>
                  : <> No disruptions occurred in your zone — your ₹{totalPremiums} premium bought you peace of mind across {policy.maxPayout.toLocaleString("en-IN")} of potential coverage.</>
                }
              </div>
            </Card>
          </>
        )}

        <div style={{ height: 8 }} />
      </div>

      <div style={{ padding: "0 20px 20px", flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "none", color: DS.muted, cursor: "pointer", padding: 12, fontSize: "0.83rem", width: "100%" }}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
