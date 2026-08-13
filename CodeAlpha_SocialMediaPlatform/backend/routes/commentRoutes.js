'use strict';

const express = require('express');
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimiter');
const { mongoIdParam } = require('../middleware/validate');

const router = express.Router();

router.delete('/:id', protect, writeLimiter, mongoIdParam('id'), commentController.deleteComment);

module.exports = router;
