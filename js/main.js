/**
 * Main frontend behaviors & interactivity for KalyanSetu
 * - Navbar scroll state & active links
 * - Mobile drawer open/close
 * - Reveal on scroll (IntersectionObserver)
 * - Smooth anchor scrolling
 * - Modal management (open on demand, accessible ESC / click outside)
 * - Real backend connection for Login & Signup (fetch -> /api/auth/*)
 * - User session persistence (localStorage) & dynamic auth UI
 * - Real backend connection for Contact Messages (fetch -> /api/contact)
 * - Real backend connection for Newsletter Subscriptions (fetch -> /api/newsletter)
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ==========================================================
     1. Navbar & Mobile Drawer
     ========================================================== */
  const nav = document.querySelector('.navbar');
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const drawer = document.querySelector('.mobile-drawer');
  const toggle = document.querySelector('.menu-toggle');
  const closeButton = document.querySelector('.close-menu');

  const openDrawer = () => drawer?.classList.add('open');
  const closeDrawer = () => drawer?.classList.remove('open');

  if (toggle) toggle.addEventListener('click', openDrawer);
  if (closeButton) closeButton.addEventListener('click', closeDrawer);

  drawer?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeDrawer));

  /* ==========================================================
     2. Scroll Reveals & Smooth Scrolling
     ========================================================== */
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.reveal, .stagger').forEach((el) => revealObserver.observe(el));

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  /* ==========================================================
     3. Helper Functions for Form Validation
     ========================================================== */
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim().toLowerCase());
  };

  const showInputError = (inputEl, message) => {
    inputEl.style.borderColor = '#c0392b';
    let feedback = inputEl.nextElementSibling;
    if (!feedback || !feedback.classList.contains('input-feedback')) {
      feedback = document.createElement('div');
      feedback.className = 'input-feedback';
      feedback.style.color = '#b00020';
      feedback.style.fontSize = '12px';
      feedback.style.marginTop = '-12px';
      feedback.style.marginBottom = '12px';
      feedback.style.textAlign = 'left';
      inputEl.parentNode.insertBefore(feedback, inputEl.nextSibling);
    }
    feedback.textContent = message;
  };

  const clearInputError = (inputEl) => {
    inputEl.style.borderColor = 'rgba(201, 162, 39, 0.65)';
    const feedback = inputEl.nextElementSibling;
    if (feedback && feedback.classList.contains('input-feedback')) {
      feedback.remove();
    }
  };

  /* ==========================================================
     4. Auth State & Dynamic Navbar Integration
     ========================================================== */
  const getCurrentUser = () => {
    try {
      const raw = localStorage.getItem('ks_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const updateAuthUI = () => {
    const user = getCurrentUser();
    const navLinks = document.querySelector('.nav-links');
    const drawer = document.querySelector('.mobile-drawer');

    document.querySelectorAll('.auth-nav-action').forEach((el) => el.remove());

    if (user) {
      if (navLinks) {
        const userBadge = document.createElement('div');
        userBadge.className = 'auth-nav-action';
        userBadge.style.display = 'inline-flex';
        userBadge.style.alignItems = 'center';
        userBadge.style.gap = '10px';

        const greeting = document.createElement('span');
        greeting.style.color = 'var(--gold)';
        greeting.style.fontWeight = '700';
        greeting.style.fontSize = '14px';
        greeting.textContent = `Hi, ${user.name.split(' ')[0]}`;

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-ghost';
        logoutBtn.style.padding = '6px 14px';
        logoutBtn.style.minHeight = '34px';
        logoutBtn.style.fontSize = '12px';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('ks_user');
          updateAuthUI();
        });

        userBadge.appendChild(greeting);
        userBadge.appendChild(logoutBtn);
        navLinks.appendChild(userBadge);
      }

      if (drawer) {
        const drawerUser = document.createElement('div');
        drawerUser.className = 'auth-nav-action';
        drawerUser.style.padding = '14px 4px';
        drawerUser.style.borderBottom = '1px solid rgba(201, 162, 39, 0.35)';

        drawerUser.innerHTML = `
          <div style="font-weight:700;color:var(--navy);font-size:15px">Signed in as <strong>${user.name}</strong></div>
          <div style="font-size:13px;color:var(--muted)">${user.email}</div>
          <button class="btn btn-ghost" style="width:100%;margin-top:10px;min-height:38px;font-size:13px">Logout</button>
        `;

        drawerUser.querySelector('button')?.addEventListener('click', () => {
          localStorage.removeItem('ks_user');
          updateAuthUI();
          closeDrawer();
        });

        drawer.insertBefore(drawerUser, drawer.firstChild);
      }
    } else {
      if (navLinks) {
        const loginLink = document.createElement('a');
        loginLink.href = '#';
        loginLink.className = 'auth-nav-action';
        loginLink.textContent = 'Sign In';
        loginLink.addEventListener('click', (e) => {
          e.preventDefault();
          window.openAuthModal(false);
        });
        navLinks.appendChild(loginLink);
      }

      if (drawer) {
        const drawerLogin = document.createElement('a');
        drawerLogin.href = '#';
        drawerLogin.className = 'auth-nav-action';
        drawerLogin.textContent = 'Sign In / Register';
        drawerLogin.addEventListener('click', (e) => {
          e.preventDefault();
          closeDrawer();
          window.openAuthModal(false);
        });
        drawer.insertBefore(drawerLogin, drawer.firstChild);
      }
    }
  };

  updateAuthUI();

  /* ==========================================================
     5. Login & Signup Modal System (with Backend API Connection)
     ========================================================== */
  const loginPopup = document.getElementById('login-popup');
  if (loginPopup) {
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const formLogin = document.getElementById('login-form');
    const formSignup = document.getElementById('signup-form');
    const loginClose = document.getElementById('login-close');
    const loginGuest = document.getElementById('login-guest');

    window.openAuthModal = (signupMode = false) => {
      loginPopup.classList.add('open');
      document.body.classList.add('login-lock');
      showTab(signupMode);
      clearModalMessages();
      const firstInput = signupMode ? document.getElementById('signup-name') : document.getElementById('login-email');
      firstInput?.focus();
    };

    window.closeAuthModal = () => {
      loginPopup.classList.remove('open');
      document.body.classList.remove('login-lock');
      clearModalMessages();
    };

    const showTab = (signup = false) => {
      if (tabLogin && tabSignup && formLogin && formSignup) {
        tabLogin.classList.toggle('active', !signup);
        tabSignup.classList.toggle('active', signup);
        formLogin.hidden = signup;
        formSignup.hidden = !signup;
        clearModalMessages();
      }
    };

    const setFormMessage = (form, text, isError = true) => {
      let msgEl = form.querySelector('.auth-message');
      if (!msgEl) {
        msgEl = document.createElement('div');
        msgEl.className = 'auth-message';
        msgEl.style.padding = '10px 12px';
        msgEl.style.borderRadius = '6px';
        msgEl.style.fontSize = '13px';
        msgEl.style.marginBottom = '14px';
        msgEl.style.textAlign = 'left';
        form.insertBefore(msgEl, form.firstChild);
      }
      msgEl.style.backgroundColor = isError ? 'rgba(192, 57, 43, 0.12)' : 'rgba(111, 141, 78, 0.15)';
      msgEl.style.color = isError ? '#b00020' : '#27ae60';
      msgEl.style.border = `1px solid ${isError ? 'rgba(192, 57, 43, 0.4)' : 'rgba(111, 141, 78, 0.5)'}`;
      msgEl.textContent = text;
    };

    const clearModalMessages = () => {
      document.querySelectorAll('.auth-message').forEach((el) => el.remove());
      document.querySelectorAll('.input-feedback').forEach((el) => el.remove());
      document.querySelectorAll('.login-card input').forEach((inp) => {
        inp.style.borderColor = 'rgba(201, 162, 39, 0.65)';
      });
    };

    tabLogin?.addEventListener('click', () => showTab(false));
    tabSignup?.addEventListener('click', () => showTab(true));

    if (!getCurrentUser() && !sessionStorage.getItem('ks-login-shown')) {
      window.openAuthModal(false);
      sessionStorage.setItem('ks-login-shown', '1');
    }

    loginClose?.addEventListener('click', window.closeAuthModal);
    loginGuest?.addEventListener('click', window.closeAuthModal);

    loginPopup.addEventListener('click', (ev) => {
      if (ev.target === loginPopup) window.closeAuthModal();
    });

    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && loginPopup.classList.contains('open')) {
        window.closeAuthModal();
      }
    });

    formLogin?.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => clearInputError(input));
    });
    formSignup?.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => clearInputError(input));
    });

    formLogin?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      clearModalMessages();

      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-pass');
      const submitBtn = formLogin.querySelector('button[type="submit"]');

      let valid = true;
      if (!isValidEmail(emailInput.value)) {
        showInputError(emailInput, 'Please enter a valid email address.');
        valid = false;
      }
      if (!passInput.value.trim()) {
        showInputError(passInput, 'Password is required.');
        valid = false;
      }
      if (!valid) return;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailInput.value.trim(),
            password: passInput.value
          })
        });

        const data = await response.json();

        if (!response.ok) {
          setFormMessage(formLogin, data.error || 'Login failed. Please check your credentials.', true);
          return;
        }

        localStorage.setItem('ks_user', JSON.stringify(data.user));
        setFormMessage(formLogin, `Welcome back, ${data.user.name}!`, false);
        updateAuthUI();

        setTimeout(() => {
          window.closeAuthModal();
          formLogin.reset();
        }, 800);
      } catch (err) {
        setFormMessage(formLogin, 'Network error. Please check your internet connection.', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
      }
    });

    formSignup?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      clearModalMessages();

      const nameInput = document.getElementById('signup-name');
      const emailInput = document.getElementById('signup-email');
      const passInput = document.getElementById('signup-pass');
      const pass2Input = document.getElementById('signup-pass2');
      const submitBtn = formSignup.querySelector('button[type="submit"]');

      let valid = true;
      if (nameInput.value.trim().length < 2) {
        showInputError(nameInput, 'Please enter your full name (at least 2 letters).');
        valid = false;
      }
      if (!isValidEmail(emailInput.value)) {
        showInputError(emailInput, 'Please enter a valid email address.');
        valid = false;
      }
      if (passInput.value.length < 6) {
        showInputError(passInput, 'Password must be at least 6 characters.');
        valid = false;
      }
      if (passInput.value !== pass2Input.value) {
        showInputError(pass2Input, 'Passwords do not match. Please verify.');
        valid = false;
      }
      if (!valid) return;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';

        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            password: passInput.value
          })
        });

        const data = await response.json();

        if (!response.ok) {
          setFormMessage(formSignup, data.error || 'Failed to create account.', true);
          return;
        }

        localStorage.setItem('ks_user', JSON.stringify(data.user));
        setFormMessage(formSignup, `Account created! Welcome to KalyanSetu, ${data.user.name}.`, false);
        updateAuthUI();

        setTimeout(() => {
          window.closeAuthModal();
          formSignup.reset();
        }, 1000);
      } catch (err) {
        setFormMessage(formSignup, 'Network error. Please try again.', true);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }
    });
  }

  /* ==========================================================
     6. Contact Form (Direct Backend SQLite Integration)
     ========================================================== */
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.querySelectorAll('input, select, textarea').forEach((field) => {
      field.addEventListener('input', () => clearInputError(field));
    });

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name');
      const email = document.getElementById('email');
      const phone = document.getElementById('phone');
      const reason = document.getElementById('reason');
      const message = document.getElementById('message');
      const status = document.querySelector('.form-status');
      const submitBtn = contactForm.querySelector('button[type="submit"]');

      let valid = true;
      if (!name || name.value.trim().length < 2) {
        showInputError(name, 'Please provide your full name.');
        valid = false;
      }
      if (!email || !isValidEmail(email.value)) {
        showInputError(email, 'Please provide a valid email address.');
        valid = false;
      }
      if (!reason || !reason.value) {
        showInputError(reason, 'Please select a reason for contact.');
        valid = false;
      }
      if (!message || message.value.trim().length < 10) {
        showInputError(message, 'Please enter a message with at least 10 characters.');
        valid = false;
      }
      if (!valid) return;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending Message...';

        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.value.trim(),
            email: email.value.trim(),
            phone: phone ? phone.value.trim() : '',
            reason: reason.value,
            message: message.value.trim()
          })
        });

        const data = await res.json();

        if (!res.ok) {
          status.style.color = '#b00020';
          status.textContent = data.error || 'Failed to send message. Please try again.';
          return;
        }

        status.style.color = '#6f8d4e';
        status.textContent = '✓ ' + (data.message || 'Thank you! Your message has been received.');
        contactForm.reset();
      } catch (err) {
        status.style.color = '#b00020';
        status.textContent = 'Network error. Please try again.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Message →';
      }
    });
  }

  /* ==========================================================
     7. Footer Newsletter (Direct Backend SQLite Integration)
     ========================================================== */
  document.querySelectorAll('.footer-links form').forEach((form) => {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const submitBtn = form.querySelector('button[type="submit"]');

      if (!input || !isValidEmail(input.value)) {
        return;
      }

      try {
        if (submitBtn) submitBtn.disabled = true;

        const res = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: input.value.trim() })
        });

        const data = await res.json();
        const parent = form.parentElement;
        const msg = document.createElement('div');
        msg.style.color = 'var(--gold-light)';
        msg.style.fontSize = '13px';
        msg.style.marginTop = '8px';
        msg.textContent = '✓ ' + (data.message || 'Thank you for subscribing to KalyanSetu updates!');
        form.style.display = 'none';
        parent.appendChild(msg);
      } catch (err) {
        console.error('Newsletter error:', err);
      }
    });
  });
});
