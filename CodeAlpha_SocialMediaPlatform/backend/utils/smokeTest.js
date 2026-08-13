'use strict';

/**
 * End-to-end smoke test of every REST endpoint.
 *
 *   npm run test:smoke
 *
 * Runs against MONGO_URI, or against an in-memory MongoDB when
 * mongodb-memory-server is installed and USE_MEMORY_DB=1 is set.
 * Exits non-zero on the first failed assertion.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    // eslint-disable-next-line no-console
    console.log(`  \x1b[32mPASS\x1b[0m  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    // eslint-disable-next-line no-console
    console.log(`  \x1b[31mFAIL\x1b[0m  ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

function section(title) {
  // eslint-disable-next-line no-console
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

/* ---------------------------- tiny PNG maker ---------------------------- */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

function pngBuffer(size = 16, rgb = [80, 120, 220]) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y += 1) {
    raw[o] = 0;
    o += 1;
    for (let x = 0; x < size; x += 1) {
      raw[o] = rgb[0];
      raw[o + 1] = rgb[1];
      raw[o + 2] = rgb[2];
      o += 3;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------- runner -------------------------------- */
async function main() {
  let memoryServer = null;

  if (process.env.USE_MEMORY_DB === '1') {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGO_URI = memoryServer.getUri('smoketest');
  }

  process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke_test_secret_value_long_enough';
  process.env.RATE_LIMIT_MAX = '100000';
  process.env.AUTH_RATE_LIMIT_MAX = '100000';

  // eslint-disable-next-line global-require
  const app = require('../app');
  // eslint-disable-next-line global-require
  const { connectDB, disconnectDB } = require('../config/database');
  // eslint-disable-next-line global-require
  const { User, Post, Comment } = require('../models');

  await connectDB();
  await Promise.all([User.deleteMany({}), Post.deleteMany({}), Comment.deleteMany({})]);

  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  const call = async (method, url, { token, json, form } = {}) => {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let body;
    if (json) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (form) {
      body = form;
    }
    const res = await fetch(`${base}${url}`, { method, headers, body });
    const text = await res.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      parsed = { raw: text.slice(0, 200) };
    }
    return { status: res.status, body: parsed };
  };

  const tmpImage = path.join(os.tmpdir(), `smoke-${Date.now()}.png`);
  fs.writeFileSync(tmpImage, pngBuffer());

  const imageForm = (caption) => {
    const fd = new FormData();
    fd.append('image', new Blob([fs.readFileSync(tmpImage)], { type: 'image/png' }), 'photo.png');
    if (caption !== undefined) fd.append('caption', caption);
    return fd;
  };

  /* ------------------------------ health ------------------------------ */
  section('Health');
  const health = await call('GET', '/api/health');
  check('GET /api/health returns 200', health.status === 200, JSON.stringify(health.body));

  /* --------------------------- registration --------------------------- */
  section('Authentication');
  const alice = await call('POST', '/api/auth/register', {
    json: { username: 'alice', fullName: 'Alice Smith', email: 'alice@test.com', password: 'Password123' },
  });
  check('POST /api/auth/register creates a user', alice.status === 201, JSON.stringify(alice.body));
  check('register returns a JWT', Boolean(alice.body.data && alice.body.data.token));
  const aliceToken = alice.body.data && alice.body.data.token;
  const aliceId = alice.body.data && alice.body.data.user.id;

  const bob = await call('POST', '/api/auth/register', {
    json: { username: 'bob', fullName: 'Bob Jones', email: 'bob@test.com', password: 'Password123' },
  });
  check('second user registers', bob.status === 201);
  const bobToken = bob.body.data && bob.body.data.token;
  const bobId = bob.body.data && bob.body.data.user.id;

  const dupe = await call('POST', '/api/auth/register', {
    json: { username: 'alice', fullName: 'Alice Two', email: 'alice2@test.com', password: 'Password123' },
  });
  check('duplicate username rejected with 409', dupe.status === 409, JSON.stringify(dupe.body));

  const shortPw = await call('POST', '/api/auth/register', {
    json: { username: 'carol', fullName: 'Carol', email: 'carol@test.com', password: 'short' },
  });
  check('password under 8 chars rejected with 400', shortPw.status === 400);

  const badEmail = await call('POST', '/api/auth/register', {
    json: { username: 'dave', fullName: 'Dave', email: 'not-an-email', password: 'Password123' },
  });
  check('invalid email rejected with 400', badEmail.status === 400);

  const login = await call('POST', '/api/auth/login', {
    json: { identifier: 'alice@test.com', password: 'Password123' },
  });
  check('login with email succeeds', login.status === 200);

  const loginByUsername = await call('POST', '/api/auth/login', {
    json: { identifier: 'alice', password: 'Password123' },
  });
  check('login with username succeeds', loginByUsername.status === 200);

  const badLogin = await call('POST', '/api/auth/login', {
    json: { identifier: 'alice@test.com', password: 'WrongPassword1' },
  });
  check('wrong password rejected with 401', badLogin.status === 401);

  const meNoToken = await call('GET', '/api/auth/me');
  check('protected route without token returns 401', meNoToken.status === 401);

  const me = await call('GET', '/api/auth/me', { token: aliceToken });
  check('GET /api/auth/me with token returns 200', me.status === 200);

  const badToken = await call('GET', '/api/auth/me', { token: 'garbage.token.value' });
  check('invalid token returns 401', badToken.status === 401);

  const logout = await call('POST', '/api/auth/logout');
  check('POST /api/auth/logout returns 200', logout.status === 200);

  /* ------------------------------ profile ----------------------------- */
  section('Profile');
  const profile = await call('GET', '/api/users/profile', { token: aliceToken });
  check('GET /api/users/profile returns 200', profile.status === 200);

  const bioForm = new FormData();
  bioForm.append('bio', 'Updated bio from smoke test');
  bioForm.append('fullName', 'Alice A. Smith');
  const updated = await call('PUT', '/api/users/profile', { token: aliceToken, form: bioForm });
  check('PUT /api/users/profile updates fields', updated.status === 200, JSON.stringify(updated.body));
  check(
    'bio persisted',
    updated.body.data && updated.body.data.user.bio === 'Updated bio from smoke test'
  );

  const avatarForm = new FormData();
  avatarForm.append(
    'profilePicture',
    new Blob([fs.readFileSync(tmpImage)], { type: 'image/png' }),
    'avatar.png'
  );
  const avatarRes = await call('PUT', '/api/users/profile', { token: aliceToken, form: avatarForm });
  check('avatar upload succeeds', avatarRes.status === 200, JSON.stringify(avatarRes.body));
  const avatarUrl = avatarRes.body.data && avatarRes.body.data.user.profilePicture;
  check('avatar URL returned', Boolean(avatarUrl));

  if (avatarUrl) {
    const relative = avatarUrl.slice(avatarUrl.indexOf('/uploads'));
    const fileRes = await fetch(`${base}${relative}`);
    check('uploaded avatar is served statically', fileRes.status === 200);
  }

  const publicProfile = await call('GET', `/api/users/${bobId}`, { token: aliceToken });
  check('GET /api/users/:id returns a public profile', publicProfile.status === 200);

  const byUsername = await call('GET', '/api/users/bob', { token: aliceToken });
  check('GET /api/users/:username works', byUsername.status === 200);

  const missingUser = await call('GET', '/api/users/000000000000000000000000');
  check('unknown user returns 404', missingUser.status === 404);

  /* ------------------------------- posts ------------------------------ */
  section('Posts');
  const created = await call('POST', '/api/posts', { token: aliceToken, form: imageForm('Hello world') });
  check('POST /api/posts creates a post', created.status === 201, JSON.stringify(created.body));
  const postId = created.body.data && created.body.data.post.id;
  check('post has an image URL', Boolean(created.body.data && created.body.data.post.image));

  const noImage = await call('POST', '/api/posts', {
    token: aliceToken,
    form: (() => {
      const fd = new FormData();
      fd.append('caption', 'no image here');
      return fd;
    })(),
  });
  check('post without an image rejected with 400', noImage.status === 400);

  const unauthPost = await call('POST', '/api/posts', { form: imageForm('nope') });
  check('creating a post without auth returns 401', unauthPost.status === 401);

  const bobPost = await call('POST', '/api/posts', { token: bobToken, form: imageForm('Bob post') });
  check('second user creates a post', bobPost.status === 201);
  const bobPostId = bobPost.body.data && bobPost.body.data.post.id;

  const feed = await call('GET', '/api/posts?page=1&limit=10', { token: aliceToken });
  check('GET /api/posts returns the feed', feed.status === 200);
  check('feed contains both posts', feed.body.data && feed.body.data.posts.length === 2);
  check(
    'feed is newest first',
    feed.body.data && feed.body.data.posts[0].id === bobPostId,
    'expected Bob post first'
  );
  check('feed includes pagination metadata', Boolean(feed.body.pagination));

  const single = await call('GET', `/api/posts/${postId}`, { token: aliceToken });
  check('GET /api/posts/:id returns a single post', single.status === 200);
  check('single post is flagged isOwner for its author', single.body.data.post.isOwner === true);

  const edited = await call('PUT', `/api/posts/${postId}`, {
    token: aliceToken,
    form: (() => {
      const fd = new FormData();
      fd.append('caption', 'Edited caption');
      return fd;
    })(),
  });
  check('PUT /api/posts/:id updates the caption', edited.status === 200);
  check('caption persisted', edited.body.data.post.caption === 'Edited caption');

  const forbiddenEdit = await call('PUT', `/api/posts/${postId}`, {
    token: bobToken,
    form: (() => {
      const fd = new FormData();
      fd.append('caption', 'hijacked');
      return fd;
    })(),
  });
  check('editing another user post returns 403', forbiddenEdit.status === 403);

  const forbiddenDelete = await call('DELETE', `/api/posts/${postId}`, { token: bobToken });
  check('deleting another user post returns 403', forbiddenDelete.status === 403);

  /* ------------------------------- likes ------------------------------ */
  section('Likes');
  const like1 = await call('POST', `/api/posts/${postId}/like`, { token: bobToken });
  check('POST /api/posts/:id/like likes the post', like1.status === 200);
  check('like count is 1', like1.body.data.likesCount === 1);
  check('isLiked is true', like1.body.data.isLiked === true);

  const like2 = await call('POST', `/api/posts/${postId}/like`, { token: bobToken });
  check('liking again unlikes (toggle)', like2.body.data.isLiked === false);
  check('like count back to 0', like2.body.data.likesCount === 0);

  await call('POST', `/api/posts/${postId}/like`, { token: bobToken });
  const relike = await call('POST', `/api/posts/${postId}/like`, { token: aliceToken });
  check('two distinct users produce 2 likes', relike.body.data.likesCount === 2);

  const likers = await call('GET', `/api/posts/${postId}/likes`, { token: aliceToken });
  check('GET /api/posts/:id/likes lists likers', likers.status === 200 && likers.body.data.users.length === 2);

  /* ----------------------------- comments ----------------------------- */
  section('Comments');
  const comment = await call('POST', `/api/posts/${postId}/comments`, {
    token: bobToken,
    json: { comment: 'Great shot!' },
  });
  check('POST /api/posts/:id/comments adds a comment', comment.status === 201, JSON.stringify(comment.body));
  const commentId = comment.body.data && comment.body.data.comment.id;
  check('commentsCount incremented to 1', comment.body.data.commentsCount === 1);

  const emptyComment = await call('POST', `/api/posts/${postId}/comments`, {
    token: bobToken,
    json: { comment: '   ' },
  });
  check('empty comment rejected with 400', emptyComment.status === 400);

  const comments = await call('GET', `/api/posts/${postId}/comments`, { token: bobToken });
  check('GET /api/posts/:id/comments lists comments', comments.status === 200);
  check('comment author can delete', comments.body.data.comments[0].canDelete === true);

  const aliceView = await call('GET', `/api/posts/${postId}/comments`, { token: aliceToken });
  check(
    'post owner can delete comments on their post',
    aliceView.body.data.comments[0].canDelete === true
  );

  const bobPostComment = await call('POST', `/api/posts/${bobPostId}/comments`, {
    token: bobToken,
    json: { comment: 'Own post comment' },
  });
  const strangerDelete = await call('DELETE', `/api/comments/${bobPostComment.body.data.comment.id}`, {
    token: aliceToken,
  });
  check('deleting someone else comment on their post returns 403', strangerDelete.status === 403);

  const deletedComment = await call('DELETE', `/api/comments/${commentId}`, { token: bobToken });
  check('DELETE /api/comments/:id removes own comment', deletedComment.status === 200);
  check('commentsCount decremented to 0', deletedComment.body.data.commentsCount === 0);

  /* ------------------------------ follow ------------------------------ */
  section('Follow system');
  const follow = await call('POST', `/api/users/${bobId}/follow`, { token: aliceToken });
  check('POST /api/users/:id/follow follows', follow.status === 200);
  check('isFollowing true', follow.body.data.isFollowing === true);
  check('followers count is 1', follow.body.data.followersCount === 1);

  const selfFollow = await call('POST', `/api/users/${aliceId}/follow`, { token: aliceToken });
  check('following yourself returns 400', selfFollow.status === 400);

  const followers = await call('GET', `/api/users/${bobId}/followers`, { token: aliceToken });
  check('GET /api/users/:id/followers lists followers', followers.body.data.users.length === 1);

  const following = await call('GET', `/api/users/${aliceId}/following`, { token: aliceToken });
  check('GET /api/users/:id/following lists following', following.body.data.users.length === 1);

  const followingFeed = await call('GET', '/api/posts?feed=following', { token: aliceToken });
  check('following feed returns posts from followed users + self', followingFeed.body.data.posts.length === 2);

  const unfollow = await call('POST', `/api/users/${bobId}/follow`, { token: aliceToken });
  check('follow toggles to unfollow', unfollow.body.data.isFollowing === false);
  check('followers count back to 0', unfollow.body.data.followersCount === 0);

  /* ------------------------------ search ------------------------------ */
  section('Search');
  const search = await call('GET', '/api/users/search?q=ali', { token: aliceToken });
  check('GET /api/users/search finds users by partial username', search.status === 200);
  check('search returns alice', search.body.data.users.some((u) => u.username === 'alice'));

  const searchName = await call('GET', '/api/users/search?q=Bob%20Jones', { token: aliceToken });
  check('search matches full name', searchName.body.data.users.some((u) => u.username === 'bob'));

  const emptySearch = await call('GET', '/api/users/search?q=', { token: aliceToken });
  check('empty search returns an empty list', emptySearch.body.data.users.length === 0);

  const suggestions = await call('GET', '/api/users/suggestions', { token: aliceToken });
  check('GET /api/users/suggestions returns users', suggestions.status === 200);

  /* --------------------------- user posts ----------------------------- */
  section('User posts & counts');
  const userPosts = await call('GET', `/api/users/${aliceId}/posts`, { token: aliceToken });
  check('GET /api/users/:id/posts returns the user posts', userPosts.body.data.posts.length === 1);

  const profileAfter = await call('GET', '/api/users/profile', { token: aliceToken });
  check('postsCount reflects created posts', profileAfter.body.data.user.postsCount === 1);

  /* ------------------------------ delete ------------------------------ */
  section('Delete post cascade');
  await call('POST', `/api/posts/${postId}/comments`, { token: bobToken, json: { comment: 'to be removed' } });
  const removed = await call('DELETE', `/api/posts/${postId}`, { token: aliceToken });
  check('DELETE /api/posts/:id deletes own post', removed.status === 200);

  const gone = await call('GET', `/api/posts/${postId}`);
  check('deleted post returns 404', gone.status === 404);

  const orphanComments = await Comment.countDocuments({ post: postId });
  check('comments cascade-deleted with the post', orphanComments === 0);

  const profileAfterDelete = await call('GET', '/api/users/profile', { token: aliceToken });
  check('postsCount decremented after delete', profileAfterDelete.body.data.user.postsCount === 0);

  /* ---------------------------- validation ---------------------------- */
  section('Validation & 404s');
  const badId = await call('GET', '/api/posts/not-a-valid-id');
  check('invalid ObjectId returns 400', badId.status === 400);

  const unknownRoute = await call('GET', '/api/does-not-exist');
  check('unknown API route returns 404 JSON', unknownRoute.status === 404);

  /* ------------------------------ cleanup ----------------------------- */
  fs.promises.unlink(tmpImage).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await disconnectDB();
  if (memoryServer) await memoryServer.stop();

  // eslint-disable-next-line no-console
  console.log(`\n\x1b[1mResults:\x1b[0m ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    // eslint-disable-next-line no-console
    console.log(`Failing checks:\n - ${failures.join('\n - ')}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
