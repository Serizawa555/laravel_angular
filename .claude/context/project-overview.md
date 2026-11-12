# Project overview — PhoneShop (Laravel 13 API + Angular 22 SPA)

A small, realistic online shop for **mobile phones + accessories** (cases, Bluetooth/wired
headsets). Public storefront (browse, filter, PDP, favorites, cart, mock checkout) + role-based
back office. **EN (default) + RO**, currency **MDL**. See [`../../PROMPT.md`](../../PROMPT.md)
for the full brief — this file is the orientation summary.

> **Milestones 1–10 built** (as of 2026-11-12) — storefront + admin work end to end. Installed
> versions: **Laravel 13.40 / PHP 8.5 / PostgreSQL 18 / Angular 22.2** (Sail's current defaults —
> newer than the brief's 8.4/PG17; see `docs/DECISIONS.md`). Rows marked *(not installed)* were in
> the brief but were deferred.

## Stack
| Layer | Choice |
|---|---|
| Backend | **Laravel 13.40**, PHP **8.5** (Sail), API-only (`install:api`) |
| Auth | **Sanctum SPA cookie mode** (session + CSRF; no tokens in localStorage) |
| Roles | **spatie/laravel-permission** |
| Translatable content | **spatie/laravel-translatable** (JSON columns, per-locale) |
| Filtering API | **hand-rolled `App\Queries\ProductQuery`** reading `?filter[...]`. spatie/laravel-query-builder is installed but unused — facets need to re-apply every filter *except* the counted one, which it doesn't do cleanly |
| Media | **spatie/laravel-medialibrary** — `gallery` collection, conversions thumb/card/large (`nonQueued`), SVG placeholder fallback |
| Audit | **spatie/laravel-activitylog** (product lifecycle; `/admin/activity`) |
| API docs | **dedoc/scramble** — *(not installed)*; no `/docs/api` yet |
| DB | **PostgreSQL 18** — relational + **JSONB** `specs` (GIN-indexed); Redis for cache/queue/session |
| Backend tests / QA | **Pest** (66 tests), **Laravel Pint**, **Larastan** (level 6) |
| Frontend | **Angular 22.2** — standalone, **signals**, **zoneless**, `@if`/`@for`, `inject()` |
| Forms | **plain signals + controlled inputs** (Signal Forms' `[control]` directive is still privately exported in 22.2 — see DECISIONS) |
| HTTP state | `firstValueFrom`/Observables feeding **signal-based stores** (`stores/`, `core/*.service.ts`). No NgRx |
| UI | **Tailwind CSS 4** (brand theme via `@theme` tokens) + component classes in `styles.css`. No Angular Material/CDK yet |
| UI i18n | **Transloco** — runtime switch, locale in URL (`/en`, `/ro`), `Accept-Language` interceptor |
| Slider | **Swiper** (web-component build; `CUSTOM_ELEMENTS_SCHEMA`) |
| Frontend tests / QA | **Vitest** (9 tests) + **Playwright** e2e spec (`frontend/e2e/`). **ESLint not configured** |
| Local dev | **Laravel Sail** (Docker: PHP 8.5, PostgreSQL 18, Redis, Mailpit). Herd is an OK alt |

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
PostgreSQL 18 (relational + JSONB specs, GIN)   Redis (cache/queue/session)   Mailpit
   ^
   |  seeders apply structural config + demo catalog (config-and-seed.md)
Checkout -> MockPaymentGateway -> writes storage/app/private/orders/{number}.json
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
| Frontend tests | `cd frontend && npx ng test --watch=false` (Vitest) · `npx playwright test` (e2e, needs `npx playwright install`) |
| Frontend lint | *(not configured — no `npm run lint`)* |
| All-in-one | `make help` lists shortcuts (`make up`, `make serve`, `make be-test`, `make fe-test`, `make fresh`, …) |

## Local-dev prefix
**`./vendor/bin/sail`** for anything PHP/Composer/artisan/Pest (runs in-container). Frontend
Node/Angular commands run on the host under `frontend/`. The Angular dev server proxies `/api`
and `/sanctum` to Laravel so Sanctum cookies + CSRF work same-origin.
