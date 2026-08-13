'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { sendOk, sendCreated } = require('../utils/apiResponse');
const config = require('../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProduction,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { username, fullName, email, password } = req.body;

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    if (existing.email === email) throw ApiError.conflict('That email is already registered.');
    throw ApiError.conflict('That username is already taken.');
  }

  const user = await User.create({ username, fullName, email, password });
  const token = signToken(user._id);

  res.cookie('token', token, COOKIE_OPTIONS);
  return sendCreated(res, 'Account created successfully.', {
    token,
    user: user.toPublicJSON(user._id),
  });
});

/**
 * POST /api/auth/login
 * Accepts { identifier, password } where identifier is an email or username.
 */
const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const value = String(identifier).trim().toLowerCase();

  const user = await User.findOne({
    $or: [{ email: value }, { username: value }],
  }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid credentials. Please check and try again.');
  }

  const token = signToken(user._id);
  res.cookie('token', token, COOKIE_OPTIONS);

  return sendOk(res, 'Logged in successfully.', {
    token,
    user: user.toPublicJSON(user._id),
  });
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', { ...COOKIE_OPTIONS, maxAge: undefined });
  return sendOk(res, 'Logged out successfully.', null);
});

/**
 * GET /api/auth/me
 */
const me = asyncHandler(async (req, res) => {
  return sendOk(res, 'Current user fetched.', {
    user: req.user.toPublicJSON(req.userId),
  });
});

module.exports = { register, login, logout, me };
