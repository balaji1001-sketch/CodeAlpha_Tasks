/**
 * Home feed: paginated post list, infinite scroll, refresh, sidebar
 * (profile summary + who-to-follow), feed filter (all / following).
 */
(function initFeed() {
  'use strict';

  const { Icons, avatar, escapeHtml, toast, skeletonPosts, skeletonUserRows, emptyState, throttle, formatCount } =
    window.UI;
  const { PAGE_SIZE } = window.APP_CONFIG;

  const state = {
    page: 1,
    hasMore: true,
    loading: false,
    feed: 'all',
    total: 0,
  };

  let listEl;
  let sentinelEl;
  let statusEl;

  /* ------------------------------ sidebar ------------------------------ */
  function renderProfileCard(user) {
    const host = document.getElementById('sidebarProfile');
    if (!host) return;

    host.innerHTML = `
      <div class="card__body">
        <a class="row" href="profile.html">
          ${avatar(user, 'avatar--md')}
          <span style="min-width:0">
            <span class="post__name truncate" style="display:block">${escapeHtml(user.fullName)}</span>
            <span class="text-dim truncate" style="display:block;font-size:.82rem">@${escapeHtml(user.username)}</span>
          </span>
        </a>
        ${user.bio ? `<p class="text-muted mt-2" style="font-size:.87rem">${escapeHtml(user.bio)}</p>` : ''}
        <div class="profile-stats mt-2" style="gap:20px">
          <span class="profile-stat">
            <span class="profile-stat__value">${formatCount(user.postsCount)}</span>
            <span class="profile-stat__label">Posts</span>
          </span>
          <span class="profile-stat">
            <span class="profile-stat__value">${formatCount(user.followersCount)}</span>
            <span class="profile-stat__label">Followers</span>
          </span>
          <span class="profile-stat">
            <span class="profile-stat__value">${formatCount(user.followingCount)}</span>
            <span class="profile-stat__label">Following</span>
          </span>
        </div>
      </div>
    `;
  }

  function suggestionRow(user) {
    return `
      <div class="user-row" data-user-id="${user.id}">
        <a href="profile.html?user=${encodeURIComponent(user.username)}">${avatar(user, 'avatar--sm')}</a>
        <div class="user-row__info">
          <a class="user-row__name truncate" href="profile.html?user=${encodeURIComponent(user.username)}">${escapeHtml(user.username)}</a>
          <div class="user-row__meta truncate">${escapeHtml(user.fullName)}</div>
        </div>
        <button class="btn btn--soft btn--sm" type="button" data-action="follow" data-id="${user.id}">
          ${user.isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>
    `;
  }

  async function loadSuggestions() {
    const host = document.getElementById('sidebarSuggestions');
    if (!host) return;

    host.innerHTML = `<div class="card__body"><div class="section-title">Suggested for you</div>${skeletonUserRows(4)}</div>`;

    try {
      const res = await window.Api.users.suggestions(5);
      const users = res.data.users || [];

      host.innerHTML = `
        <div class="card__body">
          <div class="section-title">Suggested for you</div>
          ${
            users.length
              ? users.map(suggestionRow).join('')
              : '<p class="text-dim" style="font-size:.86rem">You are following everyone already. Nice.</p>'
          }
        </div>
      `;

      host.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action="follow"]');
        if (!btn) return;
        btn.disabled = true;
        try {
          const followRes = await window.Api.users.follow(btn.dataset.id);
          btn.textContent = followRes.data.isFollowing ? 'Following' : 'Follow';
          btn.classList.toggle('btn--ghost', followRes.data.isFollowing);
          btn.classList.toggle('btn--soft', !followRes.data.isFollowing);
          toast.success(followRes.message, { duration: 1800 });
        } catch (err) {
          toast.error(err.message);
        } finally {
          btn.disabled = false;
        }
      });
    } catch (err) {
      host.innerHTML = `<div class="card__body"><div class="section-title">Suggested for you</div><p class="text-dim" style="font-size:.86rem">Could not load suggestions.</p></div>`;
    }
  }

  /* -------------------------------- feed ------------------------------- */
  function setStatus(html) {
    if (statusEl) statusEl.innerHTML = html;
  }

  async function loadPage(reset = false) {
    if (state.loading) return;
    if (!reset && !state.hasMore) return;

    state.loading = true;

    if (reset) {
      state.page = 1;
      state.hasMore = true;
      listEl.innerHTML = skeletonPosts(2);
    } else if (state.page > 1) {
      setStatus(window.UI.spinnerBlock('Loading more posts…', 'spinner--sm'));
    }

    try {
      const res = await window.Api.posts.list({
        page: state.page,
        limit: PAGE_SIZE,
        feed: state.feed === 'following' ? 'following' : undefined,
      });

      const posts = res.data.posts || [];
      const pagination = res.pagination || {};
      state.total = pagination.total || 0;

      if (reset) listEl.innerHTML = '';

      if (!posts.length && state.page === 1) {
        listEl.innerHTML =
          state.feed === 'following'
            ? emptyState({
                icon: Icons.users,
                title: 'Your following feed is quiet',
                text: 'Follow a few people, or switch to “Everyone” to discover new posts.',
                actionHtml:
                  '<button class="btn btn--primary" type="button" data-action="switch-all">Browse everyone</button>',
              })
            : emptyState({
                icon: Icons.camera,
                title: 'No posts yet',
                text: 'Be the first to share something. Your photos will show up right here.',
                actionHtml:
                  '<a class="btn btn--primary" href="create-post.html">Create your first post</a>',
              });
        state.hasMore = false;
        setStatus('');
        return;
      }

      // Fetch preview comments for each post in parallel.
      const withComments = await Promise.all(
        posts.map(async (post) => {
          if (!post.commentsCount) return { post, comments: [] };
          try {
            const c = await window.Api.comments.list(post.id);
            return { post, comments: c.data.comments || [] };
          } catch (e) {
            return { post, comments: [] };
          }
        })
      );

      const html = withComments
        .map(({ post, comments }) => window.PostCard.render(post, { comments }))
        .join('');
      listEl.insertAdjacentHTML('beforeend', html);

      state.hasMore = Boolean(pagination.hasMore);
      state.page += 1;

      setStatus(
        state.hasMore
          ? ''
          : `<p class="text-dim text-center" style="font-size:.85rem;padding:18px 0">You are all caught up · ${formatCount(state.total)} posts</p>`
      );
    } catch (err) {
      if (state.page === 1) {
        listEl.innerHTML = emptyState({
          icon: Icons.alert,
          title: 'Could not load the feed',
          text: err.message,
          actionHtml: '<button class="btn btn--primary" type="button" data-action="retry">Try again</button>',
        });
      } else {
        setStatus(
          '<p class="text-dim text-center" style="font-size:.85rem;padding:14px 0">Could not load more posts.</p>'
        );
      }
      toast.error(err.message);
    } finally {
      state.loading = false;
    }
  }

  function wireInfiniteScroll() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) loadPage(false);
        },
        { rootMargin: '400px' }
      );
      observer.observe(sentinelEl);
      return;
    }

    window.addEventListener(
      'scroll',
      throttle(() => {
        const nearBottom =
          window.innerHeight + window.scrollY >= document.body.offsetHeight - 700;
        if (nearBottom) loadPage(false);
      }, 250),
      { passive: true }
    );
  }

  function wireControls() {
    const refreshBtn = document.getElementById('refreshFeed');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.style.transition = 'transform .5s';
        refreshBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
          refreshBtn.style.transform = '';
        }, 500);
        await loadPage(true);
        toast.success('Feed refreshed.', { duration: 1600 });
      });
    }

    document.querySelectorAll('[data-feed-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.feedFilter;
        if (next === state.feed) return;
        state.feed = next;
        document.querySelectorAll('[data-feed-filter]').forEach((b) => {
          const on = b.dataset.feedFilter === next;
          b.classList.toggle('btn--primary', on);
          b.classList.toggle('btn--ghost', !on);
        });
        loadPage(true);
      });
    });

    listEl.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="retry"]')) loadPage(true);
      if (e.target.closest('[data-action="switch-all"]')) {
        const allBtn = document.querySelector('[data-feed-filter="all"]');
        if (allBtn) allBtn.click();
      }
    });
  }

  function renderComposer(user) {
    const host = document.getElementById('composer');
    if (!host) return;
    host.innerHTML = `
      <div class="composer">
        ${avatar(user, 'avatar--sm')}
        <a class="composer__fake" href="create-post.html">Share something, ${escapeHtml((user.fullName || '').split(' ')[0])}…</a>
        <a class="btn btn--primary btn--sm" href="create-post.html">${Icons.plusSmall}<span>Post</span></a>
      </div>
    `;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.Auth.requireAuth()) return;

    window.Navbar.mount('feed');

    listEl = document.getElementById('feedList');
    sentinelEl = document.getElementById('feedSentinel');
    statusEl = document.getElementById('feedStatus');

    const cached = window.Auth.user || {};
    renderComposer(cached);
    renderProfileCard(cached);

    document.addEventListener('linkup:user-refreshed', (e) => {
      renderComposer(e.detail);
      renderProfileCard(e.detail);
    });

    window.PostCard.bind(listEl, {
      onDeleted: () => {
        if (!listEl.querySelector('.post')) loadPage(true);
      },
    });

    wireControls();
    await loadPage(true);
    wireInfiniteScroll();
    loadSuggestions();
  });
})();
