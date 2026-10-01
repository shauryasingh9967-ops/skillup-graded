/*
 * End-to-end API smoke test. Requires: a running API (npm run dev) and seeded demo data (npm run seed).
 * Usage: API_URL=http://localhost:5000/api ADMIN_PASSWORD=... TEACHER_PASSWORD=... npm run test:api
 */
const API = process.env.API_URL || 'http://localhost:5000/api';
const ADMIN_PW = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
const TEACHER_PW = process.env.TEACHER_PASSWORD || process.env.SEED_TEACHER_PASSWORD;
let passed = 0; let failed = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : await res.text();
  return { status: res.status, data };
}
function check(name, cond, extra) {
  if (cond) { passed += 1; console.log(`  ok   ${name}`); } else { failed += 1; console.log(`  FAIL ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); }
}
const today = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

(async () => {
  if (!ADMIN_PW || !TEACHER_PW) { console.error('Set ADMIN_PASSWORD and TEACHER_PASSWORD (or SEED_* variables).'); process.exit(1); }
  console.log('Auth');
  let r = await call('POST', '/auth/login', { body: { email: 'admin@skillup.demo', password: 'wrong-password-1' } });
  check('rejects wrong password (401)', r.status === 401, r);
  r = await call('POST', '/auth/login', { body: { email: 'not-an-email', password: 'x' } });
  check('validates login body (422)', r.status === 422, r);
  r = await call('POST', '/auth/login', { body: { email: 'admin@skillup.demo', password: ADMIN_PW } });
  check('admin login', r.status === 200 && r.data.data.token, r);
  check('password hash never returned', !JSON.stringify(r.data).includes('passwordHash'));
  const admin = r.data.data.token;
  r = await call('POST', '/auth/login', { body: { email: 'priya.nair@skillup.demo', password: TEACHER_PW } });
  check('teacher login', r.status === 200 && r.data.data.user.role === 'TEACHER', r);
  const teacher = r.data.data.token;
  r = await call('GET', '/auth/me');
  check('protected route without token (401)', r.status === 401, r);
  r = await call('GET', '/students', { token: 'garbage.token.value' });
  check('invalid token (401)', r.status === 401, r);

  console.log('Role-based access');
  r = await call('GET', '/teachers', { token: teacher });
  check('teacher cannot list teachers (403)', r.status === 403, r);
  r = await call('POST', '/students', { token: teacher, body: {} });
  check('teacher cannot create students (403)', r.status === 403, r);
  r = await call('GET', '/teachers', { token: admin });
  check('admin lists teachers', r.status === 200 && r.data.data.items.length >= 4, r);

  console.log('Students');
  const all = await call('GET', '/students?limit=100', { token: admin });
  check('admin sees all students', all.status === 200 && all.data.data.pagination.total >= 48, all.data.data && all.data.data.pagination);
  const mine = await call('GET', '/students?limit=100', { token: teacher });
  check('teacher sees only assigned students', mine.status === 200 && mine.data.data.pagination.total > 0 && mine.data.data.pagination.total < all.data.data.pagination.total, mine.data.data.pagination);
  const otherStudent = all.data.data.items.find((s) => !mine.data.data.items.some((m) => m._id === s._id));
  r = await call('GET', `/students/${otherStudent._id}`, { token: teacher });
  check('teacher blocked from unassigned student (403)', r.status === 403, r);
  r = await call('GET', '/students?search=SKG-26-00&limit=5&sort=studentId&order=asc', { token: admin });
  check('search + sort + pagination', r.status === 200 && r.data.data.items.length === 5 && r.data.data.items[0].studentId < r.data.data.items[1].studentId, r.data);
  r = await call('GET', '/students?batch=notanid', { token: admin });
  check('bad filter id (400)', r.status === 400, r);

  const batches = (await call('GET', '/batches', { token: admin })).data.data.items;
  const b = batches[0];
  const teachers = (await call('GET', '/teachers?limit=100', { token: admin })).data.data.items;
  const newStudent = { studentId: `tst-${Date.now() % 100000}`, fullName: 'Test Student', phone: '9876543210', guardianName: 'Test Guardian', guardianPhone: '9876543211', batch: b._id, course: b.course._id, admissionDate: today(), assignedTeacher: teachers[0]._id, email: '' };
  r = await call('POST', '/students', { token: admin, body: { ...newStudent, phone: '12' } });
  check('rejects invalid phone (422)', r.status === 422 && r.data.errors.some((e) => e.field === 'phone'), r);
  r = await call('POST', '/students', { token: admin, body: newStudent });
  check('creates student', r.status === 201 && r.data.data.studentId === newStudent.studentId.toUpperCase(), r);
  const sid = r.data.data._id;
  r = await call('POST', '/students', { token: admin, body: newStudent });
  check('duplicate student ID (409)', r.status === 409, r);
  const wrongBatch = batches.find((x) => String(x.course._id) !== String(b.course._id));
  r = await call('POST', '/students', { token: admin, body: { ...newStudent, studentId: 'tst-other', batch: wrongBatch._id } });
  check('batch/course mismatch (422)', r.status === 422, r);
  r = await call('PATCH', `/students/${sid}`, { token: admin, body: { fullName: 'Test Student Updated' } });
  check('updates student', r.status === 200 && r.data.data.fullName === 'Test Student Updated', r);
  r = await call('GET', `/students/${sid}/summary`, { token: admin });
  check('student summary (empty data ok)', r.status === 200 && r.data.data.attendance.overall.percentage === null, r);

  console.log('Attendance');
  const sheetBatch = mine.data.data.items[0].batch._id;
  r = await call('GET', `/attendance/sheet?date=${today()}&batch=${sheetBatch}`, { token: teacher });
  check('teacher gets attendance sheet', r.status === 200 && r.data.data.students.length > 0, r);
  const roster = r.data.data.students;
  const records = roster.map((s, i) => ({ student: s._id, status: i === 0 ? 'ABSENT' : 'PRESENT' }));
  r = await call('POST', '/attendance/bulk', { token: teacher, body: { date: today(), batch: sheetBatch, records } });
  check('bulk save attendance', r.status === 200 && r.data.data.total === records.length, r);
  r = await call('POST', '/attendance/bulk', { token: teacher, body: { date: today(), batch: sheetBatch, records: [{ ...records[0], status: 'LATE' }] } });
  check('re-saving upserts (no duplicates)', r.status === 200 && r.data.data.created === 0, r);
  r = await call('GET', `/attendance?date=${today()}&batch=${sheetBatch}&limit=100`, { token: teacher });
  check('one record per student per day', r.data.data.pagination.total === roster.length, r.data.data.pagination);
  r = await call('POST', '/attendance/bulk', { token: teacher, body: { date: '2099-01-01', batch: sheetBatch, records } });
  check('future date rejected (422)', r.status === 422, r);
  r = await call('POST', '/attendance/bulk', { token: teacher, body: { date: today(), batch: sheetBatch, records: [{ student: otherStudent._id, status: 'PRESENT' }] } });
  check('teacher cannot mark unassigned student (403)', r.status === 403, r);
  r = await call('GET', `/attendance/student/${roster[0]._id}`, { token: teacher });
  check('student attendance history + percentage', r.status === 200 && r.data.data.stats.total > 0 && typeof r.data.data.stats.percentage === 'number', r.data);

  console.log('Academic records');
  const acad = { student: roster[0]._id, subject: 'JavaScript', assessmentName: 'Smoke quiz', assessmentType: 'QUIZ', marksObtained: 18, maxMarks: 20, assessmentDate: today() };
  r = await call('POST', '/academic-records', { token: teacher, body: { ...acad, marksObtained: 25 } });
  check('marks above max rejected (422)', r.status === 422, r);
  r = await call('POST', '/academic-records', { token: teacher, body: { ...acad, marksObtained: -1 } });
  check('negative marks rejected (422)', r.status === 422, r);
  r = await call('POST', '/academic-records', { token: teacher, body: { ...acad, maxMarks: 0 } });
  check('zero max marks rejected (422)', r.status === 422, r);
  r = await call('POST', '/academic-records', { token: teacher, body: acad });
  check('creates record with computed percentage/grade', r.status === 201 && r.data.data.percentage === 90 && r.data.data.grade === 'A+', r);
  const recId = r.data.data._id;
  r = await call('PATCH', `/academic-records/${recId}`, { token: teacher, body: { marksObtained: 15 } });
  check('update recalculates percentage', r.status === 200 && r.data.data.percentage === 75 && r.data.data.grade === 'B+', r);
  r = await call('DELETE', `/academic-records/${recId}`, { token: teacher });
  check('teacher cannot delete (403)', r.status === 403, r);
  r = await call('GET', `/academic-records/student/${roster[0]._id}/summary`, { token: teacher });
  check('academic summary', r.status === 200 && r.data.data.subjects.length > 0, r);
  r = await call('DELETE', `/academic-records/${recId}`, { token: admin });
  check('admin deletes record', r.status === 200, r);

  console.log('Dashboard & reports');
  r = await call('GET', '/dashboard', { token: admin });
  check('admin dashboard has real KPIs', r.status === 200 && r.data.data.kpis.totalStudents >= 49 && r.data.data.kpis.totalTeachers === 4, r.data.data && r.data.data.kpis);
  r = await call('GET', '/dashboard', { token: teacher });
  check('teacher dashboard is scoped', r.status === 200 && r.data.data.kpis.totalStudents === mine.data.data.pagination.total && r.data.data.kpis.totalTeachers === undefined, r.data.data && r.data.data.kpis);
  for (const t of ['students', 'attendance', 'academic']) {
    r = await call('GET', `/reports/${t}?batch=${sheetBatch}`, { token: teacher });
    check(`${t} report (teacher scoped)`, r.status === 200 && r.data.data.rows.length > 0 && r.data.data.rows.length <= mine.data.data.pagination.total, r.status);
  }
  r = await call('GET', '/reports/attendance?format=csv', { token: admin });
  check('CSV export', r.status === 200 && typeof r.data === 'string' && r.data.includes('Student ID'), r.status);
  r = await call('GET', '/reports/attendance?from=2026-05-10&to=2026-05-01', { token: admin });
  check('invalid date range (400)', r.status === 400, r);

  console.log('Deactivation');
  r = await call('PATCH', `/students/${sid}/status`, { token: admin, body: { status: 'INACTIVE' } });
  check('deactivates student (soft)', r.status === 200 && r.data.data.status === 'INACTIVE', r);
  r = await call('GET', '/nope', { token: admin });
  check('unknown route returns JSON 404', r.status === 404 && r.data.success === false, r);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
