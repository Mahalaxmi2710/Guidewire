// ─────────────────────────────────────────────────────────────
//  RideSure — Dashboard: Worker Tab
// ─────────────────────────────────────────────────────────────
import { useState, useRef } from "react";
import { DS, TRIGGER_CONFIGS, DEFAULT_METRICS, P } from "../constants.js";
import { PulseDot, Card, SectionLabel, StatBox, Toast } from "../components/ui.jsx";
import { computeLoss, getTriggerStatus, RazorpayMock, FirebaseMock } from "../lib/backend.js";

/* ── Live Metric Row ───────────────────────────────────────── */
function MetricRow({ label, value, unit, max, threshold, icon }) {
  const status = getTriggerStatus(value, threshold);
  const colors = { safe: DS.green, warning: DS.accent2, critical: DS.red };
  const bgs    = { safe: `${DS.green}12`, warning: `${DS.accent2}12`, critical: `${DS.red}12` };
  const bords  = { safe: `${DS.green}30`, warning: `${DS.accent2}30`, critical: `${DS.red}35` };
  const pct    = Math.min((value / max) * 100, 100);
  const color  = colors[status];

  return (
    <div style={{
      borderRadius: 12, padding: 12, transition: "all 0.3s",
      background: bgs[status], border: `1px solid ${bords[status]}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.85rem" }}>{icon}</span>
          <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#fff" }}>{label}</span>
          {status === "critical" && (
            <span style={{
              fontSize: "0.62rem", padding: "2px 6px", borderRadius: 4, fontWeight: 800,
              background: `${DS.red}30`, color: DS.red,
            }}>TRIGGER</span>
          )}
        </div>
        <span style={{ fontWeight: 900, fontSize: "0.95rem", color, fontFamily: DS.display }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ width: "100%", borderRadius: 99, height: 5, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: color, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ fontSize: "0.65rem", color: DS.muted, marginTop: 4 }}>
        Threshold: {threshold}{unit}
      </div>
    </div>
  );
}

/* ── Claim History Item ────────────────────────────────────── */
function ClaimItem({ claim }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: `${claim.color}18`, border: `1px solid ${claim.color}35`,
        fontSize: "1rem",
      }}>{claim.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.85rem" }}>{claim.label}</div>
        <div style={{ fontSize: "0.7rem", color: DS.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {claim.trigger}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: DS.green }}>
          +₹{claim.amount.toLocaleString("en-IN")}
        </div>
        <div style={{ fontSize: "0.65rem", color: DS.muted }}>{claim.time}</div>
      </div>
    </div>
  );
}

/* ── Worker Tab ────────────────────────────────────────────── */
export default function WorkerTab({ user, policy }) {
  const [metrics,  setMetrics]  = useState({ ...DEFAULT_METRICS });
  const [claims,   setClaims]   = useState([]);
  const [toasts,   setToasts]   = useState([]);
  const [simActive,setSimActive]= useState(false);
  const intervalRef = useRef(null);

  const totalPaid = claims.reduce((a, c) => a + c.amount, 0);

  const addToast = (msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [{ id, msg, type }, ...t].slice(0, 3));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  };

  const resetSim = () => {
    clearInterval(intervalRef.current);
    setMetrics({ ...DEFAULT_METRICS });
    setSimActive(false);
  };

  const simulate = (type) => {
    if (simActive) return;
    setSimActive(true);
    const cfg = TRIGGER_CONFIGS[type];

    intervalRef.current = setInterval(() => {
      setMetrics(m => {
        const cur  = m[cfg.key];
        const next = Math.min(cur + cfg.step, cfg.target);

        if (next >= cfg.target) {
          clearInterval(intervalRef.current);
          const amount = computeLoss(user.daily, cfg.hours, cfg.sev);
          addToast(`⚠️ ${cfg.label} detected — Auto-claim triggered!`, "warn");

          setTimeout(async () => {
            // Simulate Razorpay payout to worker
            const payout = await RazorpayMock.processPayout(user.phone, amount * 100);

            // Save claim to Firebase mock
            const claimDoc = await FirebaseMock.saveClaim({
              uid:     user.phone,
              label:   cfg.label,
              trigger: cfg.trigger,
              amount,
              emoji:   cfg.emoji,
              color:   cfg.color,
              time:    new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
              payoutId: payout.utr,
            });

            setClaims(c => [claimDoc, ...c]);
            setSimActive(false);
            addToast(`✅ ₹${amount.toLocaleString("en-IN")} credited via Razorpay! UTR: ${payout.utr}`, "success");
          }, 1200);
        }

        return { ...m, [cfg.key]: next };
      });
    }, 80);
  };

  const liveReadings = [
    { label: "Rainfall",    value: Math.round(metrics.rainfall),    unit: "mm",  max: 100, threshold: 50,  icon: "🌧️" },
    { label: "Temperature", value: Math.round(metrics.temperature), unit: "°C",  max: 50,  threshold: 40,  icon: "🌡️" },
    { label: "AQI",         value: Math.round(metrics.aqi),         unit: "",    max: 500, threshold: 300, icon: "💨" },
    { label: "Congestion",  value: Math.round(metrics.traffic),     unit: "%",   max: 100, threshold: 80,  icon: "🚦" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Toast toasts={toasts} />

      {/* Greeting card */}
      <Card style={{ background: `linear-gradient(135deg, ${DS.accent}16, ${DS.surface})` }} padding="16px">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: DS.surface, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.5rem", flexShrink: 0,
          }}>🛵</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: "0.72rem", color: DS.muted }}>{user.platform.name} · {user.zone.name}</div>
            <div style={{ fontSize: "0.72rem", color: DS.green, fontWeight: 600, marginTop: 2 }}>
              Coverage active — Week of {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatBox label="Weekly Premium"  value={`₹${policy.premium}`}                       color={DS.accent}  sub="paid this week" />
        <StatBox label="Max Payout"      value={`₹${policy.maxPayout.toLocaleString("en-IN")}`} color={DS.green}   sub="this week" />
        <StatBox label="Claims Paid"     value={`₹${totalPaid.toLocaleString("en-IN")}`}    color={DS.blue}    sub={`${claims.length} payout${claims.length !== 1 ? "s" : ""}`} />
        <StatBox label="Hours Protected" value="8–12 hrs"                                    color={DS.accent2} sub="daily coverage" />
      </div>

      {/* Claim history */}
      {claims.length > 0 && (
        <Card>
          <SectionLabel>Auto-Processed Claims</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {claims.map(c => <ClaimItem key={c.id} claim={c} />)}
          </div>
        </Card>
      )}

      {/* Live Disruption Monitor */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <SectionLabel>Live Disruption Monitor</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <PulseDot color={simActive ? DS.accent : DS.green} />
            <span style={{ fontSize: "0.7rem", color: simActive ? DS.accent : DS.green }}>
              {simActive ? "Simulating…" : "Monitoring"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {liveReadings.map(m => <MetricRow key={m.label} {...m} />)}
        </div>

        <SectionLabel>🎮 Simulate Disruption (Demo)</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
          {Object.entries(TRIGGER_CONFIGS).map(([type, cfg]) => (
            <button key={type} onClick={() => simulate(type)} disabled={simActive}
              style={{
                padding: "12px 4px", borderRadius: 12, border: `1px solid ${DS.border}`,
                background: DS.surface, cursor: simActive ? "not-allowed" : "pointer",
                opacity: simActive ? 0.35 : 1, transition: "transform 0.15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              }}
              onMouseEnter={e => { if (!simActive) e.currentTarget.style.transform = "scale(1.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}>
              <span style={{ fontSize: "1.2rem" }}>{cfg.emoji}</span>
              <span style={{ fontSize: "0.65rem", color: DS.muted }}>{cfg.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {(simActive || claims.length > 0) && (
          <button onClick={resetSim}
            style={{
              width: "100%", padding: "10px", borderRadius: 10, border: `1px solid ${DS.border}`,
              background: DS.surface, color: DS.muted, cursor: "pointer", fontSize: "0.78rem",
            }}>
            ↺ Reset Simulation
          </button>
        )}
      </Card>

      {/* AI Recommendations */}
      <Card>
        <SectionLabel>🤖 AI Earning Optimization</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { msg: "Switch to Anna Nagar — 40% lower disruption risk today", icon: "🗺️" },
            { msg: "Peak demand at Adyar 7–9 PM — high order density expected", icon: "📈" },
            { msg: "Rain forecast 3–5 PM: start early to protect peak earnings", icon: "⏰" },
          ].map((r, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 10, padding: 12,
              background: `${DS.accent}0a`, border: `1px solid ${DS.accent}22`,
            }}>
              <span style={{ fontSize: "0.95rem", flexShrink: 0 }}>{r.icon}</span>
              <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{r.msg}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
