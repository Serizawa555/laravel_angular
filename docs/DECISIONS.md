# Decisions (ADR log)

Short, append-only record of choices that are reversible-but-notable. Newest first.

## 2026-11-10 — Milestone 1: project scaffold
- **Monorepo**: `backend/` (Laravel) + `frontend/` (Angular), single git repo. Matches PROMPT §2.
- **Backend = Laravel 13.40**, PHP requirement `^8.3`. Created via `composer create-project`.
- **Sail defaults are newer than the brief**: Sail installed **PHP 8.5** (`sail-8.5/app`) and
  **PostgreSQL 18** (`postgres:18-alpine`), vs PROMPT's 8.4 / PG17. Kept the newer defaults —
  they satisfy "current major, PHP ≥ 8.3" and avoid pinning to superseded images. Redis +
  Mailpit as specified. Compose file is `backend/compose.yaml` (Sail's current naming, not
  `docker-compose.yml`).
- **Auth plumbing**: Sanctum installed via `install:api`; enabled **SPA cookie mode** now
  (`statefulApi()` middleware + `SANCTUM_STATEFUL_DOMAINS`/`SESSION_DOMAIN`/`FRONTEND_URL` in
  `.env`, `SESSION_DRIVER=database`). Full login/register/guards land in milestone 2.
- **API versioning**: all routes under `/api/v1` (`routes/api.php`). Added `GET /api/v1/health`
  (proxy smoke test) and a guarded `GET /api/v1/me` stub.
- **Frontend = Angular 22.2**, **zoneless** (`provideZonelessChangeDetection()`, zone.js removed),
  standalone, no SSR (SSR is phase 2 per PROMPT §2). `provideHttpClient(withFetch, withXsrf…)`
  wired for Sanctum's `XSRF-TOKEN` → `X-XSRF-TOKEN`.
- **Dev proxy**: `frontend/proxy.conf.json` forwards `/api` + `/sanctum` to `http://localhost:8000`
  so cookies/CSRF are same-origin. Wired into `angular.json` serve options.
- **Styling = Tailwind CSS 4** (CSS-first: `@import "tailwindcss"` in `styles.css`,
  `@tailwindcss/postcss` in `.postcssrc.json`). No `tailwind.config.js` needed at this stage.
- **Backend tooling**: Pest 4.7 (+ pest-plugin-laravel), Larastan 3.14 (`phpstan.neon`, level 6),
  Pint (bundled).
- **Deferred to their milestones** (not installed yet): spatie packages
  (permission/translatable/query-builder/medialibrary/activitylog), Scramble, Transloco, Swiper,
  Angular CDK/Material, Vitest/Playwright config, angular-eslint. Keeps milestone 1 lean + runnable.
- **Laravel Boost**: `backend/CLAUDE.md` (auto-generated nudge to install `laravel/boost`) left
  in place but **not installed** — out of scope; our context kit lives in root `.claude/`.

### Open follow-ups
- **Node 25 is not an LTS** (Angular warns; build still works). Recommend the user run on Node 22
  or 24 LTS for the project. See README.
- Publish/adjust `config/cors.php` (`supports_credentials=true`) before any cross-origin (non-proxy)
  use. Not needed while the dev proxy keeps requests same-origin.
