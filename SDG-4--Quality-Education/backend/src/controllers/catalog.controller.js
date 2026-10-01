const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/respond');

exports.listCourses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.active === 'true') filter.isActive = true;
  const courses = await Course.find(filter).sort({ name: 1 }).lean();
  ok(res, { items: courses });
});

exports.createCourse = asyncHandler(async (req, res) => {
  const course = await Course.create(req.body);
  created(res, course, 'Course created');
});

exports.updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found.');
  course.set(req.body);
  await course.save();
  ok(res, course, 'Course updated');
});

exports.listBatches = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.active === 'true') filter.isActive = true;
  if (req.query.course && /^[a-f\d]{24}$/i.test(req.query.course)) filter.course = req.query.course;
  if (req.user.role === 'TEACHER') {
    filter._id = { $in: await Student.find({ assignedTeacher: req.user._id }).distinct('batch') };
  }
  const batches = await Batch.find(filter).sort({ name: 1 }).populate('course', 'name code subjects').lean();
  const counts = await Student.aggregate([
    { $match: { batch: { $in: batches.map((b) => b._id) }, status: 'ACTIVE' } },
    { $group: { _id: '$batch', n: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  ok(res, { items: batches.map((b) => ({ ...b, activeStudents: map.get(String(b._id)) || 0 })) });
});

exports.createBatch = asyncHandler(async (req, res) => {
  if (!(await Course.exists({ _id: req.body.course }))) throw new ApiError(422, 'Selected course does not exist.', [{ field: 'course', message: 'Selected course does not exist.' }]);
  const batch = await Batch.create({ ...req.body, academicYear: req.body.academicYear || undefined });
  created(res, batch, 'Batch created');
});

exports.updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id);
  if (!batch) throw new ApiError(404, 'Batch not found.');
  if (req.body.course && !(await Course.exists({ _id: req.body.course }))) throw new ApiError(422, 'Selected course does not exist.', [{ field: 'course', message: 'Selected course does not exist.' }]);
  batch.set({ ...req.body, academicYear: req.body.academicYear === null ? undefined : req.body.academicYear });
  await batch.save();
  ok(res, batch, 'Batch updated');
});
