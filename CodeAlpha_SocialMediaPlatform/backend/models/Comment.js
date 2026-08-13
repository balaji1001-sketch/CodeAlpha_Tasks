'use strict';

const mongoose = require('mongoose');
const { toPublicUrl } = require('../utils/fileHelper');

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    comment: {
      type: String,
      required: [true, 'Comment text is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [500, 'Comment cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

commentSchema.index({ post: 1, createdAt: -1 });

/**
 * Serialize a comment for API responses.
 * @param {mongoose.Types.ObjectId|string|null} viewerId
 * @param {mongoose.Types.ObjectId|string|null} postOwnerId Post owners may delete any comment on their post.
 */
commentSchema.methods.toPublicJSON = function toPublicJSON(viewerId = null, postOwnerId = null) {
  const author = this.user && this.user.username ? this.user : null;
  const authorId = String(author ? author._id : this.user);

  const canDelete = Boolean(
    viewerId && (authorId === String(viewerId) || String(postOwnerId) === String(viewerId))
  );

  return {
    id: String(this._id),
    comment: this.comment,
    post: String(this.post && this.post._id ? this.post._id : this.post),
    user: author
      ? {
          id: authorId,
          username: author.username,
          fullName: author.fullName,
          profilePicture: toPublicUrl(author.profilePicture),
        }
      : { id: authorId, username: 'unknown', fullName: 'Unknown user', profilePicture: null },
    isOwner: viewerId ? authorId === String(viewerId) : false,
    canDelete,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Comment', commentSchema);
