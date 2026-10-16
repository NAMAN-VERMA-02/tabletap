const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

// router.param handler: rejects malformed :id values with a clean 400.
const validateId = (_req, _res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return next(new ApiError(400, 'Invalid id'));
  next();
};

module.exports = validateId;
