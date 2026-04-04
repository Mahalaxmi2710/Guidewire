// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Dashboard: Worker Tab
//  Live weather mock, 6 triggers, Firebase claim persistence
//  Weekly Dynamic Pricing integration.
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import { DS, TRIGGER_CONFIGS, DEFAULT_METRICS } from "../constants.js";
import { PulseDot, Card, SectionLabel, StatBox, Toast } from "../components/ui.jsx";
import { estimateLoss, getTriggerStatus, computeWeeklyDynamicPremium, computeLocationRiskScore } from "../lib/mlModel.js";
import { computeWorkerROI } from "../lib/actuarial.js";
import { fetchWeather } from "../lib/weatherApi.js";
import { DB, Razorpay } from "../lib/firebase.js";
import { seedUserEarnings, getWeeklyAvgEarnings } from "../lib/dataSchema.js";
import WeeklyPricingCard from "../components/WeeklyPricingCard.jsx";

// ── Claim Progress Indicator ──────────────────────────────────
function ClaimProgress({ stage }) {
  const stages = ["Detecting", "Validating", "Processing", "Credited"];
  const idx    = stages.indexOf(stage);
  return (
    <div style={{ padding: "12px 14px", borderRadius: 12, background: `${DS.green}10`, border: `1px solid ${DS.green}30` }}>
      <div style={{ fontSize: "0.7rem", color: DS.green, fontWeight: 700, marginBottom: 8 }}>
        Zero-touch claim in progress…
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {stages.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < stages.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", fontSize: "0.6rem", fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: i <= idx ? DS.green : "rgba(255,255,255,0.08)",
                color: i <= idx ? "#fff" : DS.muted,
                border: `2px solid ${i <= idx ? DS.green : "rgba(255,255,255,0.1)"}`,
              }}>
                {i < idx ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: "0.52rem", color: i <= idx ? DS.green : DS.muted, whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {i < stages.length - 1 && (
              <div style={{ flex: 1, height: 2, marginBottom: 14, margin: "0 2px 14px",
                background: i < idx ? DS.green : "rgba(255,255,255,0.08)" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Metric Row ────────────────────────────────────────────────
function MetricRow({ label, value, unit, max, threshold, emoji }) {
  const status = getTriggerStatus(value, threshold);
  const colors  = { safe: DS.green,   warning: DS.accent2,   critical: DS.red };
  const bgs     = { safe: `${DS.green}12`, warning: `${DS.accent2}12`, critical: `${DS.red}12` };
  const borders = { safe: `${DS.green}30`, warning: `${DS.accent2}30`, critical: `${DS.red}35` };
  const pct     = Math.min((value / max) * 100, 100);
  const color   = colors[status];

  return (
    <div style={{ borderRadius: 12, padding: 11, transition: "all 0.3s", background: bgs[status], border: `1px solid ${borders[status]}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: "0.85rem" }}>{emoji}</span>
          <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#fff" }}>{label}</span>
          {status === "critical" && (
            <span style={{ fontSize: "0.6rem", padding: "2px 5px", borderRadius: 4, fontWeight: 800, background: `${DS.red}30`, color: DS.red }}>TRIGGER</span>
          )}
          {status === "warning" && (
            <span style={{ fontSize: "0.6rem", padding: "2px 5px", borderRadius: 4, fontWeight: 800, background: `${DS.accent2}30`, color: DS.accent2 }}>WARNING</span>
          )}
        </div>
        <span style={{ fontWeight: 900, fontSize: "0.92rem", color, fontFamily: DS.display }}>{value}{unit}</span>
      </div>
      <div style={{ width: "100%", borderRadius: 99, height: 5, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: color, transition: "width 0.3s ease" }} />
      </div>
      <div style={{ fontSize: "0.62rem", color: DS.muted, marginTop: 4 }}>Threshold: {threshold}{unit}</div>
    </div>
  );
}

export default function WorkerTab({ user, policy, onOpenPolicy, onOpenClaims, globalRiskOn }) {
  const [metrics,     setMetrics]     = useState({ ...DEFAULT_METRICS });
  const [claims,      setClaims]      = useState([]);
  const [toasts,      setToasts]      = useState([]);
  const [simActive,   setSimActive]   = useState(false);
  const [claimStage,  setClaimStage]  = useState(null);
  const [weatherSrc,  setWeatherSrc]  = useState("mock");
  const intervalRef = useRef(null);

  // Weekly Pricing State
  const [pricing, setPricing] = useState(null);

  // Initialize Earnings + Weather
  useEffect(() => {
    seedUserEarnings(user.phone, user.daily);
    
    fetchWeather(user.zone.id).then(w => {
      setMetrics(m => ({ ...m, rainfall: w.rainfall, temperature: w.temperature, aqi: w.aqi, traffic: w.traffic }));
      setWeatherSrc(w.source);
      
      const weeklyAvg = getWeeklyAvgEarnings(user.phone);
      const riskScore = computeLocationRiskScore(w);
      const res = computeWeeklyDynamicPremium(weeklyAvg, riskScore, user.zone);
      setPricing(res);
    });
  }, [user]);

  const totalPaid = claims.reduce((a, c) => a + c.amount, 0);
  const currentPremium = globalRiskOn ? Math.round((pricing?.premium || policy.premium) * 1.5) : (pricing?.premium || policy.premium);
  const roi       = computeWorkerROI(currentPremium * 4, totalPaid);

  const addToast = (msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [{ id, msg, type }, ...t].slice(0, 3));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 6000);
  };

  const resetSim = () => {
    clearInterval(intervalRef.current);
    setSimActive(false);
    setClaimStage(null);
    fetchWeather(user.zone.id).then(w =>
      setMetrics({ rainfall: w.rainfall, temperature: w.temperature, aqi: w.aqi, traffic: w.traffic })
    );
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
          addToast(`⚠️ ${cfg.label} — threshold crossed! Auto-claim triggered.`, "warn");
          runClaimPipeline(cfg);
        }
        return { ...m, [cfg.key]: next };
      });
    }, 80);
  };

  const runClaimPipeline = async (cfg) => {
    const amount = estimateLoss(user.daily, cfg.hours, cfg.sev);
    const stages = ["Detecting", "Validating", "Processing", "Credited"];
    for (const stage of stages) {
      setClaimStage(stage);
      await new Promise(r => setTimeout(r, 700));
    }
    const fraudFlag = false;
    const payout = await Razorpay.processPayout(user.phone, amount * 100);
    const doc = await DB.saveClaim({
      uid:       user.phone,
      label:     cfg.label,
      trigger:   cfg.trigger,
      amount,
      emoji:     cfg.emoji,
      color:     cfg.color,
      time:      new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      payoutId:  payout.utr,
      fraudFlag,
      zoneId:    user.zone.id,
    });
    setClaims(c => [doc, ...c]);
    setSimActive(false);
    setClaimStage(null);
    addToast(`✅ ₹${amount.toLocaleString("en-IN")} credited via Razorpay! UTR: ${payout.utr}`, "success");
  };

  const readings = [
    { label: "Rainfall",    value: Math.round(metrics.rainfall),    unit: "mm", max: 100, threshold: 50,  emoji: "🌧️" },
    { label: "Temperature", value: Math.round(metrics.temperature), unit: "°C", max: 50,  threshold: 40,  emoji: "🌡️" },
    { label: "AQI",         value: Math.round(metrics.aqi),         unit: "",   max: 500, threshold: 300, emoji: "💨" },
    { label: "Congestion",  value: Math.round(metrics.traffic),     unit: "%",  max: 100, threshold: 80,  emoji: "🚦" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      <Toast toasts={toasts} />

      {/* Greeting */}
      <Card style={{ background: `linear-gradient(135deg, ${DS.accent}16, ${DS.surface})` }} padding="15px">
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: DS.surface, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>🛵</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: "0.7rem", color: DS.muted }}>{user.platform.name} · {user.zone.name}</div>
            <div style={{ fontSize: "0.7rem", color: DS.green, fontWeight: 600, marginTop: 2 }}>
              Coverage active · Week of {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </div>
          </div>
          <div style={{ fontSize: "0.62rem", color: weatherSrc === "openweathermap" ? DS.green : DS.muted, textAlign: "right", flexShrink: 0 }}>
            {weatherSrc === "openweathermap" ? "🟢 Live weather" : weatherSrc === "open-meteo" ? "🔵 Open-Meteo" : "🟡 Mock data"}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        <StatBox label="Weekly Premium"  value={`₹${currentPremium}`}                        color={globalRiskOn ? DS.red : DS.accent}  sub="est. dynamic" />
        <StatBox label="Max Payout"      value={`₹${policy.maxPayout.toLocaleString("en-IN")}`} color={DS.green}   sub="this week" />
        <StatBox label="Claims Paid"     value={`₹${totalPaid.toLocaleString("en-IN")}`}      color={DS.blue}    sub={`${claims.length} payout${claims.length !== 1 ? "s" : ""}`} />
        <StatBox label="ROI"             value={`${roi.roiPct > 0 ? "+" : ""}${roi.roiPct}%`} color={roi.roiPct >= 0 ? DS.green : DS.red} sub="on premium" />
      </div>

      {/* Dynamic Pricing Card */}
      {pricing && <WeeklyPricingCard result={pricing} globalRiskOn={globalRiskOn} />}

      {/* Quick nav */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
        {[
          { label: "📄 My Policy",  sub: "View coverage & exclusions", action: onOpenPolicy },
          { label: "📋 My Claims",  sub: "History & ROI summary",       action: onOpenClaims },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action}
            style={{ borderRadius: 12, padding: "12px", background: DS.surface, border: `1px solid ${DS.border}`, cursor: "pointer", textAlign: "left", transition: "border-color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = DS.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = DS.border}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff", marginBottom: 3 }}>{btn.label}</div>
            <div style={{ fontSize: "0.67rem", color: DS.muted }}>{btn.sub}</div>
          </button>
        ))}
      </div>

      {/* Recent claims (truncated) */}
      {claims.length > 0 && (
        <Card>
          <SectionLabel>Auto-Processed Claims</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {claims.slice(0, 3).map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${c.color}18`, border: `1px solid ${c.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>{c.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.82rem" }}>{c.label}</div>
                  <div style={{ fontSize: "0.67rem", color: DS.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.trigger}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.87rem", color: DS.green }}>+₹{c.amount.toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: "0.62rem", color: DS.muted }}>{c.time}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Live Disruption Monitor */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
          <SectionLabel>Live Disruption Monitor</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <PulseDot color={simActive ? DS.accent : DS.green} />
            <span style={{ fontSize: "0.67rem", color: simActive ? DS.accent : DS.green }}>
              {simActive ? "Simulating…" : "Monitoring"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
          {readings.map(m => <MetricRow key={m.label} {...m} />)}
        </div>
        {claimStage && <div style={{ marginBottom: 12 }}><ClaimProgress stage={claimStage} /></div>}
        <SectionLabel>🎮 Simulate Disruption</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 7, marginBottom: 9 }}>
          {Object.entries(TRIGGER_CONFIGS).map(([type, cfg]) => (
            <button key={type} onClick={() => simulate(type)} disabled={simActive}
              style={{ padding: "11px 4px", borderRadius: 11, border: `1px solid ${DS.border}`, background: DS.surface, cursor: simActive ? "not-allowed" : "pointer", opacity: simActive ? 0.35 : 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "1.15rem" }}>{cfg.emoji}</span>
              <span style={{ fontSize: "0.62rem", color: DS.muted }}>{cfg.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
        {(simActive || claims.length > 0) && (
          <button onClick={resetSim} style={{ width: "100%", padding: 9, borderRadius: 9, border: `1px solid ${DS.border}`, background: DS.surface, color: DS.muted, cursor: "pointer", fontSize: "0.76rem" }}>
            ↺ Reset
          </button>
        )}
      </Card>

      <div style={{ height: 8 }} />
    </div>
  );
}
