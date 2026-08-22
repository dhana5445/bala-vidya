# Balavidya Production Path

## Local API

1. Copy `.env.example` to `.env` and set a strong `JWT_SECRET` and PostgreSQL `DATABASE_URL`.
2. Run `npm install`.
3. Apply `server/schema.sql` to PostgreSQL.
4. Run `npm start`.

The static UI can still be opened directly for the prototype. For authentication, API calls, service-worker caching, and secure cookies, serve it from the same origin over HTTPS.

## What Is Included

- `server/index.js`: Express API with Helmet, CORS, Zod request validation, Argon2 password verification, JWT role claims, student-scoped progress, attempt creation, and protected admin analytics boundary.
- `server/schema.sql`: schools, users, role model, student profiles, subjects, topics, lessons, questions, attempts, answers, progress, and audit log tables.
- `manifest.webmanifest` and `service-worker.js`: installable shell and cache-first low-bandwidth behavior.

## Required Next Integration

Replace the prototype `localStorage` sign-in with `POST /api/v1/auth/login`, store the short-lived token in an HttpOnly secure cookie, load `/api/v1/me/dashboard` on Home, submit attempts to `/api/v1/attempts`, and load `/api/v1/me/progress` for Progress. Do not put child passwords, tokens, or private performance data in localStorage in production.
