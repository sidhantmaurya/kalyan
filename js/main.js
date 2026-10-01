/**
 * Main frontend behaviors & interactivity
 * - Navbar scroll state & active links
 * - Mobile drawer open/close
 * - Reveal on scroll (IntersectionObserver)
 * - Smooth anchor scrolling
 * - Modal management (open on demand, accessible ESC / click outside)
 * - Interactive client-side validation (Login, Signup, Contact, Newsletter)
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
     4. Login & Signup Modal System
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
      const firstInput = signupMode ? document.getElementById('signup-name') : document.getElementById('login-email');
      firstInput?.focus();
    };

    window.closeAuthModal = () => {
      loginPopup.classList.remove('open');
      document.body.classList.remove('login-lock');
    };

    const showTab = (signup = false) => {
      if (tabLogin && tabSignup && formLogin && formSignup) {
        tabLogin.classList.toggle('active', !signup);
        tabSignup.classList.toggle('active', signup);
        formLogin.hidden = signup;
        formSignup.hidden = !signup;
      }
    };

    tabLogin?.addEventListener('click', () => showTab(false));
    tabSignup?.addEventListener('click', () => showTab(true));

    // Show popup once per browser session automatically
    if (!sessionStorage.getItem('ks-login-shown')) {
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

    // Real-time error clearing on input
    formLogin?.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => clearInputError(input));
    });
    formSignup?.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => clearInputError(input));
    });

    // Login validation
    formLogin?.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const emailInput = document.getElementById('login-email');
      const passInput = document.getElementById('login-pass');
      let valid = true;

      if (!isValidEmail(emailInput.value)) {
        showInputError(emailInput, 'Please enter a valid email address.');
        valid = false;
      }

      if (!passInput.value.trim()) {
        showInputError(passInput, 'Password is required.');
        valid = false;
      }

      if (valid) {
        // Ready for backend submission in Step 5
        console.log('Login validation passed for:', emailInput.value);
        window.closeAuthModal();
      }
    });

    // Signup validation
    formSignup?.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const nameInput = document.getElementById('signup-name');
      const emailInput = document.getElementById('signup-email');
      const passInput = document.getElementById('signup-pass');
      const pass2Input = document.getElementById('signup-pass2');
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

      if (valid) {
        // Ready for backend submission in Step 5
        console.log('Signup validation passed for:', nameInput.value, emailInput.value);
        window.closeAuthModal();
      }
    });
  }

  /* ==========================================================
     5. Contact Form Validation
     ========================================================== */
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.querySelectorAll('input, select, textarea').forEach((field) => {
      field.addEventListener('input', () => clearInputError(field));
    });

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('name');
      const email = document.getElementById('email');
      const reason = document.getElementById('reason');
      const message = document.getElementById('message');
      const status = document.querySelector('.form-status');
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

      if (valid && status) {
        status.style.color = '#6f8d4e';
        status.textContent = '✓ Thank you! Your message has been received. Divyansh will get back to you within 48 hours.';
        contactForm.reset();
      }
    });
  }

  /* ==========================================================
     6. Footer Newsletter Subscription
     ========================================================== */
  document.querySelectorAll('.footer-links form').forEach((form) => {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (input && isValidEmail(input.value)) {
        const parent = form.parentElement;
        const msg = document.createElement('div');
        msg.style.color = 'var(--gold-light)';
        msg.style.fontSize = '13px';
        msg.style.marginTop = '8px';
        msg.textContent = '✓ Thank you for subscribing to KalyanSetu updates!';
        form.style.display = 'none';
        parent.appendChild(msg);
      }
    });
  });
});
