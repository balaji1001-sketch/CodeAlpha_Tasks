'use strict';

const mongoose = require('mongoose');
const { toPublicUrl } = require('../utils/fileHelper');

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    image: {
      type: String,
      required: [true, 'A post image is required'],
    },
    caption: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2200, 'Caption cannot exceed 2200 characters'],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    commentsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ user: 1, createdAt: -1 });

postSchema.virtual('likesCount').get(function likesCount() {
  return Array.isArray(this.likes) ? this.likes.length : 0;
});

/**
 * Serialize a post for API responses.
 * @param {mongoose.Types.ObjectId|string|null} viewerId
 */
postSchema.methods.toPublicJSON = function toPublicJSON(viewerId = null) {
  const likes = (this.likes || []).map(String);
  const author = this.user && this.user.username ? this.user : null;

  return {
    id: String(this._id),
    image: toPublicUrl(this.image),
    imagePath: this.image,
    caption: this.caption || '',
    likesCount: likes.length,
    isLiked: viewerId ? likes.includes(String(viewerId)) : false,
    commentsCount: this.commentsCount || 0,
    user: author
      ? {
          id: String(author._id),
          username: author.username,
          fullName: author.fullName,
          profilePicture: toPublicUrl(author.profilePicture),
        }
      : { id: String(this.user), username: 'unknown', fullName: 'Unknown user', profilePicture: null },
    isOwner: viewerId
      ? String(author ? author._id : this.user) === String(viewerId)
      : false,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Post', postSchema);
