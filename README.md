[![Deploy Status](https://img.shields.io/badge/deploy-live-brightgreen?style=flat-square&logo=vercel)](https://vershkov.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/License-PolyForm_Noncommercial_1.0.0-blue.svg)](LICENSE)

**Documentation languages:** [English](./README.md) | [Русский](./README.ru.md)

# 🧠 Vershkov.com

> **Professional psychology platform** — a modern web application for psychologist Anna Vershkova, built with Next.js
> 16, featuring client management, survey system, and secure multi-provider authentication.

🔗 **Live:** [vershkov.com](https://vershkov.com)

---

## ✨ Features

### 🔐 Authentication & Security

- **Multi-provider auth** — Email/Password, Google OAuth, and WebAuthn (Passkeys) via NextAuth v5
- **Email verification** — New users must confirm their email before accessing the platform
- **Welcome notifications** — Automated welcome emails for Google sign-up (not on repeat login)
- **Rate limiting** — Login attempt throttling (3 attempts per hour)
- **Role-based access** — `ADMIN`, `USER`, and `GUEST` roles with granular route protection

### 📋 Survey System

- Admin-created surveys with multiple question types (single choice, multi choice, free text, scale)
- User assignment and completion tracking
- Results viewer with comment discussions between admin and users
- Draft auto-save for survey responses

### 📧 Email System

- **Resend** integration for transactional emails
- Batch sending from admin panel (up to 100 per batch)
- Real-time delivery status tracking with polling
- **Multilingual email templates** — emails are sent in the user's preferred language
- Beautiful React Email templates (verification, welcome, admin messages)

### 🌍 Internationalization

- Full **English** and **Russian** support via `next-intl`
- Cookie-based locale detection (no URL prefixes)
- User language preference saved to profile
- Extensible — add new languages by creating a translation file

### 🎨 UI & Design

- Dark/Light/System theme support via `next-themes`
- Responsive layout with mobile-first design
- Component library built on **Radix UI** primitives
- Toast notifications via **Sonner**
- Inter font with Latin & Cyrillic subsets

### 👤 User Dashboard

- Personal dashboard with stats
- Survey management (pending/completed)
- Profile management (name, Google account linking)
- Passkey management (create/delete)
- Appearance & language settings

### 🛠 Admin Panel

- User management (CRUD, role assignment)
- Survey builder & assignment
- Email broadcast tool
- Real-time online status tracking (heartbeat)

---

## 🏗 Tech Stack

| Layer         | Technology                                  |
|---------------|---------------------------------------------|
| **Framework** | Next.js 16 (App Router, Turbopack)          |
| **Language**  | TypeScript (strict mode)                    |
| **Database**  | PostgreSQL + Prisma ORM                     |
| **Auth**      | NextAuth v5 (Google, Credentials, WebAuthn) |
| **Email**     | Resend + React Email                        |
| **i18n**      | next-intl                                   |
| **UI**        | Radix UI, Tailwind CSS, Lucide Icons        |
| **State**     | React Hook Form, Sonner                     |
| **Charts**    | amCharts 5                                  |
| **DnD**       | @dnd-kit                                    |
| **Deploy**    | Vercel (standalone output)                  |
| **Analytics** | Vercel Analytics + Speed Insights           |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- [Resend](https://resend.com) API key
- Google OAuth credentials (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/evn88/psy.git
cd psy

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

### Environment Variables

#### Authentication & Database

| Variable              | Description                                                                   |
|-----------------------|-------------------------------------------------------------------------------|
| `AUTH_SECRET`         | NextAuth secret key for session signing (generate: `openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID`      | Google OAuth client ID (formerly `GOOGLE_CLIENT_ID`)                          |
| `AUTH_GOOGLE_SECRET`  | Google OAuth client secret (formerly `GOOGLE_CLIENT_SECRET`)                  |
| `DATABASE_URL`        | PostgreSQL connection string (full URL with credentials)                      |
| `POSTGRES_URL`        | Alternative Postgres connection string (used by Vercel Postgres)              |
| `PRISMA_DATABASE_URL` | Explicit Prisma database URL (overrides `DATABASE_URL` if set)                |
| `ADMIN_EMAIL`         | Email address to grant admin access on first login (e.g., your@email.com)     |

#### Email & Notifications

| Variable                                | Description                                                                            |
|-----------------------------------------|----------------------------------------------------------------------------------------|
| `RESEND_API_KEY`                        | Resend API key for transactional emails                                                |
| `VAPID_PRIVATE_KEY`                     | VAPID private key for push notifications (keep secret)                                 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`          | VAPID public key for push notifications (safe to expose)                               |
| `VAPID_SUBJECT`                         | VAPID subject URI (e.g., `mailto:your@email.com`) for push notification identification |
| `CRON_SECRET`                           | Secret token for securing daily Vercel Cron endpoint `/api/cron/session-reminders`     |
| `WORKFLOW_MONTHLY_STEP_LIMIT`           | Optional monthly workflow steps budget for admin alerts (default: `50000`)             |
| `WORKFLOW_ALERT_THRESHOLD_PERCENT`      | Optional warning threshold in percent (default: `80`)                                  |
| `WORKFLOW_ESTIMATED_STEPS_PER_REMINDER` | Optional estimated steps per one reminder workflow run (default: `3`)                  |

#### AI & Storage

| Variable                | Description                                                               |
|-------------------------|---------------------------------------------------------------------------|
| `AI_GATEWAY_API_KEY`    | Vercel AI Gateway API key (optional if using OIDC)                        |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token for file uploads                                |
| `VERCEL_OIDC_TOKEN`     | Auto-provisioned OIDC token for Vercel services (set by Vercel on deploy) |

#### Application URLs

| Variable              | Description                                                                                    |
|-----------------------|------------------------------------------------------------------------------------------------|
| `NEXT_PUBLIC_APP_URL` | Public base URL of the application (e.g., `http://localhost:3000`)                             |
| `PROD_DOMAIN`         | Production domain with protocol (e.g., `https://example.com`) - required for production emails |

### Admin Setup

1. **Register** — Sign up with your email or Google OAuth
2. **Set ADMIN_EMAIL** — Add your email to `.env.local`:
   ```bash
   ADMIN_EMAIL=your@email.com
   ```
3. **Login Again** — Sign in again and your account will automatically be elevated to `ADMIN` role
4. **Access Admin Panel** — Navigate to `/admin` (accessible only to ADMIN users)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (main)/          # Main layout group
│   │   ├── admin/       # Admin panel pages
│   │   ├── auth/        # Authentication page
│   │   └── my/          # User dashboard pages
│   └── api/             # API routes
│       ├── auth/        # Register, verify-email
│       ├── profile/     # Profile updates, passkeys
│       ├── send/        # Email sending
│       └── settings/    # User preferences
├── components/
│   ├── admin/           # Admin-specific components
│   ├── email-templates/ # React Email templates
│   ├── my/              # User dashboard components
│   └── ui/              # Radix UI primitives
├── i18n/                # Internationalization config
├── shared/lib/          # Shared utilities (Prisma, email)
└── middleware.ts         # Auth & locale middleware
messages/
├── en.json              # English UI translations
├── ru.json              # Russian UI translations
├── email-en.json        # English email translations
└── email-ru.json        # Russian email translations
```

---

## 📜 Scripts

| Command              | Description                                  |
|----------------------|----------------------------------------------|
| `npm run dev`        | Start dev server with Turbopack              |
| `npm run build`      | Production build (Prisma generate + Next.js) |
| `npm start`          | Start production server                      |
| `npm run lint`       | Run ESLint                                   |
| `npm run type-check` | TypeScript type checking                     |

---

## 📱 PWA: Offline Mode

The application works offline thanks to the Service Worker (`public/sw.js`).

### Offline-Available Pages

| Page              | Path           |
|-------------------|----------------|
| Home              | `/`            |
| User Dashboard    | `/my`          |
| Sessions Schedule | `/my/sessions` |
| Surveys           | `/my/surveys`  |

### Adding a New Page to Offline Cache

1. Open `public/sw.js`
2. Find the `PRE_CACHED_URLS` array
3. Add the required path:

```js
const PRE_CACHED_URLS = [
    '/',
    '/my',
    '/my/sessions',
    '/my/surveys',
    '/my/your-page',  // ← add here
];
```

4. Deploy. After updating the Service Worker, new pages will appear in the cache automatically.

> To clear the old cache for all users (for example after a major update) — change the constant:
> ```js
> const CACHE_VERSION = 'v2'; // was v1
> ```

### Caching Strategies

| Request Type       | Strategy                               |
|--------------------|----------------------------------------|
| `/api/**`          | Network Only — never cache             |
| `/_next/static/**` | Cache First — immutable JS/CSS bundles |
| PNG/SVG/ICO        | Cache First — static icons             |
| HTML pages         | Network First → fallback to cache      |

---

## 🔔 Push Notifications

### Initial Setup (one-time)

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. Add to `.env.local` and on the server:
   ```env
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public_key>
   VAPID_PRIVATE_KEY=<private_key>
   VAPID_SUBJECT=mailto:admin@vershkov.com
   ```

### How It Works

- On the first visit, users are shown a banner requesting permission
- Subscriptions are stored in the `PushSubscription` table in the database
- Management: `/my/settings` → "Push Notifications"
- If blocked by user — instructions for unblocking are displayed

### Platform Support

| Platform                         | Status                   |
|----------------------------------|--------------------------|
| Android Chrome/Firefox           | ✅ Full                   |
| iOS Safari 16.4+ (PWA installed) | ✅ Works                  |
| iOS Safari (browser)             | ❌ Apple does not support |
| Desktop Chrome/Firefox/Edge      | ✅ Full                   |

### Sending from Admin Panel

1. `/admin/send-email` → select recipients → write message (up to 178 characters)
2. Click **"Send Push"** → confirm

---

## 📄 License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use is strictly
prohibited.
