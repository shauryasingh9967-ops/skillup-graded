const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { queryId, escapeRegex, round, gradeFor, oid } = require('../utils/helpers');
const { parseDay } = require('../utils/dates');
const { toCsv } = require('../utils/csv');
const { studentScope } = require('../services/scope');
const { attendanceByStudent, academicByStudent, shapeCounts } = require('../services/stats');
const AcademicRecord = require('../models/AcademicRecord');
const { dateRange } = require('../services/stats');

const ROW_LIMIT = 2000;
const POPULATE = [
  { path: 'batch', select: 'name' },
  { path: 'course', select: 'name' },
  { path: 'assignedTeacher', select: 'name' },
];

function readFilters(req) {
  const q = req.query;
  const from = q.from ? parseDay(String(q.from)) : undefined;
  const to = q.to ? parseDay(String(q.to)) : undefined;
  if ((q.from && !from) || (q.to && !to)) throw new ApiError(400, 'Dates must use YYYY-MM-DD.');
  if (from && to && from > to) throw new ApiError(400, 'The start date must be on or before the end date.');
  const filter = { ...studentScope(req) };
  const batch = queryId(q.batch, 'batch'); if (batch) filter.batch = batch;
  const course = queryId(q.course, 'course'); if (course) filter.course = course;
  const teacher = queryId(q.teacher, 'teacher'); if (teacher && req.user.role === 'ADMIN') filter.assignedTeacher = teacher;
  const student = queryId(q.student, 'student'); if (student) filter._id = student;
  if (q.status === 'ACTIVE' || q.status === 'INACTIVE') filter.status = q.status;
  if (q.search && String(q.search).trim()) {
    const rx = new RegExp(escapeRegex(String(q.search).trim()), 'i');
    filter.$or = [{ fullName: rx }, { studentId: rx }];
  }
  return { filter, from, to, subject: q.subject ? String(q.subject) : undefined };
}

async function loadStudents(filter) {
  const students = await Student.find(filter).sort({ studentId: 1 }).limit(ROW_LIMIT).populate(POPULATE).lean();
  return { students, ids: students.map((s) => s._id) };
}

const base = (s) => ({
  studentId: s.studentId,
  fullName: s.fullName,
  batch: s.batch ? s.batch.name : '',
  course: s.course ? s.course.name : '',
  teacher: s.assignedTeacher ? s.assignedTeacher.name : '',
});

