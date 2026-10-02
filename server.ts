/**
 * KalyanSetu Full-Stack Server (Production & Development)
 * Express + SQLite + Vite
 *
 * Production Features:
 *  - CORS configuration
 *  - HTTPS enforcement in production
 *  - Full security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)
 *  - In-memory API Rate Limiter
 *  - Input sanitization (XSS mitigation)
 *  - Enhanced Health check with metrics
 *  - Production static caching headers
 *  - Graceful SQLite database shutdown
 */

import express from 'express';
import path from 'node:path';
import bcrypt from 'bcryptjs';
// @ts-ignore - db.js is an ES module
import { db, dbOps } from './db.js';

// Sanitizes user strings to prevent script injection / XSS
function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // strip opening/closing brackets
    .trim();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. HTTPS Redirect Middleware (For Production on Cloud Run, Render, VPS)
  if (isProduction) {
    app.use((req, res, next) => {
      const proto = req.headers['x-forwarded-proto'];
      if (proto && proto !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
      }
      next();
    });
  }

  // 2. CORS Middleware
  app.use((req, res, next) => {
    const allowedOrigin = process.env.CORS_ORIGIN || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // 3. Security Headers (CSP, HSTS, Clickjacking, MIME-sniffing)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https://images.unsplash.com https://*.unsplash.com; " +
      "connect-src 'self';"
    );

    if (isProduction) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });

  // 4. In-Memory API Rate Limiter
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 mins
  const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

  function apiRateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const now = Date.now();
    const clientData = rateLimitMap.get(clientIp);

    if (!clientData || now > clientData.resetTime) {
      rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }

    clientData.count += 1;
    if (clientData.count > RATE_LIMIT_MAX) {
      const retryAfterSec = Math.ceil((clientData.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please slow down and try again later.',
        retryAfterSeconds: retryAfterSec
      });
    }

    next();
  }

  // Apply rate limiter specifically to API routes
  app.use('/api', apiRateLimiter);

  // 5. Parse incoming JSON payloads (max 1MB)
  app.use(express.json({ limit: '1mb' }));

  // ==========================================================
  // 6. API Endpoints
  // ==========================================================

  // HEALTH CHECK: Returns uptime, memory, and database status
  app.get('/api/health', (_req, res) => {
    let dbHealthy = false;
    try {
      db.prepare('SELECT 1').get();
      dbHealthy = true;
    } catch {
      dbHealthy = false;
    }

    res.json({
      status: dbHealthy ? 'healthy' : 'degraded',
      service: 'KalyanSetu Backend',
      environment: isProduction ? 'production' : 'development',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    });
  });

  // SIGNUP ROUTE: Creates a new user with bcrypt password hashing
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const name = sanitizeText(req.body.name);
      const email = sanitizeText(req.body.email).toLowerCase();
      const { password } = req.body;

      if (!name || name.length < 2) {
        return res.status(400).json({ success: false, error: 'Full name must be at least 2 characters.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }

      const existingUser = dbOps.findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists. Please log in.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const newUser = dbOps.createUser(name, email, passwordHash);

      return res.status(201).json({
        success: true,
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
      return res.status(500).json({ success: false, error: 'An error occurred while creating your account. Please try again.' });
    }
  });

  // LOGIN ROUTE: Validates credentials against hashed passwords in SQLite
  app.post('/api/auth/login', async (req, res) => {
    try {
      const email = sanitizeText(req.body.email).toLowerCase();
      const { password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }

      const user = dbOps.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      return res.json({
        success: true,
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
      return res.status(500).json({ success: false, error: 'An error occurred during login. Please try again.' });
    }
  });

  // CONTACT ROUTE: Persists messages to SQLite contacts table
  app.post('/api/contact', (req, res) => {
    try {
      const name = sanitizeText(req.body.name);
      const email = sanitizeText(req.body.email).toLowerCase();
      const phone = sanitizeText(req.body.phone);
      const reason = sanitizeText(req.body.reason);
      const message = sanitizeText(req.body.message);

      if (!name || name.length < 2) {
        return res.status(400).json({ success: false, error: 'Please provide your full name.' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
      }

      if (!reason) {
        return res.status(400).json({ success: false, error: 'Please select a reason for contacting us.' });
      }

      if (!message || message.length < 10) {
        return res.status(400).json({ success: false, error: 'Please enter a message with at least 10 characters.' });
      }

      dbOps.saveContact(name, email, phone, reason, message);

      return res.status(201).json({
        success: true,
        message: 'Thank you! Your message has been saved and forwarded to Divyansh.'
      });
    } catch (err) {
      console.error('Contact error:', err);
      return res.status(500).json({ success: false, error: 'Could not save message. Please try again.' });
    }
  });

  // NEWSLETTER ROUTE: Persists subscriber emails to SQLite subscribers table
  app.post('/api/newsletter', (req, res) => {
    try {
      const email = sanitizeText(req.body.email).toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!email || !emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: 'Please provide a valid email address.' });
      }

      dbOps.saveSubscriber(email);

      return res.status(201).json({
        success: true,
        message: 'Thank you for subscribing to KalyanSetu updates!'
      });
    } catch (err) {
      console.error('Newsletter error:', err);
      return res.status(500).json({ success: false, error: 'Could not subscribe. Please try again.' });
    }
  });

  // STATS ROUTE: Live database counts
  app.get('/api/stats', (_req, res) => {
    try {
      const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const contactCountRow = db.prepare('SELECT COUNT(*) as count FROM contacts').get() as { count: number };
      const subCountRow = db.prepare('SELECT COUNT(*) as count FROM subscribers').get() as { count: number };

      return res.json({
        success: true,
        supporters: userCountRow.count,
        messagesReceived: contactCountRow.count,
        newsletterSubscribers: subCountRow.count
      });
    } catch (err) {
      console.error('Stats error:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve stats.' });
    }
  });

  // 7. Static Frontend Delivery
  if (isProduction) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1d', etag: true }));

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

  // 8. Global 404 & Error Handling for API routes
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ success: false, error: 'API endpoint not found.' });
  });

  // 9. Start HTTP Listener
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ KalyanSetu Server running on port ${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
    console.log(`  - Rate Limiting: Active (${RATE_LIMIT_MAX} req / ${RATE_LIMIT_WINDOW_MS / 1000 / 60}m)`);
    console.log(`  - Security Headers: CSP, HSTS, Sniff-Protection active`);
  });

  // 10. Graceful Shutdown (safely closes SQLite transactions)
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
