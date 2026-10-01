const { z } = require('zod');

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,14}$/;
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid selection');
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Invalid date');
const emptyToNull = (schema) => z.preprocess((v) => (v === '' || v === undefined ? null : v), schema.nullable());
const phone = z.string().trim().regex(PHONE_RE, 'Enter a valid phone number (7-15 digits)');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must include a letter')
  .regex(/[0-9]/, 'Password must include a number');

const login = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePassword = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});

const teacherFields = {
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  phone: emptyToNull(phone),
  employeeId: emptyToNull(z.string().trim().max(30)),
  department: emptyToNull(z.string().trim().max(100)),
  subjects: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
};
const teacherCreate = z.object({ ...teacherFields, password });
const teacherUpdate = z.object(teacherFields).partial().extend({ password: password.optional() });

const statusBody = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) });

const courseBody = z.object({
  name: z.string().trim().min(2, 'Course name is required').max(120),
  code: z.string().trim().min(2, 'Course code is required').max(20),
  subjects: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  isActive: z.boolean().optional(),
});
const courseUpdate = courseBody.partial();

const batchBody = z.object({
  name: z.string().trim().min(2, 'Batch name is required').max(120),
  code: z.string().trim().min(2, 'Batch code is required').max(20),
  course: objectId,
  academicYear: emptyToNull(z.string().trim().max(20)),
  isActive: z.boolean().optional(),
});
const batchUpdate = batchBody.partial();

const studentFields = {
  studentId: z.string().trim().min(2, 'Student ID is required').max(30),
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  email: emptyToNull(z.string().trim().toLowerCase().email('Enter a valid email address')),
  phone,
  guardianName: z.string().trim().min(2, 'Guardian name is required').max(120),
  guardianPhone: phone,
  dateOfBirth: emptyToNull(day),
  gender: emptyToNull(z.enum(['MALE', 'FEMALE', 'OTHER'])),
  address: emptyToNull(z.string().trim().max(300)),
  batch: objectId,
  course: objectId,
  admissionDate: day,
  assignedTeacher: objectId,
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
};
const studentCreate = z.object(studentFields);
const studentUpdate = z.object(studentFields).partial();

const attendanceBulk = z.object({
  date: day,
  batch: objectId,
  records: z
    .array(
      z.object({
        student: objectId,
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']),
        remarks: emptyToNull(z.string().trim().max(200)),
      })
    )
    .min(1, 'Add at least one attendance record')
    .max(500),
});
const attendancePatch = z.object({
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']).optional(),
  remarks: emptyToNull(z.string().trim().max(200)).optional(),
});

const academicFields = {
  student: objectId,
  subject: z.string().trim().min(1, 'Subject is required').max(80),
  assessmentName: z.string().trim().min(1, 'Assessment name is required').max(120),
  assessmentType: z.enum(['QUIZ', 'ASSIGNMENT', 'MIDTERM', 'FINAL', 'PRACTICAL']).default('QUIZ'),
  marksObtained: z.coerce.number({ invalid_type_error: 'Enter the marks obtained' }).min(0, 'Marks cannot be negative'),
  maxMarks: z.coerce.number({ invalid_type_error: 'Enter the maximum marks' }).gt(0, 'Maximum marks must be greater than 0'),
  assessmentDate: day,
  remarks: emptyToNull(z.string().trim().max(300)),
};
const academicCreate = z.object(academicFields).refine((d) => d.marksObtained <= d.maxMarks, {
  message: 'Marks obtained cannot exceed maximum marks',
  path: ['marksObtained'],
});
const academicUpdate = z.object(academicFields).omit({ student: true }).partial();

module.exports = {
  login, changePassword, teacherCreate, teacherUpdate, statusBody, courseBody, courseUpdate, batchBody, batchUpdate,
  studentCreate, studentUpdate, attendanceBulk, attendancePatch, academicCreate, academicUpdate,
};
