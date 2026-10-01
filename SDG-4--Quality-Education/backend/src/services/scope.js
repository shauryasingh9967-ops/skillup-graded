const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');

// Filter that limits Student queries to what the signed-in user may see.
const studentScope = (req) => (req.user.role === 'ADMIN' ? {} : { assignedTeacher: req.user._id });

// null = unrestricted (admin). Otherwise the list of student ids the teacher may access.
async function scopedStudentIds(req) {
  if (req.user.role === 'ADMIN') return null;
  return Student.find({ assignedTeacher: req.user._id }).distinct('_id');
}

// Loads a student and enforces teacher scope. 404 hides students outside the teacher's scope only via 403.
async function getAccessibleStudent(req, studentId, select) {
  const student = await Student.findById(studentId).select(select || '');
  if (!student) throw new ApiError(404, 'Student not found.');
  if (req.user.role === 'TEACHER' && String(student.assignedTeacher) !== String(req.user._id)) {
    throw new ApiError(403, 'This student is not assigned to you.');
  }
  return student;
}

module.exports = { studentScope, scopedStudentIds, getAccessibleStudent };
