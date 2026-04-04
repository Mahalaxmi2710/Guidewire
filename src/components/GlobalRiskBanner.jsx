// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Global Risk Banner
//  Sticky top banner displayed when Heightened Risk Mode is ON.
// ─────────────────────────────────────────────────────────────
import { DS } from "../constants.js";

export default function GlobalRiskBanner({ visible }) {
  if (!visible) return null;
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: `linear-gradient(90deg, ${DS.red}CC, #b91c1c88)`,
      borderBottom: `1px solid ${DS.red}60`,
      padding: "9px 18px",
      display: "flex", alignItems: "center", gap: 9,
      backdropFilter: "blur(6px)",
    }}>
      <span style={{ fontSize: "1rem", flexShrink: 0, animation: "pulse 1.5s infinite" }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#fff", letterSpacing: "0.02em" }}>
          Heightened Risk Mode Active
        </div>
        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.4 }}>
          Premium +50% · Coverage capped at 50% · Max 2 claims/week
        </div>
      </div>
      <div style={{
        fontSize: "0.58rem", padding: "3px 7px", borderRadius: 4, fontWeight: 800,
        background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)",
        whiteSpace: "nowrap",
      }}>
        ADMIN
      </div>
    </div>
  );
}
