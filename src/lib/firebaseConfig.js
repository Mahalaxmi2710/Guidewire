// ─────────────────────────────────────────────────────────────
//  RideSure — Firebase Config
//  Replace the placeholder values below with your real
//  Firebase project config from:
//  console.firebase.google.com → Project Settings → Your Apps
// ─────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID",
};

// ── How to get these values ───────────────────────────────────
// 1. Go to https://console.firebase.google.com
// 2. Create a project (or open existing)
// 3. Click the </> Web icon to register a web app
// 4. Copy the firebaseConfig object and paste it above
//
// ── Firestore Setup ───────────────────────────────────────────
// 1. In Firebase console → Build → Firestore Database
// 2. Click "Create database" → Start in test mode → Choose region
// 3. That's it — the app will auto-create collections on first use
//
// ── Collections used by RideSure ─────────────────────────────
//   /users/{uid}             — worker profile
//   /policies/{id}           — insurance policies
//   /claims/{id}             — claim records
//   /earnings/{uid}          — user weekly earnings history
//   /platform_activity/{city} — city-level order/rider stats
//   /risk_data/{zoneId}       — live ML risk snapshots
//   /config/global_risk      — admin-controlled risk switch
//
// ── Auth Providers ────────────────────────────────────────────
//   Email/Password (Primary)
//   Google OAuth (Secondary)
