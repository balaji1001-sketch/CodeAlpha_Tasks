/**
 * Post card renderer + all post interactions (like, comment, edit, delete,
 * share). Used by the feed, the profile page and the post detail page.
 * Exposes window.PostCard.
 */
(function initPostCard() {
  'use strict';

  const {
    Icons,
    avatar,
    escapeHtml,
    formatCaption,
    timeAgo,
    formatCount,
    pluralize,
    toast,
    confirmDialog,
    buttonLoading,
    copyToClipboard,
    openModal,
  } = window.UI;

  /* --------------------------- markup builders -------------------------- */

  function commentHtml(comment) {
    return `
      <div class="comment" data-comment-id="${comment.id}">
        <a href="profile.html?user=${encodeURIComponent(comment.user.username)}">
          ${avatar(comment.user, 'avatar--xs')}
        </a>
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

  function menuHtml(post) {
    if (!post.isOwner) {
      return `
        <button class="usermenu__item" type="button" data-action="copy-link">${Icons.share}<span>Copy link</span></button>
        <a class="usermenu__item" href="post.html?id=${post.id}">${Icons.eye}<span>Open post</span></a>
      `;
    }
    return `
      <button class="usermenu__item" type="button" data-action="edit">${Icons.edit}<span>Edit post</span></button>
      <button class="usermenu__item" type="button" data-action="copy-link">${Icons.share}<span>Copy link</span></button>
      <a class="usermenu__item" href="post.html?id=${post.id}">${Icons.eye}<span>Open post</span></a>
      <button class="usermenu__item usermenu__item--danger" type="button" data-action="delete">${Icons.trash}<span>Delete post</span></button>
    `;
  }

  /**
   * Build a full post card.
   * @param {object} post
   * @param {{showComments?:boolean, comments?:Array, compact?:boolean}} opts
   */
  function render(post, opts = {}) {
    const { showComments = true, comments = [] } = opts;
    const edited = post.updatedAt && post.updatedAt !== post.createdAt;
    const me = window.Auth.user || {};

    const previewComments = comments.slice(0, 2);
    const hasMore = post.commentsCount > previewComments.length;

    return `
      <article class="post" data-post-id="${post.id}" data-liked="${post.isLiked}" data-likes="${post.likesCount}" data-caption="${escapeHtml(post.caption || '')}" data-username="${escapeHtml(post.user.username)}">
        <header class="post__head">
          <a class="post__author" href="profile.html?user=${encodeURIComponent(post.user.username)}">
            ${avatar(post.user, 'avatar--sm')}
            <span style="min-width:0">
              <span class="post__name truncate">${escapeHtml(post.user.username)}</span>
              <span class="post__time">${timeAgo(post.createdAt)}${edited ? ' · <span class="post__edited">edited</span>' : ''}</span>
            </span>
          </a>

          <div class="post__menu">
            <button class="btn btn--icon" type="button" data-action="toggle-menu" aria-label="Post options" aria-haspopup="true">${Icons.dots}</button>
            <div class="post__menu-panel">${menuHtml(post)}</div>
          </div>
        </header>

        ${
          post.caption
            ? `<div class="post__body post__body--top"><div class="post__caption" data-role="caption"><strong><a href="profile.html?user=${encodeURIComponent(post.user.username)}">${escapeHtml(post.user.username)}</a></strong>${formatCaption(post.caption)}</div></div>`
            : '<div class="post__body post__body--top"><div class="post__caption" data-role="caption"></div></div>'
        }

        <div class="post__media" data-action="dblclick-like" role="button" tabindex="0" aria-label="Post image">
          <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.caption ? post.caption.slice(0, 90) : `Post by ${post.user.username}`)}" loading="lazy" />
          <div class="post__heart-burst">${Icons.heartBig}</div>
        </div>

        <div class="post__stats-row">
          <span class="post__stats" data-role="likes-label">${pluralize(post.likesCount, 'like')}</span>
          ${hasMore ? `<a class="post__viewall" href="post.html?id=${post.id}">${formatCount(post.commentsCount)} comments</a>` : ''}
        </div>

        <div class="post__actions">
          <button class="action-btn ${post.isLiked ? 'is-liked' : ''}" type="button" data-action="like" aria-pressed="${post.isLiked}" aria-label="Like">
            ${Icons.heart}<span data-role="like-count">${formatCount(post.likesCount)}</span>
          </button>
          <button class="action-btn" type="button" data-action="focus-comment" aria-label="Comment">
            ${Icons.comment}<span data-role="comment-count">${formatCount(post.commentsCount)}</span>
          </button>
          <button class="action-btn action-btn--share" type="button" data-action="copy-link" aria-label="Copy link">
            ${Icons.share}<span>Share</span>
          </button>
        </div>

        ${
          showComments
            ? `<div class="comments" data-role="comments">${previewComments.map(commentHtml).join('')}</div>
               <form class="comment-form" data-role="comment-form">
                 ${avatar(me, 'avatar--xs')}
                 <input class="comment-form__input" type="text" name="comment" placeholder="Add a comment…" maxlength="500" autocomplete="off" aria-label="Add a comment" />
                 <button class="comment-form__submit" type="submit" disabled>Post</button>
               </form>`
            : ''
        }
      </article>
    `;
  }

  /* ----------------------------- interactions --------------------------- */

  async function handleLike(card) {
    const button = card.querySelector('[data-action="like"]');
    const countEl = card.querySelector('[data-role="like-count"]');
    const labelEl = card.querySelector('[data-role="likes-label"]');
    const postId = card.dataset.postId;

    // Optimistic update, rolled back if the request fails.
    const wasLiked = card.dataset.liked === 'true';
    const wasCount = Number(card.dataset.likes) || 0;
    const optimisticCount = Math.max(0, wasCount + (wasLiked ? -1 : 1));

    card.dataset.liked = String(!wasLiked);
    card.dataset.likes = String(optimisticCount);
    button.classList.toggle('is-liked', !wasLiked);
    button.setAttribute('aria-pressed', String(!wasLiked));
    countEl.textContent = formatCount(optimisticCount);
    if (labelEl) labelEl.textContent = pluralize(optimisticCount, 'like');

    button.disabled = true;
    try {
      const res = await window.Api.posts.like(postId);
      const { isLiked, likesCount } = res.data;

      card.dataset.liked = String(isLiked);
      card.dataset.likes = String(likesCount);
      button.classList.toggle('is-liked', isLiked);
      button.setAttribute('aria-pressed', String(isLiked));
      countEl.textContent = formatCount(likesCount);
      if (labelEl) labelEl.textContent = pluralize(likesCount, 'like');

      if (isLiked) {
        const burst = card.querySelector('.post__heart-burst');
        if (burst) {
          burst.classList.remove('is-active');
          void burst.offsetWidth;
          burst.classList.add('is-active');
        }
      }
    } catch (err) {
      card.dataset.liked = String(wasLiked);
      card.dataset.likes = String(wasCount);
      button.classList.toggle('is-liked', wasLiked);
      button.setAttribute('aria-pressed', String(wasLiked));
      countEl.textContent = formatCount(wasCount);
      if (labelEl) labelEl.textContent = pluralize(wasCount, 'like');
      toast.error(err.message);
    } finally {
      button.disabled = false;
    }
  }

  async function handleAddComment(card, form) {
    const input = form.querySelector('input[name="comment"]');
    const value = input.value.trim();
    if (!value) return;

    const submit = form.querySelector('button[type="submit"]');
    const restore = buttonLoading(submit, '');
    const postId = card.dataset.postId;

    try {
      const res = await window.Api.comments.add(postId, value);
      const container = card.querySelector('[data-role="comments"]');
      if (container) {
        container.insertAdjacentHTML('afterbegin', commentHtml(res.data.comment));
      }

      const countEl = card.querySelector('[data-role="comment-count"]');
      if (countEl) countEl.textContent = formatCount(res.data.commentsCount);

      input.value = '';
      submit.disabled = true;
      toast.success('Comment added.', { duration: 2000 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      restore();
      submit.disabled = !input.value.trim();
    }
  }

  async function handleDeleteComment(card, commentEl) {
    const ok = await confirmDialog({
      title: 'Delete this comment?',
      text: 'The comment will be permanently removed.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    try {
      const res = await window.Api.comments.remove(commentEl.dataset.commentId);
      commentEl.style.opacity = '0';
      setTimeout(() => commentEl.remove(), 180);

      const countEl = card.querySelector('[data-role="comment-count"]');
      if (countEl) countEl.textContent = formatCount(res.data.commentsCount);
      toast.success('Comment deleted.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDeletePost(card, onDeleted) {
    const ok = await confirmDialog({
      title: 'Delete this post?',
      text: 'The photo and all of its comments will be permanently removed.',
      confirmLabel: 'Delete post',
    });
    if (!ok) return;

    try {
      await window.Api.posts.remove(card.dataset.postId);
      card.style.transition = 'opacity .2s, transform .2s';
      card.style.opacity = '0';
      card.style.transform = 'scale(.97)';
      setTimeout(() => {
        card.remove();
        if (typeof onDeleted === 'function') onDeleted();
      }, 200);
      toast.success('Post deleted.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  function handleEditPost(card) {
    const postId = card.dataset.postId;
    const captionEl = card.querySelector('[data-role="caption"]');
    // The raw caption is stored on the card so it survives HTML formatting.
    const currentCaption = card.dataset.caption || '';

    const modal = openModal(
      `
      <div class="row-between" style="margin-bottom:18px">
        <h3 class="modal__title" style="margin:0">Edit post</h3>
        <button class="btn btn--icon modal__close" type="button" data-modal-close aria-label="Close">${Icons.close}</button>
      </div>
      <form id="editPostForm" novalidate>
        <label class="field">
          <span class="field__label">Caption</span>
          <textarea class="textarea" id="editCaption" maxlength="2200" placeholder="Write a caption…">${escapeHtml(currentCaption)}</textarea>
          <span class="field__counter" id="editCaptionCounter"></span>
        </label>
        <label class="field">
          <span class="field__label">Replace image (optional)</span>
          <input class="input" id="editImage" type="file" accept="image/jpeg,image/png,image/gif,image/webp" />
          <span class="field__error" data-error-for="editImage"></span>
        </label>
        <div id="editPreview"></div>
        <div class="modal__actions mt-2">
          <button class="btn btn--ghost" type="button" data-modal-close>Cancel</button>
          <button class="btn btn--primary" type="submit" id="editSubmit">Save changes</button>
        </div>
      </form>
    `,
      { wide: true }
    );

    const form = modal.element.querySelector('#editPostForm');
    const captionInput = modal.element.querySelector('#editCaption');
    const fileInput = modal.element.querySelector('#editImage');
    const preview = modal.element.querySelector('#editPreview');

    window.UI.bindCounter(captionInput, modal.element.querySelector('#editCaptionCounter'), 2200);

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      preview.innerHTML = '';
      if (!file) return;
      const error = window.UI.Validate.image(file);
      window.UI.setFieldError(fileInput, error);
      if (error) {
        fileInput.value = '';
        return;
      }
      const url = URL.createObjectURL(file);
      preview.innerHTML = `<div class="preview mt-1"><img src="${url}" alt="New image preview" /></div>`;
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submit = form.querySelector('#editSubmit');
      const restore = buttonLoading(submit, 'Saving…');

      const fd = new FormData();
      fd.append('caption', captionInput.value.trim());
      if (fileInput.files[0]) fd.append('image', fileInput.files[0]);

      try {
        const res = await window.Api.posts.update(postId, fd);
        const updated = res.data.post;

        // Repaint caption and image in place.
        card.dataset.caption = updated.caption || '';
        if (captionEl) {
          captionEl.innerHTML = updated.caption
            ? `<strong><a href="profile.html?user=${encodeURIComponent(updated.user.username)}">${escapeHtml(updated.user.username)}</a></strong>${formatCaption(updated.caption)}`
            : '';
        }
        const img = card.querySelector('.post__media img');
        if (img) img.src = `${updated.image}?t=${Date.now()}`;

        toast.success('Post updated.');
        modal.close();
      } catch (err) {
        window.UI.applyServerErrors(form, err);
        toast.error(err.message);
      } finally {
        restore();
      }
    });
  }

  async function handleCopyLink(postId) {
    const url = `${window.location.origin}${window.location.pathname.replace(/[^/]*$/, '')}post.html?id=${postId}`;
    const ok = await copyToClipboard(url);
    if (ok) toast.success('Link copied to clipboard.');
    else toast.error('Could not copy the link.');
  }

  function closeAllMenus(except) {
    document.querySelectorAll('.post__menu-panel.is-open').forEach((panel) => {
      if (panel !== except) panel.classList.remove('is-open');
    });
  }

  /**
   * Attach a single delegated listener to a container holding post cards.
   * @param {HTMLElement} container
   * @param {{onDeleted?:Function}} options
   */
  function bind(container, options = {}) {
    if (!container || container.dataset.postCardBound === 'true') return;
    container.dataset.postCardBound = 'true';

    container.addEventListener('click', async (e) => {
      const card = e.target.closest('.post');
      if (!card) return;

      const trigger = e.target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.dataset.action;

      if (action === 'toggle-menu') {
        e.preventDefault();
        const panel = trigger.nextElementSibling;
        const willOpen = !panel.classList.contains('is-open');
        closeAllMenus(panel);
        panel.classList.toggle('is-open', willOpen);
        return;
      }

      if (action === 'like') {
        e.preventDefault();
        await handleLike(card);
        return;
      }

      if (action === 'focus-comment') {
        e.preventDefault();
        const input = card.querySelector('.comment-form__input');
        if (input) input.focus();
        else window.location.href = `post.html?id=${card.dataset.postId}`;
        return;
      }

      if (action === 'copy-link') {
        e.preventDefault();
        closeAllMenus();
        await handleCopyLink(card.dataset.postId);
        return;
      }

      if (action === 'edit') {
        e.preventDefault();
        closeAllMenus();
        handleEditPost(card);
        return;
      }

      if (action === 'delete') {
        e.preventDefault();
        closeAllMenus();
        await handleDeletePost(card, options.onDeleted);
        return;
      }

      if (action === 'delete-comment') {
        e.preventDefault();
        const commentEl = e.target.closest('.comment');
        if (commentEl) await handleDeleteComment(card, commentEl);
      }
    });

    // Double-tap / double-click the image to like.
    container.addEventListener('dblclick', async (e) => {
      const media = e.target.closest('[data-action="dblclick-like"]');
      if (!media) return;
      const card = media.closest('.post');
      if (card && card.dataset.liked !== 'true') await handleLike(card);
    });

    // Comment form: enable/disable submit + submit handling.
    container.addEventListener('input', (e) => {
      if (!e.target.matches('.comment-form__input')) return;
      const form = e.target.closest('form');
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = !e.target.value.trim();
    });

    container.addEventListener('submit', async (e) => {
      const form = e.target.closest('[data-role="comment-form"]');
      if (!form) return;
      e.preventDefault();
      const card = form.closest('.post');
      await handleAddComment(card, form);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.post__menu')) closeAllMenus();
    });
  }

  window.PostCard = { render, commentHtml, bind, handleLike, handleEditPost };
})();
