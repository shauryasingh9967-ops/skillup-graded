const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;
const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'];

const attendanceSchema = new mongoose.Schema(
  {
    student: { type: ObjectId, ref: 'Student', required: true },
    batch: { type: ObjectId, ref: 'Batch', required: true },
    date: { type: Date, required: true }, // stored as 00:00 UTC of the calendar day
    status: { type: String, enum: { values: STATUSES, message: 'Invalid attendance status' }, required: true },
    markedBy: { type: ObjectId, ref: 'User', required: true },
    remarks: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

attendanceSchema.index({ student: 1, date: 1 }, { unique: true }); // one record per student per day
attendanceSchema.index({ batch: 1, date: 1 });
attendanceSchema.index({ date: 1 });

attendanceSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Attendance', attendanceSchema);
