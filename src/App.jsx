// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — App.jsx
//  Full router with all Phase 2 screens added.
//  Handles Global Risk Switch state and Firebase Auth integration.
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { GlobalStyles } from "./components/ui.jsx";
import Landing from "./screens/Landing.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import RiskProfile from "./screens/RiskProfile.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import PolicyManagement from "./screens/PolicyManagement.jsx";
import ClaimsManagement from "./screens/ClaimsManagement.jsx";
import { Auth, DB, initFirebase } from "./lib/firebase.js";
import { GlobalRisk } from "./lib/globalRisk.js";
import GlobalRiskBanner from "./components/GlobalRiskBanner.jsx";
import { startTriggerMonitor, stopTriggerMonitor } from "./services/triggerMonitor.js";

/* ── History Stack Router ────────────────────────────────────── */
function useRouter(initial) {
  const [stack, setStack] = useState([{ screen: initial }]);
  const current = stack[stack.length - 1];
  const push = (screen) => setStack(s => [...s, { screen }]);
  const pop = () => setStack(s => s.length > 1 ? s.slice(0, -1) : s);
  const replace = (screen) => setStack([{ screen }]);
  return { screen: current.screen, push, pop, replace };
}

/* ── Root App ─────────────────────────────────────────────── */
export default function App() {
  const router = useRouter("landing");

  const [userData, setUserData] = useState(null);
  const [policyData, setPolicyData] = useState(null);
  const [globalRiskOn, setGlobalRiskOn] = useState(GlobalRisk.isOn());

  // Subscribe to Global Risk changes
  useEffect(() => {
    initFirebase();
    const unsub = GlobalRisk.subscribe(setGlobalRiskOn);

    // Start background monitor (30s interval for demo/stable testing)
    const monitor = startTriggerMonitor({ intervalMs: 30000 });

    return () => {
      unsub();
      stopTriggerMonitor();
    };
  }, []);

  const handleLogout = () => {
    setUserData(null);
    setPolicyData(null);
    router.replace("landing");
  };

  const handleToggleGlobalRisk = () => {
    GlobalRisk.toggle();
  };

  const render = () => {
    switch (router.screen) {

      case "landing":
        return <Landing onStart={() => router.push("onboard")} />;

      case "onboard":
        return (
          <Onboarding
            onComplete={data => {
              setUserData(data);
              router.push("risk");
            }}
            onBack={() => router.pop()}
          />
        );

      case "risk":
        return userData ? (
          <RiskProfile
            user={userData}
            onActivate={policy => {
              setPolicyData(policy);
              router.push("dashboard");
            }}
            onBack={() => router.pop()}
          />
        ) : null;

      case "dashboard":
        return userData && policyData ? (
          <Dashboard
            user={userData}
            policy={policyData}
            onLogout={handleLogout}
            onOpenPolicy={() => router.push("policy-management")}
            onOpenClaims={() => router.push("claims-management")}
            globalRiskOn={globalRiskOn}
            onToggleGlobalRisk={handleToggleGlobalRisk}
          />
        ) : null;

      case "policy-management":
        return userData && policyData ? (
          <PolicyManagement
            user={userData}
            policy={policyData}
            onBack={() => router.pop()}
          />
        ) : null;

      case "claims-management":
        return userData && policyData ? (
          <ClaimsManagement
            user={userData}
            policy={policyData}
            onBack={() => router.pop()}
          />
        ) : null;

      default:
        return <Landing onStart={() => router.push("onboard")} />;
    }
  };

  return (
    <>
      <GlobalStyles />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif", position: "relative" }}>
        <GlobalRiskBanner visible={globalRiskOn} />
        {render()}
      </div>
    </>
  );
}