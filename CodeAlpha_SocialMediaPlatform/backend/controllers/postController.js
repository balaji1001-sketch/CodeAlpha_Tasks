'use strict';

const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendOk, sendCreated } = require('../utils/apiResponse');
const { removeUpload } = require('../utils/fileHelper');
const config = require('../config/env');

const AUTHOR_FIELDS = 'username fullName profilePicture';

/**
 * GET /api/posts — global feed, newest first, paginated.
 * ?feed=following restricts to people the viewer follows (plus themselves).
 */
const getPosts = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    parseInt(req.query.limit, 10) || config.pagination.defaultLimit,
    config.pagination.maxLimit
  );

  let filter = {};
  if (req.query.feed === 'following' && req.user) {
    filter = { user: { $in: [...req.user.following, req.user._id] } };
  }

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', AUTHOR_FIELDS),
    Post.countDocuments(filter),
  ]);

  return sendOk(
    res,
    'Feed fetched.',
    { posts: posts.map((p) => p.toPublicJSON(req.userId || null)) },
    {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasMore: page * limit < total,
      },
    }
  );
});

/**
 * GET /api/posts/:id — single post with its comments
 */
const getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('user', AUTHOR_FIELDS);
  if (!post) throw ApiError.notFound('Post not found.');

  const comments = await Comment.find({ post: post._id })
    .sort({ createdAt: -1 })
    .populate('user', AUTHOR_FIELDS);

  const ownerId = post.user && post.user._id ? post.user._id : post.user;

  return sendOk(res, 'Post fetched.', {
    post: post.toPublicJSON(req.userId || null),
    comments: comments.map((c) => c.toPublicJSON(req.userId || null, ownerId)),
  });
});

/**
 * POST /api/posts — create a post (multipart/form-data with an "image" field)
 */
const createPost = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('A post image is required.');

  const post = await Post.create({
    user: req.userId,
    image: `/uploads/posts/${req.file.filename}`,
    caption: (req.body.caption || '').trim(),
  });

  await User.updateOne({ _id: req.userId }, { $inc: { postsCount: 1 } });
  await post.populate('user', AUTHOR_FIELDS);

  return sendCreated(res, 'Post published successfully.', {
    post: post.toPublicJSON(req.userId),
  });
});

/**
 * PUT /api/posts/:id — edit own post (caption and/or image)
 */
const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found.');
  if (String(post.user) !== String(req.userId)) {
    throw ApiError.forbidden('You can only edit your own posts.');
  }

  if (typeof req.body.caption === 'string') {
    post.caption = req.body.caption.trim();
  }

  if (req.file) {
    const previous = post.image;
    post.image = `/uploads/posts/${req.file.filename}`;
    removeUpload(previous);
  }

  await post.save();
  await post.populate('user', AUTHOR_FIELDS);

  return sendOk(res, 'Post updated successfully.', { post: post.toPublicJSON(req.userId) });
});

/**
 * DELETE /api/posts/:id — delete own post and its comments
 */
const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found.');
  if (String(post.user) !== String(req.userId)) {
    throw ApiError.forbidden('You can only delete your own posts.');
  }

  const imagePath = post.image;

  await Promise.all([
    Comment.deleteMany({ post: post._id }),
    Post.deleteOne({ _id: post._id }),
    User.updateOne({ _id: post.user, postsCount: { $gt: 0 } }, { $inc: { postsCount: -1 } }),
  ]);

  removeUpload(imagePath);

  return sendOk(res, 'Post deleted successfully.', { id: String(post._id) });
});

/**
 * POST /api/posts/:id/like — toggle like, duplicate-safe via $addToSet
 */
const toggleLike = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw ApiError.notFound('Post not found.');

  const alreadyLiked = post.likes.some((u) => String(u) === String(req.userId));

  await Post.updateOne(
    { _id: post._id },
    alreadyLiked ? { $pull: { likes: req.userId } } : { $addToSet: { likes: req.userId } }
  );

  const updated = await Post.findById(post._id).select('likes');

  return sendOk(res, alreadyLiked ? 'Post unliked.' : 'Post liked.', {
    id: String(post._id),
    isLiked: !alreadyLiked,
    likesCount: updated.likes.length,
  });
});

/**
 * GET /api/posts/:id/likes — users who liked the post
 */
const getPostLikes = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate(
    'likes',
    'username fullName profilePicture bio followers following postsCount createdAt'
  );
  if (!post) throw ApiError.notFound('Post not found.');

  return sendOk(res, 'Likes fetched.', {
    users: post.likes.map((u) => u.toPublicJSON(req.userId || null)),
  });
});

module.exports = {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  getPostLikes,
};
