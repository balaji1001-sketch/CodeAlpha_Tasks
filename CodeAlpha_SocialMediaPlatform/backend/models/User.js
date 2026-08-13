'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { toPublicUrl } = require('../utils/fileHelper');

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [
        /^[a-z0-9._]+$/,
        'Username may only contain lowercase letters, numbers, dots and underscores',
      ],
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [60, 'Full name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: [160, 'Bio cannot exceed 160 characters'],
    },
    profilePicture: {
      type: String,
      default: '',
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    postsCount: {
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

userSchema.index({ username: 'text', fullName: 'text' });

userSchema.virtual('followersCount').get(function followersCount() {
  return Array.isArray(this.followers) ? this.followers.length : 0;
});

userSchema.virtual('followingCount').get(function followingCount() {
  return Array.isArray(this.following) ? this.following.length : 0;
});

/** Hash the password whenever it is set or changed. */
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    return next();
  } catch (err) {
    return next(err);
  }
});

/**
 * Compare a plain-text password with the stored hash.
 * @param {string} candidate
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * Serialize a user for API responses.
 * @param {mongoose.Types.ObjectId|string|null} viewerId Current user, to compute isFollowing.
 */
userSchema.methods.toPublicJSON = function toPublicJSON(viewerId = null) {
  const followers = (this.followers || []).map(String);
  const following = (this.following || []).map(String);

  return {
    id: String(this._id),
    username: this.username,
    fullName: this.fullName,
    email: this.email,
    bio: this.bio || '',
    profilePicture: toPublicUrl(this.profilePicture),
    profilePicturePath: this.profilePicture || '',
    followersCount: followers.length,
    followingCount: following.length,
    postsCount: this.postsCount || 0,
    isFollowing: viewerId ? followers.includes(String(viewerId)) : false,
    isSelf: viewerId ? String(this._id) === String(viewerId) : false,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('User', userSchema);
