// middleware/validate.js
const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extracted = errors.array().map(err => ({ field: err.path, message: err.msg }));
    return ApiResponse.error(res, 'Validation failed', 400, extracted);
  }
  next();
};

module.exports = validate;