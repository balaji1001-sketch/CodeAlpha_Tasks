'use strict';

const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const { ensureUploadDirs } = require('../utils/fileHelper');

ensureUploadDirs();

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function makeStorage(subfolder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      cb(null, path.join(config.uploadsDir, subfolder));
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = ALLOWED_EXT.has(ext) ? ext : '.jpg';
      const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
      cb(null, `${subfolder}-${unique}${safeExt}`);
    },
  });
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
    return cb(ApiError.badRequest('Only JPG, PNG, GIF and WEBP images are allowed.'));
  }
  return cb(null, true);
}

function build(subfolder) {
  return multer({
    storage: makeStorage(subfolder),
    fileFilter,
    limits: {
      fileSize: config.maxFileSizeBytes,
      files: 1,
    },
  });
}

const uploadPostImage = build('posts').single('image');
const uploadAvatar = build('avatars').single('profilePicture');

/** Wrap a multer middleware so its errors become ApiError instances. */
function wrap(middleware) {
  return function handler(req, res, next) {
    middleware(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            ApiError.payloadTooLarge(
              `Image is too large. Maximum size is ${Math.round(config.maxFileSizeBytes / (1024 * 1024))} MB.`
            )
          );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(ApiError.badRequest(`Unexpected file field "${err.field}".`));
        }
        return next(ApiError.badRequest(err.message));
      }
      return next(err);
    });
  };
}

module.exports = {
  uploadPostImage: wrap(uploadPostImage),
  uploadAvatar: wrap(uploadAvatar),
};
