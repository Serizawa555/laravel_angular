# CLAUDE.md — PhoneShop (Laravel 13 API + Angular 22 SPA)

A learning-project e-commerce shop (mobile phones + accessories). The **source of truth for
scope and architecture is [`PROMPT.md`](PROMPT.md)** — read it for the full brief. This file +
`.claude/` is the fast-orientation kit; it points at where things live and the rules that are
easy to get wrong.

> **Status (as of 2026-11-10): milestones 1–10 complete** — the shop is built end to end. Auth
> (Sanctum SPA + spatie roles), catalog schema + seeded demo data, public catalog API
> (filters/facets/sort/detail/i18n), storefront (home + featured slider + URL-synced listing),
> PDP (variant selector + dynamic specs), favorites + cart (guest→user merge), checkout + mock
> payment (+ order JSON), admin back office (products/variants/specs/publish/featured/orders/
> users/taxonomies/activity), and polish (caching, recently-viewed, cross-tab auth, CI, Playwright
> e2e spec). 60 backend tests + frontend unit tests green. Per-milestone decisions and what's
> **deferred** (product comparison, deeper a11y, phase-2 SSR/search/reviews) are in
> [`docs/DECISIONS.md`](docs/DECISIONS.md). The `.claude/context/*` docs describe the intended
> architecture; refresh them against the code with `/bootstrap-context` as it evolves.

## Who the user is (read before explaining anything)
Experienced **PHP (WordPress/Drupal)** + **front-end (React/Vue/jQuery)** dev who has **never
used Laravel or Angular**. When a new Laravel/Angular concept first appears, explain it
**briefly** and map it to a Drupal/React analog (Eloquent ≈ Drupal entities, Policies ≈
permissions/access callbacks, taxonomies ≈ vocabularies, Angular signals ≈ Vue `ref`, Angular
services/DI ≈ React context/hooks). Follow each framework's **idioms**, not ported habits.
Deliver in **small runnable milestones** — each works + has tests before the next. Ask before
decisions expensive to reverse (schema, auth model, package choice); otherwise pick a sensible
default and say so.

## Routing table — where to look
| I need to know about… | Read |
|---|---|
| Stack, repo layout, run/test commands, dev prefix | [`.claude/context/project-overview.md`](.claude/context/project-overview.md) |
| Laravel API — structure, Actions/Services, policies, packages | [`.claude/context/backend-laravel.md`](.claude/context/backend-laravel.md) |
| Angular SPA — components, signals, stores, i18n, routing | [`.claude/context/frontend-angular.md`](.claude/context/frontend-angular.md) |
| Domain model — entities, tables, enums, variants, specs | [`.claude/context/content-model.md`](.claude/context/content-model.md) |
| Add an endpoint / Action / policy / migration | [`.claude/workflows/backend-dev.md`](.claude/workflows/backend-dev.md) |
| Add a page / component / store / translation | [`.claude/workflows/frontend-dev.md`](.claude/workflows/frontend-dev.md) |
| The config system (taxonomies, attrs, roles, settings) | [`.claude/workflows/config-and-seed.md`](.claude/workflows/config-and-seed.md) |

## Context maintenance
After code lands, when these paths change, refresh the matching doc:
```bash
git diff main --name-only
```
| Changed path | Update |
|---|---|
| `backend/app/**`, `backend/routes/**`, `backend/composer.json` | `context/backend-laravel.md`, `workflows/backend-dev.md` |
| `backend/database/migrations/**`, `backend/app/Models/**` | `context/content-model.md` |
| `backend/database/seeders/**`, `backend/config/shop.php` | `workflows/config-and-seed.md` |
| `frontend/src/**`, `frontend/package.json` | `context/frontend-angular.md`, `workflows/frontend-dev.md` |
| stack/tooling/env | `context/project-overview.md` |

## Non-negotiables / key conventions
- **Money is integers in bani** (1 MDL = 100 bani). Never floats. Currency is **MDL**;
  format with `Intl.NumberFormat('ro-MD' | 'en')`.
- **Server-side authorization is the real security.** Policies/Gates on every admin endpoint;
  Angular guards + hidden buttons are UX only. `Gate::before` grants superadmin everything.
- **Never trust client prices.** Checkout recalculates subtotal/stock server-side in a DB
  transaction.
- **Thin controllers.** Business logic lives in Actions/Services (`PlaceOrder`, `PublishProduct`);
  output through API Resources; validate with Form Requests. No N+1 — eager-load,
  `Model::preventLazyLoading()` in dev.
- **Translatable content** = JSON-per-locale (spatie/laravel-translatable), **EN default + RO**.
  Public API returns one locale (from `Accept-Language`); admin API returns all locales.
- **Type-specific specs are data-driven.** `products.specs` (JSONB) is validated/rendered from
  `attribute_definitions` — do not hard-code per-type spec fields in forms or validators.
- **RAM / storage / color are variant options**, not specs. Only realistic combinations exist.
- **Angular is signal-first**: standalone components, `signals`, zoneless, new control flow
  (`@if`/`@for`), `inject()`. No NgRx. No NgModules. Forms use **plain signals + controlled inputs**
  (Signal Forms' `[control]` directive is still privately exported in 22.2 — see DECISIONS).
- **The browser caches no catalog data — the API is the single source.** Favorites store only
  product **IDs** (`favorites:v2`) and refetch cards via `GET /products?filter[ids]=`; nothing about
  price/stock/name/image is persisted client-side.
- **All listing/filter state lives in the URL query string** (shareable, back-button works) — the
  listing reads `queryParamMap` directly (no FiltersStore). Locale is a URL prefix: `/en/…`, `/ro/…`.
- **Secrets only in `.env`** (never committed). Superadmin is seeded from `.env`, never hard-coded.
- **Media**: products fall back to a bundled **SVG placeholder** (`public/images/placeholder.svg`)
  when they have no image; real uploads go through Medialibrary conversions (`thumb`/`card`/`large`).
  No real retailer photos.
- **Do not copy retailer marketing text/photos.** Seed only factual specs + approximate MDL
  prices, with source URL + date; write original short EN/RO descriptions.
- Keep **`docs/DECISIONS.md`** (short ADR log) updated for reversible-but-notable choices.
