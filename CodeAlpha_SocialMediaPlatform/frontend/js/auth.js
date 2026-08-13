/**
 * Login and register page logic (client-side validation + submission).
 */
(function initAuthPages() {
  'use strict';

  const { Validate, setFieldError, clearFormErrors, applyServerErrors, buttonLoading, toast, bindPasswordToggle, getParam } =
    window.UI;

  /* ------------------------------- login ------------------------------- */
  function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    if (window.Auth.redirectIfLoggedIn()) return;

    if (getParam('expired')) {
      toast.warning('Your session expired. Please log in again.');
    }
    if (getParam('registered')) {
      toast.success('Account created. Please log in.');
    }

    const identifier = document.getElementById('identifier');
    const password = document.getElementById('password');

    bindPasswordToggle(document.getElementById('togglePassword'), password);

    identifier.addEventListener('blur', () =>
      setFieldError(identifier, Validate.required(identifier.value, 'Email or username'))
    );
    password.addEventListener('blur', () =>
      setFieldError(password, Validate.required(password.value, 'Password'))
    );
    [identifier, password].forEach((input) =>
      input.addEventListener('input', () => setFieldError(input, ''))
    );

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearFormErrors(form);

      const errors = {
        identifier: Validate.required(identifier.value, 'Email or username'),
        password: Validate.required(password.value, 'Password'),
      };

      let hasError = false;
      Object.entries(errors).forEach(([id, message]) => {
        if (message) {
          hasError = true;
          setFieldError(document.getElementById(id), message);
        }
      });
      if (hasError) return;

      const submit = form.querySelector('button[type="submit"]');
      const restore = buttonLoading(submit, 'Signing in…');

      try {
        const res = await window.Api.auth.login({
          identifier: identifier.value.trim(),
          password: password.value,
        });

        window.Auth.save(res.data.token, res.data.user);
        toast.success(`Welcome back, ${res.data.user.fullName.split(' ')[0]}!`, { duration: 1600 });
        setTimeout(() => {
          window.location.href = getParam('next') || 'feed.html';
        }, 500);
      } catch (err) {
        applyServerErrors(form, err);
        toast.error(err.message);
        restore();
      }
    });

    // Demo account shortcut.
    const demoBtn = document.getElementById('demoLogin');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        identifier.value = 'ada@example.com';
        password.value = 'Password123';
        form.requestSubmit();
      });
    }
  }

  /* ------------------------------ register ----------------------------- */
  function initRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    if (window.Auth.redirectIfLoggedIn()) return;

    const fullName = document.getElementById('fullName');
    const username = document.getElementById('username');
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const meter = document.getElementById('passwordMeter');

    bindPasswordToggle(document.getElementById('togglePassword'), password);

    const rules = {
      fullName: () => Validate.fullName(fullName.value),
      username: () => Validate.username(username.value),
      email: () => Validate.email(email.value),
      password: () => Validate.password(password.value),
      confirmPassword: () =>
        confirmPassword.value !== password.value ? 'Passwords do not match' : '',
    };

    Object.keys(rules).forEach((id) => {
      const input = document.getElementById(id);
      input.addEventListener('blur', () => setFieldError(input, rules[id]()));
      input.addEventListener('input', () => setFieldError(input, ''));
    });

    // Auto-suggest a username from the full name.
    fullName.addEventListener('blur', () => {
      if (username.value.trim()) return;
      const suggestion = fullName.value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '.')
        .slice(0, 30);
      if (suggestion.length >= 3) username.value = suggestion;
    });

    password.addEventListener('input', () => {
      if (!meter) return;
      const score = Validate.passwordStrength(password.value);
      meter.style.width = `${score * 25}%`;
      meter.dataset.level = String(score);
    });

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
      const restore = buttonLoading(submit, 'Creating account…');

      try {
        const res = await window.Api.auth.register({
          fullName: fullName.value.trim(),
          username: username.value.trim().toLowerCase(),
          email: email.value.trim().toLowerCase(),
          password: password.value,
        });

        window.Auth.save(res.data.token, res.data.user);
        toast.success('Welcome to LinkUp!', { duration: 1600 });
        setTimeout(() => {
          window.location.href = 'feed.html';
        }, 600);
      } catch (err) {
        applyServerErrors(form, err);
        toast.error(err.message);
        restore();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initRegister();
  });
})();
