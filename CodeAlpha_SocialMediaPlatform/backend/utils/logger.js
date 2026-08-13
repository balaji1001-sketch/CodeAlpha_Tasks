'use strict';

/* eslint-disable no-console */

const COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function stamp() {
  return new Date().toISOString();
}

function write(color, label, message) {
  console.log(`${COLORS.gray}${stamp()}${COLORS.reset} ${color}${label}${COLORS.reset} ${message}`);
}

module.exports = {
  info: (message) => write(COLORS.blue, '[info] ', message),
  success: (message) => write(COLORS.green, '[ok]   ', message),
  warn: (message) => write(COLORS.yellow, '[warn] ', message),
  error: (message) => write(COLORS.red, '[error]', message),
};
