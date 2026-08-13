/**
 * Create post page: drag & drop image picker, live preview, caption counter,
 * upload with progress feedback.
 */
(function initCreatePost() {
  'use strict';

  const { Icons, Validate, escapeHtml, setFieldError, buttonLoading, toast, bindCounter, avatar } =
    window.UI;
  const { MAX_IMAGE_MB } = window.APP_CONFIG;

  let selectedFile = null;
  let previewUrl = null;

  function showPreview(file) {
    const host = document.getElementById('previewArea');
    const dropzone = document.getElementById('dropzone');

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);

    host.innerHTML = `
      <div class="preview">
        <img src="${previewUrl}" alt="Selected image preview" />
        <button class="preview__remove" type="button" id="clearImage" aria-label="Remove image">${Icons.close}</button>
      </div>
      <p class="field__hint">${escapeHtml(file.name)} · ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
    `;
    host.classList.remove('hidden');
    dropzone.classList.add('hidden');

    document.getElementById('clearImage').addEventListener('click', clearImage);
    document.getElementById('submitPost').disabled = false;
  }

  function clearImage() {
    selectedFile = null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }
    const host = document.getElementById('previewArea');
    host.innerHTML = '';
    host.classList.add('hidden');
    document.getElementById('dropzone').classList.remove('hidden');
    document.getElementById('imageInput').value = '';
    document.getElementById('submitPost').disabled = true;
  }

  function acceptFile(file) {
    const error = Validate.image(file);
    if (error) {
      toast.error(error);
      setFieldError(document.getElementById('imageInput'), error);
      return;
    }
    setFieldError(document.getElementById('imageInput'), '');
    selectedFile = file;
    showPreview(file);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Auth.requireAuth()) return;

    window.Navbar.mount('create');

    const user = window.Auth.user || {};
    const authorHost = document.getElementById('composerAuthor');
    if (authorHost) {
      authorHost.innerHTML = `
        ${avatar(user, 'avatar--sm')}
        <span style="min-width:0">
          <span class="post__name" style="display:block">${escapeHtml(user.fullName || '')}</span>
          <span class="text-dim" style="font-size:.8rem">Posting publicly</span>
        </span>
      `;
    }

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('imageInput');
    const caption = document.getElementById('caption');
    const form = document.getElementById('createPostForm');

    bindCounter(caption, document.getElementById('captionCounter'), 2200);

    document.getElementById('maxSizeHint').textContent =
      `JPG, PNG, GIF or WEBP · up to ${MAX_IMAGE_MB} MB`;

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) acceptFile(file);
    });

    ['dragenter', 'dragover'].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragging');
      })
    );

    ['dragleave', 'drop'].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragging');
      })
    );

    dropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files[0];
      if (file) acceptFile(file);
    });

    // Paste an image straight from the clipboard.
    document.addEventListener('paste', (e) => {
      const item = Array.from(e.clipboardData ? e.clipboardData.items : []).find((i) =>
        i.type.startsWith('image/')
      );
      if (!item) return;
      const file = item.getAsFile();
      if (file) {
        acceptFile(file);
        toast.info('Image pasted from clipboard.', { duration: 2000 });
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!selectedFile) {
        toast.error('Please choose an image for your post.');
        return;
      }
      if (caption.value.length > 2200) {
        toast.error('Caption cannot exceed 2200 characters.');
        return;
      }

      const submit = document.getElementById('submitPost');
      const restore = buttonLoading(submit, 'Publishing…');

      const fd = new FormData();
      fd.append('image', selectedFile);
      fd.append('caption', caption.value.trim());

      try {
        const res = await window.Api.posts.create(fd);
        toast.success('Post published!', { duration: 1600 });
        setTimeout(() => {
          window.location.href = `post.html?id=${res.data.post.id}`;
        }, 700);
      } catch (err) {
        toast.error(err.message);
        restore();
      }
    });
  });
})();
