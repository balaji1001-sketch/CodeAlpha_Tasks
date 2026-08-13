'use strict';

const express = require('express');
const userController = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { writeLimiter } = require('../middleware/rateLimiter');
const {
  updateProfileRules,
  mongoIdParam,
  paginationRules,
  searchRules,
} = require('../middleware/validate');

const router = express.Router();

// Static segments must be declared before the ":id" routes.
router.get('/search', optionalAuth, searchRules, userController.searchUsers);
router.get('/suggestions', protect, userController.getSuggestions);

router
  .route('/profile')
  .get(protect, userController.getMyProfile)
  .put(protect, writeLimiter, uploadAvatar, updateProfileRules, userController.updateMyProfile);

router.get('/:id', optionalAuth, userController.getUserProfile);
router.get('/:id/posts', optionalAuth, paginationRules, userController.getUserPosts);
router.post('/:id/follow', protect, writeLimiter, mongoIdParam('id'), userController.toggleFollow);
router.get('/:id/followers', optionalAuth, mongoIdParam('id'), userController.getFollowers);
router.get('/:id/following', optionalAuth, mongoIdParam('id'), userController.getFollowing);

module.exports = router;
