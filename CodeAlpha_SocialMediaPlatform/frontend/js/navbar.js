/**
 * Renders the responsive navbar (with live user search, theme toggle and
 * user menu) plus the mobile tab bar. Exposes window.Navbar.
 */
(function initNavbar() {
  'use strict';

  const { Icons, avatar, escapeHtml, debounce, Theme, toast } = window.UI;

  function navbarHtml(user, active) {
    const isActive = (name) => (active === name ? 'is-active' : '');

    return `
      <nav class="navbar">
        <div class="navbar__inner">
          <a class="brand" href="feed.html" aria-label="LinkUp home">
            <span class="brand__mark">${Icons.logo}</span>
            <span class="gradient-text">LinkUp</span>
          </a>

          <div class="navsearch">
            <span class="navsearch__icon">${Icons.search}</span>
            <input
              class="navsearch__input"
              id="navSearchInput"
              type="search"
              placeholder="Search people…"
              autocomplete="off"
              aria-label="Search users"
              role="combobox"
              aria-expanded="false"
              aria-controls="navSearchResults"
            />
            <div class="navsearch__results" id="navSearchResults" role="listbox"></div>
          </div>

          <div class="navbar__actions">
            <a class="navlink navlink--desktop ${isActive('feed')}" href="feed.html" title="Home" aria-label="Home">
              <span class="navlink__icon">${Icons.home}</span><span class="navlink__label">Home</span>
            </a>
            <a class="navlink navlink--desktop ${isActive('create')}" href="create-post.html" title="Create post" aria-label="Create post">
              <span class="navlink__icon">${Icons.plus}</span><span class="navlink__label">Post</span>
            </a>

            <button class="theme-toggle" id="themeToggle" type="button" title="Toggle dark mode" aria-label="Toggle dark mode">
              <span class="theme-toggle__sun">${Icons.sun}</span>
              <span class="theme-toggle__moon">${Icons.moon}</span>
            </button>

            <div class="usermenu">
              <button class="usermenu__trigger" id="userMenuTrigger" type="button" aria-haspopup="true" aria-expanded="false" aria-label="Account menu">
                ${avatar(user, 'avatar--xs')}
                <span class="usermenu__trigger-label">Me <span aria-hidden="true">▾</span></span>
              </button>
              <div class="usermenu__panel" id="userMenuPanel">
                <div class="usermenu__header">
                  <div style="font-weight:800;font-size:.92rem" class="truncate">${escapeHtml(user.fullName || '')}</div>
                  <div class="text-dim truncate" style="font-size:.8rem">@${escapeHtml(user.username || '')}</div>
                </div>
                <a class="usermenu__item" href="profile.html">${Icons.user}<span>My profile</span></a>
                <a class="usermenu__item" href="edit-profile.html">${Icons.settings}<span>Edit profile</span></a>
                <a class="usermenu__item" href="create-post.html">${Icons.plusSmall}<span>Create post</span></a>
                <button class="usermenu__item usermenu__item--danger" id="logoutBtn" type="button">${Icons.logout}<span>Log out</span></button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div class="tabbar">
        <div class="tabbar__inner">
          <a class="tabbar__link ${isActive('feed')}" href="feed.html" aria-label="Home">${Icons.home}</a>
          <a class="tabbar__link ${isActive('create')}" href="create-post.html" aria-label="Create post">${Icons.plus}</a>
          <a class="tabbar__link ${isActive('profile')}" href="profile.html" aria-label="Profile">${Icons.user}</a>
        </div>
      </div>
    `;
  }

  function resultRow(user) {
    return `
      <a class="result-item" href="profile.html?user=${encodeURIComponent(user.username)}" role="option">
        ${avatar(user, 'avatar--sm')}
        <span style="min-width:0">
          <span class="result-item__name truncate">${escapeHtml(user.fullName)}</span>
          <span class="result-item__meta truncate">@${escapeHtml(user.username)} · ${user.followersCount} followers</span>
        </span>
      </a>
    `;
  }

  function wireSearch() {
    const input = document.getElementById('navSearchInput');
    const results = document.getElementById('navSearchResults');
    if (!input || !results) return;

    let controller = null;
    let activeIndex = -1;

    const close = () => {
      results.classList.remove('is-open');
      input.setAttribute('aria-expanded', 'false');
      activeIndex = -1;
    };

    const open = () => {
      results.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
    };

    const run = debounce(async (term) => {
      if (!term || term.trim().length < 1) {
        close();
        results.innerHTML = '';
        return;
      }

      if (controller) controller.abort();
      controller = new AbortController();

      results.innerHTML = '<div class="result-empty">Searching…</div>';
      open();

      try {
        const res = await window.Api.users.search(term.trim(), controller.signal);
        const users = res.data.users || [];
        results.innerHTML = users.length
          ? users.map(resultRow).join('')
          : `<div class="result-empty">No users match “${escapeHtml(term)}”</div>`;
        activeIndex = -1;
      } catch (err) {
        if (err.name === 'AbortError') return;
        results.innerHTML = '<div class="result-empty">Search is unavailable right now</div>';
      }
    }, 260);

    input.addEventListener('input', (e) => run(e.target.value));
    input.addEventListener('focus', () => {
      if (results.innerHTML.trim() && input.value.trim()) open();
    });

    input.addEventListener('keydown', (e) => {
      const items = Array.from(results.querySelectorAll('.result-item'));
      if (e.key === 'Escape') {
        close();
        input.blur();
        return;
      }
      if (!items.length) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex =
          e.key === 'ArrowDown'
            ? (activeIndex + 1) % items.length
            : (activeIndex - 1 + items.length) % items.length;
        items.forEach((item, i) => item.classList.toggle('is-active', i === activeIndex));
        items[activeIndex].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        items[activeIndex].click();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.navsearch')) close();
    });
  }

  function wireUserMenu() {
    const trigger = document.getElementById('userMenuTrigger');
    const panel = document.getElementById('userMenuPanel');
    if (!trigger || !panel) return;

    const close = () => {
      panel.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !panel.classList.contains('is-open');
      panel.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.usermenu')) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        const ok = await window.UI.confirmDialog({
          title: 'Log out of LinkUp?',
          text: 'You will need to sign in again to continue.',
          confirmLabel: 'Log out',
          danger: false,
        });
        if (!ok) return;
        toast.info('Signing you out…', { duration: 1200 });
        await window.Auth.logout();
      });
    }
  }

  function wireTheme() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const next = Theme.toggle();
      toast.info(next === 'dark' ? 'Dark mode on' : 'Light mode on', { duration: 1600 });
    });
  }

  /**
   * Mount the navbar into #navbarMount.
   * @param {string} active one of 'feed' | 'create' | 'profile'
   */
  function mount(active = '') {
    const host = document.getElementById('navbarMount');
    if (!host) return;

    const user = window.Auth.user || {};
    host.innerHTML = navbarHtml(user, active);

    wireSearch();
    wireUserMenu();
    wireTheme();
    window.UI.mountBackToTop();

    // Keep the cached user (and therefore the avatar) fresh.
    window.Auth.refresh()
      .then((fresh) => {
        const trigger = document.getElementById('userMenuTrigger');
        if (trigger) {
          trigger.innerHTML = `${avatar(fresh, 'avatar--xs')}<span class="usermenu__trigger-label">Me <span aria-hidden="true">▾</span></span>`;
        }
        const header = document.querySelector('.usermenu__header');
        if (header) {
          header.innerHTML = `
            <div style="font-weight:800;font-size:.92rem" class="truncate">${escapeHtml(fresh.fullName)}</div>
            <div class="text-dim truncate" style="font-size:.8rem">@${escapeHtml(fresh.username)}</div>
          `;
        }
        document.dispatchEvent(new CustomEvent('linkup:user-refreshed', { detail: fresh }));
      })
      .catch(() => {
        /* handled by the API layer */
      });
  }

  window.Navbar = { mount };
})();
