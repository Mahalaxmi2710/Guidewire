// ─────────────────────────────────────────────────────────────
//  RideSure — Screen: Dashboard
//  Composes WorkerTab + AdminTab with shared header + nav
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { DS } from "../constants.js";
import { Logo, TabBar, PulseDot } from "../components/ui.jsx";
import WorkerTab from "./DashboardWorker.jsx";
import AdminTab  from "./DashboardAdmin.jsx";

/* ── Logout Icon SVG ──────────────────────────────────────── */
function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={DS.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

/* ── Logout Confirm Modal ─────────────────────────────────── */
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{
        borderRadius: 20, padding: 24, width: "100%", maxWidth: 340,
        background: DS.card, border: `1px solid ${DS.border}`,
      }}>
        <div style={{ fontSize: "1.5rem", marginBottom: 10, textAlign: "center" }}>👋</div>
        <div style={{
          fontWeight: 900, color: "#fff", fontSize: "1.1rem",
          textAlign: "center", marginBottom: 6, fontFamily: DS.display,
        }}>
          Log out of RideSure?
        </div>
        <div style={{ fontSize: "0.8rem", color: DS.muted, textAlign: "center", marginBottom: 22 }}>
          Your active coverage stays intact. You can log back in anytime.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button
            onClick={onConfirm}
            style={{
              width: "100%", padding: "13px", borderRadius: 13,
              border: "none", cursor: "pointer",
              background: `linear-gradient(135deg, ${DS.red}, #ef4444cc)`,
              color: "#fff", fontWeight: 700, fontSize: "0.9rem",
              fontFamily: DS.font,
              boxShadow: `0 4px 20px ${DS.red}44`,
            }}
          >
            Yes, Log Out
          </button>
          <button
            onClick={onCancel}
            style={{
              width: "100%", padding: "13px", borderRadius: 13,
              cursor: "pointer", background: "transparent",
              color: DS.muted, fontWeight: 600, fontSize: "0.9rem",
              fontFamily: DS.font, border: `1px solid ${DS.border}`,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard Screen ─────────────────────────────────────── */
export default function Dashboard({ user, policy, onLogout }) {
  const [tab,           setTab]           = useState("worker");
  const [claims,        setClaims]        = useState([]);
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: DS.bg, display: "flex", flexDirection: "column" }}>

      {/* Sticky header */}
      <div style={{
        padding: "24px 20px 12px", flexShrink: 0,
        borderBottom: `1px solid ${DS.border}`,
        position: "sticky", top: 0, zIndex: 10,
        background: DS.bg,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            {/* Active pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", borderRadius: 99,
              background: `${DS.green}18`, border: `1px solid ${DS.green}35`,
            }}>
              <PulseDot color={DS.green} />
              <span style={{ fontSize: "0.72rem", fontWeight: 600, color: DS.green }}>Active</span>
            </div>

            {/* Logout button */}
            <button
              onClick={() => setConfirmLogout(true)}
              title="Logout"
              style={{
                width: 34, height: 34, borderRadius: 10,
                border: `1px solid ${DS.border}`,
                background: DS.surface, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = DS.red;
                e.currentTarget.style.background  = `${DS.red}18`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = DS.border;
                e.currentTarget.style.background  = DS.surface;
              }}
            >
              <LogoutIcon />
            </button>
          </div>
        </div>

        <TabBar
          tabs={[["worker", "🛵 Worker"], ["admin", "📊 Admin"]]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto" }}>
        {tab === "worker" && (
          <WorkerTab user={user} policy={policy} onClaimsChange={setClaims} />
        )}
        {tab === "admin" && (
          <AdminTab claimsCount={claims.length} />
        )}
      </div>

      {/* Logout confirmation modal */}
      {confirmLogout && (
        <LogoutModal
          onConfirm={() => { setConfirmLogout(false); onLogout(); }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </div>
  );
}