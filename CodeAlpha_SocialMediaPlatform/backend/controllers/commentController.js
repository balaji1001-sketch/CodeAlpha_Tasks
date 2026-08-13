'use strict';

const Comment = require('../models/Comment');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendOk, sendCreated } = require('../utils/apiResponse');

const AUTHOR_FIELDS = 'username fullName profilePicture';

/**
 * GET /api/posts/:id/comments — all comments on a post, newest first
 */
const getComments = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).select('user');
  if (!post) throw ApiError.notFound('Post not found.');

  const comments = await Comment.find({ post: post._id })
    .sort({ createdAt: -1 })
    .populate('user', AUTHOR_FIELDS);

  return sendOk(res, 'Comments fetched.', {
    comments: comments.map((c) => c.toPublicJSON(req.userId || null, post.user)),
    commentsCount: comments.length,
  });
});

/**
 * POST /api/posts/:id/comments — add a comment
 */
const addComment = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).select('user commentsCount');
  if (!post) throw ApiError.notFound('Post not found.');

  const comment = await Comment.create({
    user: req.userId,
    post: post._id,
    comment: req.body.comment.trim(),
  });

  await Post.updateOne(
    { _id: post._id },
    { $push: { comments: comment._id }, $inc: { commentsCount: 1 } }
  );

  await comment.populate('user', AUTHOR_FIELDS);

  const updated = await Post.findById(post._id).select('commentsCount');

  return sendCreated(res, 'Comment added.', {
    comment: comment.toPublicJSON(req.userId, post.user),
    commentsCount: updated.commentsCount,
  });
});

/**
 * DELETE /api/comments/:id — delete own comment (or any comment on your own post)
 */
const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw ApiError.notFound('Comment not found.');

  const post = await Post.findById(comment.post).select('user commentsCount');
  const isCommentAuthor = String(comment.user) === String(req.userId);
  const isPostOwner = post && String(post.user) === String(req.userId);

  if (!isCommentAuthor && !isPostOwner) {
    throw ApiError.forbidden('You can only delete your own comments.');
  }

  await Comment.deleteOne({ _id: comment._id });

  let commentsCount = 0;
  if (post) {
    await Post.updateOne(
      { _id: post._id, commentsCount: { $gt: 0 } },
      { $pull: { comments: comment._id }, $inc: { commentsCount: -1 } }
    );
    const updated = await Post.findById(post._id).select('commentsCount');
    commentsCount = updated ? updated.commentsCount : 0;
  }

  return sendOk(res, 'Comment deleted.', {
    id: String(comment._id),
    postId: String(comment.post),
    commentsCount,
  });
});

module.exports = { getComments, addComment, deleteComment };
