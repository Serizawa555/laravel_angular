# PhoneShop — Laravel 13 API + Angular 22 SPA

A small but realistic e-commerce app (mobile phones & accessories), built to **demonstrate
full-stack ability across Laravel and Angular**. It covers a public storefront, a role-based admin
back office, EN/RO internationalisation, a cart + mock checkout, and a data-driven catalog — with
tests, static analysis, and CI.

> **Showcase project.** The catalog is **demo data**: brand names and specs are factual references,
> prices are approximate placeholders, and product imagery is a generated placeholder — no retailer
> marketing copy or photos are reproduced.

---

## Highlights

**Storefront**
- Home with a **featured slider** (Swiper) and a full product listing
- **Filterable catalog** — brand, segment, colour/RAM/storage, price, in-stock, "compatible with",
  text search — with **facet counts**, sort, grid/list, pagination; **all state lives in the URL**
- **Product pages** with a variant selector (invalid/out-of-stock combinations disabled) and a
  **dynamic spec table** driven by the database, not hard-coded
- **Favorites** and **cart** that work for guests and merge into the account on login
- **Checkout** with a mock payment gateway and a downloadable **order JSON**
- **EN / RO** with the locale in the URL (`/en`, `/ro`) and a live language switcher

**Admin back office** (role-gated)
- Products CRUD with dynamic spec fields, a variant matrix, image uploads, and a
  draft → published ⇄ unpublished → soft-deleted → restored lifecycle
- Featured-slider manager, orders, users & roles, taxonomies, attribute definitions, activity log

---

## Tech stack

| Layer | Choice |
|---|---|
| **Backend** | Laravel 13 (API-only), PHP 8.5, PostgreSQL 18 (JSONB + GIN), Redis |
| **Auth / RBAC** | Sanctum SPA cookie auth · spatie/laravel-permission (policies + `Gate::before`) |
| **Catalog** | spatie/laravel-translatable (EN/RO JSON), medialibrary (images), activitylog (audit) |
| **Frontend** | Angular 22 — standalone, **signals**, **zoneless**, new control flow, `inject()` |
| **UI / i18n** | Tailwind CSS 4 (custom brand theme) · Transloco · Swiper |
| **Quality** | Pest, Larastan, Laravel Pint · Vitest · Playwright (e2e) · GitHub Actions CI |
| **Local dev** | Laravel Sail (Docker) · Mailpit |

---

## Getting started

**Prerequisites:** Docker, PHP 8.3+ & Composer (to bootstrap the backend), and Node.js (LTS: 20/22/24).

```bash
# 1. Backend deps + Docker stack (PostgreSQL, Redis, Mailpit)
cd backend && composer install && cp -n .env.example .env && ./vendor/bin/sail up -d

# 2. App key, migrate + seed the demo catalog
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate --seed

# 3. Frontend deps + dev server (proxies /api + /sanctum to the API)
cd ../frontend && npm install && npm start
```

Open **http://localhost:4200**. The API runs at **http://localhost:8000**, Mailpit at
**http://localhost:8025**. `make help` lists shortcuts (`make up`, `make serve`, `make fresh`, …).

### Demo accounts (password: `password`)
| Role | Email |
|---|---|
| Admin | `admin@phoneshop.test` |
| Editor | `editor@phoneshop.test` |
| Customer | `customer@phoneshop.test` |

The **superadmin** is seeded from `.env` (`SUPERADMIN_*`). Sign in as admin/superadmin to see the
**Admin** area.

---

## Testing & quality

```bash
# Backend (in Sail)
./vendor/bin/sail test                               # Pest (feature + role matrix + checkout)
./vendor/bin/sail pint --test                        # code style
./vendor/bin/sail php vendor/bin/phpstan analyse     # Larastan (level 6)

# Frontend
cd frontend && npx ng test --watch=false             # Vitest
npx playwright install && npx playwright test        # e2e happy-path (backend must be up)
```

CI runs the backend and frontend gates on every push — see `.github/workflows/ci.yml`.

---

## Architecture

```
Browser ── Angular SPA (locale in URL) ──► /api proxied to ──► Laravel API (/api/v1, JSON Resources)
                                                                     │  Accept-Language → EN/RO
                                                                     ▼
                              PostgreSQL (relational + JSONB specs)   Redis   Mailpit
```

```
laravel_angular/
├─ backend/     Laravel 13 API (thin controllers → Actions/Services → Eloquent)
├─ frontend/    Angular 22 SPA (storefront + lazy /admin)
├─ docs/        DECISIONS.md (ADR log) · ERD.md (Mermaid)
└─ .claude/     project context + workflow docs
```

A few decisions worth calling out (full log in [`docs/DECISIONS.md`](docs/DECISIONS.md)):

- **Data-driven specs** — type-specific fields live in a JSONB `specs` column (GIN-indexed),
  *described* by an `attribute_definitions` table, so the admin form, the product page and
  validation all share one source of truth. Adding a spec is a data change, not a migration.
- **Money is integer bani** end-to-end; checkout recomputes prices and stock server-side in a
  transaction — the client total is never trusted.
- **Single source of truth** — the browser caches no catalog data; favorites store only product
  IDs and refetch fresh cards from the API.
- **Server-side authorization is the real gate**; Angular guards and hidden buttons are UX only.

---

## License

[MIT](LICENSE) © 2026 Sergiu Gheciu ([@Serizawa555](https://github.com/Serizawa555))

Code is MIT-licensed. Third-party brand names and product specifications in the demo catalog belong
to their respective owners and are used here only as illustrative sample data.
