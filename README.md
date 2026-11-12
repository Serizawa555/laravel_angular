# PhoneShop — Laravel 13 API + Angular 22 SPA

A learning-project e-commerce shop (phones + accessories). Full brief in
[`PROMPT.md`](PROMPT.md); architecture notes for AI/dev onboarding in
[`CLAUDE.md`](CLAUDE.md) + [`.claude/`](.claude). Decisions in
[`docs/DECISIONS.md`](docs/DECISIONS.md).

```
backend/    Laravel 13 API (runs in Sail / Docker: PHP 8.5, PostgreSQL 18, Redis, Mailpit)
frontend/   Angular 22 SPA (standalone, zoneless, Tailwind 4) — dev-proxies /api + /sanctum
docs/       DECISIONS.md (ADR log)
```

## Prerequisites
- **Docker** (for the backend stack via Laravel Sail)
- **PHP 8.3+** and **Composer** on the host (to bootstrap the backend)
- **Node.js** — use an **LTS** release (**20 / 22 / 24**). Node 25 works but is not LTS and
  Angular will warn.

## Setup (under 5 commands)
```bash
# 1. Backend deps + boot the Docker stack (Postgres, Redis, Mailpit)
cd backend && composer install && ./vendor/bin/sail up -d

# 2. Migrate the database
./vendor/bin/sail artisan migrate

# 3. Frontend deps
cd ../frontend && npm install

# 4. Run the Angular dev server (proxies to the API)
npm start
```
Then open **http://localhost:4200** (SPA) — it talks to the API at **http://localhost:8000**
through the dev proxy. Mailpit UI: **http://localhost:8025**.

`make help` lists shortcuts for all of the above (`make setup`, `make up`, `make serve`, …).

## Verify it's wired
```bash
curl http://localhost:8000/api/v1/health          # {"ok":true,"app":"PhoneShop",...}
curl -i http://localhost:8000/sanctum/csrf-cookie  # sets XSRF-TOKEN cookie
```

## Test & quality
| | Command |
|---|---|
| Backend tests (Pest) | `cd backend && ./vendor/bin/sail test` |
| PHP format (Pint) | `cd backend && ./vendor/bin/sail pint` |
| Static analysis (Larastan) | `cd backend && ./vendor/bin/sail php vendor/bin/phpstan analyse` |
| Frontend build | `cd frontend && npm run build` |
| Frontend tests (Vitest) | `cd frontend && npm test` |

## Demo accounts
Seeded by `./vendor/bin/sail artisan db:seed` (all password `password`): superadmin from `.env`
(`SUPERADMIN_*`), `admin@phoneshop.test`, `editor@phoneshop.test`, `customer@phoneshop.test`.

## Status
**All core milestones (1–10) complete** — a working shop: storefront (home, featured slider,
filterable listing, product pages with variant selection), favorites + cart (guest → user merge),
checkout with a mock payment gateway and downloadable order JSON, EN/RO i18n, and a role-based
admin back office. 60 backend tests + frontend unit tests pass; CI in `.github/workflows/ci.yml`;
an e2e happy-path in `frontend/e2e/`. Per-milestone decisions: [`docs/DECISIONS.md`](docs/DECISIONS.md);
ERD: [`docs/ERD.md`](docs/ERD.md).

Open the storefront at **http://localhost:4200** and sign in as `admin@phoneshop.test` /
`password` to see the **Admin** area. Deferred (nice-to-have): product comparison, a deeper a11y
pass, and phase-2 items (SSR/SEO, search, reviews, emails). See [`PROMPT.md`](PROMPT.md) §10–11.

### End-to-end (Playwright)
```bash
cd frontend && npx playwright install && npx playwright test   # backend must be up on :8000
```
