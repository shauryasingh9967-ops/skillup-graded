const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { pageParams, pagination, queryId, oid } = require('../utils/helpers');
const { parseDay, todayLocal, addDays } = require('../utils/dates');
const { studentScope, scopedStudentIds, getAccessibleStudent } = require('../services/scope');
const { attendanceStats, attendanceDaily, dateRange, shapeCounts } = require('../services/stats');

function dayParam(value, name) {
  if (value == null || value === '') return undefined;
  const d = parseDay(String(value));
  if (!d) throw new ApiError(400, `${name} must be a valid date (YYYY-MM-DD).`);
  return d;
}

// Builds a match filter for attendance queries honouring the teacher's scope.
async function buildMatch(req) {
  const q = req.query;
  const match = {};
  const date = dayParam(q.date, 'date');
  const from = dayParam(q.from, 'from');
  const to = dayParam(q.to, 'to');
  if (date) match.date = date;
  else { const dr = dateRange(from, to); if (dr) match.date = dr; }
  const batch = queryId(q.batch, 'batch'); if (batch) match.batch = oid(batch);
  const student = queryId(q.student, 'student');
  if (q.status && Attendance.STATUSES.includes(q.status)) match.status = q.status;
  const ids = await scopedStudentIds(req);
  if (student) {
    if (ids && !ids.some((i) => String(i) === student)) throw new ApiError(403, 'This student is not assigned to you.');
    match.student = oid(student);
  } else if (ids) {
    match.student = { $in: ids };
  }
  return match;
}

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 20, 100);
  const match = await buildMatch(req);
  const [items, total] = await Promise.all([
    Attendance.find(match).sort({ date: -1, _id: 1 }).skip(skip).limit(limit)
      .populate('student', 'studentId fullName').populate('batch', 'name code').populate('markedBy', 'name').lean(),
    Attendance.countDocuments(match),
  ]);
  ok(res, { items, pagination: pagination(page, limit, total) });
});

// Roster for a batch + date with any existing marks (drives the fast marking screen).
exports.sheet = asyncHandler(async (req, res) => {
  const date = dayParam(req.query.date, 'date');
  const batchId = queryId(req.query.batch, 'batch');
  if (!date || !batchId) throw new ApiError(400, 'Both date and batch are required.');
  const batch = await Batch.findById(batchId).populate('course', 'name code').lean();
  if (!batch) throw new ApiError(404, 'Batch not found.');
  const students = await Student.find({ batch: batchId, status: 'ACTIVE', ...studentScope(req) }).sort({ studentId: 1 }).select('studentId fullName').lean();
  const records = await Attendance.find({ date, student: { $in: students.map((s) => s._id) } }).select('student status remarks').lean();
  const map = new Map(records.map((r) => [String(r.student), r]));
  const rows = students.map((s) => {
    const r = map.get(String(s._id));
    return { _id: s._id, studentId: s.studentId, fullName: s.fullName, recordId: r ? r._id : null, status: r ? r.status : null, remarks: r ? r.remarks || '' : '' };
  });
  ok(res, { date: req.query.date, batch, students: rows, marked: records.length });
});

exports.bulk = asyncHandler(async (req, res) => {
  const { date: dateStr, batch: batchId, records } = req.body;
  const date = parseDay(dateStr);
  if (date > todayLocal()) throw new ApiError(422, 'Attendance cannot be marked for a future date.', [{ field: 'date', message: 'Choose today or an earlier date.' }]);
  if (!(await Batch.exists({ _id: batchId }))) throw new ApiError(404, 'Batch not found.');

  const ids = records.map((r) => r.student);
  if (new Set(ids).size !== ids.length) throw new ApiError(422, 'Each student can appear only once in a submission.');

  const students = await Student.find({ _id: { $in: ids }, ...studentScope(req) }).select('batch status').lean();
  if (students.length !== ids.length) throw new ApiError(403, 'Some students do not exist or are not assigned to you.');
  const bad = students.find((s) => String(s.batch) !== String(batchId) || s.status !== 'ACTIVE');
  if (bad) throw new ApiError(422, 'Attendance can only be marked for active students in the selected batch.');

  const ops = records.map((r) => ({
    updateOne: {
      filter: { student: oid(r.student), date },
      update: { $set: { status: r.status, remarks: r.remarks || undefined, batch: oid(batchId), markedBy: req.user._id } },
      upsert: true,
    },
  }));
  // remarks: undefined must clear the field, so unset explicitly
  ops.forEach((op, i) => {
    if (!records[i].remarks) { delete op.updateOne.update.$set.remarks; op.updateOne.update.$unset = { remarks: '' }; }
  });
  const result = await Attendance.bulkWrite(ops, { ordered: false });
  ok(res, { date: dateStr, total: records.length, created: result.upsertedCount, updated: result.modifiedCount },
    `Attendance saved for ${records.length} student${records.length === 1 ? '' : 's'}`);
});

exports.update = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) throw new ApiError(404, 'Attendance record not found.');
  await getAccessibleStudent(req, record.student, '_id assignedTeacher');
  if (req.body.status) record.status = req.body.status;
  if (req.body.remarks !== undefined) record.remarks = req.body.remarks || undefined;
  record.markedBy = req.user._id;
  await record.save();
  ok(res, record, 'Attendance updated');
});

exports.studentHistory = asyncHandler(async (req, res) => {
  const student = await getAccessibleStudent(req, req.params.id, 'studentId fullName assignedTeacher');
  const from = dayParam(req.query.from, 'from');
  const to = dayParam(req.query.to, 'to');
  const match = { student: oid(req.params.id) };
  const dr = dateRange(from, to);
  if (dr) match.date = dr;
  const [stats, records, dailyRows] = await Promise.all([
    attendanceStats(match),
    Attendance.find(match).sort({ date: -1 }).limit(400).select('date status remarks').lean(),
    attendanceDaily(match),
  ]);
  // Roll daily rows up into months (kept in JS so it works on any MongoDB-compatible server).
  const months = new Map();
  dailyRows.forEach((d) => {
    const key = d.date.slice(0, 7);
    if (!months.has(key)) months.set(key, { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 });
    const m = months.get(key);
    m.PRESENT += d.present; m.ABSENT += d.absent; m.LATE += d.late; m.LEAVE += d.leave;
  });
  const monthly = [...months.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([month, c]) => ({ month, ...shapeCounts(c) }));
  ok(res, { student: { _id: student._id, studentId: student.studentId, fullName: student.fullName }, stats, monthly, records });
});

exports.summary = asyncHandler(async (req, res) => {
  const match = await buildMatch(req);
  if (!match.date) match.date = { $gte: addDays(todayLocal(), -29) };
  const [stats, daily] = await Promise.all([attendanceStats(match), attendanceDaily(match)]);
  ok(res, { stats, daily });
});
