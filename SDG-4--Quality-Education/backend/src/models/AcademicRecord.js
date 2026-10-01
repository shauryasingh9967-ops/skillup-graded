const mongoose = require('mongoose');
const { gradeFor, round } = require('../utils/helpers');

const { ObjectId } = mongoose.Schema.Types;
const TYPES = ['QUIZ', 'ASSIGNMENT', 'MIDTERM', 'FINAL', 'PRACTICAL'];

const academicRecordSchema = new mongoose.Schema(
  {
    student: { type: ObjectId, ref: 'Student', required: true },
    subject: { type: String, required: [true, 'Subject is required'], trim: true, maxlength: 80 },
    assessmentName: { type: String, required: [true, 'Assessment name is required'], trim: true, maxlength: 120 },
    assessmentType: { type: String, enum: { values: TYPES, message: 'Invalid assessment type' }, default: 'QUIZ' },
    marksObtained: { type: Number, required: [true, 'Marks obtained is required'], min: [0, 'Marks cannot be negative'] },
    maxMarks: { type: Number, required: [true, 'Maximum marks is required'], min: [1, 'Maximum marks must be greater than 0'] },
    percentage: { type: Number },
    grade: { type: String },
    teacher: { type: ObjectId, ref: 'User', required: true },
    assessmentDate: { type: Date, required: [true, 'Assessment date is required'] },
    remarks: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

academicRecordSchema.index({ student: 1, assessmentDate: -1 });
academicRecordSchema.index({ student: 1, subject: 1 });
academicRecordSchema.index({ teacher: 1, createdAt: -1 });

academicRecordSchema.pre('validate', function computeScore(next) {
  if (this.marksObtained != null && this.maxMarks > 0) {
    if (this.marksObtained > this.maxMarks) {
      this.invalidate('marksObtained', 'Marks obtained cannot exceed maximum marks');
    } else {
      this.percentage = round((this.marksObtained / this.maxMarks) * 100, 2);
      this.grade = gradeFor(this.percentage);
    }
  }
  next();
});

academicRecordSchema.statics.TYPES = TYPES;

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);
