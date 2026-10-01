/**
 * js/auth.js
 * Client-side authentication & form validation module for KalyanSetu
 *
 * Implements:
 * 1. Email format validation (RFC-compliant regex & HTML5 check)
 * 2. Password & password_confirm matching validation
 * 3. Pre-flight check preventing signup form submission when validation fails
 * 4. Error messaging in .signup-error container and input field highlights
 * 5. Toggle password visibility for user convenience
 * 6. Server authentication requests (POST /api/auth/signup & POST /api/auth/login)
 */

// 1. Email Format Validator
function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

// 2. Password & Password Confirm Validator
function validatePasswordMatch(password, passwordConfirm) {
  if (!password || !passwordConfirm) {
    return { valid: false, message: 'Both password and confirm password are required.' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long.' };
  }
  if (password !== passwordConfirm) {
    return { valid: false, message: 'Passwords do not match. Please verify.' };
  }
  return { valid: true, message: '' };
}

// Helper to display error messages in .signup-error
function showSignupError(message) {
  const errorContainer = document.querySelector('.signup-error');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }
}

// Helper to clear error messages
function clearSignupError() {
  const errorContainer = document.querySelector('.signup-error');
  if (errorContainer) {
    errorContainer.textContent = '';
    errorContainer.style.display = 'none';
  }
}

// Helper to highlight invalid input fields
function markInputInvalid(inputEl) {
  if (inputEl) {
    inputEl.style.borderColor = '#c0392b';
    inputEl.setAttribute('aria-invalid', 'true');
    inputEl.focus();
  }
}

// Helper to clear invalid input highlights
function clearInputInvalid(inputEl) {
  if (inputEl) {
    inputEl.style.borderColor = 'rgba(201, 162, 39, 0.65)';
    inputEl.removeAttribute('aria-invalid');
  }
}

// 3. 'Show/Hide Password' Toggle Functionality for login-pass, signup-pass, and signup-pass2
function setupPasswordToggles() {
  const configs = [
    { inputId: 'login-pass', btnId: 'toggle-login-pass' },
    { inputId: 'signup-pass', btnId: 'toggle-signup-pass' },
    { inputId: 'signup-pass2', btnId: 'toggle-signup-pass2' }
  ];

  configs.forEach(({ inputId, btnId }) => {
    const input = document.getElementById(inputId);
    let toggleBtn = document.getElementById(btnId);

    if (!input) return;

    if (!toggleBtn) {
      const wrapper = document.createElement('div');
      wrapper.className = 'password-field-wrapper';
      wrapper.style.position = 'relative';
      wrapper.style.width = '100%';

      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      input.style.paddingRight = '65px';

      toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.id = btnId;
      toggleBtn.className = 'toggle-password-btn';
      toggleBtn.setAttribute('aria-label', 'Show or hide password');
      toggleBtn.textContent = 'Show';
      toggleBtn.style.position = 'absolute';
      toggleBtn.style.right = '10px';
      toggleBtn.style.top = '50%';
      toggleBtn.style.transform = 'translateY(-50%)';
      toggleBtn.style.background = 'none';
      toggleBtn.style.border = 'none';
      toggleBtn.style.color = 'var(--gold, #c9a227)';
      toggleBtn.style.fontSize = '12px';
      toggleBtn.style.fontWeight = '700';
      toggleBtn.style.cursor = 'pointer';
      toggleBtn.style.padding = '4px 6px';
      toggleBtn.style.textTransform = 'uppercase';
      wrapper.appendChild(toggleBtn);
    }

    if (toggleBtn.dataset.bound) return;
    toggleBtn.dataset.bound = 'true';

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isCurrentlyPassword = input.type === 'password';
      input.type = isCurrentlyPassword ? 'text' : 'password';
      toggleBtn.textContent = isCurrentlyPassword ? 'Hide' : 'Show';
      toggleBtn.setAttribute(
        'aria-label',
        isCurrentlyPassword ? 'Hide password' : 'Show password'
      );
      input.focus();
    });
  });
}

