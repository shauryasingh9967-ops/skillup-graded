const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Batch name is required'], trim: true, maxlength: 120 },
    code: { type: String, required: [true, 'Batch code is required'], unique: true, uppercase: true, trim: true, maxlength: 20 },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: [true, 'Course is required'], index: true },
    academicYear: { type: String, trim: true, maxlength: 20 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Batch', batchSchema);
