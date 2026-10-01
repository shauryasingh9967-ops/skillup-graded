const mongoose = require('mongoose');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,14}$/;
const { ObjectId } = mongoose.Schema.Types;

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: [true, 'Student ID is required'], unique: true, uppercase: true, trim: true, maxlength: 30 },
    fullName: { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 120 },
    email: { type: String, lowercase: true, trim: true, match: [EMAIL_RE, 'Enter a valid email address'] },
    phone: { type: String, required: [true, 'Phone number is required'], trim: true, match: [PHONE_RE, 'Enter a valid phone number'] },
    guardianName: { type: String, required: [true, 'Guardian name is required'], trim: true, maxlength: 120 },
    guardianPhone: { type: String, required: [true, 'Guardian phone is required'], trim: true, match: [PHONE_RE, 'Enter a valid phone number'] },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: { values: ['MALE', 'FEMALE', 'OTHER'], message: 'Invalid gender' } },
    address: { type: String, trim: true, maxlength: 300 },
    batch: { type: ObjectId, ref: 'Batch', required: [true, 'Batch is required'], index: true },
    course: { type: ObjectId, ref: 'Course', required: [true, 'Course is required'], index: true },
    admissionDate: { type: Date, required: [true, 'Admission date is required'], default: Date.now },
    assignedTeacher: { type: ObjectId, ref: 'User', required: [true, 'Assigned teacher is required'], index: true },
    status: { type: String, enum: { values: ['ACTIVE', 'INACTIVE'], message: 'Invalid status' }, default: 'ACTIVE' },
    profilePhoto: { type: String },
  },
  { timestamps: true }
);

studentSchema.index({ fullName: 1 });
studentSchema.index({ phone: 1 });
studentSchema.index({ email: 1 }, { sparse: true });
studentSchema.index({ batch: 1, status: 1 });

module.exports = mongoose.model('Student', studentSchema);
