// ─────────────────────────────────────────────────────────────
//  RideSure — Screen: Onboarding (3 steps)
//  Step 0 → Identity  |  Step 1 → Zone  |  Step 2 → Earnings
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { DS, ZONES, PLATFORMS, RISK_META, P } from "../constants.js";
import { Logo, StepBar, GlowBtn, Input, Badge, Bar, Card, SectionLabel } from "../components/ui.jsx";
import { computeMaxPayout } from "../lib/backend.js";

const STEPS = ["Identity", "Zone", "Earnings"];

/* ── Step 0: Identity ──────────────────────────────────────── */
function StepIdentity({ form, setForm, errors }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", fontFamily: DS.display, marginBottom: 4 }}>
          Who are you?
        </h2>
        <p style={{ fontSize: "0.82rem", color: DS.muted }}>
          We keep your data private and secure via Firebase Auth.
        </p>
      </div>

      <Input label="Full Name" value={form.name} onChange={e => set("name", e.target.value)}
        placeholder="e.g. Arjun Rajan" error={errors.name} />
      <Input label="Mobile Number" value={form.phone} onChange={e => set("phone", e.target.value)}
        placeholder="9876543210" type="tel" maxLength={10} error={errors.phone} />
      <Input label="Email (optional)" value={form.email} onChange={e => set("email", e.target.value)}
        placeholder="arjun@email.com" type="email" />

      <div>
        <SectionLabel>Delivery Platform</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => set("platform", p)}
              style={{
                padding: "16px 8px", borderRadius: 16, border: `1.5px solid ${form.platform?.id === p.id ? p.color : DS.border}`,
                background: form.platform?.id === p.id ? `${p.color}22` : DS.surface,
                cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                transition: "all 0.2s",
              }}>
              <span style={{ fontSize: "1.5rem" }}>{p.emoji}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: form.platform?.id === p.id ? p.color : DS.muted }}>
                {p.name}
              </span>
            </button>
          ))}
        </div>
        {errors.platform && <p style={{ color: DS.red, fontSize: "0.72rem", marginTop: 4 }}>{errors.platform}</p>}
      </div>
    </div>
  );
}

