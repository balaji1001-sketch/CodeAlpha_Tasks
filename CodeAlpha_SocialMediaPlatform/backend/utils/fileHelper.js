'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const logger = require('./logger');

/**
 * Ensure the uploads folders exist at boot.
 */
function ensureUploadDirs() {
  const dirs = [
    config.uploadsDir,
    path.join(config.uploadsDir, 'avatars'),
    path.join(config.uploadsDir, 'posts'),
  ];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Turn a stored relative path (e.g. "/uploads/posts/a.jpg") into an absolute URL.
 * Returns null for empty values, and leaves external URLs untouched.
 * @param {string} relativePath
 * @returns {string|null}
 */
function toPublicUrl(relativePath) {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const clean = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${config.serverUrl}${clean}`;
}

/**
 * Delete an uploaded file referenced by its public relative path.
 * Silently ignores missing files; never throws.
 * @param {string} relativePath
 */
function removeUpload(relativePath) {
  if (!relativePath || /^https?:\/\//i.test(relativePath)) return;
  const normalized = relativePath.replace(/^\/+/, '');
  if (!normalized.startsWith('uploads/')) return;

  const absolute = path.join(config.uploadsDir, '..', normalized);
  const resolved = path.resolve(absolute);

  // Guard against path traversal outside the uploads directory.
  if (!resolved.startsWith(path.resolve(config.uploadsDir))) return;

  fs.promises.unlink(resolved).catch((err) => {
    if (err.code !== 'ENOENT') {
      logger.warn(`Could not delete upload ${normalized}: ${err.message}`);
    }
  });
}

module.exports = { ensureUploadDirs, toPublicUrl, removeUpload };
