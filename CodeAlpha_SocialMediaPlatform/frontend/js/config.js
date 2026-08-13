/**
 * Global runtime configuration.
 * Loaded first on every page.
 */
(function initConfig() {
  'use strict';

  // Backend and frontend run as two separate servers (backend on 5000,
  // frontend on 5173). Only use a relative "/api" when this page is
  // literally being served BY the backend itself (single-server deploy);
  // otherwise always point at the backend's own origin explicitly.
  const BACKEND_ORIGIN = 'http://localhost:5000';
  const servedByBackend = window.location.origin === BACKEND_ORIGIN;

  window.APP_CONFIG = {
    API_BASE: servedByBackend ? '/api' : `${BACKEND_ORIGIN}/api`,
    TOKEN_KEY: 'linkup.token',
    USER_KEY: 'linkup.user',
    THEME_KEY: 'linkup.theme',
    PAGE_SIZE: 6,
    MAX_IMAGE_MB: 5,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  };

  /* Apply the saved theme before first paint to avoid a flash. */
  try {
    const saved = localStorage.getItem(window.APP_CONFIG.THEME_KEY);
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (err) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
