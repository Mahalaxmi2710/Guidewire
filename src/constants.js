// ─────────────────────────────────────────────────────────────
//  RideSure — Constants, Design Tokens & Static Data
// ─────────────────────────────────────────────────────────────

/* ── Design System ── */
export const DS = {
  bg:      "#0C0E14",
  surface: "#13161F",
  card:    "#181C28",
  border:  "rgba(255,255,255,0.07)",
  accent:  "#F97316",   // saffron
  accent2: "#FBBF24",   // amber
  blue:    "#38BDF8",
  green:   "#34D399",
  red:     "#F87171",
  muted:   "rgba(255,255,255,0.35)",
  font:    "'Plus Jakarta Sans', sans-serif",
  display: "'Plus Jakarta Sans', sans-serif",
};

/* ── Zone Data ── */
export const ZONES = [
  { id: "velachery",  name: "Velachery",  risk: "high",   score: 82, flood: 88, rain: 76, aqi: 72, hist: 9 },
  { id: "t_nagar",    name: "T. Nagar",   risk: "medium", score: 54, flood: 48, rain: 60, aqi: 55, hist: 5 },
  { id: "anna_nagar", name: "Anna Nagar", risk: "low",    score: 19, flood: 12, rain: 24, aqi: 20, hist: 2 },
  { id: "adyar",      name: "Adyar",      risk: "medium", score: 46, flood: 52, rain: 38, aqi: 44, hist: 4 },
  { id: "perambur",   name: "Perambur",   risk: "high",   score: 78, flood: 72, rain: 84, aqi: 68, hist: 8 },
  { id: "tambaram",   name: "Tambaram",   risk: "low",    score: 22, flood: 16, rain: 28, aqi: 18, hist: 2 },
];

/* ── Platforms ── */
export const PLATFORMS = [
  { id: "swiggy", name: "Swiggy", color: "#FC8019", emoji: "🧡" },
  { id: "zomato", name: "Zomato", color: "#E23744", emoji: "❤️" },
  { id: "both",   name: "Both",   color: "#8B5CF6", emoji: "💜" },
];

/* ── Risk Metadata ── */
export const RISK_META = {
  low:    { label: "Low Risk",    bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.3)",  text: "#34D399", bar: "#34D399" },
  medium: { label: "Medium Risk", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  text: "#FBBF24", bar: "#FBBF24" },
  high:   { label: "High Risk",   bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", text: "#F87171", bar: "#F87171" },
};

/* ── Parametric Trigger Configs (used in RiskProfile + Dashboard) ── */
export const TRIGGER_CONFIGS = {
  rain: {
    key: "rainfall", target: 67, step: 2.5, threshold: 50,
    label: "Heavy Rainfall",    trigger: "67mm > 50mm threshold",
    hours: 4,   sev: 0.9,  color: "#38BDF8", emoji: "🌧️",
  },
  heat: {
    key: "temperature", target: 43, step: 0.8, threshold: 40,
    label: "Extreme Heat",      trigger: "43°C > 40°C threshold",
    hours: 2.5, sev: 0.7,  color: "#F87171", emoji: "🌡️",
  },
  aqi: {
    key: "aqi", target: 318, step: 9, threshold: 300,
    label: "Severe Pollution",  trigger: "AQI 318 > 300 threshold",
    hours: 3,   sev: 0.75, color: "#FBBF24", emoji: "💨",
  },
  traffic: {
    key: "traffic", target: 92, step: 4, threshold: 80,
    label: "Traffic Lockdown",  trigger: "Congestion index 92 > 80",
    hours: 2,   sev: 0.6,  color: "#F97316", emoji: "🚦",
  },
};

/* ── Default live metric state ── */
export const DEFAULT_METRICS = {
  rainfall: 34, temperature: 35, aqi: 142, traffic: 38,
};

/* ── SVG path dictionary ── */
export const P = {
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  zap:      "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  rain:     "M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25M8 19v1m4-3v3m4-1v1",
  heat:     "M12 2a7 7 0 0 1 7 7c0 3.87-3.13 7-7 7s-7-3.13-7-7a7 7 0 0 1 7-7zM12 16v6M8 18l4 4 4-4",
  wind:     "M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2.5 2.5 0 1 1 19.5 12H2m7.59-1.59A2 2 0 1 0 11 16H2",
  traffic:  "M3 17h18M3 12h18M3 7h18",
  platform: "M18 20V10M12 20V4M6 20v-6",
  check:    "M20 6L9 17l-5-5",
  arrow:    "M5 12h14M12 5l7 7-7 7",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  map:      "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z",
  bell:     "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  wallet:   "M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M16 14h.01",
  chart:    "M18 20V10M12 20V4M6 20v-6",
  scan:     "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18",
  refresh:  "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  back:     "M19 12H5M12 19l-7-7 7-7",
};
