/*
 * DEVELOPMENT / DEMO DATA ONLY.
 * Creates 1 admin, 4 teachers, 3 courses, 6 batches, 48 students plus attendance and academic records.
 * Usage:  npm run seed            (only when the database is empty)
 *         npm run seed -- --reset (wipes ALL collections first)
 * Passwords come from SEED_ADMIN_PASSWORD / SEED_TEACHER_PASSWORD in your .env file.
 */
const env = require('../src/config/env');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Course = require('../src/models/Course');
const Batch = require('../src/models/Batch');
const Student = require('../src/models/Student');
const Attendance = require('../src/models/Attendance');
const AcademicRecord = require('../src/models/AcademicRecord');
const { todayLocal, addDays } = require('../src/utils/dates');

// Deterministic pseudo-random so demo data is repeatable.
let seedState = 20260929;
const rnd = () => { seedState = (seedState * 1664525 + 1013904223) % 4294967296; return seedState / 4294967296; };
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const between = (a, b) => a + rnd() * (b - a);

const FIRST = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Kabir', 'Rohan', 'Ishaan', 'Reyansh', 'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Myra', 'Kiara', 'Riya', 'Meera', 'Nikhil', 'Karan', 'Sahil', 'Yash', 'Pooja', 'Neha', 'Simran', 'Tanvi'];
const LAST = ['Sharma', 'Verma', 'Singh', 'Gupta', 'Yadav', 'Mehta', 'Kapoor', 'Malhotra', 'Chauhan', 'Joshi', 'Bansal', 'Khanna', 'Saxena', 'Tiwari', 'Nair', 'Reddy'];
const GUARDIAN = ['Rajesh', 'Sunil', 'Anil', 'Vikram', 'Manoj', 'Deepak', 'Suresh', 'Sanjay', 'Ritu', 'Sunita', 'Kavita', 'Anita'];
const TYPES = ['QUIZ', 'ASSIGNMENT', 'MIDTERM', 'PRACTICAL'];

const COURSES = [
  { name: 'Full Stack Web Development', code: 'FSWD', subjects: ['HTML & CSS', 'JavaScript', 'React', 'Node.js', 'MongoDB'] },
  { name: 'Data Science & Analytics', code: 'DSA', subjects: ['Python', 'Statistics', 'SQL', 'Machine Learning', 'Data Visualization'] },
  { name: 'Digital Marketing', code: 'DGM', subjects: ['SEO', 'Content Marketing', 'Social Media', 'Web Analytics', 'Paid Advertising'] },
];

