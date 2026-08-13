'use strict';

const fs = require('fs');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/** 404 handler for unknown API routes. */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/** Remove any file multer wrote before the request failed. */
function cleanupUploadedFile(req) {
  if (req.file && req.file.path) {
    fs.promises.unlink(req.file.path).catch(() => {});
  }
}

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  cleanupUploadedFile(req);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors || [];

  // Mongoose: bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  // Mongoose: schema validation
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0] ? errors[0].message : 'Validation failed';
  }

  // Mongo: duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || { field: '' })[0];
    message = `That ${field} is already taken.`;
    errors = [{ field, message }];
  }

  // JSON body parse failure
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body.';
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${err.stack || err.message}`);
    if (config.isProduction) message = 'Something went wrong. Please try again.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    data: null,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
}
/* eslint-enable no-unused-vars */

module.exports = { notFound, errorHandler };
