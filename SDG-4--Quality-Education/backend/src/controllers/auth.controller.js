const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/respond');

const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = user ? await user.verifyPassword(password) : false;
  if (!valid) throw new ApiError(401, 'Incorrect email or password.');
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated. Contact your administrator.');
  ok(res, { token: signToken(user), user: user.toJSON() }, 'Signed in successfully');
});

exports.me = asyncHandler(async (req, res) => ok(res, { user: req.user }));

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.verifyPassword(req.body.currentPassword))) throw new ApiError(400, 'Current password is incorrect.', [{ field: 'currentPassword', message: 'Current password is incorrect.' }]);
  user.passwordHash = await User.hashPassword(req.body.newPassword);
  await user.save();
  ok(res, null, 'Password updated');
});
