'use strict';

const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger');

let server;

async function start() {
  try {
    await connectDB();

    server = app.listen(config.port, () => {
      logger.success(`Server running in ${config.nodeEnv} mode on http://localhost:${config.port}`);
      logger.info(`API base URL: ${config.serverUrl}/api`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

function shutdown(signal) {
  logger.warn(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason && reason.message ? reason.message : reason}`);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  process.exit(1);
});

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));

start();
