# Skillup Graded — Education Institute Management and Student Tracking System

**Organisation:** Skillup Graded  ·  **Status:** Approved  ·  **Repository:** https://github.com/shauryasingh9967-ops/SDG-4--Quality-Education

Skillup Graded is a web application for education institutes to keep student records, daily attendance and academic progress in one place instead of paper registers and spreadsheets.

## Problem statement

The institute currently finds it hard to manage student records, attendance, academic progress and other student information efficiently. Maintaining and searching records by hand is slow and error-prone, and it is difficult to track student performance. A centralised digital system is needed to keep this information organised and easy to reach.

## Objectives

1. Digitise and organise student records.
2. Simplify attendance management and tracking.
3. Maintain and monitor students' academic progress.
4. Reduce manual paperwork and data-entry errors.
5. Provide a centralised dashboard for quick access to student information.
6. Make student record management faster and more efficient.

## Features

| Area | What you get |
|---|---|
| Authentication | JWT login, bcrypt-hashed passwords, expired-token handling, session restore, logout, change password |
| Roles | **Admin** and **Teacher** only. Students are records, never users. Authorization is enforced on the backend |
| Dashboards | Admin: institute-wide KPIs, attendance trend, today's distribution, students by batch, subject performance, attention list, recent students/activity. Teacher: same views scoped to their assigned students |
| Students | Server-side search, filters (status, course, batch, teacher), sorting, pagination, add/edit/view, activate/deactivate (no hard delete), detail page with Overview / Attendance / Academic Progress / Basic Information tabs |
| Attendance | Batch + date sheet, one-click "Mark all present", segmented Present/Absent/Late/Leave controls, remarks, bulk save (idempotent), history with filters, per-record edit, real percentage calculation |
| Academic progress | Assessments with marks, max marks, auto percentage and grade, subject-wise summary, progress trend, history, edit (own records for teachers), delete (admin) |
| Reports | Student, Attendance and Academic reports with date/batch/course/teacher/status/subject filters, summary tiles, **CSV export** and **print-friendly layout** |
| Admin tools | Teacher accounts (create/edit/reset password/deactivate), courses and batches |
| Interface | Loading, empty and error states, confirmation dialogs, keyboard support, responsive layout with a slide-out menu on mobile |

Deliberately **not** included (out of approved scope): student login, parent portal, payments, chat, LMS, library/hostel/transport modules.

## Tech stack

React 18 (Vite), React Router, Axios, Recharts, Lucide icons, plain CSS design system · Node.js, Express 4 · MongoDB with Mongoose 8 · JWT, bcryptjs, Zod validation, Helmet, CORS, express-rate-limit · Git/GitHub · Postman.

## Architecture

```
React SPA ──HTTPS/JSON──► Express API ──Mongoose──► MongoDB
  AuthContext (JWT)         authenticate → authorize(role) → validate(zod)
  services/ (API layer)     → controller → services (scope, stats) → models
```

```
backend/
  src/  config/ controllers/ middleware/ models/ routes/ services/ utils/ validators/  app.js  server.js
  scripts/  seed.js  create-admin.js
  tests/    api.smoke.js
  postman/  Scholaris.postman_collection.json
frontend/
  src/  api/ components/{ui,data,forms,charts} context/ hooks/ layouts/ pages/ routes/ services/ utils/
```

## Setup

**Requirements:** Node.js 18+, a MongoDB instance (local or Atlas).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit .env (see below)
npm run seed                # optional demo data (development only)
npm run dev                 # http://localhost:5000/api
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173  (proxies /api to the backend)
```

For a production build: `npm run build`, serve `frontend/dist`, and set `VITE_API_URL` to your API URL before building.

### Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random secret (32+ characters). Never commit it |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `8h` |
| `CLIENT_ORIGIN` | Comma-separated allowed frontend origins (CORS) |
| `TZ_OFFSET_MINUTES` | Institute time zone offset from UTC, 330 = IST. Decides what "today" means |
| `SEED_ADMIN_PASSWORD`, `SEED_TEACHER_PASSWORD` | Used only by `npm run seed` |

`.env` is git-ignored. Only `.env.example` is committed.

### Database setup

Collections and indexes are created automatically by Mongoose on first run.

* **Demo data:** `npm run seed` (only on an empty database) or `npm run seed -- --reset` to wipe and reload. It creates 1 admin, 4 teachers, 3 courses, 6 batches, 48 students, ~1,700 attendance records and ~460 assessments. It refuses to run when `NODE_ENV=production`.
* **Real data:** skip the seed and create your first admin with
  `npm run create-admin -- "Full Name" admin@yourinstitute.com "StrongPassword1"`, then add teachers, courses and batches from the UI.

**Development credentials (seed data only — change or never seed in production):**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@skillup.demo` | value of `SEED_ADMIN_PASSWORD` (`Admin@12345` in `.env.example`) |
| Teacher | `priya.nair@skillup.demo`, `rahul.deshmukh@skillup.demo`, `sneha.kulkarni@skillup.demo`, `amit.bhatia@skillup.demo` | value of `SEED_TEACHER_PASSWORD` (`Teacher@12345` in `.env.example`) |

