'use strict';

/**
 * Uniform success envelope: { success, message, data }
 */
function sendSuccess(res, statusCode, message, data = null, extra = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
  });
}

function sendCreated(res, message, data = null, extra = {}) {
  return sendSuccess(res, 201, message, data, extra);
}

function sendOk(res, message, data = null, extra = {}) {
  return sendSuccess(res, 200, message, data, extra);
}

module.exports = { sendSuccess, sendCreated, sendOk };
