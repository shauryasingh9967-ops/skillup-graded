const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, checkId } = require('../middleware/validate');
const s = require('../validators/schemas');
const auth = require('../controllers/auth.controller');
const teachers = require('../controllers/teacher.controller');
const catalog = require('../controllers/catalog.controller');
const students = require('../controllers/student.controller');
const attendance = require('../controllers/attendance.controller');
const academic = require('../controllers/academic.controller');
const dashboard = require('../controllers/dashboard.controller');
const reports = require('../controllers/report.controller');

const router = express.Router();
const admin = authorize('ADMIN');
const any = authorize('ADMIN', 'TEACHER');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many sign-in attempts. Please wait a few minutes and try again.', errors: [] },
});

router.get('/health', (req, res) => res.json({ success: true, message: 'Skillup Graded API is running', data: { time: new Date().toISOString() } }));

// ---- Auth
const authRouter = express.Router();
authRouter.post('/login', loginLimiter, validate(s.login), auth.login);
authRouter.get('/me', authenticate, auth.me);
authRouter.patch('/change-password', authenticate, validate(s.changePassword), auth.changePassword);
router.use('/auth', authRouter);

// Everything below requires a valid token.
router.use(authenticate, any);

// ---- Dashboard
router.get('/dashboard', dashboard.get);

// ---- Teachers (admin only)
const teacherRouter = express.Router();
teacherRouter.param('id', checkId);
teacherRouter.use(admin);
teacherRouter.get('/', teachers.list);
teacherRouter.post('/', validate(s.teacherCreate), teachers.create);
teacherRouter.get('/:id', teachers.get);
teacherRouter.patch('/:id', validate(s.teacherUpdate), teachers.update);
teacherRouter.patch('/:id/status', validate(s.statusBody), teachers.setStatus);
router.use('/teachers', teacherRouter);

// ---- Courses & batches (read: all, write: admin)
const courseRouter = express.Router();
courseRouter.param('id', checkId);
courseRouter.get('/', catalog.listCourses);
courseRouter.post('/', admin, validate(s.courseBody), catalog.createCourse);
courseRouter.patch('/:id', admin, validate(s.courseUpdate), catalog.updateCourse);
router.use('/courses', courseRouter);

const batchRouter = express.Router();
batchRouter.param('id', checkId);
batchRouter.get('/', catalog.listBatches);
batchRouter.post('/', admin, validate(s.batchBody), catalog.createBatch);
batchRouter.patch('/:id', admin, validate(s.batchUpdate), catalog.updateBatch);
router.use('/batches', batchRouter);

// ---- Students
const studentRouter = express.Router();
studentRouter.param('id', checkId);
studentRouter.get('/', students.list);
studentRouter.post('/', admin, validate(s.studentCreate), students.create);
studentRouter.get('/:id', students.get);
studentRouter.get('/:id/summary', students.summary);
studentRouter.patch('/:id', admin, validate(s.studentUpdate), students.update);
studentRouter.patch('/:id/status', admin, validate(s.statusBody), students.setStatus);
router.use('/students', studentRouter);

// ---- Attendance
const attendanceRouter = express.Router();
attendanceRouter.param('id', checkId);
attendanceRouter.get('/', attendance.list);
attendanceRouter.get('/sheet', attendance.sheet);
attendanceRouter.get('/summary', attendance.summary);
attendanceRouter.get('/student/:id', attendance.studentHistory);
attendanceRouter.post('/bulk', validate(s.attendanceBulk), attendance.bulk);
attendanceRouter.patch('/:id', validate(s.attendancePatch), attendance.update);
router.use('/attendance', attendanceRouter);

// ---- Academic records
const academicRouter = express.Router();
academicRouter.param('id', checkId);
academicRouter.get('/', academic.list);
academicRouter.post('/', validate(s.academicCreate), academic.create);
academicRouter.get('/student/:id/summary', academic.studentSummary);
academicRouter.patch('/:id', validate(s.academicUpdate), academic.update);
academicRouter.delete('/:id', admin, academic.remove);
router.use('/academic-records', academicRouter);

// ---- Reports
router.get('/reports/students', reports.run('students'));
router.get('/reports/attendance', reports.run('attendance'));
router.get('/reports/academic', reports.run('academic'));

module.exports = router;
