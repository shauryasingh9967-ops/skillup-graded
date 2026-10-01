const { isValidObjectId } = require('mongoose');
const ApiError = require('../utils/ApiError');

const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(result.error);
  req[source] = result.data;
  next();
};

// Use with router.param('id', checkId)
const checkId = (req, res, next, value) => {
  if (!/^[a-f\d]{24}$/i.test(value) || !isValidObjectId(value)) return next(new ApiError(400, 'Invalid identifier in URL.'));
  next();
};

module.exports = { validate, checkId };
