# Decisions (ADR log)

Short, append-only record of choices that are reversible-but-notable. Newest first.

## 2026-11-12 — Fix: product-card quick-add & favorites single-source-of-truth
- **The client stores only IDs; the API is the single source of catalog data.** Favorites in
  localStorage are now a `number[]` under `favorites:v2` (legacy full-`ProductCard` snapshots under
  `favorites` are migrated to IDs on first load, then the old key is dropped). Cards are always
  fetched fresh via `GET /products?filter[ids]=…`, so price/stock/name/image can't go stale and
  unpublished favorites silently disappear (the store prunes ids the API stops returning). This is
  what fixed the faded/dead quick-add button: stale snapshots lacked `default_variant_id`.
- **Quick-add only for single-variant products.** Cards now show **"Choose options"** (a link to the
  PDP) when `variant_count > 1` — we don't silently guess a phone's colour/RAM/storage. Single-variant
  products get a real quick-add. (`variant_count` added to `ProductCardResource`.)
- **Feedback + errors**: a small signal-based `ToastService` (+ `aria-live` host) shows success
  ("Added to cart — {name}" with a View-cart link) or the API error message; the header cart badge
  pulses. `CartStore` methods throw typed `HttpErrorResponse` and **retry once on 419** after
  re-priming CSRF.
- **Accessible card**: root is `<article>`; the title is a **stretched link** (`after:absolute
  after:inset-0`) so the whole card is clickable, while the favorite/add buttons are siblings with
  `z-10` — no interactive elements nested inside an `<a>`, so keyboard/screen-reader work and the
  `preventDefault/stopPropagation` hacks are gone. Cart icon is a crisp inline SVG; disabled state is
  grey + `cursor-not-allowed` (not translucent orange).


## 2026-11-10 — Milestone 10: polish
- **Caching**: public `featured` + `taxonomies` use a **version-keyed cache** (`CatalogCache`) —
  a single `catalog:version` counter bumped on any Product/ProductVariant/Term change invalidates
  all derived keys. Works on any store (no tag support needed) and keys include the locale.
  Mass updates skip model events, so `FeaturedController` bumps explicitly. (Listing/detail
  caching can follow the same pattern — left uncached for now to keep facet correctness simple.)
- **Recently viewed** products in localStorage (`RecentlyViewedStore`), recorded on PDP visit,
  shown on the home page.
- **Cross-tab auth sync**: `AuthService` broadcasts an `auth-sync` localStorage key on
  login/logout; other tabs listen for the `storage` event and re-check `/me`. Refresh persistence
  is inherent (the app-init `/me` call restores the session cookie).
- **CI**: `.github/workflows/ci.yml` — backend job (Postgres service, Pint + Larastan + Pest) and
  frontend job (npm ci, lint, Vitest, build).
- **E2E**: Playwright config + a happy-path spec (browse → category → PDP → cart → checkout →
  order JSON) in `frontend/e2e/`. Run with `npx playwright install && npx playwright test` (backend
  must be up). Not executed in this environment (no browser binaries).
- **Deferred (nice-to-have)**: product comparison (≤3), a deeper a11y audit, SSR/SEO + search +
  reviews + emails + installment calculator (PROMPT §10 "could have" / phase 2).
- Final state: 60 backend tests green, Pint + Larastan clean, frontend builds + unit tests pass,
  `migrate:fresh --seed` rebuilds cleanly.

## 2026-11-10 — Milestone 9: admin back office
- **Server-side authorization is the real gate**: `ProductPolicy` for the product lifecycle
  (viewAny/create/update/publish/delete/restore/forceDelete) mapped to spatie permissions;
  superadmin bypasses via `Gate::before`. Other admin areas gated by **`can:<permission>`
  route middleware** (`featured.manage`, `orders.viewAny`, `users.manage`, `taxonomies.manage`,
  `attributes.manage`, `activitylog.view`). `AuthorizesRequests` added to the base controller.
- **Dynamic spec validation**: `SpecsValidator` builds rules from `attribute_definitions` for the
  product type — the admin form, the public API and validation all share one source of truth.
- **Editors create drafts only**; publish/unpublish/delete/restore/force-delete are admin+
  (force-delete superadmin-only). Variant matrix synced on save (upsert by id/sku, prune missing).
