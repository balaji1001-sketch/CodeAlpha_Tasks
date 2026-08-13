'use strict';

const { validationResult, body, param, query } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Collects express-validator errors and converts them into a 400 ApiError.
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({
    field: e.path || e.param,
    message: e.msg,
  }));

  return next(ApiError.badRequest(errors[0].message, errors));
}

const registerRules = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage('Username may only contain letters, numbers, dots and underscores')
    .customSanitizer((v) => v.toLowerCase()),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 60 })
    .withMessage('Full name must be between 2 and 60 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters'),
  validate,
];

const loginRules = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email or username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const updateProfileRules = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Full name must be between 2 and 60 characters'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage('Username may only contain letters, numbers, dots and underscores')
    .customSanitizer((v) => v.toLowerCase()),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Bio cannot exceed 160 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .optional({ checkFalsy: true })
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters'),
  validate,
];

const createPostRules = [
  body('caption')
    .optional()
    .trim()
    .isLength({ max: 2200 })
    .withMessage('Caption cannot exceed 2200 characters'),
  validate,
];

const updatePostRules = [
  param('id').isMongoId().withMessage('Invalid post id'),
  body('caption')
    .optional()
    .trim()
    .isLength({ max: 2200 })
    .withMessage('Caption cannot exceed 2200 characters'),
  validate,
];

const commentRules = [
  param('id').isMongoId().withMessage('Invalid post id'),
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Comment cannot be empty')
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
  validate,
];

const mongoIdParam = (name = 'id') => [
  param(name).isMongoId().withMessage(`Invalid ${name}`),
  validate,
];

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50')
    .toInt(),
  validate,
];

const searchRules = [
  query('q').optional().trim().isLength({ max: 60 }).withMessage('Search query is too long'),
  validate,
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  updateProfileRules,
  createPostRules,
  updatePostRules,
  commentRules,
  mongoIdParam,
  paginationRules,
  searchRules,
};
