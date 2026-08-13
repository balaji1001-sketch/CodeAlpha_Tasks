'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Sign a JWT for a user id.
 * @param {string} userId
 * @returns {string}
 */
function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * Verify a JWT and return its payload.
 * @param {string} token
 * @returns {{ sub: string, iat: number, exp: number }}
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

/**
 * Extract a bearer token from the Authorization header or cookie.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim() || null;
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

module.exports = { signToken, verifyToken, extractToken };
