'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const config = require('./config/env');
const apiRoutes = require('./routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { ensureUploadDirs } = require('./utils/fileHelper');

ensureUploadDirs();

const app = express();

app.set('trust proxy', 1);

/* ----------------------------- Security ----------------------------- */
app.use(
  helmet({
    contentSecurityPolicy: false, // frontend is served separately
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow <img> from other origin
  })
);

const corsOptions = {
  origin(origin, callback) {
    // Allow same-origin / curl / file:// (no Origin header).
    if (!origin) return callback(null, true);
    if (config.clientOrigins.length === 0) return callback(null, true);
    if (config.clientOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};
app.use(cors(corsOptions));

/* ----------------------------- Parsing ------------------------------ */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize({ replaceWith: '_' }));

if (!config.isProduction) {
  app.use(morgan('dev'));
}

/* --------------------------- Static files --------------------------- */
app.use(
  '/uploads',
  express.static(config.uploadsDir, {
    maxAge: '7d',
    fallthrough: true,
  })
);

// Optionally serve the frontend from the same origin (single-server deploy).
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir, { extensions: ['html'] }));

/* ------------------------------- API -------------------------------- */
app.use('/api', apiLimiter, apiRoutes);

/* ---------------------------- Fallbacks ----------------------------- */
// Unknown /api route -> JSON 404. Anything else -> the 404 HTML page.
app.use('/api', notFound);

app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html')) {
    return res.status(404).sendFile(path.join(frontendDir, '404.html'), (err) => {
      if (err) next();
    });
  }
  return notFound(req, res, next);
});

app.use(errorHandler);

module.exports = app;
