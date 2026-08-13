'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, extractToken } = require('../utils/token');

/**
 * Require a valid JWT. Attaches req.user (full document) and req.userId.
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    throw ApiError.unauthorized('Not authenticated. Please log in.');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Session expired. Please log in again.');
    }
    throw ApiError.unauthorized('Invalid authentication token.');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('The user for this token no longer exists.');
  }

  req.user = user;
  req.userId = String(user._id);
  return next();
});

/**
 * Attach req.user when a valid token is present, but never reject.
 * Used for public endpoints that personalise their output (isLiked, isFollowing).
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (user) {
      req.user = user;
      req.userId = String(user._id);
    }
  } catch (err) {
    // Ignore invalid tokens on optional routes.
  }
  return next();
});

module.exports = { protect, optionalAuth };
