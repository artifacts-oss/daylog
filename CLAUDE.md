# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (http://localhost:3000)
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run ESLint
npm run test      # Run Vitest in WATCH mode (stays running)
npm run coverage  # Run all tests once with coverage (vitest run --coverage)
```

`npm run test` watches; for a one-shot run use `npx vitest run` (or `npm run coverage`).

Run a single test file:
```bash
npx vitest run path/to/file.test.tsx
```

Database migrations:
```bash
npx prisma migrate dev    # Create and apply migration in development
npx prisma migrate deploy # Apply migrations in production
npx prisma generate       # Regenerate Prisma client after schema changes
```

## Architecture

**daylog** is a self-hosted, multi-user notes and boards application. Built with Next.js 15 App Router (React 19), Prisma + PostgreSQL, Redis, and Tailwind CSS v4. Runtime depends on **both** PostgreSQL and Redis — `lib/redis.ts` throws at import if `REDIS_URL` is unset.

Mutations are handled by a mix of **Next.js Server Actions** (e.g. `updateNote`) and **REST API routes** under `/app/api/v1/`. When adding a mutation, check which pattern the surrounding feature already uses.

### Route Structure

- `/app/(authenticated)/` — Protected route group (boards, notes, dashboard, profile, admin, community, shared). Wraps all pages requiring a logged-in session.
- `/app/(marketing)/` — Public marketing route group.
- `/app/api/v1/` — REST endpoints: `auth`, `notes`, `storage`, `images`, `share`, `locale`, `backup`.
- `/app/login/`, `/app/register/` — Unauthenticated pages; `/register/init` creates the first admin user.
- `/app/share/[token]/` — Public share view (no auth required).

### Middleware

`middleware.ts` runs on every request and is the first line of routing/security: it applies general rate limiting (via `utils/rateLimit`), resolves the locale cookie (`i18n/config`), and gates auth by maintaining the `PUBLIC_PATHS` allowlist. It also rewrites server-side fetches to `INTERNAL_APP_URL` to avoid SSL errors behind a reverse proxy. New public/unauthenticated routes must be added to its allowlist.

### Data Models (Prisma)

Core models in `prisma/schema.prisma`:
- **User** — email/password auth, TOTP 2FA, account locking, role (user/admin)
- **Session** — server-side session records linked to Users
- **Board** — container for Notes, supports favorites and metadata
- **Note** — markdown content with title, images, favorites; belongs to a Board
- **Picture** — images attached to Notes, stored via S3 or local filesystem
- **NoteChange** — version history using diff-match-patch patches
- **ChangeComment** — comments on NoteChange records
- **Share** — public share tokens with optional password, expiry, and view tracking
- **Setting** — application-wide key-value configuration store

### Authentication & Security

Session-based auth using secure cookies (SameSite=Lax). Key flows:
- Login → session creation → `Session` record in DB
- TOTP 2FA with QR code provisioning
- CSRF token validation on mutations
- Rate limiting on login with automatic account locking
- Password reset and email verification via Nodemailer

Auth and security primitives live in `/utils/` (`crypto`, `totp`, `csrf`, `rateLimit`, `encryption`, `ssrf`) and the API routes under `/app/api/v1/auth/`. `config/security.ts` (`SECURITY_CONFIG`) centralizes password policy, session expiry, rate-limit windows, and MFA constants — change security tunables there, not inline.

`utils/ssrf.ts` guards outbound fetches (e.g. Unsplash, remote images) against SSRF; route any new server-side fetch of user-supplied URLs through it.

### Field Encryption

Opt-in AES-256-GCM encryption of board/note content (`utils/encryption.ts`). A PBKDF2 key derived from the user's password is wrapped and stored on the `Session` record; helpers like `getSessionEncryptionKey`, `decryptField`, and `isEncrypted` gate access. Content is encrypted at rest in the DB but always operated on as plaintext in memory (see collaboration below).

### Real-time Collaboration

`lib/noteCollaboration.ts` powers multi-user live editing (`CollabEditor`) over **Redis pub/sub + SSE**. Each note is a "room"; clients exchange plaintext diffs (diff-match-patch) and presence. Each SSE connection needs its own Redis subscriber (`createSubscriber()`), since a subscribed ioredis connection cannot issue normal commands. Rooms always work on plaintext — decryption happens on load, and persistence back to the DB (with encryption) goes through the `updateNote` server action.


### Component Patterns

- `/components/ui/` — Radix UI primitives styled with Tailwind (shadcn/ui pattern). These are low-level building blocks.
- Feature components sit directly in `/components/` (e.g., `Navigation`, `Search`, share dialogs).
- Forms use React Hook Form + Zod for validation.

### Testing

Vitest with jsdom (config in `vitest.config.mts`). The test setup (`vitest.setup.ts`) mocks next-intl, localStorage, and Radix UI globals. Prisma uses a singleton pattern for test isolation. Tests also emit a `sonar-report.xml` via `vitest-sonar-reporter` for SonarCloud.

Tests live alongside source files or in `__tests__/`/`utils/test`. Coverage excludes route handlers (`**/route.ts`), test files, JS files, icons, and `prisma/**`.

Never use `any` in tests or any other code. If a suitable type does not already exist, create one.

### Storage

Image storage supports two backends configured via environment variables:
- **S3-compatible** — set `S3_*` env vars
- **Local filesystem** — set `STORAGE_PATH`

Sharp is used for image optimization. Unsplash API integration is available for cover image search.

### Internationalization

next-intl with translation files in `/messages/`. The i18n setup is in `/i18n/`. All user-facing strings should go through the translation layer.

### Design System

See `STYLE_GUIDE.md` for the design system: semantic color tokens, typography hierarchy, and component specifications. The app supports dark/light mode via Tailwind's class-based dark mode, with preference persisted per user.
