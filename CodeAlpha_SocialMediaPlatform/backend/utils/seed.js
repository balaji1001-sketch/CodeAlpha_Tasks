'use strict';

/**
 * Seeds demo users, posts and comments.
 * Usage:  npm run seed
 * WARNING: clears the users/posts/comments collections first.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const config = require('../config/env');
const { connectDB, disconnectDB } = require('../config/database');
const { User, Post, Comment } = require('../models');
const logger = require('./logger');

/** Build a small solid-colour PNG without any external dependency. */
function makePng(filePath, r, g, b, size = 600) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // filter type: none
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      // Smooth diagonal gradient (darker top-left to lighter bottom-right) instead of banding.
      const shade = Math.floor(((x + y) / (size * 2)) * 50) - 25;
      raw[offset] = Math.min(255, Math.max(0, r + shade));
      raw[offset + 1] = Math.min(255, Math.max(0, g + shade));
      raw[offset + 2] = Math.min(255, Math.max(0, b + shade));
      offset += 3;
    }
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  fs.writeFileSync(filePath, png);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ 0xffffffff;
}

const DEMO_USERS = require('./demoUsers');

const CAPTIONS = [
  'Golden hour on the roof. #nofilter',
  'Trying out a new lens today.',
  'Coffee, code, repeat.',
  'Weekend hike was worth every step.',
  'Small things, big joy.',
  'Late night debugging session.',
  'Sunday market colours.',
  'Finally finished this build!',
];

const COMMENTS = [
  'This is beautiful!',
  'Love the colours here.',
  'Where was this taken?',
  'Incredible shot 👏',
  'Bookmarking this one.',
  'So good.',
];

async function run() {
  await connectDB();
  logger.info('Clearing existing collections...');
  await Promise.all([User.deleteMany({}), Post.deleteMany({}), Comment.deleteMany({})]);

  const avatarsDir = path.join(config.uploadsDir, 'avatars');
  const postsDir = path.join(config.uploadsDir, 'posts');
  fs.mkdirSync(avatarsDir, { recursive: true });
  fs.mkdirSync(postsDir, { recursive: true });

  const users = [];
  for (const spec of DEMO_USERS) {
    const avatarName = `avatars-seed-${spec.username}.png`;
    makePng(path.join(avatarsDir, avatarName), spec.color[0], spec.color[1], spec.color[2], 256);

    // eslint-disable-next-line no-await-in-loop
    const user = await User.create({
      username: spec.username,
      fullName: spec.fullName,
      email: spec.email,
      password: 'Password123',
      bio: spec.bio,
      profilePicture: `/uploads/avatars/${avatarName}`,
    });
    users.push(user);
  }
  logger.success(`Created ${users.length} demo users (password: Password123)`);

  // Everyone follows everyone else.
  for (const user of users) {
    const others = users.filter((u) => String(u._id) !== String(user._id));
    user.following = others.map((u) => u._id);
    // eslint-disable-next-line no-await-in-loop
    await user.save();
  }
  for (const user of users) {
    const followers = users.filter((u) => String(u._id) !== String(user._id));
    user.followers = followers.map((u) => u._id);
    // eslint-disable-next-line no-await-in-loop
    await user.save();
  }
  logger.success('Wired up follow relationships');

  let postIndex = 0;
  const posts = [];
  for (const user of users) {
    for (let i = 0; i < 3; i += 1) {
      const imageName = `posts-seed-${user.username}-${i}.png`;
      const [r, g, b] = DEMO_USERS[users.indexOf(user)].color;
      makePng(path.join(postsDir, imageName), (r + i * 40) % 255, (g + i * 25) % 255, (b + i * 60) % 255, 800);

      // eslint-disable-next-line no-await-in-loop
      const post = await Post.create({
        user: user._id,
        image: `/uploads/posts/${imageName}`,
        caption: CAPTIONS[postIndex % CAPTIONS.length],
        likes: users.filter(() => Math.random() > 0.4).map((u) => u._id),
      });
      posts.push(post);
      postIndex += 1;
    }
    // eslint-disable-next-line no-await-in-loop
    await User.updateOne({ _id: user._id }, { $set: { postsCount: 3 } });
  }
  logger.success(`Created ${posts.length} demo posts`);

  let commentIndex = 0;
  for (const post of posts) {
    const commenters = users.filter((u) => String(u._id) !== String(post.user)).slice(0, 2);
    for (const commenter of commenters) {
      // eslint-disable-next-line no-await-in-loop
      const comment = await Comment.create({
        user: commenter._id,
        post: post._id,
        comment: COMMENTS[commentIndex % COMMENTS.length],
      });
      commentIndex += 1;
      // eslint-disable-next-line no-await-in-loop
      await Post.updateOne(
        { _id: post._id },
        { $push: { comments: comment._id }, $inc: { commentsCount: 1 } }
      );
    }
  }
  logger.success(`Created ${commentIndex} demo comments`);

  logger.success('Seed complete. Log in with ada@example.com / Password123');
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  logger.error(err.stack || err.message);
  process.exit(1);
});
