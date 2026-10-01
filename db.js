/**
 * Database Module for KalyanSetu
 * Uses Node.js 22 built-in SQLite engine (node:sqlite)
 * Automatically initializes tables on startup:
 *  - users: user accounts with hashed passwords
 *  - contacts: messages sent via the contact form
 *  - subscribers: emails subscribed to newsletter updates
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

// Database file stored locally in project root
const dbPath = path.resolve(process.cwd(), 'kalyansetu.db');
export const db = new DatabaseSync(dbPath);

// Create required tables if they don't already exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'supporter',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    reason TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✓ SQLite database initialized successfully at:', dbPath);

/**
 * Helper Database Operations
 */
export const dbOps = {
  // Find a user by email
  findUserByEmail(email) {
    const query = db.prepare('SELECT * FROM users WHERE email = ?');
    return query.get(email.trim().toLowerCase());
  },

  // Find a user by ID (excludes password hash for safety)
  findUserById(id) {
    const query = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?');
    return query.get(id);
  },

  // Create a new user with hashed password
  createUser(name, email, passwordHash) {
    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash)
      VALUES (?, ?, ?)
    `);
    const result = insert.run(name.trim(), email.trim().toLowerCase(), passwordHash);
    return {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'supporter'
    };
  },

  // Save a contact form submission
  saveContact(name, email, phone, reason, message) {
    const insert = db.prepare(`
      INSERT INTO contacts (name, email, phone, reason, message)
      VALUES (?, ?, ?, ?, ?)
    `);
    return insert.run(name.trim(), email.trim(), phone ? phone.trim() : null, reason, message.trim());
  },

  // Save a newsletter subscription
  saveSubscriber(email) {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO subscribers (email)
      VALUES (?)
    `);
    return insert.run(email.trim().toLowerCase());
  }
};
