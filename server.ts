/**
 * KalyanSetu Backend Server
 * Express + SQLite + Vite Middlewares
 * Provides:
 *  - POST /api/auth/signup (with bcrypt password hashing)
 *  - POST /api/auth/login (verifies hashed password)
 *  - POST /api/contact (stores inquiries in SQLite database)
 *  - POST /api/newsletter (stores subscriber emails in SQLite database)
 *  - GET  /api/stats (community numbers & activity summary)
 *  - GET  /api/health (system status)
 *  - Serves static pages and assets through Vite middleware
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
// @ts-ignore - db.js is an ES module
import { db, dbOps } from './db.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Parse incoming JSON request bodies
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'KalyanSetu Backend' });
  });

  // SIGNUP ROUTE: Creates a new user with hashed password
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

  // LOGIN ROUTE: Verifies credentials against hashed password in SQLite
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

  // CONTACT ROUTE: Persists message into SQLite contacts table
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

  // NEWSLETTER ROUTE: Persists subscriber into SQLite subscribers table
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

  // STATS ROUTE: Community counts
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

  // Mount Vite middlewares so frontend HTML, CSS & JS are served on port 3000
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ KalyanSetu Server running at http://localhost:${PORT}`);
  });
}

startServer();
