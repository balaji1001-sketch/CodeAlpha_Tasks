/**
 * Post detail page: large media pane, full comment thread, like/comment,
 * owner actions (edit / delete).
 */
(function initPostDetail() {
  'use strict';

  const {
    Icons,
    avatar,
    escapeHtml,
    formatCaption,
    timeAgo,
    formatDate,
    formatCount,
    pluralize,
    toast,
    emptyState,
    confirmDialog,
    buttonLoading,
    openModal,
    copyToClipboard,
  } = window.UI;

  let post = null;
  let comments = [];
  let root;

  function commentHtml(comment) {
    return `
      <div class="comment" data-comment-id="${comment.id}">
        <a href="profile.html?user=${encodeURIComponent(comment.user.username)}">${avatar(comment.user, 'avatar--xs')}</a>
        <div class="comment__content">
          <div class="comment__text">
            <strong><a href="profile.html?user=${encodeURIComponent(comment.user.username)}">${escapeHtml(comment.user.username)}</a></strong>${formatCaption(comment.comment)}
          </div>
          <div class="comment__meta">
            <span>${timeAgo(comment.createdAt)}</span>
            ${comment.canDelete ? '<button class="comment__delete" type="button" data-action="delete-comment">Delete</button>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  function render() {
    const me = window.Auth.user || {};
    const edited = post.updatedAt && post.updatedAt !== post.createdAt;

    root.innerHTML = `
      <a class="btn btn--ghost btn--sm" href="feed.html" style="margin-bottom:18px">${Icons.arrowLeft}<span>Back to feed</span></a>

      <div class="detail card">
        <div class="detail__media">
          <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.caption ? post.caption.slice(0, 90) : 'Post image')}" />
        </div>

        <div class="detail__side">
          <div class="detail__head">
            <a class="post__author" href="profile.html?user=${encodeURIComponent(post.user.username)}">
              ${avatar(post.user, 'avatar--sm')}
              <span style="min-width:0">
                <span class="post__name truncate">${escapeHtml(post.user.username)}</span>
                <span class="post__time">${escapeHtml(post.user.fullName)}</span>
              </span>
            </a>
            ${
              post.isOwner
                ? `<div class="post__menu" style="margin-left:auto">
                     <button class="btn btn--icon" type="button" data-action="toggle-menu" aria-label="Post options">${Icons.dots}</button>
                     <div class="post__menu-panel">
                       <button class="usermenu__item" type="button" data-action="edit">${Icons.edit}<span>Edit post</span></button>
                       <button class="usermenu__item" type="button" data-action="copy-link">${Icons.share}<span>Copy link</span></button>
                       <button class="usermenu__item usermenu__item--danger" type="button" data-action="delete">${Icons.trash}<span>Delete post</span></button>
                     </div>
                   </div>`
                : `<button class="btn btn--icon" style="margin-left:auto" type="button" data-action="copy-link" aria-label="Copy link">${Icons.share}</button>`
            }
          </div>

          <div class="detail__scroll" id="detailScroll">
            ${
              post.caption
                ? `<div class="comment">
                     ${avatar(post.user, 'avatar--xs')}
                     <div class="comment__content">
                       <div class="comment__text"><strong>${escapeHtml(post.user.username)}</strong>${formatCaption(post.caption)}</div>
                       <div class="comment__meta"><span>${timeAgo(post.createdAt)}${edited ? ' · edited' : ''}</span></div>
                     </div>
                   </div>
                   <div class="divider" style="margin:4px 0"></div>`
                : ''
            }
            <div id="commentThread">
              ${
                comments.length
                  ? comments.map(commentHtml).join('')
                  : '<p class="text-dim text-center" style="padding:22px 0;font-size:.88rem">No comments yet. Start the conversation.</p>'
              }
            </div>
          </div>

          <div class="detail__foot">
            <div class="post__actions">
              <button class="action-btn ${post.isLiked ? 'is-liked' : ''}" type="button" data-action="like" aria-pressed="${post.isLiked}">
                ${Icons.heart}<span data-role="like-count">${formatCount(post.likesCount)}</span>
              </button>
              <button class="action-btn" type="button" data-action="focus-comment">
                ${Icons.comment}<span data-role="comment-count">${formatCount(post.commentsCount)}</span>
              </button>
              <button class="action-btn action-btn--share" type="button" data-action="copy-link" aria-label="Copy link">${Icons.share}</button>
            </div>

            <div class="post__body" style="padding-top:0">
              <button class="post__stats" type="button" data-action="show-likes" style="background:none;border:none;padding:0;cursor:pointer" data-role="likes-label">${pluralize(post.likesCount, 'like')}</button>
              <div class="text-dim" style="font-size:.76rem;margin-top:4px">${formatDate(post.createdAt)}</div>
            </div>

            <form class="comment-form" id="detailCommentForm">
              ${avatar(me, 'avatar--xs')}
              <input class="comment-form__input" type="text" name="comment" placeholder="Add a comment…" maxlength="500" autocomplete="off" aria-label="Add a comment" />
              <button class="comment-form__submit" type="submit" disabled>Post</button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.title = `@${post.user.username}'s post · LinkUp`;
    wire();
  }

  async function toggleLike(button) {
    button.disabled = true;
    try {
      const res = await window.Api.posts.like(post.id);
      post.isLiked = res.data.isLiked;
      post.likesCount = res.data.likesCount;

      button.classList.toggle('is-liked', post.isLiked);
      button.setAttribute('aria-pressed', String(post.isLiked));
      root.querySelector('[data-role="like-count"]').textContent = formatCount(post.likesCount);
      root.querySelector('[data-role="likes-label"]').textContent = pluralize(post.likesCount, 'like');
    } catch (err) {
      toast.error(err.message);
    } finally {
      button.disabled = false;
    }
  }

  async function showLikes() {
    const modal = openModal(`
      <div class="row-between" style="margin-bottom:14px">
        <h3 class="modal__title" style="margin:0">Liked by</h3>
        <button class="btn btn--icon" type="button" data-modal-close aria-label="Close">${Icons.close}</button>
      </div>
      <div id="likesBody" style="max-height:56vh;overflow-y:auto">${window.UI.skeletonUserRows(3)}</div>
    `);

    const body = modal.element.querySelector('#likesBody');
    try {
      const res = await window.Api.posts.likes(post.id);
      const users = res.data.users || [];
      body.innerHTML = users.length
        ? users
            .map(
              (u) => `
          <div class="user-row">
            <a href="profile.html?user=${encodeURIComponent(u.username)}">${avatar(u, 'avatar--sm')}</a>
            <div class="user-row__info">
              <a class="user-row__name truncate" href="profile.html?user=${encodeURIComponent(u.username)}">${escapeHtml(u.username)}</a>
              <div class="user-row__meta truncate">${escapeHtml(u.fullName)}</div>
            </div>
          </div>`
            )
            .join('')
        : '<p class="text-dim text-center" style="padding:24px 0">No likes yet.</p>';
    } catch (err) {
      body.innerHTML = `<p class="text-dim text-center" style="padding:24px 0">${escapeHtml(err.message)}</p>`;
    }
  }

  function wire() {
    root.addEventListener('click', async (e) => {
      const trigger = e.target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.dataset.action;

      if (action === 'toggle-menu') {
        const panel = trigger.nextElementSibling;
        panel.classList.toggle('is-open');
        return;
      }

      if (action === 'like') {
        await toggleLike(trigger);
        return;
      }

      if (action === 'focus-comment') {
        const input = root.querySelector('.comment-form__input');
        if (input) input.focus();
        return;
      }

      if (action === 'copy-link') {
        const ok = await copyToClipboard(window.location.href);
        toast[ok ? 'success' : 'error'](ok ? 'Link copied.' : 'Could not copy the link.');
        return;
      }

      if (action === 'show-likes') {
        await showLikes();
        return;
      }

      if (action === 'edit') {
        const modal = openModal(
          `
          <div class="row-between" style="margin-bottom:18px">
            <h3 class="modal__title" style="margin:0">Edit post</h3>
            <button class="btn btn--icon" type="button" data-modal-close aria-label="Close">${Icons.close}</button>
          </div>
          <form id="editForm" novalidate>
            <label class="field">
              <span class="field__label">Caption</span>
              <textarea class="textarea" id="editCaption" maxlength="2200">${escapeHtml(post.caption || '')}</textarea>
            </label>
            <label class="field">
              <span class="field__label">Replace image (optional)</span>
              <input class="input" id="editImage" type="file" accept="image/jpeg,image/png,image/gif,image/webp" />
            </label>
            <div class="modal__actions">
              <button class="btn btn--ghost" type="button" data-modal-close>Cancel</button>
              <button class="btn btn--primary" type="submit" id="editSubmit">Save changes</button>
            </div>
          </form>
        `,
          { wide: true }
        );

        const editForm = modal.element.querySelector('#editForm');
        editForm.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const fileInput = modal.element.querySelector('#editImage');
          const file = fileInput.files[0];

          if (file) {
            const imgError = window.UI.Validate.image(file);
            if (imgError) {
              toast.error(imgError);
              return;
            }
          }

          const restore = buttonLoading(modal.element.querySelector('#editSubmit'), 'Saving…');
          const fd = new FormData();
          fd.append('caption', modal.element.querySelector('#editCaption').value.trim());
          if (file) fd.append('image', file);

          try {
            const res = await window.Api.posts.update(post.id, fd);
            post = res.data.post;
            modal.close();
            render();
            toast.success('Post updated.');
          } catch (err) {
            toast.error(err.message);
            restore();
          }
        });
        return;
      }

      if (action === 'delete') {
        const ok = await confirmDialog({
          title: 'Delete this post?',
          text: 'The photo and all of its comments will be permanently removed.',
          confirmLabel: 'Delete post',
        });
        if (!ok) return;

        try {
          await window.Api.posts.remove(post.id);
          toast.success('Post deleted.');
          setTimeout(() => {
            window.location.href = 'feed.html';
          }, 700);
        } catch (err) {
          toast.error(err.message);
        }
        return;
      }

      if (action === 'delete-comment') {
        const commentEl = e.target.closest('.comment');
        const confirmed = await confirmDialog({
          title: 'Delete this comment?',
          text: 'The comment will be permanently removed.',
          confirmLabel: 'Delete',
        });
        if (!confirmed) return;

        try {
          const res = await window.Api.comments.remove(commentEl.dataset.commentId);
          commentEl.remove();
          post.commentsCount = res.data.commentsCount;
          root.querySelector('[data-role="comment-count"]').textContent = formatCount(post.commentsCount);
          if (!root.querySelector('#commentThread .comment')) {
            root.querySelector('#commentThread').innerHTML =
              '<p class="text-dim text-center" style="padding:22px 0;font-size:.88rem">No comments yet. Start the conversation.</p>';
          }
          toast.success('Comment deleted.');
        } catch (err) {
          toast.error(err.message);
        }
      }
    });

    root.addEventListener('dblclick', async (e) => {
      if (!e.target.closest('.detail__media')) return;
      if (post.isLiked) return;
      await toggleLike(root.querySelector('[data-action="like"]'));
    });

    const form = root.querySelector('#detailCommentForm');
    const input = form.querySelector('input[name="comment"]');
    const submit = form.querySelector('button[type="submit"]');

    input.addEventListener('input', () => {
      submit.disabled = !input.value.trim();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const value = input.value.trim();
      if (!value) return;

      const restore = buttonLoading(submit, '');
      try {
        const res = await window.Api.comments.add(post.id, value);
        const thread = root.querySelector('#commentThread');
        if (!thread.querySelector('.comment')) thread.innerHTML = '';
        thread.insertAdjacentHTML('afterbegin', commentHtml(res.data.comment));

        post.commentsCount = res.data.commentsCount;
        root.querySelector('[data-role="comment-count"]').textContent = formatCount(post.commentsCount);

        input.value = '';
        toast.success('Comment added.', { duration: 1800 });
      } catch (err) {
        toast.error(err.message);
      } finally {
        restore();
        submit.disabled = true;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.Auth.requireAuth()) return;

    window.Navbar.mount('');
    root = document.getElementById('postDetail');

    const id = window.UI.getParam('id');
    if (!id) {
      root.innerHTML = emptyState({
        icon: Icons.alert,
        title: 'No post selected',
        text: 'This link is missing a post id.',
        actionHtml: '<a class="btn btn--primary" href="feed.html">Back to feed</a>',
      });
      return;
    }

    root.innerHTML = window.UI.spinnerBlock('Loading post…', 'spinner--lg');

    try {
      const res = await window.Api.posts.byId(id);
      post = res.data.post;
      comments = res.data.comments || [];
      render();
    } catch (err) {
      root.innerHTML = emptyState({
        icon: Icons.alert,
        title: 'Post not found',
        text: err.message,
        actionHtml: '<a class="btn btn--primary" href="feed.html">Back to feed</a>',
      });
      toast.error(err.message);
    }
  });
})();
