'use strict';

/**
 * Removes the demo accounts (and only the demo accounts) created by seed.js,
 * leaving any real accounts you registered untouched.
 * Usage: npm run unseed
 */

const fs = require('fs');
const path = require('path');

const config = require('../config/env');
const { connectDB, disconnectDB } = require('../config/database');
const { User, Post, Comment } = require('../models');
const logger = require('./logger');
const DEMO_USERS = require('./demoUsers');

const DEMO_USERNAMES = DEMO_USERS.map((u) => u.username);

async function run() {
  await connectDB();

  const demoUsers = await User.find({ username: { $in: DEMO_USERNAMES } }).select('_id username');
  const demoUserIds = demoUsers.map((u) => u._id);

  if (demoUserIds.length === 0) {
    logger.info('No demo accounts found. Nothing to remove.');
    await disconnectDB();
    process.exit(0);
  }

  const demoPosts = await Post.find({ user: { $in: demoUserIds } }).select('_id image');
  const demoPostIds = demoPosts.map((p) => p._id);

  const staleComments = await Comment.find({
    $or: [{ post: { $in: demoPostIds } }, { user: { $in: demoUserIds } }],
  }).select('_id');
  const staleCommentIds = staleComments.map((c) => c._id);

  const { deletedCount: commentsDeleted } = await Comment.deleteMany({
    _id: { $in: staleCommentIds },
  });
  const { deletedCount: postsDeleted } = await Post.deleteMany({ user: { $in: demoUserIds } });

  // Strip any lingering references to demo users/comments from what's left behind.
  await Post.updateMany(
    {},
    {
      $pull: {
        likes: { $in: demoUserIds },
        comments: { $in: staleCommentIds },
      },
    }
  );
  const survivingPosts = await Post.find({ comments: { $exists: true } }).select('_id comments');
  for (const post of survivingPosts) {
    // eslint-disable-next-line no-await-in-loop
    await Post.updateOne({ _id: post._id }, { $set: { commentsCount: post.comments.length } });
  }
  await User.updateMany(
    {},
    { $pull: { followers: { $in: demoUserIds }, following: { $in: demoUserIds } } }
  );

  const { deletedCount: usersDeleted } = await User.deleteMany({ _id: { $in: demoUserIds } });

  // Clean up the generated avatar/post image files for demo users only.
  const avatarsDir = path.join(config.uploadsDir, 'avatars');
  const postsDir = path.join(config.uploadsDir, 'posts');
  for (const username of DEMO_USERNAMES) {
    const avatarFile = path.join(avatarsDir, `avatars-seed-${username}.png`);
    if (fs.existsSync(avatarFile)) fs.unlinkSync(avatarFile);
    for (let i = 0; i < 10; i += 1) {
      const postFile = path.join(postsDir, `posts-seed-${username}-${i}.png`);
      if (fs.existsSync(postFile)) fs.unlinkSync(postFile);
    }
  }

  logger.success(
    `Removed ${usersDeleted} demo users, ${postsDeleted} demo posts, ${commentsDeleted} demo comments.`
  );
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  logger.error(err.stack || err.message);
  process.exit(1);
});
