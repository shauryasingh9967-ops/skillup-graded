const mongoose = require('mongoose');
const ApiError = require('./ApiError');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const round = (n, dp = 1) => (n == null ? null : Math.round(n * 10 ** dp) / 10 ** dp);
const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v) && /^[a-f\d]{24}$/i.test(v);
const oid = (v) => new mongoose.Types.ObjectId(String(v));

// Read an ObjectId-typed query value or throw 400.
function queryId(value, name) {
  if (value == null || value === '') return undefined;
  if (!isId(value)) throw new ApiError(400, `Invalid ${name}`);
  return value;
}

function pageParams(query, defLimit = 10, maxLimit = 100) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

const pagination = (page, limit, total) => ({ page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) });

function gradeFor(percentage) {
  if (percentage == null) return null;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

module.exports = { escapeRegex, round, isId, oid, queryId, pageParams, pagination, gradeFor };
