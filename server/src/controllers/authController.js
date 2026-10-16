const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const env = require('../config/env');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const slugify = require('../utils/slugify');

const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  // In production the frontend proxies /api to this server, so the cookie is first-party.
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function sendAuth(res, status, user) {
  const token = jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  res.cookie('token', token, cookieOptions);
  res.status(status).json({ success: true, user });
}

async function uniqueSlug(name) {
  const base = slugify(name) || 'restaurant';
  const taken = await Restaurant.exists({ slug: base });
  return taken ? `${base}-${crypto.randomBytes(3).toString('hex')}` : base;
}

// POST /api/v1/auth/register — creates the owner account and their restaurant.
const register = asyncHandler(async (req, res) => {
  const { name, email, password, restaurantName } = req.body;

  if (await User.exists({ email })) throw new ApiError(409, 'An account with that email already exists');

  const restaurantId = new mongoose.Types.ObjectId();
  const user = await User.create({ name, email, password, role: 'owner', restaurant: restaurantId });
  try {
    await Restaurant.create({
      _id: restaurantId,
      name: restaurantName,
      slug: await uniqueSlug(restaurantName),
      owner: user._id,
    });
  } catch (err) {
    // Roll back so we never leave an owner without a restaurant.
    await User.deleteOne({ _id: user._id });
    throw err;
  }

  sendAuth(res, 201, user);
});

// POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email or password');
  }
  sendAuth(res, 200, user);
});

// POST /api/v1/auth/logout
const logout = (_req, res) => {
  res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
  res.json({ success: true });
};

// GET /api/v1/auth/socket-token — short-lived token for the Socket.io connection.
// In production the API sits behind the frontend's domain, but websockets connect to the
// API directly, where the session cookie isn't sent. This token bridges that gap.
const socketToken = (req, res) => {
  const token = jwt.sign({ id: req.user._id, purpose: 'socket' }, env.jwtSecret, { expiresIn: '5m' });
  res.json({ success: true, token });
};

// GET /api/v1/auth/me
const me = asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findById(req.user.restaurant);
  res.json({ success: true, user: req.user, restaurant });
});

module.exports = { register, login, logout, me, socketToken };
