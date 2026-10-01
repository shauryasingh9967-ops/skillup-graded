const AcademicRecord = require('../models/AcademicRecord');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { pageParams, pagination, queryId, oid, escapeRegex } = require('../utils/helpers');
const { parseDay } = require('../utils/dates');
const { scopedStudentIds, getAccessibleStudent } = require('../services/scope');
const { academicSummary, dateRange } = require('../services/stats');

const POPULATE = [
  { path: 'student', select: 'studentId fullName' },
  { path: 'teacher', select: 'name' },
];

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 15, 100);
  const q = req.query;
  const filter = {};
  const student = queryId(q.student, 'student');
  const ids = await scopedStudentIds(req);
  if (student) {
    if (ids && !ids.some((i) => String(i) === student)) throw new ApiError(403, 'This student is not assigned to you.');
    filter.student = student;
  } else if (ids) {
    filter.student = { $in: ids };
  }
  if (q.subject) filter.subject = new RegExp(`^${escapeRegex(String(q.subject))}$`, 'i');
  if (AcademicRecord.TYPES.includes(q.type)) filter.assessmentType = q.type;
  const from = q.from ? parseDay(String(q.from)) : undefined;
  const to = q.to ? parseDay(String(q.to)) : undefined;
  if ((q.from && !from) || (q.to && !to)) throw new ApiError(400, 'Dates must use YYYY-MM-DD.');
  const dr = dateRange(from, to); if (dr) filter.assessmentDate = dr;
  const [items, total] = await Promise.all([
    AcademicRecord.find(filter).sort({ assessmentDate: -1, _id: -1 }).skip(skip).limit(limit).populate(POPULATE).lean(),
    AcademicRecord.countDocuments(filter),
  ]);
  ok(res, { items, pagination: pagination(page, limit, total) });
});

exports.create = asyncHandler(async (req, res) => {
  await getAccessibleStudent(req, req.body.student, '_id assignedTeacher');
  const b = req.body;
  const record = await AcademicRecord.create({ ...b, assessmentDate: parseDay(b.assessmentDate), remarks: b.remarks || undefined, teacher: req.user._id });
  created(res, await AcademicRecord.findById(record._id).populate(POPULATE).lean(), 'Assessment saved');
});

exports.update = asyncHandler(async (req, res) => {
  const record = await AcademicRecord.findById(req.params.id);
  if (!record) throw new ApiError(404, 'Academic record not found.');
  await getAccessibleStudent(req, record.student, '_id assignedTeacher');
  if (req.user.role === 'TEACHER' && String(record.teacher) !== String(req.user._id)) {
    throw new ApiError(403, 'You can only edit assessments you recorded.');
  }
  const b = { ...req.body };
  if (b.assessmentDate) b.assessmentDate = parseDay(b.assessmentDate);
  if (b.remarks === null) b.remarks = undefined;
  record.set(b);
  await record.save();
  ok(res, await AcademicRecord.findById(record._id).populate(POPULATE).lean(), 'Assessment updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const record = await AcademicRecord.findByIdAndDelete(req.params.id);
  if (!record) throw new ApiError(404, 'Academic record not found.');
  ok(res, null, 'Assessment deleted');
});

exports.studentSummary = asyncHandler(async (req, res) => {
  const student = await getAccessibleStudent(req, req.params.id, 'studentId fullName assignedTeacher');
  const summary = await academicSummary(req.params.id);
  ok(res, { student: { _id: student._id, studentId: student.studentId, fullName: student.fullName }, ...summary });
});
