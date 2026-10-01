const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { escapeRegex, pageParams, pagination, queryId } = require('../utils/helpers');
const { parseDay, addDays, todayLocal } = require('../utils/dates');
const { studentScope, getAccessibleStudent } = require('../services/scope');
const { attendanceStats, academicSummary } = require('../services/stats');
const { oid } = require('../utils/helpers');

const SORTS = { fullName: 'fullName', studentId: 'studentId', admissionDate: 'admissionDate', createdAt: 'createdAt' };
const POPULATE = [
  { path: 'batch', select: 'name code' },
  { path: 'course', select: 'name code' },
  { path: 'assignedTeacher', select: 'name email' },
];

// Cross-field integrity: batch must belong to course, teacher must be an active TEACHER.
async function assertRefs({ batch, course, assignedTeacher }) {
  const fail = (field, message) => { throw new ApiError(422, message, [{ field, message }]); };
  if (course && !(await Course.exists({ _id: course }))) fail('course', 'Selected course does not exist.');
  if (batch) {
    const b = await Batch.findById(batch).select('course');
    if (!b) fail('batch', 'Selected batch does not exist.');
    if (course && String(b.course) !== String(course)) fail('batch', 'This batch does not belong to the selected course.');
  }
  if (assignedTeacher && !(await User.exists({ _id: assignedTeacher, role: 'TEACHER', isActive: true }))) {
    fail('assignedTeacher', 'Select an active teacher.');
  }
}

function toDoc(body) {
  const doc = { ...body };
  ['admissionDate', 'dateOfBirth'].forEach((k) => { if (typeof doc[k] === 'string') doc[k] = parseDay(doc[k]); });
  return doc;
}

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 10, 100);
  const q = req.query;
  const filter = { ...studentScope(req) };
  if (q.status === 'ACTIVE' || q.status === 'INACTIVE') filter.status = q.status;
  const batch = queryId(q.batch, 'batch'); if (batch) filter.batch = batch;
  const course = queryId(q.course, 'course'); if (course) filter.course = course;
  const teacher = queryId(q.teacher, 'teacher'); if (teacher && req.user.role === 'ADMIN') filter.assignedTeacher = teacher;
  if (q.search && String(q.search).trim()) {
    const rx = new RegExp(escapeRegex(String(q.search).trim()), 'i');
    filter.$or = [{ fullName: rx }, { studentId: rx }, { phone: rx }, { email: rx }];
  }
  const sortKey = SORTS[q.sort] || 'createdAt';
  const sort = { [sortKey]: q.order === 'asc' ? 1 : -1, _id: 1 };
  const [items, total] = await Promise.all([
    Student.find(filter).sort(sort).skip(skip).limit(limit).populate(POPULATE).lean(),
    Student.countDocuments(filter),
  ]);
  ok(res, { items, pagination: pagination(page, limit, total) });
});

exports.create = asyncHandler(async (req, res) => {
  await assertRefs(req.body);
  const doc = toDoc(req.body);
  Object.keys(doc).forEach((k) => { if (doc[k] === null) delete doc[k]; });
  const student = await Student.create(doc);
  created(res, await Student.findById(student._id).populate(POPULATE).lean(), 'Student added');
});

exports.get = asyncHandler(async (req, res) => {
  await getAccessibleStudent(req, req.params.id, '_id assignedTeacher');
  const student = await Student.findById(req.params.id).populate(POPULATE).lean();
  ok(res, student);
});

exports.update = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found.');
  const body = req.body;
  await assertRefs({
    batch: body.batch,
    course: body.course || (body.batch ? String(student.course) : undefined),
    assignedTeacher: body.assignedTeacher && String(body.assignedTeacher) !== String(student.assignedTeacher) ? body.assignedTeacher : undefined,
  });
  if (body.course && !body.batch) {
    const b = await Batch.findById(student.batch).select('course');
    if (b && String(b.course) !== String(body.course)) throw new ApiError(422, 'Current batch does not belong to the selected course. Choose a batch too.', [{ field: 'batch', message: 'Choose a batch for the selected course.' }]);
  }
  const doc = toDoc(body);
  Object.keys(doc).forEach((k) => { if (doc[k] === null) doc[k] = undefined; });
  student.set(doc);
  await student.save();
  ok(res, await Student.findById(student._id).populate(POPULATE).lean(), 'Student updated');
});

exports.setStatus = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found.');
  student.status = req.body.status;
  await student.save();
  ok(res, student, student.status === 'ACTIVE' ? 'Student activated' : 'Student deactivated');
});

exports.summary = asyncHandler(async (req, res) => {
  await getAccessibleStudent(req, req.params.id, '_id assignedTeacher');
  const sid = oid(req.params.id);
  const since = addDays(todayLocal(), -29);
  const [attendanceAll, attendanceRecent, academic] = await Promise.all([
    attendanceStats({ student: sid }),
    attendanceStats({ student: sid, date: { $gte: since } }),
    academicSummary(req.params.id),
  ]);
  ok(res, { attendance: { overall: attendanceAll, last30Days: attendanceRecent }, academic });
});
