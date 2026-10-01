import client, { unwrap } from '../api/client';

const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
const get = (url, params) => unwrap(client.get(url, { params: clean(params) }));

export const authService = {
  login: (body) => unwrap(client.post('/auth/login', body)),
  me: () => unwrap(client.get('/auth/me')),
  changePassword: (body) => unwrap(client.patch('/auth/change-password', body)),
};

export const dashboardService = { get: () => get('/dashboard') };

export const catalogService = {
  courses: (params) => get('/courses', params),
  createCourse: (b) => unwrap(client.post('/courses', b)),
  updateCourse: (id, b) => unwrap(client.patch(`/courses/${id}`, b)),
  batches: (params) => get('/batches', params),
  createBatch: (b) => unwrap(client.post('/batches', b)),
  updateBatch: (id, b) => unwrap(client.patch(`/batches/${id}`, b)),
};

export const teacherService = {
  list: (params) => get('/teachers', params),
  get: (id) => get(`/teachers/${id}`),
  create: (b) => unwrap(client.post('/teachers', b)),
  update: (id, b) => unwrap(client.patch(`/teachers/${id}`, b)),
  setStatus: (id, status) => unwrap(client.patch(`/teachers/${id}/status`, { status })),
};

export const studentService = {
  list: (params) => get('/students', params),
  get: (id) => get(`/students/${id}`),
  summary: (id) => get(`/students/${id}/summary`),
  create: (b) => unwrap(client.post('/students', b)),
  update: (id, b) => unwrap(client.patch(`/students/${id}`, b)),
  setStatus: (id, status) => unwrap(client.patch(`/students/${id}/status`, { status })),
};

export const attendanceService = {
  sheet: (params) => get('/attendance/sheet', params),
  list: (params) => get('/attendance', params),
  summary: (params) => get('/attendance/summary', params),
  bulk: (b) => unwrap(client.post('/attendance/bulk', b)),
  update: (id, b) => unwrap(client.patch(`/attendance/${id}`, b)),
  studentHistory: (id, params) => get(`/attendance/student/${id}`, params),
};

export const academicService = {
  list: (params) => get('/academic-records', params),
  create: (b) => unwrap(client.post('/academic-records', b)),
  update: (id, b) => unwrap(client.patch(`/academic-records/${id}`, b)),
  remove: (id) => unwrap(client.delete(`/academic-records/${id}`)),
  studentSummary: (id) => get(`/academic-records/student/${id}/summary`),
};

export const reportService = {
  run: (type, params) => get(`/reports/${type}`, params),
  async downloadCsv(type, params) {
    const res = await client.get(`/reports/${type}`, { params: clean({ ...params, format: 'csv' }), responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
