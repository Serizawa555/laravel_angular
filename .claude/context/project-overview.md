# Project overview — PhoneShop (Laravel 13 API + Angular 22 SPA)

A small, realistic online shop for **mobile phones + accessories** (cases, Bluetooth/wired
headsets). Public storefront (browse, filter, PDP, favorites, cart, mock checkout) + role-based
back office. **EN (default) + RO**, currency **MDL**. See [`../../PROMPT.md`](../../PROMPT.md)
for the full brief — this file is the orientation summary.

> Milestone 1 scaffolded as of 2026-11-10. Installed versions: **Laravel 13.40 / PHP 8.5 /
> PostgreSQL 18 / Angular 22.2** (Sail's current defaults — newer than the brief's 8.4/PG17; see
> `docs/DECISIONS.md`). Rows below marked *(later)* aren't installed yet.

## Stack
| Layer | Choice |
|---|---|
| Backend | **Laravel 13.40**, PHP **8.5** (Sail), API-only (`php artisan install:api`) |
| Auth | **Sanctum SPA cookie mode** (session + CSRF; no tokens in localStorage) |
| Roles | **spatie/laravel-permission** |
| Translatable content | **spatie/laravel-translatable** (JSON columns, per-locale) |
| Filtering API | **spatie/laravel-query-builder** (`?filter[brand]=apple&sort=-price`) |
| Media | **spatie/laravel-medialibrary** (conversions: thumb, card, large) |
| Audit | **spatie/laravel-activitylog** |
| API docs | **dedoc/scramble** (OpenAPI at `/docs/api`) |
| DB | **PostgreSQL 18** — relational + **JSONB** `specs` (GIN-indexed); Redis for cache/queue/session |
| Backend tests / QA | **Pest**, **Laravel Pint**, **Larastan** |
| Frontend | **Angular 22** — standalone, **signals**, zoneless, `@if`/`@for`, `inject()` |
| Forms | **Signal Forms** (Reactive Forms only if a lib demands it) |
| HTTP state | `httpResource()`/`resource()` + small signal-based stores (services). No NgRx |
| UI | **Tailwind CSS 4** + **Angular CDK** (+ optional Angular Material in admin) |
| UI i18n | **Transloco** — runtime switch, locale in URL (`/en`, `/ro`) |
| Slider | **Swiper** (web-component build) |
| Frontend tests / QA | **Vitest** + **Playwright** (e2e); angular-eslint + Prettier |
| Local dev | **Laravel Sail** (Docker: PHP 8.4, PostgreSQL, Redis, Mailpit). Herd is an OK alt |

## Repo layout (monorepo)
```
laravel_angular/
├─ backend/     # Laravel 13 API            → context/backend-laravel.md
├─ frontend/    # Angular 22 (storefront + /admin lazy area) → context/frontend-angular.md
├─ docs/        # DECISIONS.md (ADR log), API notes, ERD (Mermaid)
├─ backend/compose.yaml (Sail) · Makefile (root)
├─ PROMPT.md    # master brief (source of truth)
└─ CLAUDE.md + .claude/
```

## How the pieces connect
```
Browser (Angular SPA, locale in URL /en|/ro)
   | dev: ng serve proxies /api + /sanctum -> Laravel (same-origin cookies + CSRF)
   v
Laravel API (/api/v1, JSON Resources)
   |  Accept-Language -> translated strings (public: 1 locale; admin: all locales)
   |  Form Request validation -> thin Controller -> Action/Service -> Eloquent
   v
PostgreSQL 17 (relational + JSONB specs, GIN)   Redis (cache/queue/session)   Mailpit
   ^
   |  seeders apply structural config + demo catalog (config-and-seed.md)
Checkout -> MockPaymentGateway -> writes storage/app/orders/{number}.json
```

## Build / run / test commands
Backend runs inside **Sail** (Docker). Prefix PHP/Composer/artisan with `./vendor/bin/sail`.
| Goal | Command |
|---|---|
| Start stack | `./vendor/bin/sail up -d` |
| Migrate + seed | `./vendor/bin/sail artisan migrate --seed` |
| Fresh DB | `./vendor/bin/sail artisan migrate:fresh --seed` |
| Backend tests | `./vendor/bin/sail test` (Pest) |
| Format / analyse | `./vendor/bin/sail pint` · `./vendor/bin/sail php vendor/bin/phpstan analyse` |
| Frontend dev server | `cd frontend && npm start` (`ng serve`, proxies to API) |
| Frontend tests | `cd frontend && npm test` (Vitest) · `npx playwright test` (e2e) |
| Frontend lint | `cd frontend && npm run lint` |

## Local-dev prefix
**`./vendor/bin/sail`** for anything PHP/Composer/artisan/Pest (runs in-container). Frontend
Node/Angular commands run on the host under `frontend/`. The Angular dev server proxies `/api`
and `/sanctum` to Laravel so Sanctum cookies + CSRF work same-origin.
