# KalyanSetu REST API Documentation

Base URL: `http://localhost:3000/api` (Local) or `https://<your-domain>/api` (Production)

---

## 🔒 Security & Rate Limiting

- **Rate Limit**: By default, clients are limited to **100 requests per 15-minute window** per IP address. Exceeding this limit returns HTTP status code `429 Too Many Requests`.
- **Content-Type**: All POST endpoints expect JSON payloads with `Content-Type: application/json`.
- **Sanitization**: All text inputs are trimmed and sanitized against cross-site scripting (XSS) attacks.

---

## 📋 Endpoints Overview

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| [`/health`](#1-system-health-check) | `GET` | Server status, database health, uptime, and memory usage. |
| [`/auth/signup`](#2-user-registration) | `POST` | Registers a new supporter account. |
| [`/auth/login`](#3-user-authentication) | `POST` | Authenticates an existing user. |
| [`/contact`](#4-contact-inquiry) | `POST` | Submits a contact inquiry or partnership request. |
| [`/newsletter`](#5-newsletter-subscription) | `POST` | Subscribes an email to KalyanSetu updates. |
| [`/stats`](#6-community-metrics) | `GET` | Public counters for supporters, inquiries, and subscribers. |

---

## 1. System Health Check

### `GET /api/health`
Monitors server vitality, SQLite database connectivity, process uptime, and memory consumption.

#### Response (`200 OK`)
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 128.45,
  "timestamp": "2026-10-02T11:05:00.000Z",
  "memory": {
    "rss": 42.15,
    "heapTotal": 24.50,
    "heapUsed": 18.20
  }
}
```

---

## 2. User Registration

### `POST /api/auth/signup`
Creates a new account in SQLite. Passwords are encrypted using bcrypt (10 salt rounds).

#### Request Body
```json
{
  "name": "Aarav Sharma",
  "email": "aarav.sharma@example.com",
  "password": "SecurePassword123"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Account created successfully. Welcome to KalyanSetu!",
  "user": {
    "id": 1,
    "name": "Aarav Sharma",
    "email": "aarav.sharma@example.com",
    "role": "supporter"
  }
}
```

#### Error Responses
- `400 Bad Request`: Validation failure (name missing, invalid email, password < 6 chars).
- `409 Conflict`: An account with this email address already exists.

---

## 3. User Authentication

### `POST /api/auth/login`
Validates credentials against the SQLite database and returns the authenticated user profile.

#### Request Body
```json
{
  "email": "aarav.sharma@example.com",
  "password": "SecurePassword123"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Welcome back, Aarav Sharma!",
  "user": {
    "id": 1,
    "name": "Aarav Sharma",
    "email": "aarav.sharma@example.com",
    "role": "supporter"
  }
}
```

#### Error Responses
- `400 Bad Request`: Missing email or password.
- `401 Unauthorized`: Invalid email address or incorrect password.

---

## 4. Contact Inquiry

### `POST /api/contact`
Receives inquiries, partnership proposals, and volunteering requests.

#### Request Body
```json
{
  "name": "Priya Patel",
  "email": "priya@domain.org",
  "phone": "+91 98765 43210",
  "reason": "partner",
  "message": "We would like to partner with KalyanSetu to distribute meals near Delhi transit stations."
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Thank you for reaching out, Priya Patel! Your message has been received."
}
```

---

## 5. Newsletter Subscription

### `POST /api/newsletter`
Subscribes an email to mission updates and monthly impact reports.

#### Request Body
```json
{
  "email": "supporter@example.com"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Thank you for subscribing to KalyanSetu updates!"
}
```

---

## 6. Community Metrics

### `GET /api/stats`
Fetches real-time counts from the database for community transparency.

#### Response (`200 OK`)
```json
{
  "success": true,
  "stats": {
    "supporters": 142,
    "messages": 38,
    "subscribers": 95
  }
}
```
