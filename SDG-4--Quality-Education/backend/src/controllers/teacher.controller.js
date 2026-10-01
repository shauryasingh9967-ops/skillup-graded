const User = require('../models/User');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');
const { escapeRegex, pageParams, pagination } = require('../utils/helpers');

const toProfile = (b) => ({
  employeeId: b.employeeId || undefined,
  department: b.department || undefined,
  subjects: b.subjects || [],
});

exports.list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query, 10, 100);
  const filter = { role: 'TEACHER' };
  if (req.query.status === 'ACTIVE') filter.isActive = true;
  if (req.query.status === 'INACTIVE') filter.isActive = false;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { 'teacherProfile.employeeId': rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const counts = await Student.aggregate([
    { $match: { assignedTeacher: { $in: items.map((t) => t._id) }, status: 'ACTIVE' } },
    { $group: { _id: '$assignedTeacher', n: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  const data = items.map(({ passwordHash, __v, ...t }) => ({ ...t, activeStudents: map.get(String(t._id)) || 0 }));
  ok(res, { items: data, pagination: pagination(page, limit, total) });
});

exports.create = asyncHandler(async (req, res) => {
  const b = req.body;
  const teacher = await User.create({
    name: b.name,
    email: b.email,
    phone: b.phone || undefined,
    role: 'TEACHER',
    passwordHash: await User.hashPassword(b.password),
    teacherProfile: toProfile(b),
  });
  created(res, teacher.toJSON(), 'Teacher account created');
});

exports.get = asyncHandler(async (req, res) => {
  const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER' });
  if (!teacher) throw new ApiError(404, 'Teacher not found.');
  const [students, activeStudents, totalStudents] = await Promise.all([
    Student.find({ assignedTeacher: teacher._id }).sort({ fullName: 1 }).limit(50).select('studentId fullName status batch').populate('batch', 'name code').lean(),
    Student.countDocuments({ assignedTeacher: teacher._id, status: 'ACTIVE' }),
    Student.countDocuments({ assignedTeacher: teacher._id }),
  ]);
  ok(res, { teacher: teacher.toJSON(), students, activeStudents, totalStudents });
});

exports.update = asyncHandler(async (req, res) => {
  const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER' });
  if (!teacher) throw new ApiError(404, 'Teacher not found.');
  const b = req.body;
  if (b.name !== undefined) teacher.name = b.name;
  if (b.email !== undefined) teacher.email = b.email;
  if (b.phone !== undefined) teacher.phone = b.phone || undefined;
  if (b.employeeId !== undefined) teacher.teacherProfile.employeeId = b.employeeId || undefined;
  if (b.department !== undefined) teacher.teacherProfile.department = b.department || undefined;
  if (b.subjects !== undefined) teacher.teacherProfile.subjects = b.subjects;
  if (b.password) teacher.passwordHash = await User.hashPassword(b.password);
  await teacher.save();
  ok(res, teacher.toJSON(), 'Teacher updated');
});

exports.setStatus = asyncHandler(async (req, res) => {
  const teacher = await User.findOne({ _id: req.params.id, role: 'TEACHER' });
  if (!teacher) throw new ApiError(404, 'Teacher not found.');
  teacher.isActive = req.body.status === 'ACTIVE';
  await teacher.save();
  ok(res, teacher.toJSON(), teacher.isActive ? 'Teacher activated' : 'Teacher deactivated');
});
