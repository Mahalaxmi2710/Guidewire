// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Weather API Integration
//  Primary:   Open-Meteo (free, no API key required)
//  Secondary: OpenWeatherMap (set VITE_WEATHER_API_KEY in .env)
//  Fallback:  Realistic mock with zone-specific jitter
//
//  Cache layer: in-memory, 15-min TTL per zone
//  Export getCacheStats() for admin display.
// ─────────────────────────────────────────────────────────────

const ZONE_COORDS = {
  velachery:  { lat: 12.9780, lon: 80.2209 },
  t_nagar:    { lat: 13.0418, lon: 80.2341 },
  anna_nagar: { lat: 13.0849, lon: 80.2101 },
  adyar:      { lat: 13.0012, lon: 80.2565 },
  perambur:   { lat: 13.1162, lon: 80.2351 },
  tambaram:   { lat: 12.9249, lon: 80.1000 },
};

const ZONE_BASELINES = {
  velachery:  { rainfall: 34, temperature: 35, aqi: 142, traffic: 68 },
  t_nagar:    { rainfall: 22, temperature: 36, aqi: 155, traffic: 72 },
  anna_nagar: { rainfall: 10, temperature: 34, aqi: 110, traffic: 55 },
  adyar:      { rainfall: 18, temperature: 35, aqi: 130, traffic: 60 },
  perambur:   { rainfall: 28, temperature: 37, aqi: 168, traffic: 70 },
  tambaram:   { rainfall: 12, temperature: 34, aqi: 108, traffic: 48 },
};

// ── Demo Overrides ────────────────────────────────────────────
let _demoOverwrites = {};
export function setDemoWeather(zoneId, data) { _demoOverwrites[zoneId] = { ...data, source: "demo" }; }
export function clearDemoWeather(zoneId) { if(zoneId) delete _demoOverwrites[zoneId]; else _demoOverwrites = {}; }
export function isDemoActive() { return Object.keys(_demoOverwrites).length > 0; }

// ── In-Memory Cache (15-min TTL) ──────────────────────────────
const CACHE_TTL_MS = 15 * 60 * 1000;
const _cache       = new Map();
let   _cacheHits   = 0;
let   _cacheMisses = 0;

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) { _cacheMisses++; return null; }
  if (Date.now() - entry.ts > CACHE_TTL_MS) { _cache.delete(key); _cacheMisses++; return null; }
  _cacheHits++;
  console.log(`[WeatherCache] HIT for ${key} (${Math.round((Date.now() - entry.ts) / 1000)}s old)`);
  return entry.data;
}
function setCache(key, data) { _cache.set(key, { data, ts: Date.now() }); }

export function getCacheStats() {
  const total = _cacheHits + _cacheMisses;
  return {
    hits:    _cacheHits,
    misses:  _cacheMisses,
    hitRate: total > 0 ? Math.round((_cacheHits / total) * 100) : 0,
    entries: _cache.size,
    ttlMin:  CACHE_TTL_MS / 60000,
  };
}

// ── AQI Risk Score ────────────────────────────────────────────
/** Converts raw AQI (0–500 scale) → normalized 0–100 risk score for ML. */
export function getAQIRiskScore(aqi) {
  return Math.min(100, Math.round((aqi / 500) * 100));
}

// ── Primary: Open-Meteo (no API key) ─────────────────────────
async function fetchFromOpenMeteo(zoneId) {
  const { lat, lon } = ZONE_COORDS[zoneId] || ZONE_COORDS.velachery;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=precipitation,temperature_2m&timezone=Asia%2FKolkata&forecast_days=1`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();
  const hour        = new Date().getHours();
  const rainfall    = (data.hourly?.precipitation?.[hour] ?? 0) * 10;
  const temperature = data.current_weather?.temperature ?? ZONE_BASELINES[zoneId].temperature;

  let aqi = ZONE_BASELINES[zoneId].aqi;
  try {
    const aqiUrl  = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=european_aqi&timezone=Asia%2FKolkata&forecast_days=1`;
    const aqiRes  = await fetch(aqiUrl);
    if (aqiRes.ok) {
      const aqiData = await aqiRes.json();
      const raw     = aqiData.hourly?.european_aqi?.[hour];
      if (raw != null) aqi = Math.min(500, Math.round(raw * 4.5));
    }
  } catch (_) {}

  return {
    rainfall:    Math.max(0, Math.round(rainfall)),
    temperature: Math.round(temperature * 10) / 10,
    aqi:         Math.max(30, Math.round(aqi)),
    traffic:     ZONE_BASELINES[zoneId].traffic + Math.round((Math.random() - 0.5) * 12),
    source:      "open-meteo",
    fetchedAt:   Date.now(),
  };
}

