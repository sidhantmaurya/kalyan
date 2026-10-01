/**
 * KalyanSetu - Main Frontend Script & Authentication Logic
 *
 * Core Features:
 *  1. Navigation scroll styling & mobile drawer toggling
 *  2. Scroll animations (IntersectionObserver)
 *  3. Complete Login & Authentication Logic:
 *     - Permanent "Login" button in navbar & mobile menu
 *     - Modal state control (open, close on ESC / backdrop click)
 *     - Tab switching between Login and Sign Up
 *     - Client-side validation (email format, non-empty password)
 *     - API integration (POST /api/auth/login) with loading indicator
 *     - In-modal error banners for wrong credentials
 *     - Session persistence in localStorage ('ks_user')
 *     - Dynamic header badge ("Hi, [Name]") & one-click Logout
 *     - Global testing helpers (window.ksAuth)
 *  4. Signup API integration (POST /api/auth/signup)
 *  5. Contact form submission to SQLite (POST /api/contact)
 *  6. Newsletter subscription to SQLite (POST /api/newsletter)
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
     2. Scroll Reveals & Smooth Anchor Scrolling
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
     3. Helper Functions & Input Validation
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
     4. Core Authentication Logic (Login, Session, UI Sync)
     ========================================================== */
  const loginPopup = document.getElementById('login-popup');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const formLogin = document.getElementById('login-form');
  const formSignup = document.getElementById('signup-form');
  const loginClose = document.getElementById('login-close');
  const loginGuest = document.getElementById('login-guest');

  // Retrieve current active user session
  const getCurrentUser = () => {
    try {
      const raw = localStorage.getItem('ks_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Switch between Login and Signup tabs
  const setAuthTab = (isSignup = false) => {
    if (tabLogin && tabSignup && formLogin && formSignup) {
      tabLogin.classList.toggle('active', !isSignup);
      tabSignup.classList.toggle('active', isSignup);
      formLogin.hidden = isSignup;
      formSignup.hidden = !isSignup;
      clearModalAlerts();
    }
  };

  // Open the Login/Signup popup modal
  window.openAuthModal = (signupMode = false) => {
    if (!loginPopup) return;
    loginPopup.classList.add('open');
    document.body.classList.add('login-lock');
    setAuthTab(signupMode);
    clearModalAlerts();
    setTimeout(() => {
      const inputToFocus = signupMode
        ? document.getElementById('signup-name')
        : document.getElementById('login-email');
      inputToFocus?.focus();
    }, 50);
  };

  // Close the popup modal
  window.closeAuthModal = () => {
    if (!loginPopup) return;
    loginPopup.classList.remove('open');
    document.body.classList.remove('login-lock');
    clearModalAlerts();
  };

  // Show status banner inside modal (green for success, red for errors)
  const showModalBanner = (form, message, isError = true) => {
    let banner = form.querySelector('.auth-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'auth-banner';
      banner.style.padding = '10px 14px';
      banner.style.borderRadius = '6px';
      banner.style.fontSize = '13px';
      banner.style.marginBottom = '14px';
      banner.style.textAlign = 'left';
      banner.style.lineHeight = '1.4';
      form.insertBefore(banner, form.firstChild);
    }
    banner.style.backgroundColor = isError ? 'rgba(192, 57, 43, 0.12)' : 'rgba(111, 141, 78, 0.15)';
    banner.style.color = isError ? '#b00020' : '#27ae60';
    banner.style.border = `1px solid ${isError ? 'rgba(192, 57, 43, 0.4)' : 'rgba(111, 141, 78, 0.5)'}`;
    banner.textContent = message;
  };

  const clearModalAlerts = () => {
    document.querySelectorAll('.auth-banner').forEach((el) => el.remove());
    document.querySelectorAll('.input-feedback').forEach((el) => el.remove());
    document.querySelectorAll('.login-card input').forEach((inp) => {
      inp.style.borderColor = 'rgba(201, 162, 39, 0.65)';
    });
  };

  // Render navigation buttons (Login button vs Logged-In User badge)
  const updateAuthUI = () => {
    const user = getCurrentUser();
    const navInner = document.querySelector('.nav-inner');
    const drawer = document.querySelector('.mobile-drawer');

    // Remove old auth badges
    document.querySelectorAll('.auth-header-slot').forEach((el) => el.remove());

    if (user) {
      // 1. DESKTOP HEADER (Logged In State)
      if (navInner) {
        const slot = document.createElement('div');
        slot.className = 'auth-header-slot';
        slot.style.display = 'inline-flex';
        slot.style.alignItems = 'center';
        slot.style.gap = '8px';
        slot.style.marginLeft = 'auto';

        const greeting = document.createElement('span');
        greeting.style.color = 'var(--gold)';
        greeting.style.fontWeight = '700';
        greeting.style.fontSize = '14px';
        greeting.textContent = `👤 Hi, ${user.name.split(' ')[0]}`;

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-ghost';
        logoutBtn.style.padding = '6px 12px';
        logoutBtn.style.minHeight = '32px';
        logoutBtn.style.fontSize = '12px';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('ks_user');
          updateAuthUI();
        });

        slot.appendChild(greeting);
        slot.appendChild(logoutBtn);

        const navCta = navInner.querySelector('.nav-cta');
        if (navCta) {
          navInner.insertBefore(slot, navCta);
        } else {
          navInner.appendChild(slot);
        }
      }

      // 2. MOBILE DRAWER (Logged In State)
      if (drawer) {
        const drawerSlot = document.createElement('div');
        drawerSlot.className = 'auth-header-slot';
        drawerSlot.style.padding = '14px 4px';
        drawerSlot.style.marginBottom = '12px';
        drawerSlot.style.borderBottom = '1px solid rgba(201, 162, 39, 0.35)';

        drawerSlot.innerHTML = `
          <div style="font-weight:700;color:var(--navy);font-size:15px">Logged in: <strong>${user.name}</strong></div>
          <div style="font-size:13px;color:var(--muted)">${user.email}</div>
          <button class="btn btn-ghost" style="width:100%;margin-top:10px;min-height:36px;font-size:13px">Logout</button>
        `;

        drawerSlot.querySelector('button')?.addEventListener('click', () => {
          localStorage.removeItem('ks_user');
          updateAuthUI();
          closeDrawer();
        });

        drawer.insertBefore(drawerSlot, drawer.firstChild);
      }
    } else {
      // 1. DESKTOP HEADER (Logged Out: Show Login Button)
      if (navInner) {
        const slot = document.createElement('div');
        slot.className = 'auth-header-slot';
        slot.style.marginLeft = 'auto';

        const loginBtn = document.createElement('button');
        loginBtn.className = 'btn btn-ghost';
        loginBtn.style.padding = '7px 16px';
        loginBtn.style.minHeight = '36px';
        loginBtn.style.fontSize = '13px';
        loginBtn.textContent = 'Login';
        loginBtn.addEventListener('click', () => window.openAuthModal(false));

        slot.appendChild(loginBtn);

        const navCta = navInner.querySelector('.nav-cta');
        if (navCta) {
          navInner.insertBefore(slot, navCta);
        } else {
          navInner.appendChild(slot);
        }
      }

      // 2. MOBILE DRAWER (Logged Out: Show Login / Sign Up Button)
      if (drawer) {
        const drawerSlot = document.createElement('div');
        drawerSlot.className = 'auth-header-slot';
        drawerSlot.style.paddingBottom = '12px';
        drawerSlot.style.marginBottom = '12px';
        drawerSlot.style.borderBottom = '1px solid rgba(201, 162, 39, 0.35)';

        const drawerLoginBtn = document.createElement('button');
        drawerLoginBtn.className = 'btn btn-ghost';
        drawerLoginBtn.style.width = '100%';
        drawerLoginBtn.textContent = 'Sign In / Register';
        drawerLoginBtn.addEventListener('click', () => {
          closeDrawer();
          window.openAuthModal(false);
        });

        drawerSlot.appendChild(drawerLoginBtn);
        drawer.insertBefore(drawerSlot, drawer.firstChild);
      }
    }
  };

  // Mount listeners on auth modal elements
  if (loginPopup) {
    tabLogin?.addEventListener('click', () => setAuthTab(false));
    tabSignup?.addEventListener('click', () => setAuthTab(true));

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

    // Form submissions for Login & Signup are handled with client-side validation in js/auth.js
  }

  // Initialize Auth UI state on page load
  updateAuthUI();
  window.addEventListener('ks:auth-change', updateAuthUI);

  // Expose global helper for browser console testing
  window.ksAuth = {
    getUser: getCurrentUser,
    openLogin: () => window.openAuthModal(false),
    openSignup: () => window.openAuthModal(true),
    logout: () => {
      localStorage.removeItem('ks_user');
      updateAuthUI();
      console.log('✓ Successfully logged out.');
    }
  };

  /* ==========================================================
     5. Contact Form Submission (SQLite Integration)
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
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Sending Message...';
        }

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
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message →';
        }
      }
    });
  }

  /* ==========================================================
     6. Footer Newsletter Submission (SQLite Integration)
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