/* ── Step 1: Zone ──────────────────────────────────────────── */
function StepZone({ form, setForm, errors }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", fontFamily: DS.display, marginBottom: 4 }}>
        Your working zone
      </h2>
      <p style={{ fontSize: "0.82rem", color: DS.muted, marginBottom: 20 }}>
        Our ML model uses micro-zone (1–2 km grid) risk scoring to compute your premium.
      </p>
      {errors.zone && <p style={{ color: DS.red, fontSize: "0.72rem", marginBottom: 10 }}>{errors.zone}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ZONES.map(z => {
          const rm = RISK_META[z.risk];
          const sel = form.zone?.id === z.id;
          return (
            <button key={z.id} onClick={() => set("zone", z)}
              style={{
                borderRadius: 16, padding: 16, textAlign: "left", width: "100%", cursor: "pointer",
                background: sel ? `${DS.accent}12` : DS.surface,
                border: `1.5px solid ${sel ? DS.accent : DS.border}`,
                transition: "all 0.2s",
              }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sel ? 12 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: rm.bg, border: `1px solid ${rm.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1rem",
                  }}>📍</div>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "0.88rem" }}>{z.name}</div>
                    <div style={{ fontSize: "0.7rem", color: DS.muted }}>Chennai, Tamil Nadu</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge label={rm.label} color={rm.text} bg={rm.bg} border={rm.border} />
                  {sel && <span style={{ color: DS.accent, fontWeight: 900 }}>✓</span>}
                </div>
              </div>

              {sel && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    ["Flood", z.flood,  z.flood  > 60 ? DS.red : z.flood  > 35 ? DS.accent2 : DS.green],
                    ["Rain",  z.rain,   z.rain   > 60 ? DS.red : z.rain   > 35 ? DS.accent2 : DS.green],
                    ["AQI",   z.aqi,    z.aqi    > 60 ? DS.red : z.aqi    > 35 ? DS.accent2 : DS.green],
                  ].map(([lbl, val, c]) => (
                    <div key={lbl} style={{ borderRadius: 10, padding: 10, background: "rgba(255,255,255,0.04)" }}>
                      <div style={{ fontSize: "0.68rem", color: DS.muted, marginBottom: 6 }}>{lbl} Index</div>
                      <Bar val={val} color={c} />
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, marginTop: 4, color: c }}>{val}/100</div>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 2: Earnings ──────────────────────────────────────── */
function StepEarnings({ form, setForm }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const maxPayout = computeMaxPayout(form.daily);

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", fontFamily: DS.display, marginBottom: 4 }}>
        Your earning profile
      </h2>
      <p style={{ fontSize: "0.82rem", color: DS.muted, marginBottom: 24 }}>
        Our income estimation model learns your pattern to compute accurate loss compensation.
      </p>

      <Card style={{ marginBottom: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em", color: DS.muted, marginBottom: 8 }}>
            Average Daily Earnings
          </div>
          <div style={{ fontSize: "3.5rem", fontWeight: 900, color: "#fff", fontFamily: DS.display }}>₹{form.daily}</div>
          <div style={{ fontSize: "0.82rem", color: DS.accent, marginTop: 4 }}>
            ₹{(form.daily / 10).toFixed(0)}/hour average
          </div>
        </div>
        <input type="range" min={300} max={1200} step={50} value={form.daily}
          onChange={e => set("daily", +e.target.value)}
          style={{ accentColor: DS.accent, width: "100%", marginBottom: 4 }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: DS.muted }}>
          <span>₹300</span><span>₹1,200</span>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[
          { l: "Weekly income",   v: `₹${(form.daily * 7).toLocaleString("en-IN")}`, c: "#fff" },
          { l: "Monthly estimate",v: `₹${(form.daily * 26).toLocaleString("en-IN")}`,c: "#fff" },
          { l: "Max weekly payout",v:`₹${maxPayout.toLocaleString("en-IN")}`,         c: DS.green },
          { l: "Coverage ratio",  v: "65%",                                            c: DS.blue },
        ].map(s => (
          <Card key={s.l} padding="14px">
            <div style={{ fontSize: "0.68rem", color: DS.muted, marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontWeight: 900, fontSize: "1rem", color: s.c, fontFamily: DS.display }}>{s.v}</div>
          </Card>
        ))}
      </div>

      <div>
        <SectionLabel>Working Shift</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {[
            { id: "lunch",  label: "Lunch",  sub: "12–3 PM" },
            { id: "dinner", label: "Dinner", sub: "7–10 PM" },
            { id: "both",   label: "Both",   sub: "Full day" },
          ].map(s => (
            <button key={s.id} onClick={() => set("peakShift", s.id)}
              style={{
                padding: "12px 8px", borderRadius: 12, cursor: "pointer", transition: "all 0.2s",
                background: form.peakShift === s.id ? `${DS.accent}22` : DS.surface,
                border: `1.5px solid ${form.peakShift === s.id ? DS.accent : DS.border}`,
              }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: form.peakShift === s.id ? DS.accent : "#fff" }}>
                {s.label}
              </div>
              <div style={{ fontSize: "0.68rem", color: DS.muted }}>{s.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Onboarding Screen ────────────────────────────────── */
export default function Onboarding({ onComplete, onBack }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    platform: null, zone: null,
    daily: 600, peakShift: "both",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!form.name.trim())              e.name     = "Name required";
      if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Valid 10-digit mobile needed";
      if (!form.platform)                 e.platform = "Choose your platform";
    }
    if (step === 1 && !form.zone) e.zone = "Select your working zone";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if (!validate()) return;
    if (step < 2) setStep(s => s + 1);
    else onComplete(form);
  };

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ padding: "32px 20px 16px", flexShrink: 0 }}>
        <div style={{ marginBottom: 24 }}>
          <Logo />
        </div>
        <StepBar steps={STEPS} current={step} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, padding: "8px 20px", overflowY: "auto" }}>
        {step === 0 && <StepIdentity form={form} setForm={setForm} errors={errors} />}
        {step === 1 && <StepZone     form={form} setForm={setForm} errors={errors} />}
        {step === 2 && <StepEarnings form={form} setForm={setForm} />}
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 20px 32px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <GlowBtn onClick={next} disabled={step === 1 && !form.zone}>
          {step === 2 ? "Compute My Risk Profile →" : "Continue →"}
        </GlowBtn>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            style={{ background: "none", border: "none", color: DS.muted, cursor: "pointer", padding: 12, fontSize: "0.85rem" }}>
            ← Back
          </button>
        )}
        {step === 0 && onBack && (
          <button onClick={onBack}
            style={{ background: "none", border: "none", color: DS.muted, cursor: "pointer", padding: 12, fontSize: "0.85rem" }}>
            ← Back to Home
          </button>
        )}
      </div>
    </div>
  );
}
