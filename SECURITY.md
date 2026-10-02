# Security Policy for KalyanSetu

The security of KalyanSetu's users, donors, volunteers, and systems is of utmost importance. This document details our security standards, architectural controls, and instructions for reporting vulnerabilities.

---

## 🛡️ Supported Versions

We provide active security patches for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 🔒 Implemented Security Controls

KalyanSetu incorporates enterprise-grade defensive layers out of the box:

1. **Password Hashing**:
   - Industry-standard `bcrypt` with 10 salt rounds. Plaintext passwords are never stored in memory or disk.
2. **SQL Injection Prevention**:
   - All database queries use SQLite parameterized prepared statements (`node:sqlite`), rendering SQL injection attacks impossible.
3. **HTTP Security Headers**:
   - `Content-Security-Policy` (CSP) prevents unauthorized script and style execution.
   - `Strict-Transport-Security` (HSTS) enforces HTTPS with `max-age=31536000; includeSubDomains`.
   - `X-Frame-Options: SAMEORIGIN` prevents clickjacking attacks.
   - `X-Content-Type-Options: nosniff` defends against MIME-sniffing exploits.
   - `Referrer-Policy: strict-origin-when-cross-origin` preserves user privacy.
4. **Rate Limiting & Anti-Abuse**:
   - Sliding-window rate limiting on all API routes (100 requests per 15-minute window per IP) to mitigate brute-force and DDoS attempts.
5. **Input Sanitization**:
   - Strict XSS sanitization removing malicious `<script>`, `<iframe>`, and event handler injections on all textual inputs.
6. **Isolated Secrets**:
   - No credentials or encryption secrets are committed to version control; configuration is parsed exclusively via environment variables (`.env`).

---

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability within KalyanSetu, please **do not open a public GitHub issue**.

Instead, please send a detailed disclosure report to our security team:
- **Email**: `security@kalyansetu.org` (or `sidhantmaurya140@gmail.com`)
- **Subject**: `[SECURITY VULNERABILITY] - KalyanSetu`

### What to include in your report:
- Type of issue (e.g., XSS, CSRF, auth bypass)
- Step-by-step instructions or Proof of Concept (PoC) to reproduce the behavior
- Potential impact of the vulnerability
- Any proposed mitigations or remediation steps

### Response Timeline
- **Initial Acknowledgement**: Within 24 hours
- **Assessment & Triage**: Within 48 hours
- **Resolution & Patch Deployment**: Within 5-7 business days depending on severity