const REPORTS = {
  async students(req) {
    const { filter, from, to } = readFilters(req);
    const { students, ids } = await loadStudents(filter);
    const [att, acad] = await Promise.all([attendanceByStudent(ids, from, to), academicByStudent(ids, from, to)]);
    const rows = students.map((s) => {
      const a = att.get(String(s._id)); const c = acad.get(String(s._id));
      return { ...base(s), phone: s.phone, guardian: `${s.guardianName} (${s.guardianPhone})`, admissionDate: s.admissionDate.toISOString().slice(0, 10), status: s.status, attendance: a ? a.percentage : null, academic: c ? c.percentage : null };
    });
    return {
      title: 'Student report',
      columns: [
        { key: 'studentId', label: 'Student ID' }, { key: 'fullName', label: 'Name' }, { key: 'batch', label: 'Batch' }, { key: 'course', label: 'Course' },
        { key: 'teacher', label: 'Teacher' }, { key: 'phone', label: 'Phone' }, { key: 'guardian', label: 'Guardian' },
        { key: 'admissionDate', label: 'Admitted' }, { key: 'status', label: 'Status' },
        { key: 'attendance', label: 'Attendance %', numeric: true }, { key: 'academic', label: 'Academic %', numeric: true },
      ],
      rows,
      summary: [
        { label: 'Students', value: rows.length },
        { label: 'Active', value: rows.filter((r) => r.status === 'ACTIVE').length },
        { label: 'Inactive', value: rows.filter((r) => r.status === 'INACTIVE').length },
      ],
    };
  },

  async attendance(req) {
    const { filter, from, to } = readFilters(req);
    const { students, ids } = await loadStudents(filter);
    const att = await attendanceByStudent(ids, from, to);
    const totals = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 };
    const rows = students.map((s) => {
      const a = att.get(String(s._id)) || shapeCounts({});
      totals.PRESENT += a.present; totals.ABSENT += a.absent; totals.LATE += a.late; totals.LEAVE += a.leave;
      return { ...base(s), present: a.present, absent: a.absent, late: a.late, leave: a.leave, total: a.total, percentage: a.percentage };
    });
    const overall = shapeCounts(totals);
    return {
      title: 'Attendance report',
      columns: [
        { key: 'studentId', label: 'Student ID' }, { key: 'fullName', label: 'Name' }, { key: 'batch', label: 'Batch' },
        { key: 'present', label: 'Present', numeric: true }, { key: 'absent', label: 'Absent', numeric: true }, { key: 'late', label: 'Late', numeric: true },
        { key: 'leave', label: 'Leave', numeric: true }, { key: 'total', label: 'Days recorded', numeric: true }, { key: 'percentage', label: 'Attendance %', numeric: true },
      ],
      rows,
      summary: [
        { label: 'Students', value: rows.length },
        { label: 'Overall attendance', value: overall.percentage == null ? '—' : `${overall.percentage}%` },
        { label: 'Present or late', value: overall.present + overall.late },
        { label: 'Absent', value: overall.absent },
        { label: 'Below 75%', value: rows.filter((r) => r.percentage != null && r.percentage < 75).length },
      ],
    };
  },

  async academic(req) {
    const { filter, from, to, subject } = readFilters(req);
    const { students, ids } = await loadStudents(filter);
    const acad = await academicByStudent(ids, from, to, subject);
    let obtained = 0; let max = 0; let records = 0;
    const rows = students.map((s) => {
      const c = acad.get(String(s._id));
      if (c) { obtained += c.obtained; max += c.max; records += c.records; }
      return { ...base(s), records: c ? c.records : 0, obtained: c ? c.obtained : null, max: c ? c.max : null, percentage: c ? c.percentage : null, grade: c ? c.grade : null };
    });
    const overall = max > 0 ? round((obtained / max) * 100, 1) : null;
    const match = { student: { $in: ids.map((i) => oid(i)) } };
    const dr = dateRange(from, to); if (dr) match.assessmentDate = dr;
    if (subject) match.subject = subject;
    const bySubject = await AcademicRecord.aggregate([
      { $match: match },
      { $group: { _id: '$subject', obtained: { $sum: '$marksObtained' }, max: { $sum: '$maxMarks' }, records: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return {
      title: 'Academic progress report',
      columns: [
        { key: 'studentId', label: 'Student ID' }, { key: 'fullName', label: 'Name' }, { key: 'batch', label: 'Batch' },
        { key: 'records', label: 'Assessments', numeric: true }, { key: 'obtained', label: 'Marks', numeric: true }, { key: 'max', label: 'Out of', numeric: true },
        { key: 'percentage', label: 'Percentage', numeric: true }, { key: 'grade', label: 'Grade' },
      ],
      rows,
      summary: [
        { label: 'Students', value: rows.length },
        { label: 'Assessments', value: records },
        { label: 'Average score', value: overall == null ? '—' : `${overall}%` },
        { label: 'Overall grade', value: gradeFor(overall) || '—' },
        { label: 'Below 40%', value: rows.filter((r) => r.percentage != null && r.percentage < 40).length },
      ],
      subjects: bySubject.map((s) => ({ subject: s._id, records: s.records, percentage: s.max > 0 ? round((s.obtained / s.max) * 100, 1) : null })),
    };
  },
};

exports.run = (type) => asyncHandler(async (req, res) => {
  const report = await REPORTS[type](req);
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(toCsv(report.columns, report.rows));
  }
  return ok(res, { ...report, generatedAt: new Date().toISOString(), truncated: report.rows.length >= ROW_LIMIT });
});
