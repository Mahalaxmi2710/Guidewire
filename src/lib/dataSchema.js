// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Platform Activity & Earnings Data Schema
//
//  Platform Activity schema:
//    { date, city, total_orders, active_riders,
//      avg_delivery_time, demand_supply_ratio }
//
//  User Earnings schema:
//    { user_id, date, hours_online, orders_completed,
//      daily_earnings, avg_hourly_income,
//      weekly_avg_earnings, active_days_per_week }
// ─────────────────────────────────────────────────────────────

const CITY_BASELINES = {
  velachery:  { orders: 420, riders: 52, delivery_time: 28 },
  t_nagar:    { orders: 510, riders: 63, delivery_time: 32 },
  anna_nagar: { orders: 280, riders: 38, delivery_time: 24 },
  adyar:      { orders: 350, riders: 44, delivery_time: 26 },
  perambur:   { orders: 390, riders: 48, delivery_time: 30 },
  tambaram:   { orders: 220, riders: 29, delivery_time: 22 },
};
const CITIES = Object.keys(CITY_BASELINES);

// ── Generators ────────────────────────────────────────────────
function generatePlatformActivity(city, daysBack = 30) {
  const b = CITY_BASELINES[city] || CITY_BASELINES.velachery;
  return Array.from({ length: daysBack }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (daysBack - 1 - i));
    const total_orders        = Math.max(50,  Math.round(b.orders + (Math.random() - 0.5) * 80));
    const active_riders       = Math.max(10,  Math.round(b.riders + (Math.random() - 0.5) * 12));
    const demand_supply_ratio = Math.round((total_orders / active_riders) * 10) / 10;
    return {
      date:              d.toISOString().split("T")[0],
      city,
      total_orders,
      active_riders,
      avg_delivery_time: Math.max(15, Math.round(b.delivery_time + (Math.random() - 0.5) * 6)),
      demand_supply_ratio,
    };
  });
}

function generateUserEarnings(userId, dailyEarning = 600, weeksBack = 4) {
  const records = [];
  for (let w = weeksBack - 1; w >= 0; w--) {
    const weekDays = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - (w * 7 + d));
      const active            = Math.random() > 0.18;
      const hours_online      = active ? Math.round(7 + Math.random() * 4) : 0;
      const orders_completed  = active ? Math.round(hours_online * 2.4 + (Math.random() - 0.5) * 3) : 0;
      const daily_earnings    = active ? Math.round(dailyEarning * (0.75 + Math.random() * 0.5)) : 0;
      const avg_hourly_income = hours_online > 0 ? Math.round(daily_earnings / hours_online) : 0;
      weekDays.push({ daily_earnings, active });
      records.push({
        user_id: userId, date: date.toISOString().split("T")[0],
        hours_online, orders_completed, daily_earnings, avg_hourly_income,
        weekly_avg_earnings: 0, active_days_per_week: 0,
      });
    }
    const activeDays  = weekDays.filter(r => r.active).length;
    const weeklyAvg   = Math.round(weekDays.reduce((a, r) => a + r.daily_earnings, 0) / 7);
    const weekStart   = records.length - 7;
    for (let i = weekStart; i < records.length; i++) {
      records[i].weekly_avg_earnings  = weeklyAvg;
      records[i].active_days_per_week = activeDays;
    }
  }
  return records;
}

// ── In-Memory Store ───────────────────────────────────────────
let _platformData = {};
let _userEarnings = {};

// ── Seed Functions ────────────────────────────────────────────
export function seedPlatformData() {
  CITIES.forEach(city => { _platformData[city] = generatePlatformActivity(city, 30); });
  console.log("[DataSchema] Platform activity seeded for", CITIES.length, "cities");
}

export function seedUserEarnings(userId, dailyEarning = 600) {
  if (_userEarnings[userId]) return;
  _userEarnings[userId] = generateUserEarnings(userId, dailyEarning, 4);
  console.log("[DataSchema] Earnings seeded for", userId, "@ ₹", dailyEarning, "/day");
}

// ── Query Functions ───────────────────────────────────────────
export function getPlatformActivity(city, days = 7) {
  if (!_platformData[city]) seedPlatformData();
  return (_platformData[city] || []).slice(-days);
}

export function getAllPlatformSummary() {
  if (Object.keys(_platformData).length === 0) seedPlatformData();
  return CITIES.map(city => {
    const recent    = (_platformData[city] || []).slice(-7);
    const avg       = (key) => Math.round(recent.reduce((a, b) => a + b[key], 0) / recent.length);
    const avgOrders = avg("total_orders");
    const avgRiders = avg("active_riders");
    const avgRatio  = Math.round(recent.reduce((a, b) => a + b.demand_supply_ratio, 0) / recent.length * 10) / 10;
    const avgTime   = avg("avg_delivery_time");
    return { city, avgOrders, avgRiders, avgRatio, avgTime };
  });
}

export function getUserEarnings(userId) { return _userEarnings[userId] || []; }

export function getLatestEarningsStats(userId) {
  const records = _userEarnings[userId];
  if (!records || !records.length) return null;
  const lastWeek         = records.slice(-7);
  const activeDays       = lastWeek.filter(r => r.daily_earnings > 0).length;
  const totalEarnings    = lastWeek.reduce((a, r) => a + r.daily_earnings, 0);
  const totalOrders      = lastWeek.reduce((a, r) => a + r.orders_completed, 0);
  const totalHours       = lastWeek.reduce((a, r) => a + r.hours_online, 0);
  const weekly_avg_earnings = Math.round(totalEarnings / 7);
  const avg_hourly_income   = totalHours > 0 ? Math.round(totalEarnings / totalHours) : 0;
  return { activeDays, totalEarnings, totalOrders, totalHours, weekly_avg_earnings, avg_hourly_income };
}

export function getWeeklyAvgEarnings(userId) {
  const s = getLatestEarningsStats(userId);
  return s ? s.weekly_avg_earnings : 0;
}
