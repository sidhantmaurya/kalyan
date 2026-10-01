/**
 * KalyanSetu Full-Stack Server (Production & Development)
 * Express + SQLite + Vite
 *
 * Features:
 *  - Production static serving (dist/) with cache headers
 *  - Development middleware mode via Vite
 *  - Security headers (nosniff, sameorigin, referrer-policy)
 *  - Graceful SQLite database shutdown
 *  - Authentication API (Signup & Login with bcrypt)
 *  - Form submissions API (Contacts & Newsletter)
 *  - Community stats API
 */

import express from 'express';
import path from 'node:path';
import bcrypt from 'bcryptjs';
// @ts-ignore - db.js is an ES module
import { db, dbOps } from './db.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Basic Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // 2. Parse incoming JSON payloads (max 1MB)
  app.use(express.json({ limit: '1mb' }));

  // 3. API Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'KalyanSetu Backend',
      environment: isProduction ? 'production' : 'development'
    });
  });

  // SIGNUP ROUTE: Creates a new user with bcrypt password hashing
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(String(email).trim().toLowerCase())) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      const existingUser = dbOps.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const newUser = dbOps.createUser(name, email, passwordHash);

      return res.status(201).json({
        message: 'Account created successfully!',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      });
    } catch (err) {
      console.error('Signup error:', err);
      return res.status(500).json({ error: 'An error occurred while creating your account. Please try again.' });
    }
  });

  // LOGIN ROUTE: Validates credentials against hashed passwords in SQLite
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const user = dbOps.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      return res.json({
        message: 'Login successful!',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'An error occurred during login. Please try again.' });
    }
  });

  // CONTACT ROUTE: Persists messages to SQLite contacts table
  app.post('/api/contact', (req, res) => {
    try {
      const { name, email, phone, reason, message } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Please provide your full name.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(String(email).trim().toLowerCase())) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }

      if (!reason || typeof reason !== 'string') {
        return res.status(400).json({ error: 'Please select a reason for contacting us.' });
      }

      if (!message || typeof message !== 'string' || message.trim().length < 10) {
        return res.status(400).json({ error: 'Please enter a message with at least 10 characters.' });
      }

      dbOps.saveContact(name, email, phone, reason, message);

      return res.status(201).json({
        message: 'Thank you! Your message has been saved and forwarded to Divyansh.'
      });
    } catch (err) {
      console.error('Contact error:', err);
      return res.status(500).json({ error: 'Could not save message. Please try again.' });
    }
  });

  // NEWSLETTER ROUTE: Persists subscriber emails to SQLite subscribers table
  app.post('/api/newsletter', (req, res) => {
    try {
      const { email } = req.body;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(String(email).trim().toLowerCase())) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }

      dbOps.saveSubscriber(email);

      return res.status(201).json({
        message: 'Thank you for subscribing to KalyanSetu updates!'
      });
    } catch (err) {
      console.error('Newsletter error:', err);
      return res.status(500).json({ error: 'Could not subscribe. Please try again.' });
    }
  });

  // STATS ROUTE: Live database counts
  app.get('/api/stats', (_req, res) => {
    try {
      const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const contactCountRow = db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number };
      const subCountRow = db.prepare('SELECT COUNT(*) as count FROM subscribers').get() as { count: number };

      return res.json({
        supporters: userCountRow.count,
        messagesReceived: contactCountRow.count,
        newsletterSubscribers: subCountRow.count
      });
    } catch (err) {
      console.error('Stats error:', err);
      return res.status(500).json({ error: 'Failed to retrieve stats.' });
    }
  });

  // 4. Static Frontend Delivery
  if (isProduction) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1d' }));

    // Fallback for HTML routing
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  // 5. Start HTTP Listener
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ KalyanSetu Server running on port ${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  });

  // 6. Graceful Shutdown (safely closes SQLite transactions)
  const shutdown = () => {
    console.log('\nClosing KalyanSetu server & SQLite database...');
    server.close(() => {
      try {
        db.close();
        console.log('✓ SQLite database safely closed.');
      } catch (e) {
        console.error('Error closing database:', e);
      }
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();
