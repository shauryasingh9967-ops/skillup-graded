const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');
const { studentScope } = require('../services/scope');
const { buildDashboard } = require('../services/dashboard');

exports.get = asyncHandler(async (req, res) => {
  ok(res, await buildDashboard(studentScope(req), req.user));
});
