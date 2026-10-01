const { ZodError } = require('zod');
const mongoose = require('mongoose');
const env = require('../config/env');

const DUP_MESSAGES = {
  studentId: 'A student with this Student ID already exists.',
  email: 'This email address is already registered.',
  'teacherProfile.employeeId': 'This Employee ID is already in use.',
  code: 'This code is already in use.',
  student: 'Attendance is already recorded for this student on this date.',
};

function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}`, errors: [] });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong.';
  let errors = err.errors || [];

  if (err instanceof ZodError) {
    status = 422;
    message = 'Please correct the highlighted fields.';
    errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 422;
    message = 'Please correct the highlighted fields.';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for ${err.path}.`;
    errors = [];
  } else if (err.code === 11000) {
    status = 409;
    const key = Object.keys(err.keyPattern || err.keyValue || {})[0];
    message = DUP_MESSAGES[key] || 'This record already exists.';
    errors = key ? [{ field: key, message }] : [];
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON in request body.';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large.';
  } else if (!err.isApiError) {
    status = 500;
    message = 'Something went wrong on our side. Please try again.';
    errors = [];
  }

  if (status >= 500 && env.nodeEnv !== 'test') console.error(err);
  res.status(status).json({ success: false, message, errors });
}

module.exports = { notFound, errorHandler };
