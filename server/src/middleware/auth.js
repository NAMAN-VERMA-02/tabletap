const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies a JWT and loads its user. Shared by HTTP routes and Socket.io connections.
async function userFromToken(token) {
  if (!token) throw new ApiError(401, 'Not logged in');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Session expired, please log in again');
  }

  const user = await User.findById(payload.id);
  if (!user) throw new ApiError(401, 'User no longer exists');
  return user;
}

// Requires a valid JWT (httpOnly cookie, or Bearer header for API clients).
const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = req.cookies?.token || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  req.user = await userFromToken(token);
  next();
});

// Restricts a route to the given roles. Use after `protect`.
const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to do this'));
    }
    next();
  };

module.exports = { protect, authorize, userFromToken };
