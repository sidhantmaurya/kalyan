# KalyanSetu - Affordable Food, Dignified Lives

> A for-profit social impact initiative making nutritious, hygienic, and affordable meals accessible to students, daily wage workers, transit drivers, and low-income families across India.

---

## 🌟 Overview & Mission

Millions of urban workers, students, and drivers spend 12–14 hours away from home every day. Healthy, affordable meals are almost non-existent for them — forcing reliance on unhygienic roadside stalls or skipping meals entirely. 

**KalyanSetu** provides wholesome, nutritionally balanced meals at just **₹25**, operated with central kitchen efficiencies, direct farm sourcing, and commercial discipline.

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Node.js (v22+) & Express
- **Database**: SQLite (`kalyansetu.db` via native Node.js SQLite driver)
- **Frontend**: Responsive HTML5, Vanilla JavaScript, CSS3, Vite build pipeline
- **Security**:
  - Bcrypt password hashing (10 salt rounds)
  - Content Security Policy (CSP) & HSTS headers
  - MIME-type sniffing protection (`X-Content-Type-Options: nosniff`)
  - Clickjacking protection (`X-Frame-Options: SAMEORIGIN`)
  - Sliding-window API rate limiting (100 req / 15m)
  - Strict input sanitization against XSS
- **Session Management**: Client-side storage with reactive multi-tab sync

---

## 🚀 Quick Start (Local Development)

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd kalyansetu
npm install
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
Ensure your `.env` contains:
```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
DB_PATH=./kalyansetu.db
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SESSION_SECRET=kalyansetu_secure_dev_session_secret_2026
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build & Testing

### Compile Frontend Static Assets
```bash
npm run build
```
This outputs production-optimized, minified assets into the `dist/` directory.

### Start Production Server
```bash
NODE_ENV=production npm start
```

---

## 🌐 Production Deployment Guide

### Option 1: Render.com (Recommended)
Because KalyanSetu uses an SQLite database (`kalyansetu.db`), deploying on Render with a persistent disk ensures zero data loss between redeployments.

1. Create a **New Web Service** on [Render](https://render.com).
2. Connect your Git repository.
3. Configure the following build settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add a **Persistent Disk**:
   - Mount Path: `/app/data` (set `DB_PATH=/app/data/kalyansetu.db` in Environment Variables).
5. Set Environment Variables:
   - `NODE_ENV=production`
   - `PORT=3000`

---

### Option 2: VPS (DigitalOcean / Hetzner / AWS Lightsail) with PM2 & Nginx

1. **Install Node.js 22 & PM2**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx
   sudo npm install -g pm2
   ```

2. **Clone and Build**:
   ```bash
   git clone <your-repo-url> /var/www/kalyansetu
   cd /var/www/kalyansetu
   npm install
   npm run build
   ```

3. **Start with PM2**:
   ```bash
   NODE_ENV=production pm2 start server.ts --name kalyansetu --interpreter tsx
   pm2 save
   pm2 startup
   ```

4. **Nginx Reverse Proxy Config**:
   ```nginx
   server {
       server_name kalyansetu.org www.kalyansetu.org;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $remote_addr;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
5. **Issue Free SSL with Certbot**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d kalyansetu.org -d www.kalyansetu.org
   ```

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Health status, database connection, uptime, and memory usage. |
| `/api/auth/signup` | `POST` | Registers a new user with bcrypt password hashing. |
| `/api/auth/login` | `POST` | Authenticates user against SQLite credentials. |
| `/api/contact` | `POST` | Stores inquiries & messages from the contact form. |
| `/api/newsletter` | `POST` | Stores newsletter subscriber email addresses. |
| `/api/stats` | `GET` | Live community metrics (supporters, messages, subscribers). |

---

## 🛡️ Database & Backups

The SQLite database file `kalyansetu.db` resides in the project root (or specified `DB_PATH`).

### Automated Daily Backup Script
```bash
#!/bin/bash
# Backup SQLite database with safe lock
DATE=$(date +"%Y%m%d_%H%M%S")
sqlite3 kalyansetu.db ".backup './backups/kalyansetu_${DATE}.db'"
echo "Backup completed: kalyansetu_${DATE}.db"
```

---

## 📄 License
This project is proprietary and maintained by KalyanSetu. All rights reserved.
