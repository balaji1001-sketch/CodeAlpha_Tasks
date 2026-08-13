/**
 * Thin fetch wrapper + typed endpoint helpers.
 * Exposes window.Api and window.Auth (token/user storage).
 */
(function initApi() {
  'use strict';

  const { API_BASE, TOKEN_KEY, USER_KEY } = window.APP_CONFIG;

  /* ------------------------------ storage ------------------------------ */
  const Store = {
    getToken() {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch (e) {
        return null;
      }
    },
    setToken(token) {
      try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
      } catch (e) {
        /* storage unavailable */
      }
    },
    getUser() {
      try {
        const raw = localStorage.getItem(USER_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },
    setUser(user) {
      try {
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
        else localStorage.removeItem(USER_KEY);
      } catch (e) {
        /* storage unavailable */
      }
    },
    clear() {
      Store.setToken(null);
      Store.setUser(null);
    },
  };

  /* ------------------------------ errors ------------------------------- */
  class ApiError extends Error {
    constructor(message, status, errors) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.errors = errors || [];
    }

    /** Map field -> message, for inline form errors. */
    fieldErrors() {
      const map = {};
      this.errors.forEach((e) => {
        if (e && e.field) map[e.field] = e.message;
      });
      return map;
    }
  }

  /* ------------------------------ request ------------------------------ */
  async function request(path, options = {}) {
    const { method = 'GET', body, auth = true, signal } = options;
    const headers = {};

    if (auth) {
      const token = Store.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let payload = body;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: payload,
        credentials: 'include',
        signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      throw new ApiError(
        'Cannot reach the server. Make sure the backend is running on port 5000.',
        0
      );
    }

    let data = null;
    const text = await response.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = null;
      }
    }

    if (!response.ok) {
      const message = (data && data.message) || `Request failed (${response.status})`;
      const error = new ApiError(message, response.status, data && data.errors);

      // Session expired -> clear local auth and bounce to login.
      if (response.status === 401 && Store.getToken()) {
        Store.clear();
        const onAuthPage = /\/(login|register|index)\.html$/.test(window.location.pathname) ||
          window.location.pathname === '/' ||
          window.location.pathname === '';
        if (!onAuthPage) {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.replace(`login.html?next=${next}&expired=1`);
        }
      }

      throw error;
    }

    return data;
  }

  const get = (path, opts) => request(path, { ...opts, method: 'GET' });
  const post = (path, body, opts) => request(path, { ...opts, method: 'POST', body });
  const put = (path, body, opts) => request(path, { ...opts, method: 'PUT', body });
  const del = (path, opts) => request(path, { ...opts, method: 'DELETE' });

  function qs(params) {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.append(key, value);
    });
    const str = search.toString();
    return str ? `?${str}` : '';
  }

  /* ----------------------------- endpoints ----------------------------- */
  const Api = {
    ApiError,
    request,

    auth: {
      register: (payload) => post('/auth/register', payload, { auth: false }),
      login: (payload) => post('/auth/login', payload, { auth: false }),
      logout: () => post('/auth/logout', {}, { auth: true }),
      me: () => get('/auth/me'),
    },

    users: {
      myProfile: () => get('/users/profile'),
      updateProfile: (formData) => put('/users/profile', formData),
      byId: (id) => get(`/users/${encodeURIComponent(id)}`),
      posts: (id, params) => get(`/users/${encodeURIComponent(id)}/posts${qs(params)}`),
      follow: (id) => post(`/users/${encodeURIComponent(id)}/follow`, {}),
      followers: (id) => get(`/users/${encodeURIComponent(id)}/followers`),
      following: (id) => get(`/users/${encodeURIComponent(id)}/following`),
      search: (q, signal) => get(`/users/search${qs({ q })}`, { signal }),
      suggestions: (limit) => get(`/users/suggestions${qs({ limit })}`),
    },

    posts: {
      list: (params) => get(`/posts${qs(params)}`),
      byId: (id) => get(`/posts/${encodeURIComponent(id)}`),
      create: (formData) => post('/posts', formData),
      update: (id, formData) => put(`/posts/${encodeURIComponent(id)}`, formData),
      remove: (id) => del(`/posts/${encodeURIComponent(id)}`),
      like: (id) => post(`/posts/${encodeURIComponent(id)}/like`, {}),
      likes: (id) => get(`/posts/${encodeURIComponent(id)}/likes`),
    },

    comments: {
      list: (postId) => get(`/posts/${encodeURIComponent(postId)}/comments`),
      add: (postId, comment) => post(`/posts/${encodeURIComponent(postId)}/comments`, { comment }),
      remove: (id) => del(`/comments/${encodeURIComponent(id)}`),
    },
  };

  /* -------------------------- auth session API ------------------------- */
  const Auth = {
    get token() {
      return Store.getToken();
    },
    get user() {
      return Store.getUser();
    },
    isLoggedIn() {
      return Boolean(Store.getToken());
    },
    save(token, user) {
      if (token) Store.setToken(token);
      if (user) Store.setUser(user);
    },
    updateUser(user) {
      Store.setUser(user);
    },
    clear() {
      Store.clear();
    },
    async logout() {
      try {
        await Api.auth.logout();
      } catch (e) {
        /* ignore network errors on logout */
      }
      Store.clear();
      window.location.href = 'login.html';
    },
    /** Redirect to login unless authenticated. Returns true when allowed. */
    requireAuth() {
      if (Store.getToken()) return true;
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`login.html?next=${next}`);
      return false;
    },
    /** Redirect logged-in users away from login/register. */
    redirectIfLoggedIn() {
      if (!Store.getToken()) return false;
      const params = new URLSearchParams(window.location.search);
      window.location.replace(params.get('next') || 'feed.html');
      return true;
    },
    /** Refresh the cached user from the server. */
    async refresh() {
      const res = await Api.auth.me();
      Store.setUser(res.data.user);
      return res.data.user;
    },
  };

  window.Api = Api;
  window.Auth = Auth;
})();
