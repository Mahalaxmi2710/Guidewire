// ─────────────────────────────────────────────────────────────
//  RideSure — Reusable UI Components
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { DS, P } from "../constants.js";

/* ── SVG Icon ────────────────────────────────────────────── */
export function Svg({ d, s = 18, color, style = {} }) {
  return (
    <svg
      width={s} height={s} viewBox="0 0 24 24"
      fill="none" stroke={color || "currentColor"}
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      style={style}
    >
      <path d={d} />
    </svg>
  );
}

/* ── App Logo ────────────────────────────────────────────── */
export function Logo({ size = "md" }) {
  const sz = size === "lg" ? { box: 44, icon: 22, text: "1.25rem" } : { box: 32, icon: 15, text: "1.1rem" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: sz.box, height: sz.box, borderRadius: 12,
        background: `linear-gradient(135deg, ${DS.accent}, ${DS.accent2})`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Svg d={P.shield} s={sz.icon} color="#fff" />
      </div>
      <div>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: sz.text, fontFamily: DS.display, lineHeight: 1 }}>
          RideSure
        </div>
        {size === "lg" && (
          <div style={{ color: DS.accent, fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.8 }}>
            Parametric Income Guard
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Pulsing Status Dot ──────────────────────────────────── */
export function PulseDot({ color = DS.green }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: 10, height: 10, flexShrink: 0 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%", background: color, opacity: 0.5,
        animation: "rs-ping 1.2s cubic-bezier(0,0,0.2,1) infinite",
      }} />
      <span style={{ position: "relative", width: 10, height: 10, borderRadius: "50%", background: color }} />
    </span>
  );
}

/* ── Progress Bar ────────────────────────────────────────── */
export function Bar({ val, max = 100, color = DS.accent }) {
  const pct = Math.min((val / max) * 100, 100);
  return (
    <div style={{ width: "100%", borderRadius: 99, height: 6, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: color, transition: "width 0.5s ease" }} />
    </div>
  );
}

/* ── Chip / Badge ────────────────────────────────────────── */
export function Badge({ label, color, bg, border }) {
  return (
    <span style={{
      fontSize: "0.7rem", padding: "2px 8px", borderRadius: 6,
      fontWeight: 700, color, background: bg, border: `1px solid ${border}`,
    }}>
      {label}
    </span>
  );
}

