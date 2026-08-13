# LinkUp — Mini Social Media Platform

A full-stack social platform: photo posts, likes, comments, a follow system,
live user search and a responsive Instagram-inspired UI with dark mode.

Built with **Express + MongoDB + Mongoose + JWT + Multer** on the backend and
**plain HTML5, CSS3 and vanilla JavaScript** on the frontend — no build step,
no framework, no bundler.

The backend (API, port `5000`) and frontend (static site, port `5173`) run as
two separate servers talking over HTTP/CORS.

---

## Features

- **Auth** — register/login (email or username), JWT (Bearer + httpOnly cookie), bcrypt-hashed passwords, protected routes
- **Profiles** — edit info, upload/replace avatar, followers/following/post counts
- **Feed** — Everyone / Following toggle, infinite scroll, skeleton loading
- **Posts** — create (drag-drop/paste/browse), edit, delete, `#hashtags` and `@mentions` auto-linked
- **Comments & likes** — instant updates, optimistic UI, double-tap to like, "liked by" modal
- **Follow system** — follow/unfollow, suggested users sidebar
- **Search** — live, debounced, keyboard-navigable user search
- **UI/UX** — dark mode, toasts, confirmation modals, responsive (sidebar desktop / tab bar mobile)

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript (ES2020) |
| Backend | Node.js, Express.js 4 |
| Database | MongoDB with Mongoose 8 |
| Auth | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`) |
| Uploads | Multer (disk storage) |
| Validation | express-validator |
| Security | Helmet, CORS, express-rate-limit, express-mongo-sanitize |

---

## Getting started

```bash
# 1. Install dependencies (root + backend)
npm install
cd backend && npm install && cd ..

# 2. Create your env file
cd backend
cp .env.example .env        # Windows: copy .env.example .env
cd ..

# 3. Generate a JWT secret and paste it into backend/.env as JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Start MongoDB locally, or use Atlas — set MONGO_URI in backend/.env


# 5. Run both servers
npm run dev:all
```

Open **http://localhost:5173**. Backend runs on `:5000`, frontend on `:5173`,
CORS is preconfigured between them.

**Minimal `.env`:**

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/socialmedia
JWT_SECRET=paste_your_generated_secret_here
SERVER_URL=http://localhost:5000
```

### Seed demo data

```bash
cd backend
npm run seed
```

Creates 4 demo users (all following each other), 12 posts, 24 comments.
Login: `ada@example.com` / `Password123` (also `linus`, `grace`, `alan`).
The login page has a "Use the demo account" button.

### Run tests

```bash
cd backend
npm run test:smoke   # end-to-end API test suite, ~70 assertions
```

---

## Folder structure

```
backend/
  server.js, app.js          # entry point, Express app + middleware
  config/                    # env config, DB connection
  models/                    # User, Post, Comment (Mongoose)
  controllers/                # auth, user, post, comment logic
  middleware/                 # auth, upload, validation, rate limiting
  routes/                     # /auth, /users, /posts, /comments
  utils/                       # ApiError, token, fileHelper, seed, smokeTest
  uploads/                    # avatars/ and posts/ (Multer disk storage)

frontend/
  server.js                   # zero-dependency static file server
  *.html                      # one page per view (feed, profile, post, etc.)
  css/styles.css
  js/                         # api client, UI helpers, per-page logic
```

---

## API reference

Base URL: `http://localhost:5000/api`. Every response uses the envelope
`{ success, message, data }` (paginated endpoints add `pagination`).

| Resource | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` |
| Users | `GET/PUT /users/profile`, `GET /users/search`, `GET /users/suggestions`, `GET /users/:id`, `GET /users/:id/posts`, `POST /users/:id/follow`, `GET /users/:id/followers`, `GET /users/:id/following` |
| Posts | `GET /posts`, `POST /posts`, `GET/PUT/DELETE /posts/:id`, `POST /posts/:id/like`, `GET /posts/:id/likes` |
| Comments | `GET /posts/:id/comments`, `POST /posts/:id/comments`, `DELETE /comments/:id` |

Auth routes marked ✅ require `Authorization: Bearer <token>`. Full request/response
shapes and cURL examples are in the code (`backend/routes/`, `backend/controllers/`).

---

## Security

bcrypt password hashing · JWT auth with expiry · XSS escaping on user content ·
NoSQL-injection and regex-injection protection · rate limiting on auth and writes ·
MIME/extension allowlist + size cap on uploads · Helmet security headers ·
explicit CORS allowlist.

**Known limitations:** no email verification or password reset; no token
revocation (logout is client-side only).

---

## Deployment

- Set `NODE_ENV=production`, a fresh `JWT_SECRET`, real `MONGO_URI` (Atlas),
  `SERVER_URL`, and `CLIENT_ORIGINS`.
- Multer writes to `backend/uploads/` — most PaaS platforms have ephemeral
  filesystems, so attach a persistent volume or move uploads to S3/Cloudinary.
- Simplest option: deploy `backend/` as one Node web service (Render, Railway) —
  `app.js` also serves `frontend/` as static files so one service covers both.

---

## Future improvements

Real-time notifications (Socket.IO), direct messages, stories, video posts,
S3/Cloudinary uploads, Redis caching + JWT denylist, Jest/Supertest suites,
CI pipeline, full i18n/WCAG audit.

---

## License

MIT — use it, learn from it, ship it.
