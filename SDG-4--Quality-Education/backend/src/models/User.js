const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_RE, 'Enter a valid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: { values: ['ADMIN', 'TEACHER'], message: 'Role must be ADMIN or TEACHER' }, required: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    teacherProfile: {
      employeeId: { type: String, trim: true, uppercase: true },
      department: { type: String, trim: true, maxlength: 100 },
      subjects: [{ type: String, trim: true }],
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'teacherProfile.employeeId': 1 }, { unique: true, sparse: true });

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 12);

module.exports = mongoose.model('User', userSchema);
