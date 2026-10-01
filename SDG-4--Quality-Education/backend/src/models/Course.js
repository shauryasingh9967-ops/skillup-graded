const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Course name is required'], trim: true, maxlength: 120 },
    code: { type: String, required: [true, 'Course code is required'], unique: true, uppercase: true, trim: true, maxlength: 20 },
    subjects: [{ type: String, trim: true, maxlength: 80 }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
