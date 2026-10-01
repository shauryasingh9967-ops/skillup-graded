export const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in the browser's time zone

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function fmtDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const fmtShortDay = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' });
export const fmtMonth = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
export const pct = (v) => (v == null ? '—' : `${v}%`);
export const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('') || '?';
export const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
export const label = (s) => (s ? s.charAt(0) + s.slice(1).toLowerCase() : '');
export const meterTone = (v) => (v == null ? '' : v >= 75 ? 'good' : v >= 50 ? 'warn' : 'bad');

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'];
export const ASSESSMENT_TYPES = ['QUIZ', 'ASSIGNMENT', 'MIDTERM', 'FINAL', 'PRACTICAL'];
export const PHONE_RE = /^\+?[0-9][0-9\s-]{6,14}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
