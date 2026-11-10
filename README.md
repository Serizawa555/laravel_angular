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

## Status
**Milestone 1 (setup) complete.** Next: milestone 2 (Sanctum SPA auth + spatie roles). See
[`PROMPT.md §12`](PROMPT.md) for the full roadmap.
