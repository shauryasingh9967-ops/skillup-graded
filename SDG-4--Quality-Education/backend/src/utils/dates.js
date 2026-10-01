const env = require('../config/env');

const DAY_MS = 86400000;

// Parse "YYYY-MM-DD" into a Date at 00:00 UTC. Returns null when invalid.
function parseDay(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const d = new Date(`${str}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 10) !== str) return null; // rejects 2024-02-31 etc.
  return d;
}

// "Today" as a UTC-midnight Date, based on the institute's time zone offset.
function todayLocal() {
  const shifted = new Date(Date.now() + env.tzOffsetMinutes * 60000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);
const isoDay = (d) => d.toISOString().slice(0, 10);

module.exports = { DAY_MS, parseDay, todayLocal, addDays, isoDay };