## Database design

| Collection | Purpose | Key indexes |
|---|---|---|
| `users` | Admins and teachers. Teacher details live in `teacherProfile` (employeeId, department, subjects). `passwordHash` is `select:false` and stripped from JSON | `email` unique, `teacherProfile.employeeId` unique sparse, `{role,isActive}` |
| `courses` | Course name, code, subjects list | `code` unique |
| `batches` | Group of students attending together; references a course | `code` unique, `course` |
| `students` | Student record; references batch, course and assignedTeacher | `studentId` unique, `fullName`, `phone`, `email` sparse, `{batch,status}`, `assignedTeacher` |
| `attendances` | One record per student per day: PRESENT / ABSENT / LATE / LEAVE | **`{student,date}` unique**, `{batch,date}`, `date` |
| `academicrecords` | One assessment result; percentage and grade computed server-side | `{student,assessmentDate}`, `{student,subject}`, `{teacher,createdAt}` |

Design decisions:

* A teacher's access is defined by `Student.assignedTeacher`. Batches are for grouping only.
* Attendance percentage = `(Present + Late) / (Total − Leave) × 100`. Leave days are excluded.
* Grades: A+ ≥ 90, A ≥ 80, B+ ≥ 70, B ≥ 60, C ≥ 50, D ≥ 40, F < 40.
* "Needs attention" = attendance below 75% over the last 30 days (at least 3 counted days) or overall score below 40%.
* Students are deactivated, never deleted. Deactivated students disappear from attendance sheets but keep all history.
* Dates are stored as UTC-midnight calendar days; `TZ_OFFSET_MINUTES` defines "today".

## Role permissions

| Capability | Admin | Teacher |
|---|---|---|
| Sign in, change own password | Yes | Yes |
| Dashboard | Institute-wide | Assigned students only |
| View / search students | All | Assigned only |
| Add / edit / deactivate students | Yes | No |
| Teachers, courses, batches (write) | Yes | No (batches/courses readable) |
| Mark / edit attendance | All students | Assigned students |
| Add assessments | All students | Assigned students |
| Edit assessments | All | Only ones they recorded |
| Delete assessments | Yes | No |
| Reports | All | Assigned students only |

## API overview

Base URL `/api`. Every response is `{ "success": true, "message": "...", "data": ... }` or `{ "success": false, "message": "...", "errors": [{ "field", "message" }] }`. Protected routes need `Authorization: Bearer <token>`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login` · `GET /auth/me` · `PATCH /auth/change-password` |
| Dashboard | `GET /dashboard` |
| Teachers (admin) | `GET /teachers` · `POST /teachers` · `GET/PATCH /teachers/:id` · `PATCH /teachers/:id/status` |
| Courses | `GET /courses` · `POST /courses` (admin) · `PATCH /courses/:id` (admin) |
| Batches | `GET /batches` · `POST /batches` (admin) · `PATCH /batches/:id` (admin) |
| Students | `GET /students?page&limit&search&status&batch&course&teacher&sort&order` · `POST` (admin) · `GET /students/:id` · `GET /students/:id/summary` · `PATCH /students/:id` (admin) · `PATCH /students/:id/status` (admin) |
| Attendance | `GET /attendance/sheet?date&batch` · `POST /attendance/bulk` · `GET /attendance` · `PATCH /attendance/:id` · `GET /attendance/student/:id` · `GET /attendance/summary` |
| Academic | `GET /academic-records` · `POST` · `PATCH /:id` · `DELETE /:id` (admin) · `GET /academic-records/student/:id/summary` |
| Reports | `GET /reports/students` · `/reports/attendance` · `/reports/academic` (add `?format=csv` to download) |

Status codes: 200/201 success, 400 bad id/query, 401 unauthenticated or expired, 403 forbidden, 404 not found, 409 duplicate (student ID, email, attendance), 422 validation, 500 unexpected (generic message; details are logged server-side only).

## Testing

**Postman:** import `backend/postman/Scholaris.postman_collection.json`. Set the collection variables `adminPassword` and `teacherPassword`, run *Auth → Login (admin)* (it stores the token), then run the folders in order. Run *Login (teacher)* to repeat requests as a teacher and confirm 403s. Each request documents its method, URL, headers, body and expected response.

**Automated API smoke test** (45 checks covering auth, role isolation, validation, duplicates, attendance upsert, marks rules, scoped dashboards, reports and CSV):

```bash
cd backend
npm run seed -- --reset
npm run dev                 # in another terminal
set -a; . ./.env; set +a    # load SEED_* passwords
npm run test:api
```

## Security notes

Passwords hashed with bcrypt (12 rounds); JWT secret comes only from the environment; Helmet headers; CORS limited to `CLIENT_ORIGIN`; login rate-limited; request bodies validated with Zod and Mongoose; ObjectIds checked before queries; regex input escaped; CSV cells guarded against formula injection; deactivated accounts are rejected on every request; stack traces are never returned to clients.

## Project / team information

* Project: Education Institute Management and Student Tracking System — Skillup Graded
* Group members: _add names and roles here_
* Mentor / guide: _add here_
