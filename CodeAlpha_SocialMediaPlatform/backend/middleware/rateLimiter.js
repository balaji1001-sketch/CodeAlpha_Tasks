'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

function message(text) {
  return { success: false, message: text, data: null };
}

const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('Too many requests from this IP. Please try again later.'),
});

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: message('Too many authentication attempts. Please try again in a few minutes.'),
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: message('You are doing that too fast. Please slow down.'),
});

module.exports = { apiLimiter, authLimiter, writeLimiter };
