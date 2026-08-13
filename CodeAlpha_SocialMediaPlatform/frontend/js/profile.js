/**
 * Profile page: header with live counts, follow/unfollow, post grid,
 * followers/following modals, pagination.
 */
(function initProfile() {
  'use strict';

  const {
    Icons,
    avatar,
    escapeHtml,
    formatCount,
    formatDate,
    toast,
    skeletonGrid,
    skeletonUserRows,
    emptyState,
    openModal,
    buttonLoading,
  } = window.UI;

  const state = {
    user: null,
    page: 1,
    hasMore: true,
    loading: false,
  };

  let headerEl;
  let gridEl;
  let moreEl;

  /* ------------------------------- header ------------------------------ */
  function renderHeader(user) {
    const isSelf = user.isSelf;

    headerEl.innerHTML = `
      <div class="profile-header card">
        <div class="avatar avatar--xl avatar--ring">
          ${
            user.profilePicture
              ? `<img src="${escapeHtml(user.profilePicture)}" alt="${escapeHtml(user.username)}" />`
              : `<div class="avatar avatar--xl" style="border:none">${escapeHtml(window.UI.initials(user.fullName))}</div>`
          }
        </div>

        <div class="profile-header__info">
          <div class="profile-header__top">
            <h1 class="profile-header__username">${escapeHtml(user.username)}</h1>
            ${
              isSelf
                ? `<a class="btn btn--ghost btn--sm" href="edit-profile.html">${Icons.edit}<span>Edit profile</span></a>
                   <a class="btn btn--soft btn--sm" href="create-post.html">${Icons.plusSmall}<span>New post</span></a>`
                : `<button class="btn ${user.isFollowing ? 'btn--ghost' : 'btn--primary'} btn--sm" type="button" id="followBtn" data-id="${user.id}">
                     ${user.isFollowing ? 'Following' : 'Follow'}
                   </button>`
            }
          </div>

          <div class="profile-stats">
            <span class="profile-stat">
              <span class="profile-stat__value" data-role="posts-count">${formatCount(user.postsCount)}</span>
              <span class="profile-stat__label">Posts</span>
            </span>
            <button class="profile-stat" type="button" data-action="show-followers">
              <span class="profile-stat__value" data-role="followers-count">${formatCount(user.followersCount)}</span>
              <span class="profile-stat__label">Followers</span>
            </button>
            <button class="profile-stat" type="button" data-action="show-following">
              <span class="profile-stat__value" data-role="following-count">${formatCount(user.followingCount)}</span>
              <span class="profile-stat__label">Following</span>
            </button>
          </div>

          <div class="profile-header__name">${escapeHtml(user.fullName)}</div>
          ${user.bio ? `<p class="profile-header__bio">${escapeHtml(user.bio)}</p>` : '<p class="profile-header__bio text-dim">No bio yet.</p>'}
          <div class="profile-header__joined">Joined ${formatDate(user.createdAt)}</div>
        </div>
      </div>

      <div class="profile-tabs">
        <span class="profile-tab is-active">${Icons.grid} Posts</span>
      </div>
    `;

    document.title = `@${user.username} · LinkUp`;
  }

  async function handleFollow(button) {
    const restore = buttonLoading(button, '…');
    try {
      const res = await window.Api.users.follow(button.dataset.id);
      const { isFollowing, followersCount } = res.data;

      restore();
      button.textContent = isFollowing ? 'Following' : 'Follow';
      button.classList.toggle('btn--ghost', isFollowing);
      button.classList.toggle('btn--primary', !isFollowing);

      const counter = headerEl.querySelector('[data-role="followers-count"]');
      if (counter) counter.textContent = formatCount(followersCount);

      state.user.isFollowing = isFollowing;
      state.user.followersCount = followersCount;
      toast.success(res.message, { duration: 1800 });
    } catch (err) {
      restore();
      toast.error(err.message);
    }
  }

  /* ------------------------------ user list ---------------------------- */
  function userRow(user) {
    return `
      <div class="user-row">
        <a href="profile.html?user=${encodeURIComponent(user.username)}">${avatar(user, 'avatar--sm')}</a>
        <div class="user-row__info">
          <a class="user-row__name truncate" href="profile.html?user=${encodeURIComponent(user.username)}">${escapeHtml(user.username)}</a>
          <div class="user-row__meta truncate">${escapeHtml(user.fullName)}</div>
        </div>
        ${
          user.isSelf
            ? ''
            : `<button class="btn ${user.isFollowing ? 'btn--ghost' : 'btn--soft'} btn--sm" type="button" data-action="follow" data-id="${user.id}">${user.isFollowing ? 'Following' : 'Follow'}</button>`
        }
      </div>
    `;
  }

  async function showUserList(kind) {
    const title = kind === 'followers' ? 'Followers' : 'Following';

    const modal = openModal(
      `
      <div class="row-between" style="margin-bottom:14px">
        <h3 class="modal__title" style="margin:0">${title}</h3>
        <button class="btn btn--icon" type="button" data-modal-close aria-label="Close">${Icons.close}</button>
      </div>
      <div id="userListBody" style="max-height:56vh;overflow-y:auto">${skeletonUserRows(4)}</div>
    `
    );

    const body = modal.element.querySelector('#userListBody');

    try {
      const res =
        kind === 'followers'
          ? await window.Api.users.followers(state.user.id)
          : await window.Api.users.following(state.user.id);

      const users = res.data.users || [];
      body.innerHTML = users.length
        ? users.map(userRow).join('')
        : `<p class="text-dim text-center" style="padding:26px 0">No ${title.toLowerCase()} yet.</p>`;

      body.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action="follow"]');
        if (!btn) return;
        btn.disabled = true;
        try {
          const followRes = await window.Api.users.follow(btn.dataset.id);
          btn.textContent = followRes.data.isFollowing ? 'Following' : 'Follow';
          btn.classList.toggle('btn--ghost', followRes.data.isFollowing);
          btn.classList.toggle('btn--soft', !followRes.data.isFollowing);
        } catch (err) {
          toast.error(err.message);
        } finally {
          btn.disabled = false;
        }
      });
    } catch (err) {
      body.innerHTML = `<p class="text-dim text-center" style="padding:26px 0">${escapeHtml(err.message)}</p>`;
    }
  }

  /* ------------------------------- posts ------------------------------- */
  function gridItem(post) {
    return `
      <a class="grid-item" href="post.html?id=${post.id}" aria-label="Open post">
        <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.caption ? post.caption.slice(0, 80) : 'Post')}" loading="lazy" />
        <span class="grid-item__overlay">
          <span class="grid-item__stat">${Icons.heart}${formatCount(post.likesCount)}</span>
          <span class="grid-item__stat">${Icons.comment}${formatCount(post.commentsCount)}</span>
        </span>
      </a>
    `;
  }

  async function loadPosts(reset = false) {
    if (state.loading) return;
    if (!reset && !state.hasMore) return;

    state.loading = true;
    if (reset) {
      state.page = 1;
      state.hasMore = true;
      gridEl.innerHTML = skeletonGrid(6);
    }

    try {
      const res = await window.Api.users.posts(state.user.id, {
        page: state.page,
        limit: 12,
      });

      const posts = res.data.posts || [];
      if (reset) gridEl.innerHTML = '';

      if (!posts.length && state.page === 1) {
        gridEl.innerHTML = '';
        gridEl.style.display = 'block';
        gridEl.innerHTML = emptyState({
          icon: Icons.camera,
          title: state.user.isSelf ? 'You have no posts yet' : 'No posts yet',
          text: state.user.isSelf
            ? 'Share your first photo and it will appear here.'
            : `@${state.user.username} has not posted anything yet.`,
          actionHtml: state.user.isSelf
            ? '<a class="btn btn--primary" href="create-post.html">Create a post</a>'
            : '',
        });
        state.hasMore = false;
        moreEl.innerHTML = '';
        return;
      }

      gridEl.style.display = '';
      gridEl.insertAdjacentHTML('beforeend', posts.map(gridItem).join(''));

      state.hasMore = Boolean(res.pagination && res.pagination.hasMore);
      state.page += 1;

      moreEl.innerHTML = state.hasMore
        ? '<button class="btn btn--ghost" type="button" id="loadMorePosts">Load more posts</button>'
        : '';

      const loadMore = document.getElementById('loadMorePosts');
      if (loadMore) loadMore.addEventListener('click', () => loadPosts(false));
    } catch (err) {
      toast.error(err.message);
      if (state.page === 1) {
        gridEl.innerHTML = '';
        gridEl.style.display = 'block';
        gridEl.innerHTML = emptyState({
          icon: Icons.alert,
          title: 'Could not load posts',
          text: err.message,
        });
      }
    } finally {
      state.loading = false;
    }
  }

  /* -------------------------------- init ------------------------------- */
  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.Auth.requireAuth()) return;

    window.Navbar.mount('profile');

    headerEl = document.getElementById('profileHeader');
    gridEl = document.getElementById('profileGrid');
    moreEl = document.getElementById('profileMore');

    headerEl.innerHTML = window.UI.spinnerBlock('Loading profile…');

    const target = window.UI.getParam('user') || window.UI.getParam('id');

    try {
      const res = target
        ? await window.Api.users.byId(target)
        : await window.Api.users.myProfile();

      state.user = res.data.user;
      renderHeader(state.user);

      headerEl.addEventListener('click', (e) => {
        const follow = e.target.closest('#followBtn');
        if (follow) {
          handleFollow(follow);
          return;
        }
        if (e.target.closest('[data-action="show-followers"]')) showUserList('followers');
        if (e.target.closest('[data-action="show-following"]')) showUserList('following');
      });

      await loadPosts(true);
    } catch (err) {
      headerEl.innerHTML = emptyState({
        icon: Icons.alert,
        title: 'Profile not found',
        text: err.message,
        actionHtml: '<a class="btn btn--primary" href="feed.html">Back to feed</a>',
      });
      gridEl.innerHTML = '';
      toast.error(err.message);
    }
  });
})();
