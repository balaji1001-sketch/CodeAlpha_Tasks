/**
 * Shared UI kit: icons, toasts, modals, spinners, skeletons, theme,
 * formatting helpers, validation helpers.
 * Exposes window.UI.
 */
(function initUI() {
  'use strict';

  const { THEME_KEY, MAX_IMAGE_MB, ALLOWED_IMAGE_TYPES } = window.APP_CONFIG;

  /* ------------------------------- icons ------------------------------- */
  /* Feather-style inline SVGs — 24x24, currentColor, sized via width/height:
     1em so they drop into text flow exactly like the glyphs they replace. */
  function icon(paths) {
    return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  const Icons = {
    logo: '<svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="linkupGradient" x1="6" y1="58" x2="58" y2="6" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#00a3e0"/><stop offset="50%" stop-color="#00c2c7"/><stop offset="100%" stop-color="#1de9b6"/></linearGradient></defs><g fill="none" stroke="url(#linkupGradient)" stroke-width="7" stroke-linecap="round"><rect x="6" y="29.5" width="31" height="17" rx="8.5" transform="rotate(-45 21.5 38)"/><rect x="27" y="18.5" width="31" height="17" rx="8.5" transform="rotate(-45 42.5 27)"/></g></svg>',
    home: icon('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
    plus: icon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
    plusSmall: icon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
    heart: icon('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/>'),
    heartBig:
      '<svg class="ui-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    comment: icon('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>'),
    share: icon('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/>'),
    search: icon('<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
    user: icon('<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    settings: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z"/>'),
    logout: icon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>'),
    edit: icon('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
    trash: icon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>'),
    dots: icon('<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
    sun: icon('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'),
    moon: icon('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
    image: icon('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
    close: icon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
    check: icon('<polyline points="20 6 9 17 4 12"/>'),
    alert: icon('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'),
    info: icon('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'),
    warning: icon('<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
    eye: icon('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'),
    eyeOff: icon('<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'),
    arrowUp: icon('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>'),
    arrowLeft: icon('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>'),
    grid: icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>'),
    refresh: icon('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>'),
    users: icon('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    camera: icon('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
    sparkle: icon('<path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/>'),
    shield: icon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>'),
    zap: icon('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    globe: icon('<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
  };

  /* ----------------------------- formatting ---------------------------- */
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /** Escape, then linkify @mentions and #hashtags. */
  function formatCaption(text) {
    return escapeHtml(text)
      .replace(/(^|\s)@([a-z0-9._]{3,30})/gi, '$1<a href="profile.html?user=$2">@$2</a>')
      .replace(/(^|\s)#([\p{L}0-9_]{1,40})/giu, '$1<a href="feed.html">#$2</a>');
  }

  function timeAgo(dateString) {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (Number.isNaN(seconds)) return '';
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 365) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatCount(n) {
    const value = Number(n) || 0;
    if (value < 1000) return String(value);
    if (value < 1000000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
    return `${(value / 1000000).toFixed(1)}M`;
  }

  function pluralize(n, singular, plural) {
    const value = Number(n) || 0;
    return `${formatCount(value)} ${value === 1 ? singular : plural || `${singular}s`}`;
  }

  /* ------------------------------ avatars ------------------------------ */
  function initials(name) {
    const parts = String(name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2);
    return parts.map((p) => p.charAt(0)).join('') || '?';
  }

  /**
   * Render an avatar. Falls back to gradient initials when there is no image.
   * @param {{profilePicture?:string, fullName?:string, username?:string}} user
   * @param {string} sizeClass e.g. 'avatar--sm'
   */
  function avatar(user, sizeClass = '', extraClass = '') {
    const safeUser = user || {};
    const label = escapeHtml(initials(safeUser.fullName || safeUser.username));
    const classes = ['avatar', sizeClass, extraClass].filter(Boolean).join(' ');

    if (safeUser.profilePicture) {
      return `<img class="${classes}" src="${escapeHtml(safeUser.profilePicture)}" alt="${escapeHtml(
        safeUser.username || 'user'
      )}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${classes}',textContent:'${label}'}))">`;
    }
    return `<div class="${classes}" aria-hidden="true">${label}</div>`;
  }

  /* ------------------------------- theme ------------------------------- */
  const Theme = {
    get() {
      return document.documentElement.getAttribute('data-theme') || 'light';
    },
    set(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch (e) {
        /* ignore */
      }
    },
    toggle() {
      const next = Theme.get() === 'dark' ? 'light' : 'dark';
      Theme.set(next);
      return next;
    },
  };

  /* ------------------------------- toasts ------------------------------ */
  function toastStack() {
    let stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    return stack;
  }

  const TOAST_ICONS = {
    success: Icons.check,
    error: Icons.alert,
    warning: Icons.warning,
    info: Icons.info,
  };

  const TOAST_TITLES = {
    success: 'Success',
    error: 'Something went wrong',
    warning: 'Heads up',
    info: 'Info',
  };

  /* Plain, non-animated inline message box (no toast animation library). */
  function toast(message, type = 'info', options = {}) {
    const stack = toastStack();
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `
      <span class="toast__icon">${TOAST_ICONS[type] || Icons.info}</span>
      <div class="toast__body">
        <div class="toast__title">${escapeHtml(options.title || TOAST_TITLES[type] || 'Info')}</div>
        <div class="toast__msg">${escapeHtml(message)}</div>
      </div>
      <button class="toast__close" type="button" aria-label="Dismiss">${Icons.close}</button>
    `;

    const remove = () => {
      if (!el.isConnected) return;
      el.remove();
    };

    el.querySelector('.toast__close').addEventListener('click', remove);
    stack.appendChild(el);

    const duration = options.duration === undefined ? 4200 : options.duration;
    if (duration > 0) setTimeout(remove, duration);

    // Cap the visible stack.
    const items = stack.querySelectorAll('.toast');
    if (items.length > 4) items[0].remove();

    return remove;
  }

  toast.success = (msg, opts) => toast(msg, 'success', opts);
  toast.error = (msg, opts) => toast(msg, 'error', opts);
  toast.warning = (msg, opts) => toast(msg, 'warning', opts);
  toast.info = (msg, opts) => toast(msg, 'info', opts);

  /* ------------------------------- modal ------------------------------- */
  /**
   * Confirmation dialog. Resolves true/false.
   * Uses the browser's built-in confirm() popup instead of a custom modal.
   */
  function confirmDialog(options = {}) {
    const { title = 'Are you sure?', text = 'This action cannot be undone.' } = options;
    return window.confirm(`${title}\n\n${text}`);
  }

  /**
   * Generic content modal. Returns { close }.
   */
  function openModal(innerHtml, { wide = false, onClose } = {}) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `<div class="modal ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true">${innerHtml}</div>`;

    const close = () => {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      if (typeof onClose === 'function') onClose();
    };

    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
      if (e.target.closest('[data-modal-close]')) close();
    });

    document.addEventListener('keydown', onKey);
    document.body.appendChild(backdrop);

    return { element: backdrop, close };
  }

  /* ----------------------------- button state -------------------------- */
  /**
   * Put a button into a loading state; returns a restore function.
   */
  function buttonLoading(button, loadingLabel = 'Please wait') {
    if (!button) return () => {};
    const originalHtml = button.innerHTML;
    const wasDisabled = button.disabled;

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = `<span class="btn__spinner"></span><span>${escapeHtml(loadingLabel)}</span>`;

    return function restore() {
      button.innerHTML = originalHtml;
      button.disabled = wasDisabled;
      button.removeAttribute('aria-busy');
    };
  }

  /* ----------------------------- skeletons ----------------------------- */
  function skeletonPost() {
    return `
      <div class="skeleton-post">
        <div class="skeleton-post__head">
          <div class="skeleton skeleton--circle" style="width:40px;height:40px"></div>
          <div style="flex:1">
            <div class="skeleton skeleton--text" style="width:34%;margin-bottom:8px"></div>
            <div class="skeleton skeleton--text" style="width:20%;height:9px"></div>
          </div>
        </div>
        <div class="skeleton skeleton-post__media"></div>
        <div class="skeleton-post__body">
          <div class="skeleton skeleton--text" style="width:28%"></div>
          <div class="skeleton skeleton--text" style="width:88%"></div>
          <div class="skeleton skeleton--text" style="width:62%"></div>
        </div>
      </div>
    `;
  }

  function skeletonPosts(count = 2) {
    return Array.from({ length: count }, skeletonPost).join('');
  }

  function skeletonUserRows(count = 4) {
    return Array.from(
      { length: count },
      () => `
      <div class="user-row">
        <div class="skeleton skeleton--circle" style="width:38px;height:38px"></div>
        <div style="flex:1">
          <div class="skeleton skeleton--text" style="width:44%;margin-bottom:7px"></div>
          <div class="skeleton skeleton--text" style="width:28%;height:9px"></div>
        </div>
      </div>`
    ).join('');
  }

  function skeletonGrid(count = 6) {
    return Array.from(
      { length: count },
      () => '<div class="skeleton" style="aspect-ratio:1;border-radius:8px"></div>'
    ).join('');
  }

  function spinnerBlock(label = 'Loading…', size = '') {
    return `<div class="loading-block"><div class="spinner ${size}"></div><span>${escapeHtml(label)}</span></div>`;
  }

  function emptyState({ icon = Icons.camera, title, text, actionHtml = '' }) {
    return `
      <div class="empty">
        <div class="empty__icon">${icon}</div>
        <h3 class="empty__title">${escapeHtml(title)}</h3>
        <p class="empty__text">${escapeHtml(text)}</p>
        ${actionHtml}
      </div>
    `;
  }

  /* ----------------------------- validation ---------------------------- */
  const Validate = {
    email(value) {
      if (!value || !value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Enter a valid email address';
      return '';
    },
    required(value, label = 'This field') {
      return value && String(value).trim() ? '' : `${label} is required`;
    },
    username(value) {
      const v = (value || '').trim();
      if (!v) return 'Username is required';
      if (v.length < 3) return 'Username must be at least 3 characters';
      if (v.length > 30) return 'Username cannot exceed 30 characters';
      if (!/^[a-zA-Z0-9._]+$/.test(v)) return 'Only letters, numbers, dots and underscores';
      return '';
    },
    fullName(value) {
      const v = (value || '').trim();
      if (!v) return 'Full name is required';
      if (v.length < 2) return 'Full name must be at least 2 characters';
      if (v.length > 60) return 'Full name cannot exceed 60 characters';
      return '';
    },
    password(value) {
      if (!value) return 'Password is required';
      if (value.length < 8) return 'Password must be at least 8 characters';
      if (value.length > 128) return 'Password is too long';
      return '';
    },
    /** 0-4 strength score. */
    passwordStrength(value) {
      let score = 0;
      if (!value) return 0;
      if (value.length >= 8) score += 1;
      if (value.length >= 12) score += 1;
      if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
      if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score += 1;
      return Math.min(score, 4);
    },
    image(file) {
      if (!file) return 'Please choose an image';
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return 'Only JPG, PNG, GIF and WEBP images are allowed';
      }
      if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
        return `Image must be smaller than ${MAX_IMAGE_MB} MB`;
      }
      return '';
    },
  };

  /**
   * Show/clear an inline field error.
   * Expects: <input id="x"> and <span class="field__error" data-error-for="x">
   */
  function setFieldError(input, message) {
    if (!input) return;
    const holder = document.querySelector(`[data-error-for="${input.id}"]`);
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (holder) holder.textContent = message;
    } else {
      input.removeAttribute('aria-invalid');
      if (holder) holder.textContent = '';
    }
  }

  function clearFormErrors(form) {
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field__error').forEach((el) => {
      el.textContent = '';
    });
  }

  /** Apply server-side field errors returned by the API. */
  function applyServerErrors(form, apiError) {
    if (!apiError || typeof apiError.fieldErrors !== 'function') return;
    const map = apiError.fieldErrors();
    Object.entries(map).forEach(([field, message]) => {
      const input = form.querySelector(`#${field}`) || form.querySelector(`[name="${field}"]`);
      if (input) setFieldError(input, message);
    });
  }

  /* ------------------------------- misc -------------------------------- */
  function debounce(fn, wait = 300) {
    let timer;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function throttle(fn, wait = 200) {
    let last = 0;
    return function throttled(...args) {
      const now = Date.now();
      if (now - last >= wait) {
        last = now;
        fn.apply(this, args);
      }
    };
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  /** Character counter bound to an input and a counter element. */
  function bindCounter(input, counter, max) {
    if (!input || !counter) return;
    const update = () => {
      counter.textContent = `${input.value.length} / ${max}`;
      counter.style.color = input.value.length > max ? 'var(--danger)' : '';
    };
    input.addEventListener('input', update);
    update();
  }

  /** Wire a password visibility toggle button. */
  function bindPasswordToggle(button, input) {
    if (!button || !input) return;
    button.innerHTML = Icons.eye;
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.innerHTML = show ? Icons.eyeOff : Icons.eye;
      button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  /** Floating back-to-top button. */
  function mountBackToTop() {
    if (document.querySelector('.back-to-top')) return;
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = Icons.arrowUp;
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);

    const onScroll = throttle(() => {
      btn.classList.toggle('is-visible', window.scrollY > 500);
    }, 150);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  window.UI = {
    Icons,
    Theme,
    Validate,
    escapeHtml,
    formatCaption,
    timeAgo,
    formatDate,
    formatCount,
    pluralize,
    initials,
    avatar,
    toast,
    confirmDialog,
    openModal,
    buttonLoading,
    skeletonPost,
    skeletonPosts,
    skeletonUserRows,
    skeletonGrid,
    spinnerBlock,
    emptyState,
    setFieldError,
    clearFormErrors,
    applyServerErrors,
    debounce,
    throttle,
    getParam,
    copyToClipboard,
    bindCounter,
    bindPasswordToggle,
    mountBackToTop,
  };
})();
