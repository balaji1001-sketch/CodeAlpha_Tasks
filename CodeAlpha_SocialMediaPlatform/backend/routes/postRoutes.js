'use strict';

const express = require('express');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadPostImage } = require('../middleware/upload');
const { writeLimiter } = require('../middleware/rateLimiter');
const {
  createPostRules,
  updatePostRules,
  commentRules,
  mongoIdParam,
  paginationRules,
} = require('../middleware/validate');

const router = express.Router();

router
  .route('/')
  .get(optionalAuth, paginationRules, postController.getPosts)
  .post(protect, writeLimiter, uploadPostImage, createPostRules, postController.createPost);

router
  .route('/:id')
  .get(optionalAuth, mongoIdParam('id'), postController.getPostById)
  .put(protect, writeLimiter, uploadPostImage, updatePostRules, postController.updatePost)
  .delete(protect, writeLimiter, mongoIdParam('id'), postController.deletePost);

router.post('/:id/like', protect, writeLimiter, mongoIdParam('id'), postController.toggleLike);
router.get('/:id/likes', optionalAuth, mongoIdParam('id'), postController.getPostLikes);

router
  .route('/:id/comments')
  .get(optionalAuth, mongoIdParam('id'), commentController.getComments)
  .post(protect, writeLimiter, commentRules, commentController.addComment);

module.exports = router;