/* ── Card ────────────────────────────────────────────────── */
export function Card({ children, style = {}, padding = "1.25rem" }) {
  return (
    <div style={{
      borderRadius: 16, padding,
      background: DS.card, border: `1px solid ${DS.border}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── Primary Gradient Button ─────────────────────────────── */
export function GlowBtn({ children, onClick, disabled = false, color = DS.accent, ghost = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "16px", borderRadius: 16,
        fontWeight: 700, fontSize: "1rem", letterSpacing: "0.02em",
        fontFamily: DS.font, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.3 : 1, transition: "transform 0.15s, box-shadow 0.15s",
        background: ghost ? "transparent" : `linear-gradient(135deg, ${color}, ${color}cc)`,
        color: ghost ? DS.muted : "#fff",
        border: ghost ? `1px solid ${DS.border}` : "none",
        boxShadow: ghost ? "none" : `0 4px 24px ${color}44`,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = "scale(1.015)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {children}
    </button>
  );
}

/* ── Text Input ──────────────────────────────────────────── */
export function Input({ label, value, onChange, placeholder, type = "text", maxLength, error }) {
  return (
    <div>
      {label && (
        <label style={{
          display: "block", fontSize: "0.7rem", textTransform: "uppercase",
          letterSpacing: "0.1em", marginBottom: 8, color: DS.muted,
        }}>{label}</label>
      )}
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} maxLength={maxLength}
        style={{
          width: "100%", borderRadius: 12, padding: "14px 16px",
          background: DS.surface, border: `1px solid ${error ? DS.red : DS.border}`,
          color: "#fff", fontSize: "0.9rem", fontFamily: DS.font,
          outline: "none", boxSizing: "border-box",
        }}
      />
      {error && <p style={{ color: DS.red, fontSize: "0.72rem", marginTop: 4 }}>{error}</p>}
    </div>
  );
}

/* ── Step Progress Bar ───────────────────────────────────── */
export function StepBar({ steps, current }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1 }}>
            <div style={{
              height: 4, borderRadius: 99, overflow: "hidden",
              background: "rgba(255,255,255,0.08)",
            }}>
              <div style={{
                height: "100%", borderRadius: 99,
                width: i <= current ? "100%" : "0%",
                background: i < current ? DS.green : DS.accent,
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {steps.map((s, i) => (
          <div key={s} style={{
            flex: 1, fontSize: "0.65rem", textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: i === current ? DS.accent : DS.muted,
          }}>{s}</div>
        ))}
      </div>
    </div>
  );
}

/* ── Toast Notification ──────────────────────────────────── */
export function Toast({ toasts }) {
  if (!toasts.length) return null;
  const colors = {
    success: { bg: `${DS.green}18`,   text: DS.green,   border: `${DS.green}35` },
    warn:    { bg: `${DS.accent2}18`, text: DS.accent2, border: `${DS.accent2}35` },
    info:    { bg: `${DS.blue}18`,    text: DS.blue,    border: `${DS.blue}35` },
  };
  return (
    <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map(t => {
        const c = colors[t.type] || colors.info;
        return (
          <div key={t.id} style={{
            borderRadius: 12, padding: "12px 16px", fontSize: "0.82rem", fontWeight: 600,
            background: c.bg, color: c.text, border: `1px solid ${c.border}`,
          }}>
            {t.msg}
          </div>
        );
      })}
    </div>
  );
}

/* ── Tab Switcher ────────────────────────────────────────── */
export function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", borderRadius: 12, padding: 4, background: DS.surface }}>
      {tabs.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key)}
          style={{
            flex: 1, padding: "8px", borderRadius: 10, fontSize: "0.85rem",
            fontWeight: 700, fontFamily: DS.font, cursor: "pointer",
            border: "none", transition: "all 0.2s",
            background: active === key ? `linear-gradient(135deg, ${DS.accent}, ${DS.accent2})` : "transparent",
            color: active === key ? "#fff" : DS.muted,
          }}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ── Animated Counter ────────────────────────────────────── */
export function Count({ to, prefix = "", suffix = "" }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let cur = 0;
    const inc = to / 40;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= to) { setN(to); clearInterval(t); }
      else setN(Math.floor(cur));
    }, 20);
    return () => clearInterval(t);
  }, [to]);
  return <>{prefix}{n.toLocaleString("en-IN")}{suffix}</>;
}

/* ── Section Label ───────────────────────────────────────── */
export function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: "0.65rem", textTransform: "uppercase",
      letterSpacing: "0.12em", color: DS.muted, marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

/* ── Metric Stat Box ─────────────────────────────────────── */
export function StatBox({ label, value, sub, color }) {
  return (
    <Card>
      <div style={{ fontSize: "0.68rem", color: DS.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.3rem", fontWeight: 900, color: color || "#fff", fontFamily: DS.display }}>{value}</div>
      {sub && <div style={{ fontSize: "0.68rem", color: DS.muted, marginTop: 2 }}>{sub}</div>}
    </Card>
  );
}

/* ── Global CSS (keyframes injected once) ────────────────── */
export function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: ${DS.bg}; }
      input[type=range] { height: 6px; width: 100%; }
      input::placeholder { color: rgba(255,255,255,0.18); }
      ::-webkit-scrollbar { width: 0; }
      @keyframes rs-ping {
        75%, 100% { transform: scale(2); opacity: 0; }
      }
      @keyframes rs-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.45; }
      }
      .rs-pulse { animation: rs-pulse 2s ease-in-out infinite; }
    `}</style>
  );
}
