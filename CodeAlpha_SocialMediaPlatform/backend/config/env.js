'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function required(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) {
    // eslint-disable-next-line no-console
    console.error(`[config] Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

function toInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const NODE_ENV = process.env.NODE_ENV || 'development';

const config = {
  nodeEnv: NODE_ENV,
  isProduction: NODE_ENV === 'production',
  port: toInt(process.env.PORT, 5000),

  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/socialmedia'),

  jwtSecret: required(
    'JWT_SECRET',
    NODE_ENV === 'production' ? '' : 'dev_only_insecure_secret_change_me'
  ),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  serverUrl: (process.env.SERVER_URL || 'http://localhost:5000').replace(/\/+$/, ''),

  clientOrigins: (process.env.CLIENT_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_MB, 5) * 1024 * 1024,

  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 15) * 60 * 1000,
    max: toInt(process.env.RATE_LIMIT_MAX, 300),
    authMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, 30),
  },

  uploadsDir: path.join(__dirname, '..', 'uploads'),
  pagination: {
    defaultLimit: 10,
    maxLimit: 50,
  },
};

module.exports = config;
