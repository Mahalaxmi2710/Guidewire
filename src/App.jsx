// ─────────────────────────────────────────────────────────────
//  RideSure — App.jsx
//  Client-side router using a history stack.
//  Navigate forward with push(screen, state).
//  Navigate back with pop() — returns to previous screen.
//
//  Screens:
//    landing   → Landing
//    onboard   → Onboarding
//    risk      → RiskProfile   (requires: userData)
//    dashboard → Dashboard     (requires: userData + policyData)
// ─────────────────────────────────────────────────────────────
import { useState } from "react";
import { GlobalStyles } from "./components/ui.jsx";
import Landing    from "./screens/Landing.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import RiskProfile from "./screens/RiskProfile.jsx";
import Dashboard  from "./screens/Dashboard.jsx";

/* ── Simple History Stack Router ──────────────────────────── */
function useRouter(initial) {
  const [stack, setStack] = useState([{ screen: initial, state: {} }]);
  const current = stack[stack.length - 1];

  const push = (screen, state = {}) =>
    setStack(s => [...s, { screen, state }]);

  const pop = () =>
    setStack(s => s.length > 1 ? s.slice(0, -1) : s);

  return { screen: current.screen, state: current.state, push, pop, stackDepth: stack.length };
}

/* ── Root App ─────────────────────────────────────────────── */
export default function App() {
  const router = useRouter("landing");

  // Shared app state (persists across navigation)
  const [userData,   setUserData]   = useState(null);
  const [policyData, setPolicyData] = useState(null);

  // Clears all session state and returns to landing
  const handleLogout = () => {
    setUserData(null);
    setPolicyData(null);
    router.push("landing");
  };

  const render = () => {
    switch (router.screen) {

      case "landing":
        return (
          <Landing
            onStart={() => router.push("onboard")}
          />
        );

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
      <div style={{
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {render()}
      </div>
    </>
  );
}