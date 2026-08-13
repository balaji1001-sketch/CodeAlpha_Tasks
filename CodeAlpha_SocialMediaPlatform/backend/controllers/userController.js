'use strict';

const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendOk } = require('../utils/apiResponse');
const { removeUpload } = require('../utils/fileHelper');
const config = require('../config/env');

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/users/profile  — current user's profile
 */
const getMyProfile = asyncHandler(async (req, res) => {
  return sendOk(res, 'Profile fetched.', { user: req.user.toPublicJSON(req.userId) });
});

/**
 * PUT /api/users/profile — update the current user (optionally with a new avatar)
 */
const updateMyProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select('+password');
  if (!user) throw ApiError.notFound('User not found.');

  const { fullName, username, bio, email, password } = req.body;

  if (username && username !== user.username) {
    const taken = await User.findOne({ username, _id: { $ne: user._id } });
    if (taken) throw ApiError.conflict('That username is already taken.');
    user.username = username;
  }

  if (email && email !== user.email) {
    const taken = await User.findOne({ email, _id: { $ne: user._id } });
    if (taken) throw ApiError.conflict('That email is already registered.');
    user.email = email;
  }

  if (typeof fullName === 'string' && fullName.trim()) user.fullName = fullName.trim();
  if (typeof bio === 'string') user.bio = bio.trim();
  if (password) user.password = password;

  if (req.file) {
    const previous = user.profilePicture;
    user.profilePicture = `/uploads/avatars/${req.file.filename}`;
    if (previous) removeUpload(previous);
  }

  if (req.body.removeProfilePicture === 'true' && !req.file && user.profilePicture) {
    removeUpload(user.profilePicture);
    user.profilePicture = '';
  }

  await user.save();

  return sendOk(res, 'Profile updated successfully.', { user: user.toPublicJSON(req.userId) });
});

/**
 * GET /api/users/:id — public profile by id or username
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = mongoose.isValidObjectId(id)
    ? { _id: id }
    : { username: String(id).toLowerCase() };

  const user = await User.findOne(query);
  if (!user) throw ApiError.notFound('User not found.');

  return sendOk(res, 'User fetched.', { user: user.toPublicJSON(req.userId || null) });
});

/**
 * GET /api/users/:id/posts — a user's posts, newest first
 */
const getUserPosts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = mongoose.isValidObjectId(id)
    ? { _id: id }
    : { username: String(id).toLowerCase() };

  const user = await User.findOne(query).select('_id');
  if (!user) throw ApiError.notFound('User not found.');

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    parseInt(req.query.limit, 10) || config.pagination.defaultLimit,
    config.pagination.maxLimit
  );

  const [posts, total] = await Promise.all([
    Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'username fullName profilePicture'),
    Post.countDocuments({ user: user._id }),
  ]);

  return sendOk(
    res,
    'User posts fetched.',
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
 * POST /api/users/:id/follow — toggle follow/unfollow
 */
const toggleFollow = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (String(targetId) === String(req.userId)) {
    throw ApiError.badRequest('You cannot follow yourself.');
  }

  const target = await User.findById(targetId);
  if (!target) throw ApiError.notFound('User not found.');

  const me = await User.findById(req.userId);
  const alreadyFollowing = me.following.some((f) => String(f) === String(target._id));

  if (alreadyFollowing) {
    await Promise.all([
      User.updateOne({ _id: me._id }, { $pull: { following: target._id } }),
      User.updateOne({ _id: target._id }, { $pull: { followers: me._id } }),
    ]);
  } else {
    await Promise.all([
      User.updateOne({ _id: me._id }, { $addToSet: { following: target._id } }),
      User.updateOne({ _id: target._id }, { $addToSet: { followers: me._id } }),
    ]);
  }

  const updated = await User.findById(target._id);

  return sendOk(res, alreadyFollowing ? 'Unfollowed successfully.' : 'Followed successfully.', {
    isFollowing: !alreadyFollowing,
    followersCount: updated.followers.length,
    followingCount: updated.following.length,
    user: updated.toPublicJSON(req.userId),
  });
});

/**
 * GET /api/users/:id/followers
 */
const getFollowers = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate(
    'followers',
    'username fullName profilePicture bio followers'
  );
  if (!user) throw ApiError.notFound('User not found.');

  return sendOk(res, 'Followers fetched.', {
    users: user.followers.map((u) => u.toPublicJSON(req.userId || null)),
  });
});

/**
 * GET /api/users/:id/following
 */
const getFollowing = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate(
    'following',
    'username fullName profilePicture bio followers'
  );
  if (!user) throw ApiError.notFound('User not found.');

  return sendOk(res, 'Following fetched.', {
    users: user.following.map((u) => u.toPublicJSON(req.userId || null)),
  });
});

/**
 * GET /api/users/search?q=term — live user search by username or full name
 */
const searchUsers = asyncHandler(async (req, res) => {
  const term = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 25);

  if (!term) {
    return sendOk(res, 'No search term provided.', { users: [] });
  }

  const regex = new RegExp(escapeRegex(term), 'i');
  const users = await User.find({
    $or: [{ username: regex }, { fullName: regex }],
  })
    .limit(limit)
    .select('username fullName profilePicture bio followers following postsCount createdAt');

  return sendOk(res, 'Search results fetched.', {
    users: users.map((u) => u.toPublicJSON(req.userId || null)),
  });
});

/**
 * GET /api/users/suggestions — users the viewer does not follow yet
 */
const getSuggestions = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
  const exclude = [req.user._id, ...req.user.following];

  const users = await User.find({ _id: { $nin: exclude } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('username fullName profilePicture bio followers following postsCount createdAt');

  return sendOk(res, 'Suggestions fetched.', {
    users: users.map((u) => u.toPublicJSON(req.userId)),
  });
});

module.exports = {
  getMyProfile,
  updateMyProfile,
  getUserProfile,
  getUserPosts,
  toggleFollow,
  getFollowers,
  getFollowing,
  searchUsers,
  getSuggestions,
};