// ── Secondary: OpenWeatherMap ─────────────────────────────────
async function fetchFromOWM(zoneId) {
  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  if (!API_KEY) throw new Error("No OWM API key");
  const { lat, lon } = ZONE_COORDS[zoneId] || ZONE_COORDS.velachery;
  const res  = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
  if (!res.ok) throw new Error(`OWM error: ${res.status}`);
  const data = await res.json();
  const rainfall    = data.rain?.["1h"] ? data.rain["1h"] * 10 : 0;
  const temperature = data.main.temp;
  let aqi = ZONE_BASELINES[zoneId].aqi;
  try {
    const aqiRes  = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
    const aqiData = await aqiRes.json();
    const owmAqi  = aqiData.list?.[0]?.main?.aqi || 2;
    aqi = owmAqi * 75;
  } catch (_) {}
  return {
    rainfall: Math.max(0, Math.round(rainfall)),
    temperature: Math.round(temperature * 10) / 10,
    aqi: Math.round(aqi),
    traffic: ZONE_BASELINES[zoneId].traffic + Math.round((Math.random() - 0.5) * 12),
    source: "openweathermap",
    fetchedAt: Date.now(),
  };
}

// ── Mock Fallback ─────────────────────────────────────────────
function mockWeather(zoneId) {
  const base = ZONE_BASELINES[zoneId] || ZONE_BASELINES.velachery;
  return {
    rainfall:    Math.max(0,  base.rainfall    + Math.round((Math.random() - 0.5) * 8)),
    temperature: Math.max(28, base.temperature + Math.round((Math.random() - 0.5) * 3)),
    aqi:         Math.max(50, base.aqi         + Math.round((Math.random() - 0.5) * 30)),
    traffic:     Math.max(20, base.traffic     + Math.round((Math.random() - 0.5) * 15)),
    source:      "mock",
    fetchedAt:   Date.now(),
  };
}

// ── Main Exports ──────────────────────────────────────────────
/**
 * fetchWeather — tries Open-Meteo → OWM → mock.
 * Results are cached for 15 minutes per zone.
 */
export async function fetchWeather(zoneId) {
  if (_demoOverwrites[zoneId]) {
    console.log(`[WeatherAPI] DEMO MODE active for ${zoneId}`);
    return { ..._demoOverwrites[zoneId], fetchedAt: Date.now() };
  }

  const cached = getCached(zoneId);
  if (cached) return cached;

  let result;
  try       { result = await fetchFromOpenMeteo(zoneId); }
  catch (_) {
    try     { result = await fetchFromOWM(zoneId); }
    catch(_){ result = mockWeather(zoneId); }
  }
  setCache(zoneId, result);
  return result;
}

/**
 * fetchForecast — returns 8-period (24h) disruption forecast.
 */
export async function fetchForecast(zoneId) {
  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  if (API_KEY) {
    try {
      const { lat, lon } = ZONE_COORDS[zoneId] || ZONE_COORDS.velachery;
      const res  = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&cnt=8`);
      const data = await res.json();
      return data.list.map(item => ({
        time:        item.dt_txt,
        rainfall:    item.rain?.["3h"] ? item.rain["3h"] * 3 : 0,
        temperature: item.main.temp,
        description: item.weather[0].description,
      }));
    } catch (_) {}
  }
  const base = ZONE_BASELINES[zoneId] || ZONE_BASELINES.velachery;
  return Array.from({ length: 8 }, (_, i) => ({
    time:        new Date(Date.now() + i * 3 * 3600 * 1000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    rainfall:    Math.max(0, base.rainfall + (i > 3 ? i * 4 : -i * 2)),
    temperature: base.temperature + Math.sin(i) * 2,
    description: i > 4 ? "light rain" : "partly cloudy",
  }));
}

/**
 * evaluateTriggers — checks weather against parametric thresholds.
 */
export function evaluateTriggers(weather, dailyEarning) {
  const triggers = [];
  const hourly   = dailyEarning / 10;
  if (weather.rainfall    >= 50)  triggers.push({ type: "rainfall",    label: "Heavy Rainfall",   payout: Math.round(hourly * 4   * 0.9)  });
  if (weather.temperature >= 40)  triggers.push({ type: "temperature", label: "Extreme Heat",     payout: Math.round(hourly * 2.5 * 0.7)  });
  if (weather.aqi         >= 300) triggers.push({ type: "aqi",         label: "Severe Pollution", payout: Math.round(hourly * 3   * 0.75) });
  if (weather.traffic     >= 80)  triggers.push({ type: "traffic",     label: "Traffic Lockdown", payout: Math.round(hourly * 2   * 0.6)  });
  return triggers;
}
