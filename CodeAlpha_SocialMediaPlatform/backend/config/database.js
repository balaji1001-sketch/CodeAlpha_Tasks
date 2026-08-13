'use strict';

const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB.
 * @param {string} [uri] Optional override (used by tests).
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB(uri) {
  const target = uri || config.mongoUri;

  mongoose.connection.on('connected', () => {
    logger.success(`MongoDB connected: ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(target, {
    serverSelectionTimeoutMS: 10000,
    autoIndex: !config.isProduction,
  });

  return mongoose;
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB };
