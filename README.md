[![Deploy Status](https://img.shields.io/badge/deploy-live-brightgreen?style=flat-square&logo=vercel)](https://vershkov.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![License: PolyForm Noncommercial 1.0.0](https://img.shields.io/badge/License-PolyForm_Noncommercial_1.0.0-blue.svg)](LICENSE)

# 🧠 Vershkov.com

> **Professional psychology platform** — a modern web application for psychologist Anna Vershkova, built with Next.js 15, featuring client management, survey system, and secure multi-provider authentication.

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

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Language** | TypeScript (strict mode) |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | NextAuth v5 (Google, Credentials, WebAuthn) |
| **Email** | Resend + React Email |
| **i18n** | next-intl |
| **UI** | Radix UI, Tailwind CSS, Lucide Icons |
| **State** | React Hook Form, Sonner |
| **Charts** | amCharts 5 |
| **DnD** | @dnd-kit |
| **Deploy** | Vercel (standalone output) |
| **Analytics** | Vercel Analytics + Speed Insights |

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

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth secret key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `RESEND_API_KEY` | Resend API key for emails |
| `NEXT_PUBLIC_APP_URL` | Base URL of the application |
| `PROD_DOMAIN` | Production domain with protocol (e.g., https://example.com) - required for production emails |

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

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build (Prisma generate + Next.js) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |

---

## 📱 PWA: офлайн-режим

Приложение работает офлайн благодаря Service Worker (`public/sw.js`).

### Какие страницы доступны офлайн

| Страница | Путь |
|---|---|
| Главная | `/` |
| Личный кабинет | `/my` |
| Расписание сессий | `/my/sessions` |
| Опросы | `/my/surveys` |

### Как добавить новую страницу в офлайн-кеш

1. Откройте `public/sw.js`
2. Найдите массив `PRE_CACHED_URLS`
3. Добавьте нужный путь:

```js
const PRE_CACHED_URLS = [
  '/',
  '/my',
  '/my/sessions',
  '/my/surveys',
  '/my/ваша-страница',  // ← добавить сюда
];
```

4. Задеплойте. После обновления SW новые страницы появятся в кеше автоматически.

> Чтобы сбросить старый кеш у всех пользователей (например после крупного обновления) — измените константу:
> ```js
> const CACHE_VERSION = 'v2'; // было v1
> ```

### Стратегии кеширования

| Тип запроса | Стратегия |
|---|---|
| `/api/**` | Network Only — никогда не кешировать |
| `/_next/static/**` | Cache First — иммутабельные JS/CSS бандлы |
| PNG/SVG/ICO | Cache First — статические иконки |
| HTML-страницы | Network First → fallback кеш |

---

## 🔔 Push-уведомления

### Первоначальная настройка (один раз)

1. Сгенерировать VAPID-ключи:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. Добавить в `.env.local` и на сервере:
   ```env
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<публичный ключ>
   VAPID_PRIVATE_KEY=<приватный ключ>
   VAPID_SUBJECT=mailto:admin@vershkov.com
   ```

### Как работает

- При первом визите пользователю показывается баннер с запросом разрешения
- Подписка хранится в таблице `PushSubscription` в БД
- Управление: `/my/settings` → «Push-уведомления»
- Если пользователь заблокировал — показываются инструкции по разблокировке

### Поддержка платформ

| Платформа | Статус |
|---|---|
| Android Chrome/Firefox | ✅ Полная |
| iOS Safari 16.4+ (PWA на экране) | ✅ Работает |
| iOS Safari (браузер) | ❌ Apple не поддерживает |
| Desktop Chrome/Firefox/Edge | ✅ Полная |

### Отправка из админки

1. `/admin/send-email` → выбрать получателей → написать сообщение (до 178 символов)
2. Кнопка **«Отправить Push»** → подтвердить

---

## 📄 License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE). Commercial use is strictly prohibited.