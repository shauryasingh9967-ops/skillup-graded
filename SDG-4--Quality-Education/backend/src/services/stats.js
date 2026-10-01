const Attendance = require('../models/Attendance');
const AcademicRecord = require('../models/AcademicRecord');
const { round, gradeFor, oid } = require('../utils/helpers');
const { isoDay } = require('../utils/dates');

// Attended = PRESENT + LATE. LEAVE is excluded from the denominator.
function shapeCounts(counts) {
  const present = counts.PRESENT || 0;
  const absent = counts.ABSENT || 0;
  const late = counts.LATE || 0;
  const leave = counts.LEAVE || 0;
  const total = present + absent + late + leave;
  const denominator = total - leave;
  return { present, absent, late, leave, total, percentage: denominator > 0 ? round(((present + late) / denominator) * 100, 1) : null };
}

const idsMatch = (ids) => ids.map((i) => oid(i));

function dateRange(from, to) {
  if (!from && !to) return undefined;
  const r = {};
  if (from) r.$gte = from;
  if (to) r.$lte = to;
  return r;
}

async function attendanceStats(match) {
  const rows = await Attendance.aggregate([{ $match: match }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  const counts = {};
  rows.forEach((r) => { counts[r._id] = r.n; });
  return shapeCounts(counts);
}

async function attendanceDaily(match) {
  const rows = await Attendance.aggregate([
    { $match: match },
    { $group: { _id: { d: '$date', s: '$status' }, n: { $sum: 1 } } },
  ]);
  const byDay = new Map();
  rows.forEach((r) => {
    const key = isoDay(r._id.d);
    if (!byDay.has(key)) byDay.set(key, {});
    byDay.get(key)[r._id.s] = r.n;
  });
  return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, counts]) => ({ date, ...shapeCounts(counts) }));
}

// Map<studentId, stats> for a set of students.
async function attendanceByStudent(ids, from, to) {
  const match = { student: { $in: idsMatch(ids) } };
  const dr = dateRange(from, to);
  if (dr) match.date = dr;
  const rows = await Attendance.aggregate([
    { $match: match },
    { $group: { _id: { s: '$student', st: '$status' }, n: { $sum: 1 } } },
  ]);
  const grouped = new Map();
  rows.forEach((r) => {
    const k = String(r._id.s);
    if (!grouped.has(k)) grouped.set(k, {});
    grouped.get(k)[r._id.st] = r.n;
  });
  const out = new Map();
  grouped.forEach((counts, k) => out.set(k, shapeCounts(counts)));
  return out;
}

// Map<studentId, {records, obtained, max, percentage, grade}>
async function academicByStudent(ids, from, to, subject) {
  const match = { student: { $in: idsMatch(ids) } };
  const dr = dateRange(from, to);
  if (dr) match.assessmentDate = dr;
  if (subject) match.subject = subject;
  const rows = await AcademicRecord.aggregate([
    { $match: match },
    { $group: { _id: '$student', records: { $sum: 1 }, obtained: { $sum: '$marksObtained' }, max: { $sum: '$maxMarks' } } },
  ]);
  const out = new Map();
  rows.forEach((r) => {
    const percentage = r.max > 0 ? round((r.obtained / r.max) * 100, 1) : null;
    out.set(String(r._id), { records: r.records, obtained: r.obtained, max: r.max, percentage, grade: gradeFor(percentage) });
  });
  return out;
}

async function academicSummary(studentId) {
  const sid = oid(studentId);
  const [overallRows, subjectRows, trend] = await Promise.all([
    AcademicRecord.aggregate([{ $match: { student: sid } }, { $group: { _id: null, records: { $sum: 1 }, obtained: { $sum: '$marksObtained' }, max: { $sum: '$maxMarks' } } }]),
    AcademicRecord.aggregate([
      { $match: { student: sid } },
      { $group: { _id: '$subject', records: { $sum: 1 }, obtained: { $sum: '$marksObtained' }, max: { $sum: '$maxMarks' } } },
      { $sort: { _id: 1 } },
    ]),
    AcademicRecord.find({ student: sid }).sort({ assessmentDate: 1, createdAt: 1 }).select('assessmentDate percentage subject assessmentName').lean(),
  ]);
  const o = overallRows[0];
  const overallPct = o && o.max > 0 ? round((o.obtained / o.max) * 100, 1) : null;
  return {
    overall: { records: o ? o.records : 0, percentage: overallPct, grade: gradeFor(overallPct) },
    subjects: subjectRows.map((s) => {
      const percentage = s.max > 0 ? round((s.obtained / s.max) * 100, 1) : null;
      return { subject: s._id, records: s.records, percentage, grade: gradeFor(percentage) };
    }),
    trend: trend.map((t) => ({ date: isoDay(t.assessmentDate), percentage: t.percentage, subject: t.subject, assessmentName: t.assessmentName })),
  };
}

module.exports = { shapeCounts, dateRange, attendanceStats, attendanceDaily, attendanceByStudent, academicByStudent, academicSummary };
