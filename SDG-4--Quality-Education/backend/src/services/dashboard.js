const Student = require('../models/Student');
const User = require('../models/User');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const AcademicRecord = require('../models/AcademicRecord');
const { oid, round } = require('../utils/helpers');
const { todayLocal, addDays, isoDay } = require('../utils/dates');
const { attendanceStats, attendanceDaily, shapeCounts } = require('./stats');

const ATTENDANCE_ALERT_BELOW = 75;
const SCORE_ALERT_BELOW = 40;

async function attentionStudents(ids, today) {
  const since = addDays(today, -29);
  const [att, acad] = await Promise.all([
    Attendance.aggregate([
      { $match: { student: { $in: ids }, date: { $gte: since } } },
      { $group: { _id: { s: '$student', st: '$status' }, n: { $sum: 1 } } },
    ]),
    AcademicRecord.aggregate([
      { $match: { student: { $in: ids } } },
      { $group: { _id: '$student', obtained: { $sum: '$marksObtained' }, max: { $sum: '$maxMarks' } } },
    ]),
  ]);
  const counts = new Map();
  att.forEach((r) => { const k = String(r._id.s); if (!counts.has(k)) counts.set(k, {}); counts.get(k)[r._id.st] = r.n; });
  const flags = new Map();
  counts.forEach((c, k) => {
    const s = shapeCounts(c);
    if (s.total - s.leave >= 3 && s.percentage != null && s.percentage < ATTENDANCE_ALERT_BELOW) {
      flags.set(k, { attendance: s.percentage });
    }
  });
  acad.forEach((r) => {
    const pct = r.max > 0 ? round((r.obtained / r.max) * 100, 1) : null;
    if (pct != null && pct < SCORE_ALERT_BELOW) flags.set(String(r._id), { ...(flags.get(String(r._id)) || {}), score: pct });
  });
  if (!flags.size) return { total: 0, items: [] };
  const students = await Student.find({ _id: { $in: [...flags.keys()].map(oid) }, status: 'ACTIVE' }).select('studentId fullName').populate('batch', 'name').lean();
  const items = students.map((s) => {
    const f = flags.get(String(s._id));
    const reasons = [];
    if (f.attendance != null) reasons.push(`Attendance ${f.attendance}% in the last 30 days`);
    if (f.score != null) reasons.push(`Average score ${f.score}%`);
    return { _id: s._id, studentId: s.studentId, fullName: s.fullName, batch: s.batch ? s.batch.name : null, reasons, severity: (f.attendance != null ? 1 : 0) + (f.score != null ? 1 : 0) };
  }).sort((a, b) => b.severity - a.severity || a.fullName.localeCompare(b.fullName));
  return { total: items.length, items: items.slice(0, 8) };
}

// scopeFilter: {} for admin, { assignedTeacher } for teachers.
async function buildDashboard(scopeFilter, user) {
  const today = todayLocal();
  const isAdmin = user.role === 'ADMIN';
  const students = await Student.find(scopeFilter).select('_id status').lean();
  const allIds = students.map((s) => s._id);
  const activeIds = students.filter((s) => s.status === 'ACTIVE').map((s) => s._id);
  const trendFrom = addDays(today, -13);

  const [todayStats, trend, weekStats, subjectRows, recentStudents, recentRecords, batchGroups, attention, teacherCount] = await Promise.all([
    attendanceStats({ student: { $in: allIds }, date: today }),
    attendanceDaily({ student: { $in: allIds }, date: { $gte: trendFrom, $lte: today } }),
    attendanceStats({ student: { $in: allIds }, date: { $gte: addDays(today, -6), $lte: today } }),
    AcademicRecord.aggregate([
      { $match: { student: { $in: allIds } } },
      { $group: { _id: '$subject', obtained: { $sum: '$marksObtained' }, max: { $sum: '$maxMarks' }, records: { $sum: 1 } } },
      { $sort: { records: -1 } },
      { $limit: 8 },
    ]),
    Student.find(scopeFilter).sort({ createdAt: -1 }).limit(5).select('studentId fullName status createdAt').populate('batch', 'name').lean(),
    AcademicRecord.find({ student: { $in: allIds }, ...(isAdmin ? {} : { teacher: user._id }) }).sort({ createdAt: -1 }).limit(5)
      .populate('student', 'fullName').populate('teacher', 'name').lean(),
    Student.aggregate([
      { $match: { ...scopeFilter, status: 'ACTIVE' } },
      { $group: { _id: '$batch', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]),
    attentionStudents(activeIds, today),
    isAdmin ? User.countDocuments({ role: 'TEACHER', isActive: true }) : null,
  ]);

  const batchDocs = await Batch.find({ _id: { $in: batchGroups.map((b) => b._id) } }).select('name').lean();
  const batchName = new Map(batchDocs.map((b) => [String(b._id), b.name]));
  const markedToday = todayStats.total;
  const activity = [
    ...recentStudents.map((s) => ({ type: 'STUDENT_ADDED', at: s.createdAt, text: `${s.fullName} was added${s.batch ? ` to ${s.batch.name}` : ''}` })),
    ...recentRecords.map((r) => ({ type: 'ASSESSMENT', at: r.createdAt, text: `${r.student ? r.student.fullName : 'A student'} scored ${r.percentage}% in ${r.subject} (${r.assessmentName})` })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);

  const kpis = {
    totalStudents: students.length,
    activeStudents: activeIds.length,
    attendanceMarkedToday: markedToday,
    attendancePendingToday: Math.max(activeIds.length - markedToday, 0),
    attendanceRateToday: todayStats.percentage,
    attendanceRateWeek: weekStats.percentage,
    needsAttention: attention.total,
  };
  if (isAdmin) kpis.totalTeachers = teacherCount;

  return {
    role: user.role,
    today: isoDay(today),
    kpis,
    todayAttendance: todayStats,
    trend,
    batchDistribution: batchGroups.map((b) => ({ name: batchName.get(String(b._id)) || 'Unassigned', students: b.n })),
    subjectPerformance: subjectRows.map((s) => ({ subject: s._id, records: s.records, percentage: s.max > 0 ? round((s.obtained / s.max) * 100, 1) : null })),
    recentStudents,
    activity,
    attention: attention.items,
  };
}

module.exports = { buildDashboard };