// Initialize Auth Logic
function initAuth() {
  setupPasswordToggles();

  const signupForm = document.getElementById('signup-form') || document.querySelector('form.auth-form#signup-form');
  const loginForm = document.getElementById('login-form') || document.querySelector('form.auth-form#login-form');

  /* ==========================================================
     SIGNUP FORM VALIDATION & SUBMISSION
     ========================================================== */
  if (signupForm) {
    const getNameInput = () => signupForm.querySelector('[name="name"]') || document.getElementById('signup-name');
    const getEmailInput = () => signupForm.querySelector('[name="email"]') || document.getElementById('signup-email');
    const getPassInput = () => signupForm.querySelector('[name="password"]') || document.getElementById('signup-pass');
    const getPassConfirmInput = () =>
      signupForm.querySelector('[name="password_confirm"]') ||
      signupForm.querySelector('[name="confirm_password"]') ||
      document.getElementById('signup-pass2');

    const passInput = getPassInput();
    const passConfirmInput = getPassConfirmInput();

    // Real-time mismatch check on input
    if (passInput && passConfirmInput) {
      passConfirmInput.addEventListener('input', () => {
        clearSignupError();
        clearInputInvalid(passConfirmInput);
        if (passConfirmInput.value && passInput.value !== passConfirmInput.value) {
          showSignupError('Passwords do not match.');
          passConfirmInput.style.borderColor = '#c0392b';
        }
      });

      passInput.addEventListener('input', () => {
        clearSignupError();
        clearInputInvalid(passInput);
        if (passConfirmInput.value && passInput.value !== passConfirmInput.value) {
          showSignupError('Passwords do not match.');
          passConfirmInput.style.borderColor = '#c0392b';
        }
      });
    }

    // Clear field highlight on input
    signupForm.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        clearInputInvalid(input);
        clearSignupError();
      });
    });

    // Form submit pre-flight validation
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearSignupError();

      const nameEl = getNameInput();
      const emailEl = getEmailInput();
      const passEl = getPassInput();
      const passConfirmEl = getPassConfirmInput();

      const name = nameEl?.value.trim() || '';
      const email = emailEl?.value.trim() || '';
      const password = passEl?.value || '';
      const passwordConfirm = passConfirmEl?.value || '';
      const submitBtn = signupForm.querySelector('button[type="submit"]');

      // 1. Validate full name (at least 2 characters)
      if (name.length < 2) {
        showSignupError('Please enter your full name (at least 2 characters).');
        markInputInvalid(nameEl);
        return false; // PREVENTS SUBMISSION
      }

      // 2. Validate email format
      if (!validateEmail(email)) {
        showSignupError('Please enter a valid email address (e.g. name@example.com).');
        markInputInvalid(emailEl);
        return false; // PREVENTS SUBMISSION
      }

      // 3. Confirm that password matches password_confirm
      const matchCheck = validatePasswordMatch(password, passwordConfirm);
      if (!matchCheck.valid) {
        showSignupError(matchCheck.message);
        if (password.length < 6) {
          markInputInvalid(passEl);
        } else {
          markInputInvalid(passConfirmEl);
        }
        return false; // PREVENTS SUBMISSION
      }

      // Pre-flight checks passed -> Dispatch network request to server
      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Creating account...';
        }

        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          showSignupError(data.error || 'Failed to create account.');
          return false;
        }

        // Save session & dispatch sync event
        localStorage.setItem('ks_user', JSON.stringify(data.user));

        const successMsg = document.createElement('div');
        successMsg.className = 'auth-success-msg';
        successMsg.style.color = '#27ae60';
        successMsg.style.marginTop = '10px';
        successMsg.textContent = `✓ Account created! Welcome, ${data.user.name}.`;
        signupForm.appendChild(successMsg);

        window.dispatchEvent(new CustomEvent('ks:auth-change', { detail: data.user }));

        setTimeout(() => {
          if (typeof window.closeAuthModal === 'function') {
            window.closeAuthModal();
          }
          signupForm.reset();
          successMsg.remove();
        }, 900);
      } catch (err) {
        showSignupError('Network error. Please try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
        }
      }
    });
  }

  /* ==========================================================
     LOGIN FORM VALIDATION & SUBMISSION
     ========================================================== */
  if (loginForm) {
    const getEmailInput = () => loginForm.querySelector('[name="email"]') || document.getElementById('login-email');
    const getPassInput = () => loginForm.querySelector('[name="password"]') || document.getElementById('login-pass');

    loginForm.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => clearInputInvalid(input));
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailEl = getEmailInput();
      const passEl = getPassInput();
      const email = emailEl?.value.trim() || '';
      const password = passEl?.value || '';
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      let errorEl = loginForm.querySelector('.login-error');
      if (errorEl) errorEl.remove();

      const showLoginError = (msg) => {
        if (!errorEl) {
          errorEl = document.createElement('div');
          errorEl.className = 'login-error';
          errorEl.style.color = '#b00020';
          errorEl.style.marginTop = '8px';
          errorEl.style.fontSize = '13px';
          loginForm.insertBefore(errorEl, submitBtn);
        }
        errorEl.textContent = msg;
      };

      if (!validateEmail(email)) {
        showLoginError('Please enter a valid email address.');
        markInputInvalid(emailEl);
        return false;
      }

      if (!password) {
        showLoginError('Password is required.');
        markInputInvalid(passEl);
        return false;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Verifying credentials...';
        }

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
          showLoginError(data.error || 'Invalid email or password.');
          return false;
        }

        localStorage.setItem('ks_user', JSON.stringify(data.user));

        const successMsg = document.createElement('div');
        successMsg.className = 'auth-success-msg';
        successMsg.style.color = '#27ae60';
        successMsg.style.marginTop = '10px';
        successMsg.textContent = `✓ Login successful! Welcome back, ${data.user.name}.`;
        loginForm.appendChild(successMsg);

        window.dispatchEvent(new CustomEvent('ks:auth-change', { detail: data.user }));

        setTimeout(() => {
          if (typeof window.closeAuthModal === 'function') {
            window.closeAuthModal();
          }
          loginForm.reset();
          successMsg.remove();
        }, 700);
      } catch (err) {
        showLoginError('Network error. Please try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Login';
        }
      }
    });
  }
}

// Register on DOM load or invoke immediately if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}

// Global exports for tests and browser console
if (typeof window !== 'undefined') {
  window.validateEmail = validateEmail;
  window.validatePasswordMatch = validatePasswordMatch;
  window.setupPasswordToggles = setupPasswordToggles;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateEmail, validatePasswordMatch, setupPasswordToggles, initAuth };
}
