/**
 * KalyanSetu Backend Server
 * Express + SQLite + Vite Middlewares
 * Provides:
 *  - POST /api/auth/signup (with bcrypt password hashing)
 *  - POST /api/auth/login (verifies hashed password)
 *  - GET  /api/health (system status)
 *  - Serves static pages and assets through Vite middleware
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
// @ts-ignore - db.js is an ES module
import { dbOps } from './db.js';

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

      // 1. Validate name
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      }

      // 2. Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(String(email).trim().toLowerCase())) {
        return res.status(400).json({ error: 'Please provide a valid email address.' });
      }

      // 3. Validate password strength
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      // 4. Check if user already exists
      const existingUser = dbOps.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists. Please log in.' });
      }

      // 5. Hash password with bcrypt (10 salt rounds)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // 6. Save user into SQLite database
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

      // 1. Look up user by email
      const user = dbOps.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // 2. Compare entered password with stored bcrypt hash
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