- **spatie/laravel-activitylog** logs product lifecycle (`status`/`featured`/`price` changes);
  `GET /admin/activity` exposes it. v5 moved the trait to
  `Spatie\Activitylog\Models\Concerns\LogsActivity` and `LogOptions` to `Support\` (not the v4
  `Traits\`/root namespaces) — gotcha when wiring.
- **Users**: admins assign customer/editor/admin only; **cannot modify a superadmin or grant
  superadmin** (enforced in the controller).
- **Angular admin** at `/:lang/admin` (lazy, `roleGuard('editor','admin','superadmin')`): shell +
  products list, product form (General EN/RO + dynamic Specs + Variants), featured manager, orders,
  users. Menu items appear per permission from `/me`.
- 58 backend tests (full admin permission matrix + lifecycle + activity) green; Pint + Larastan
  clean; frontend builds + unit tests pass.

## 2026-11-10 — Milestones 5–8: storefront, PDP, cart/favorites, checkout
- **i18n (M5)**: Transloco runtime switch; **locale lives in the URL** (`/:lang(en|ro)`). A
  `LocaleService` is the single source of truth (keeps Transloco in sync, builds `[lang, ...]`
  router links, swaps the lang segment on switch). `acceptLanguageInterceptor` tells the API which
  locale to translate to. `langGuard` activates the language from the route.
- **Listing (M5)**: all filter/sort/page state lives in the **URL query string**; the component
  derives API params from `queryParamMap` and reloads via an effect. Facets drive the filter UI;
  grid/list persists in localStorage. Featured slider = **Swiper web component**
  (`CUSTOM_ELEMENTS_SCHEMA`). Home = slider + the listing.
- **PDP (M6)**: variant selector derives axes from the variants; an option is **disabled unless a
  combined in-stock variant exists**; price/stock follow the selected variant. Specs render
  dynamically from `spec_groups` (grouped + labelled by the API).
- **Cart (M7)**: works for **guests via an encrypted cookie** (`CartService`) and for users;
  **merges on login** (`mergeOnLogin` in `AuthController`). Signal `CartStore`. CSRF primed once at
  app init (`CsrfService`) so mutations carry the header.
- **Favorites (M7)**: **localStorage is the display source** (works offline/guests); logged-in
  users also sync to the server (`/favorites/sync` on login) for cross-device persistence. Heart
  toggles on cards + PDP.
- **Forms**: still plain signals + controlled inputs (consistent with the M2 decision).
- **Checkout (M8)**: `PlaceOrder` action recomputes **prices + stock server-side in a DB
  transaction** (client total ignored), runs the **`MockPaymentGateway`** (bound via interface —
  `4242…`=success, `4000…0002`=declined), decrements stock, clears the cart, and writes
  `storage/app/private/orders/{number}.json` (Laravel 11+ `local` disk root is `.../private`; brief
  said `storage/app/orders`). Declined → `402` + order kept `failed`, cart preserved.
  Confirmation page shows the pretty JSON with a **Download JSON** button.
- **Order JSON by number is public** (`/orders/{number}/json`) so guests see their just-placed
  order — numbers are guessable, a **demo trade-off** (noted; tighten before real use).
- Tests: 48 backend (catalog/cart/favorites/checkout incl. decline, stock, recompute, ownership)
  + frontend build/unit green; Pint + Larastan clean.

## 2026-11-10 — Milestone 4: public catalog API
- **Endpoints** under `/api/v1`: `GET /products` (filter/sort/paginate), `/products/facets`,
  `/products/featured`, `/products/{slug}`, `/taxonomies`. API Resources shape output
  (card/detail/term/variant/option-value).
- **Locale from `Accept-Language`** via a `SetLocale` middleware appended to the api group;
  public responses return the single active locale (spatie translatable accessors).
- **Filtering hand-rolled in `App\Queries\ProductQuery`** (not spatie/query-builder, though it's
  installed) so **facets can re-apply every filter except the one being counted** — correct,
  context-aware facet counts. Param shape matches PROMPT `?filter[...]`. Filters: type, brand,
  segment, color/ram/storage (variant options), price_min/max, in_stock, compatible_with, q
  (ILIKE on name/short_description JSON text).
- **Sorting**: `-price|price` via correlated `min(price)` subquery; `name|-name` locale-aware
  (`name->>'<locale>'`); `created_at` default `-created_at`.
- **Facets** computed one query per term/option (fine at 13 products) — simple + obviously correct
  over premature optimisation. Pagination uses `page[number]`/`page[size]` via `currentPageResolver`.
- **Larastan**: added `@property` annotations for cast attributes on `Product` (enum/array casts
  aren't inferred from `casts()`); multi-line docblocks required (combined `@param`/`@return` on one
  line isn't parsed). 13 API tests (filters, sort, facets, locale, 404) — full suite 34 green.

## 2026-11-10 — Milestone 3: catalog schema
- **10 catalog tables** + 2 PHP enums (`ProductType`, `ProductStatus`). Tables: vocabularies,
  terms, option_types, option_values, products, product_variants, variant_option_value,
  product_term, product_compatibility, attribute_definitions. ERD in `docs/ERD.md` (Mermaid).
- **Enums stored as strings** (not DB enum/check) and cast to PHP enums on the models — flexible,
  idiomatic, avoids painful Postgres enum migrations.
- **Translatable fields via spatie/laravel-translatable** (JSON per locale, EN+RO): product
  name/short_description/description, term/vocab/option names+labels, attribute labels.
- **Money = integer bani** on `products.base_price` and `product_variants.price/compare_at_price`
  (model casts to int). `Product::fromPrice()` returns the lowest variant price.
- **`products.specs` is JSONB with a GIN index** (Postgres-only, guarded by driver check) —
  queryable for filters (verified: `where('specs->five_g', true)`). Spec keys are *not* columns;
  they're defined in `attribute_definitions` (matched by `product_type` + `key`).
- **Variants carry arbitrary option axes** via `variant_option_value`: phones use color×ram×storage
  (iPhone omits ram — the schema allows variable axes), accessories use colour only. Only realistic
  combos are seeded.
- **Structural config + demo content via idempotent seeders** (the config-and-seed pattern), keyed
  on stable slug/code/sku: `VocabularySeeder`, `OptionTypeSeeder`, `AttributeDefinitionSeeder`,
  `CatalogSeeder`. Data lives in `database/seeders/data/*.json`.
- **Demo catalog** (`catalog.json`): 13 products (6 phones across economy/mid/flagship, 3 cases,
  2 BT + 2 wired headsets), 29 variants, 3 featured, accessory↔phone compatibility. **Specs are
  factual; MDL prices are approximate placeholders** flagged in the file to verify against
  `darwin.md` / `orange.md` (not present in repo). No retailer copy/photos reproduced.
- **`Model::preventLazyLoading()` enabled outside production** (catches N+1 early) — added to
  `AppServiceProvider`.
- **Deferred**: media (spatie/medialibrary) — not needed for schema; placeholder JPEG + conversions
  come with the storefront/admin (M5/M9). `SpecsValidator` (write-time spec validation) comes with
  the admin/product-write path (M4/M9). 21 Pest tests pass; Pint + Larastan clean.

## 2026-11-10 — Milestone 2: auth & roles
- **Sanctum SPA cookie auth** end-to-end: `POST /api/v1/{register,login,logout}`, `GET /api/v1/me`.
  Login throttled (5/min per email+IP) via a Breeze-style `LoginRequest`. Verified by curl
  (csrf → login → authed /me → logout → 401) and 11 Pest feature tests.
- **spatie/laravel-permission** (guard `web` = the SPA session). Roles: `customer`, `editor`,
  `admin`, `superadmin`. Permissions + role→grant map live in
  `database/seeders/data/roles.json` and are reconciled idempotently by `RolePermissionSeeder`
  (the config-system pattern). **Superadmin bypasses all gates** via `Gate::before` in
  `AppServiceProvider`.
- **Seeders**: `SuperAdminSeeder` reads `SUPERADMIN_*` from `.env` (never hard-coded);
  `DemoUsersSeeder` creates admin/editor/customer demo accounts (password `password`). Wired into
  `DatabaseSeeder` in dependency order.
- **`/me` returns `roles` + flat `permissions`** (`['*']` for superadmin) via `UserResource`, so
  the SPA can gate UI. Access is still enforced server-side.
- **Frontend auth**: signal-based `AuthService` (core/), `authErrorInterceptor` (clears session on
  401), functional guards (`authGuard`/`guestGuard`/`roleGuard`), and `provideAppInitializer`
  hydrating `/me` before the router runs. Pages: login, register, account, home; shell nav shows
  auth state. Routes are lazy-loaded.
- **Forms: plain signals + controlled inputs** (not Signal Forms) for the auth pages. Signal Forms
  is installed-and-available (`@angular/forms/signals`) but its `[control]` directive is still
  exported privately (`ɵNgFieldDirective`) in 22.2, so it was not safe to depend on for template
  binding yet. Revisit for the larger admin forms (milestone 9); plain signals map cleanly to the
  React controlled-input model meanwhile.
- **Routing is not locale-prefixed yet** (`/login`, not `/en/login`) — URL locale + Transloco land
  in milestone 5, per PROMPT. **Forgot/reset password** deferred (needs mail flow) — noted for a
  later pass.

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
