# AGENTS.md

Guidance for AI coding agents working in this repository.

## Commands

```bash
npm run dev       # next dev --webpack (http://localhost:3000)
npm run build     # next build --webpack
npm start         # Start production server
npm run lint      # eslint app components lib (only these dirs; CI runs it)
npm run test      # Vitest in WATCH mode (stays running)
npm run coverage  # vitest run --coverage (one-shot, emits coverage/lcov.info for SonarCloud)
```

One-shot single file: `npx vitest run path/to/file.test.tsx`.

Prisma (client output: `prisma/generated/client`, wrapper: `prisma/client`):
```bash
npx prisma migrate dev    # Create and apply migration in development
npx prisma migrate deploy # Apply migrations in production (run by entrypoint.sh)
npx prisma generate       # Regenerate client after schema changes (required before tests/CI)
```

Runtime: Node 22 (Dockerfile + CI). Env vars: see `.env.example` (`DATABASE_URL`, `REDIS_URL`, `INTERNAL_APP_URL`, `STORAGE_PATH`/`S3_*`, `UNSPLASH_ACCESS_KEY`, `SMTP_*`, `ENCRYPTION_MASTER_KEY`).

## Architecture

**daylog** is a self-hosted, multi-user notes and boards application: Next.js 16 App Router (React 19), Prisma 5 + PostgreSQL, Redis, Tailwind CSS v4. Runtime depends on **both** PostgreSQL and Redis — `lib/redis.ts` throws at import if `REDIS_URL` is unset.

Mutations use a mix of **Server Actions** (`'use server'` files in route-local `lib/` dirs, e.g. `updateNote`, `createShare`) and **REST routes** under `app/api/v1/`. Follow the pattern of the surrounding feature.

### Route Structure

- `app/(authenticated)/` — session-protected group: dashboard (`page.tsx`), `boards`, `favorites`, `recent`, `community`, `shared`, `profile`, `admin`. Each route colocates `components/` (UI) and `lib/` (server actions, types, schemas).
- `app/login/`, `app/register/` — unauthenticated; `/register/init` creates the first admin.
- `app/share/[token]/` — public share view.
- `app/api/v1/`: `auth/[slug]`, `backup`, `images` (+`unsplash`), `locale`, `notes/[noteId]/{stream,sync}`, `share/[token]/image/[...path]`, `storage`, `users/[userId]/avatar`.

### Proxy (`proxy.ts`)

Next.js 16 successor of `middleware.ts`; runs on every request: general rate limiting (`utils/rateLimit`), locale cookie resolution (`i18n/config`), auth gating, and rewriting server-side fetches to `INTERNAL_APP_URL` (avoids SSL errors behind a reverse proxy). Public routes are the `PUBLIC_PATHS` allowlist plus prefix checks in `isPublicPath` (`/login/otp/`, `/login/reset/`, `/share/`, `/api/v1/share/`). **New unauthenticated routes must be added there.** Covered by `proxy.test.ts`.

### Data Models (`prisma/schema.prisma`)

`User` (email/password, TOTP, lockout, role), `Session` (server-side; holds wrapped encryption key), `Board`, `Note` (markdown; belongs to a Board), `Picture` (note images), `Attachment` (note files: `fileUrl`, `fileName`, `mimeType`, `size`), `NoteChange` (diff-match-patch history), `ChangeComment`, `Share` (`entityType` BOARD|NOTE, `scope` PUBLIC|ALL|SPECIFIC, optional password/expiry, `oneTime`, `canEdit`, decrypted `snapshot`), `ShareRecipient` (SPECIFIC scope users), `ShareView` (hashed IP+UA view tracking), `Setting` (global key-value). Schema changes need a migration in `prisma/migrations/`.

### Authentication & Security

Cookie sessions (SameSite=Lax) backed by `Session` rows; TOTP 2FA; CSRF tokens on auth flows (`utils/csrf`, `api/v1/auth`); login rate limiting with account lockout; password reset and email via Nodemailer (`utils/email`).

Primitives live in `utils/` (`crypto`, `totp`, `csrf`, `rateLimit`, `encryption`, `ssrf`, `fileAccess`). `config/security.ts` (`SECURITY_CONFIG`) centralizes password policy, session expiry, rate-limit windows and MFA constants — change tunables there, not inline.

`utils/ssrf.ts` guards outbound fetches of user-supplied URLs (used by `api/v1/backup`); route any new such fetch through it.

### Field Encryption

Opt-in AES-256-GCM encryption of board/note content (`utils/encryption.ts`, requires `ENCRYPTION_MASTER_KEY`). A PBKDF2 key derived from the user's password is wrapped and stored on `Session`; use `getSessionEncryptionKey`, `decryptField`, `isEncrypted`. Content is encrypted at rest but handled as plaintext in memory.

### Real-time Collaboration

`lib/noteCollaboration.ts` powers live editing (`CollabEditor`) over **Redis pub/sub + SSE** (`api/v1/notes/[noteId]/stream`, `sync`). Each note is a room; clients exchange plaintext diffs and presence. Each SSE connection needs its own subscriber (`createSubscriber()`): a subscribed ioredis connection cannot issue normal commands. Persistence (with encryption) goes through the `updateNote` server action.

### Components

- `components/ui/` — Radix primitives styled with Tailwind (shadcn/ui pattern).
- `components/` — shared feature components (`NavBar`, `NavSearch`, `ShareDialog`, `QuickNote`, …).
- Route-specific components live next to their route, not in `components/`.
- Forms: React Hook Form + Zod (schemas in route `lib/`).

### Storage

`api/v1/storage` + `utils/storage`: S3-compatible (`S3_*`, `app/api/v1/storage/lib/`) or local filesystem (`STORAGE_PATH`). Sharp optimizes images. Unsplash search via `api/v1/images/unsplash`.

### Internationalization

next-intl; messages in `messages/{en,es,fr,de}.json`, setup in `i18n/`. All user-facing strings go through it; add keys to every locale file.

### Design System

See `STYLE_GUIDE.md` (semantic color tokens, typography, component specs). Dark/light via class-based Tailwind dark mode, persisted per user.

## Testing

Vitest + jsdom (`vitest.config.mts`). Tests are colocated as `*.test.ts(x)`; shared helpers in `utils/test` (`renderWithIntl`, `commonMocks`). `vitest.setup.ts` mocks next-intl (against `messages/en.json`), localStorage and Radix globals, and loads `prisma/singleton.ts`, which replaces `@/prisma/client` with a `vitest-mock-extended` deep mock (`prismaMock`).

Coverage excludes `**/route.ts`, test files, JS files, `components/icons`, `prisma/**`. CI (`.github/workflows`): `test.yml`, `lint.yml`, `sonarqube.yml` (SonarCloud reads `coverage/lcov.info`).

## Conventions

- Never use `any` in tests or any other code. If a suitable type does not exist, create one.
- Match the surrounding code's style, naming and comment density.
