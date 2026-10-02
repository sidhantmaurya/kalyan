/**
 * Database Module for KalyanSetu (Production Ready)
 * Uses Node.js 22 built-in SQLite engine (node:sqlite)
 *
 * Enhancements:
 *  - Configurable DB_PATH (supports Docker volumes & persistent cloud disks)
 *  - WAL (Write-Ahead Logging) mode for fast, concurrent production reads & writes
 *  - Performance indexes for rapid lookups
 *  - Safe SQLite backup function
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

// Configurable database path via environment variable (default: ./kalyansetu.db)
const dbPath = process.env.DB_PATH 
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.resolve(process.cwd(), 'kalyansetu.db');

// Ensure database parent directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Enable Write-Ahead Logging & Normal Synchronous for high production throughput
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  console.warn('SQLite PRAGMA setup note:', e);
}

// Create required tables with performance indexes
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

  -- Production Performance Indexes
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
  CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
`);

console.log('✓ SQLite database initialized successfully with WAL & indexes at:', dbPath);

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
  },

  // Create an on-demand snapshot backup of the SQLite database
  createBackup() {
    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = path.join(backupDir, `kalyansetu-backup-${timestamp}.db`);
    
    // Copy the database file safely
    fs.copyFileSync(dbPath, destination);
    console.log(`✓ Database backup snapshot created at: ${destination}`);
    return destination;
  }
};
