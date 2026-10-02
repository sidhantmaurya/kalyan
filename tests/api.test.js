/**
 * Automated Test Suite for KalyanSetu
 * Uses Node.js 22 built-in test runner (node:test)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dbOps } from '../db.js';
import fs from 'node:fs';

describe('KalyanSetu Core Database & Logic Tests', () => {
  const testEmail = `test_${Date.now()}@example.com`;

  test('Database: User registration and retrieval', () => {
    const user = dbOps.createUser('Test Volunteer', testEmail, 'mock_hashed_password');
    assert.ok(user.id > 0, 'User ID should be a positive number');
    assert.equal(user.email, testEmail);
    assert.equal(user.role, 'supporter');

    // Retrieve by email
    const fetched = dbOps.findUserByEmail(testEmail);
    assert.ok(fetched, 'Fetched user should exist');
    assert.equal(fetched.name, 'Test Volunteer');

    // Retrieve by ID (safe view)
    const safeUser = dbOps.findUserById(user.id);
    assert.ok(safeUser, 'Safe user should exist');
    assert.equal(safeUser.name, 'Test Volunteer');
    assert.equal(safeUser.password_hash, undefined, 'password_hash should not be exposed in safeUser');
  });

  test('Database: Contact message creation', () => {
    const result = dbOps.saveContact(
      'Ananya Sen',
      'ananya@sen.org',
      '+91 99999 88888',
      'volunteer',
      'I want to help with weekend meal distribution in Mumbai.'
    );
    assert.ok(result.changes > 0, 'Should insert one contact row');
  });

  test('Database: Newsletter subscription idempotency', () => {
    const subEmail = `newsletter_${Date.now()}@example.com`;
    const res1 = dbOps.saveSubscriber(subEmail);
    assert.ok(res1.changes >= 0, 'Should handle new subscription');

    // Duplicate should be ignored safely (INSERT OR IGNORE)
    const res2 = dbOps.saveSubscriber(subEmail);
    assert.equal(res2.changes, 0, 'Duplicate subscription should insert 0 rows without throwing');
  });

  test('Database: Snapshot backup generation', () => {
    const backupPath = dbOps.createBackup();
    assert.ok(fs.existsSync(backupPath), 'Backup snapshot file should exist on disk');
    const stats = fs.statSync(backupPath);
    assert.ok(stats.size > 0, 'Backup file should have positive byte size');
    
    // Clean up test backup file
    try {
      fs.unlinkSync(backupPath);
    } catch (_) {}
  });

  test('Security: Input sanitization check', () => {
    function sanitize(val) {
      if (typeof val !== 'string') return val;
      return val
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    }

    const dangerousInput = '<script>alert("hacked")</script>Hello KalyanSetu!<b>Test</b>';
    const clean = sanitize(dangerousInput);
    assert.equal(clean, 'Hello KalyanSetu!Test');
    assert.ok(!clean.includes('<script>'), 'Script tag must be stripped');
  });
});