(async () => {
  if (env.isProd) { console.error('Refusing to seed demo data when NODE_ENV=production.'); process.exit(1); }
  const adminPw = process.env.SEED_ADMIN_PASSWORD;
  const teacherPw = process.env.SEED_TEACHER_PASSWORD;
  if (!adminPw || !teacherPw) { console.error('Set SEED_ADMIN_PASSWORD and SEED_TEACHER_PASSWORD in your .env file first.'); process.exit(1); }
  env.assertRequired();
  await mongoose.connect(env.mongoUri);

  const existing = await User.estimatedDocumentCount();
  if (existing > 0 && !process.argv.includes('--reset')) {
    console.error('The database already has data. Re-run with "-- --reset" to wipe it and load demo data.');
    await mongoose.disconnect(); process.exit(1);
  }
  if (process.argv.includes('--reset')) {
    await Promise.all([User, Course, Batch, Student, Attendance, AcademicRecord].map((m) => m.deleteMany({})));
    await Promise.all([User, Course, Batch, Student, Attendance, AcademicRecord].map((m) => m.syncIndexes()));
  }

  const adminHash = await User.hashPassword(adminPw);
  const teacherHash = await User.hashPassword(teacherPw);
  await User.create({ name: 'Institute Admin', email: 'admin@skillup.demo', passwordHash: adminHash, role: 'ADMIN', phone: '9810000001' });

  const teacherDefs = [
    ['Priya Nair', 'priya.nair@skillup.demo', 'Web Development', 0],
    ['Rahul Deshmukh', 'rahul.deshmukh@skillup.demo', 'Web Development', 0],
    ['Sneha Kulkarni', 'sneha.kulkarni@skillup.demo', 'Data Science', 1],
    ['Amit Bhatia', 'amit.bhatia@skillup.demo', 'Marketing', 2],
  ];
  const teachers = [];
  for (let i = 0; i < teacherDefs.length; i += 1) {
    const [name, email, department, ci] = teacherDefs[i];
    teachers.push({
      ci,
      user: await User.create({ name, email, passwordHash: teacherHash, role: 'TEACHER', phone: `98100000${10 + i}`, teacherProfile: { employeeId: `T-${100 + i}`, department, subjects: COURSES[ci].subjects.slice(0, 3) } }),
    });
  }

  const courses = await Course.create(COURSES);
  const batchDefs = [[0, 'FSWD Morning 2026', 'FSWD-M26'], [0, 'FSWD Evening 2026', 'FSWD-E26'], [1, 'Data Science 2026-A', 'DSA-A26'], [1, 'Data Science 2026-B', 'DSA-B26'], [2, 'Digital Marketing 2026-A', 'DGM-A26'], [2, 'Digital Marketing 2026-B', 'DGM-B26']];
  const batches = [];
  for (const [ci, name, code] of batchDefs) batches.push(await Batch.create({ name, code, course: courses[ci]._id, academicYear: '2026-27' }));

  const today = todayLocal();
  const days = [];
  for (let i = 44; i >= 0; i -= 1) { const d = addDays(today, -i); if (d.getUTCDay() !== 0) days.push(d); }

  let n = 0; const students = [];
  for (let bi = 0; bi < batches.length; bi += 1) {
    const batch = batches[bi]; const ci = batchDefs[bi][0];
    const teacherPool = teachers.filter((t) => t.ci === ci);
    for (let k = 0; k < 8; k += 1) {
      n += 1;
      const first = pick(FIRST); const last = pick(LAST);
      const admission = addDays(today, -Math.floor(between(50, 200)));
      const stu = await Student.create({
        studentId: `SKG-26-${String(n).padStart(3, '0')}`,
        fullName: `${first} ${last}`,
        email: `${first}.${last}${n}@example.com`.toLowerCase(),
        phone: `9${String(Math.floor(between(100000000, 999999999)))}`,
        guardianName: `${pick(GUARDIAN)} ${last}`,
        guardianPhone: `9${String(Math.floor(between(100000000, 999999999)))}`,
        gender: ['Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Myra', 'Kiara', 'Riya', 'Meera', 'Pooja', 'Neha', 'Simran', 'Tanvi'].includes(first) ? 'FEMALE' : 'MALE',
        batch: batch._id, course: courses[ci]._id, admissionDate: admission,
        assignedTeacher: teacherPool[k % teacherPool.length].user._id,
        status: n % 17 === 0 ? 'INACTIVE' : 'ACTIVE',
      });
      // A few students are deliberately weaker so "needs attention" shows real, computed results.
      const weak = n % 11 === 0;
      students.push({ stu, ci, batch, attendProb: weak ? 0.55 : between(0.82, 0.98), ability: weak ? between(28, 45) : between(58, 92) });
    }
  }

  const attendanceDocs = []; const academicDocs = [];
  for (const { stu, ci, batch, attendProb, ability } of students) {
    if (stu.status !== 'ACTIVE') continue;
    const teacher = teachers.find((t) => String(t.user._id) === String(stu.assignedTeacher)).user;
    for (const d of days) {
      if (d < stu.admissionDate) continue;
      const r = rnd(); let status = 'PRESENT';
      if (r > attendProb) status = rnd() < 0.2 ? 'LEAVE' : 'ABSENT'; else if (rnd() < 0.06) status = 'LATE';
      attendanceDocs.push({ student: stu._id, batch: batch._id, date: d, status, markedBy: teacher._id });
    }
    for (const subject of COURSES[ci].subjects) {
      for (let a = 0; a < 2; a += 1) {
        const max = pick([20, 25, 50, 100]);
        const pct = Math.max(5, Math.min(100, ability + between(-12, 12)));
        academicDocs.push({
          student: stu._id, subject, assessmentName: `${subject} ${a === 0 ? 'Quiz' : 'Assignment'} ${a + 1}`, assessmentType: TYPES[a % TYPES.length],
          marksObtained: Math.round((pct / 100) * max), maxMarks: max, teacher: teacher._id, assessmentDate: addDays(today, -Math.floor(between(2, 40))),
        });
      }
    }
  }
  await Attendance.insertMany(attendanceDocs);
  for (const doc of academicDocs) await AcademicRecord.create(doc); // create() runs percentage/grade hooks

  console.log(`Seeded: 1 admin, ${teachers.length} teachers, ${courses.length} courses, ${batches.length} batches, ${students.length} students, ${attendanceDocs.length} attendance records, ${academicDocs.length} academic records.`);
  console.log('Admin login:   admin@skillup.demo');
  console.log('Teacher login: priya.nair@skillup.demo (and the other teachers listed in README)');
  await mongoose.disconnect();
})().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });
