/**
 * Edit profile page: avatar upload with preview, field validation,
 * optional password change.
 */
(function initEditProfile() {
  'use strict';

  const {
    Icons,
    Validate,
    escapeHtml,
    setFieldError,
    clearFormErrors,
    applyServerErrors,
    buttonLoading,
    toast,
    bindCounter,
    bindPasswordToggle,
    confirmDialog,
  } = window.UI;

  let currentUser = null;
  let selectedFile = null;
  let removeAvatar = false;

  function renderAvatarPreview(url, user) {
    const host = document.getElementById('avatarPreview');
    if (!host) return;

    host.innerHTML = url
      ? `<img class="avatar avatar--lg" src="${escapeHtml(url)}" alt="Profile picture preview" />`
      : `<div class="avatar avatar--lg">${escapeHtml(window.UI.initials((user || {}).fullName))}</div>`;
  }

  function fillForm(user) {
    document.getElementById('fullName').value = user.fullName || '';
    document.getElementById('username').value = user.username || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('bio').value = user.bio || '';
    renderAvatarPreview(user.profilePicture, user);

    const removeBtn = document.getElementById('removeAvatar');
    if (removeBtn) removeBtn.classList.toggle('hidden', !user.profilePicture);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!window.Auth.requireAuth()) return;

    window.Navbar.mount('profile');

    const form = document.getElementById('editProfileForm');
    const fileInput = document.getElementById('profilePicture');
    const bio = document.getElementById('bio');
    const password = document.getElementById('password');
    const shell = document.getElementById('editShell');

    bindCounter(bio, document.getElementById('bioCounter'), 160);
    bindPasswordToggle(document.getElementById('togglePassword'), password);

    try {
      const res = await window.Api.users.myProfile();
      currentUser = res.data.user;
      window.Auth.updateUser(currentUser);
      fillForm(currentUser);
      shell.classList.remove('hidden');
      document.getElementById('editLoading').classList.add('hidden');
    } catch (err) {
      toast.error(err.message);
      return;
    }

    /* ---------------------------- avatar ---------------------------- */
    const pickBtn = document.getElementById('pickAvatar');
    if (pickBtn) pickBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;

      const error = Validate.image(file);
      setFieldError(fileInput, error);
      if (error) {
        fileInput.value = '';
        selectedFile = null;
        toast.error(error);
        return;
      }

      selectedFile = file;
      removeAvatar = false;
      renderAvatarPreview(URL.createObjectURL(file), currentUser);
      document.getElementById('removeAvatar').classList.remove('hidden');
      toast.info('Image selected. Save to apply.', { duration: 2200 });
    });

    const removeBtn = document.getElementById('removeAvatar');
    if (removeBtn) {
      removeBtn.addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: 'Remove profile picture?',
          text: 'Your avatar will fall back to your initials.',
          confirmLabel: 'Remove',
        });
        if (!ok) return;

        selectedFile = null;
        removeAvatar = true;
        fileInput.value = '';
        renderAvatarPreview('', currentUser);
        removeBtn.classList.add('hidden');
      });
    }

    /* --------------------------- validation -------------------------- */
    const rules = {
      fullName: () => Validate.fullName(document.getElementById('fullName').value),
      username: () => Validate.username(document.getElementById('username').value),
      email: () => Validate.email(document.getElementById('email').value),
      bio: () =>
        document.getElementById('bio').value.length > 160
          ? 'Bio cannot exceed 160 characters'
          : '',
      password: () => (password.value ? Validate.password(password.value) : ''),
    };

    Object.keys(rules).forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('blur', () => setFieldError(input, rules[id]()));
      input.addEventListener('input', () => setFieldError(input, ''));
    });

    /* ----------------------------- submit ---------------------------- */
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormErrors(form);

      let hasError = false;
      Object.entries(rules).forEach(([id, rule]) => {
        const message = rule();
        if (message) {
          hasError = true;
          setFieldError(document.getElementById(id), message);
        }
      });
      if (hasError) {
        toast.error('Please fix the highlighted fields.');
        return;
      }

      const submit = form.querySelector('button[type="submit"]');
      const restore = buttonLoading(submit, 'Saving…');

      const fd = new FormData();
      fd.append('fullName', document.getElementById('fullName').value.trim());
      fd.append('username', document.getElementById('username').value.trim().toLowerCase());
      fd.append('email', document.getElementById('email').value.trim().toLowerCase());
      fd.append('bio', bio.value.trim());
      if (password.value) fd.append('password', password.value);
      if (selectedFile) fd.append('profilePicture', selectedFile);
      if (removeAvatar) fd.append('removeProfilePicture', 'true');

      try {
        const res = await window.Api.users.updateProfile(fd);
        currentUser = res.data.user;
        window.Auth.updateUser(currentUser);

        selectedFile = null;
        removeAvatar = false;
        fileInput.value = '';
        password.value = '';
        fillForm(currentUser);

        toast.success('Profile updated.');
        setTimeout(() => {
          window.location.href = 'profile.html';
        }, 900);
      } catch (err) {
        applyServerErrors(form, err);
        toast.error(err.message);
        restore();
      }
    });

    const cancelBtn = document.getElementById('cancelEdit');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        window.location.href = 'profile.html';
      });
    }
  });
})();
