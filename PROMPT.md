# Meta Prompt — "PhoneShop": a Laravel + Angular e-commerce learning project

> Paste this whole file into an AI coding assistant (or keep it in the repo root) as the master brief.
> It is the source of truth for scope, stack and architecture. Work through it milestone by milestone.

---

## 0. Who I am and how to work with me

- I'm an experienced PHP developer (WordPress, Drupal) and front-end developer (React, Vue, jQuery).
- I have **never worked with Laravel or Angular**. This project is how I learn the stack.
- So, while building:
  - Explain each new Laravel/Angular concept **briefly**, the first time it appears. Map it to something I already know when possible, for example:
    - Eloquent models / migrations ≈ Drupal entities / `hook_update_N`
    - Laravel service container ≈ Drupal services.yml / DI
    - Policies & Gates ≈ Drupal permissions & access callbacks
    - Taxonomies ≈ Drupal vocabularies & terms
    - Angular services + DI ≈ React context / custom hooks
    - Angular signals ≈ Vue `ref` / `computed`
  - Follow each framework's **idiomatic conventions** rather than porting WordPress/Drupal or React habits.
  - Deliver in **small, runnable milestones** (section 12). Each milestone must work and have tests before moving on.
  - Ask before any decision that is expensive to reverse (schema shape, auth model, package choice). For small things, choose a sensible default and say so.
  - Keep a `docs/DECISIONS.md` (short ADR log) and update the README with setup/run commands.

---

## 1. Goal

A small but realistic online shop that sells **mobile phones and accessories**:

- at most **12 phones**, across **economy / mid-range / flagship** lines;
- **cases** made for specific phones;
- **Bluetooth headsets** and **wired headsets**.

Public storefront: browse, filter, product details, favorites, cart, mock checkout.
Back office: role-based product management.
Languages: **English (default) and Romanian**, with a language switcher.
Currency: **MDL** (Moldovan leu).

---

## 2. Recommended stack (current as of Nov 2026)

These are the community defaults for a Laravel API + Angular SPA. Use them unless a milestone gives a strong reason to change.

### Backend — Laravel 13 (API only)
| Concern | Choice | Why |
|---|---|---|
| Framework | **Laravel 13**, PHP **8.4** | Current major (released Mar 2026, needs PHP ≥ 8.3) |
| API scaffolding | `php artisan install:api` | API routes + Sanctum |
| Auth | **Laravel Sanctum, SPA cookie mode** (session + CSRF) | Officially recommended for a first-party SPA. No tokens in localStorage |
| Roles/permissions | **spatie/laravel-permission** | De-facto standard |
| Translations of content | **spatie/laravel-translatable** (JSON columns) | Simple per-field EN/RO |
| Filtering/sorting API | **spatie/laravel-query-builder** | `?filter[brand]=apple&sort=-price` out of the box |
| Images | **spatie/laravel-medialibrary** | Uploads + responsive conversions (thumb, card, large) |
| Audit trail | **spatie/laravel-activitylog** | Who edited/published what |
| API docs | **dedoc/scramble** | Auto OpenAPI docs from code |
| Tests | **Pest** | Laravel's default test runner |
| Code style / static analysis | **Laravel Pint**, **Larastan** | |
| Local env | **Laravel Sail** (Docker) — PostgreSQL, Redis, Mailpit | Reproducible on macOS. (Laravel Herd is an acceptable alternative) |

### Database — **PostgreSQL 17**
- Relational data (orders, variants, roles) fits SQL best.
- **JSONB** stores the *type-specific technical specs* of each product. It is indexable (GIN) and queryable for filters.
- Translatable fields are stored as JSON per locale.
- Redis for cache/queue/session (optional in early milestones; the database driver is fine at first).

### Frontend — Angular 22
| Concern | Choice | Why |
|---|---|---|
| Framework | **Angular 22**: standalone components, **signals**, zoneless change detection, new control flow (`@if`, `@for`), `inject()` | Modern signal-first defaults |
| Forms | **Signal Forms** (stable in v22). Use Reactive Forms only if a library requires them | |
| HTTP state | `httpResource()` / `resource()` + small signal-based stores (services) | No NgRx needed at this size |
| UI | **Tailwind CSS 4** + **Angular CDK** (overlays, a11y). Optionally **Angular Material** for the admin area | Full control over the storefront look |
| i18n (UI strings) | **Transloco** — *runtime* language switching. Locale lives in the URL: `/en/...`, `/ro/...` | `@angular/localize` is build-time (one build per language), which makes a live switcher awkward |
| Slider | **Swiper** (web-component build) | Featured-products slider |
| Tests | **Vitest** (Angular default) + **Playwright** for e2e | |
| Lint/format | angular-eslint + Prettier | |
| SSR | **Phase 2 / optional**: Angular SSR + hydration for SEO | Skip at first to keep the learning curve flat |

### Repo layout (monorepo)
```
laravel_angular/
├─ backend/          # Laravel 13 API
├─ frontend/         # Angular 22 app (storefront + /admin lazy area)
├─ docs/             # DECISIONS.md, API notes, ERD
├─ docker-compose.yml (via Sail) / Makefile with common commands
└─ PROMPT.md         # this file
```
In development, the Angular dev server **proxies `/api` and `/sanctum` to Laravel**, so cookies and CSRF work same-origin.

---

## 3. Domain model

### 3.1 Taxonomies (Drupal-style vocabularies)
Use a generic `vocabularies` + `terms` structure (translatable term names, slugs, weight). It drives filters and the admin.

| Vocabulary | Example terms | Applies to |
|---|---|---|
| `product_type` | Phone, Case, Bluetooth headset, Wired headset | all |
| `brand` | Apple, Samsung, Xiaomi, Google, Motorola, JBL… | all |
| `segment` (line) | Economy, Mid-range, Flagship | phones (optional for headsets) |
| `connection` | Bluetooth, USB-C wired, 3.5 mm jack | headsets |
| `case_material` | Silicone, Leather, TPU/Clear, Rugged | cases |

`product_type` is **also a code-level enum** (`phone`, `case`, `headset_bt`, `headset_wired`). It decides which specification schema applies.

### 3.2 Tables (core)
```
products
  id, type (enum), brand_id → terms, segment_id → terms (nullable)
  slug (unique), sku_base
  name (json, translatable), short_description (json), description (json, rich text)
  specs (jsonb)                      -- type-specific technical fields, see 3.3
  base_price (int, bani), status (draft|published|unpublished), published_at
  is_featured (bool), featured_position (1..3, nullable, unique when set)
  created_by, updated_by → users, timestamps, soft deletes

option_types           id, code (color|ram|storage), name (json)
option_values          id, option_type_id, code, label (json), sort, meta (jsonb: {hex:"#1f1f1f"} or {gb:8})
product_variants       id, product_id, sku (unique), price (int, bani), compare_at_price (nullable),
                       stock (int), is_default (bool), timestamps
variant_option_value   variant_id, option_value_id         -- e.g. Black + 8 GB + 256 GB
product_term           product_id, term_id                 -- extra taxonomy tags
product_compatibility  accessory_id → products, phone_id → products   -- "this case fits Galaxy S25"
media                  (medialibrary) images per product and optionally per variant (color-specific photos)

favorites   user_id, product_id, created_at  (unique pair)
carts       id, user_id (nullable), guest_token (nullable, unique), timestamps
cart_items  cart_id, variant_id, quantity, unit_price_snapshot
orders      id, number (e.g. ORD-20261110-0007), user_id (nullable), email, name, phone,
            shipping_address (jsonb), currency ('MDL'), subtotal, shipping, total,
            status (pending|paid|failed|cancelled), payment_status, payment_reference, locale, timestamps
order_items id, order_id, product_id, variant_id, sku, name_snapshot (json),
            options_snapshot (jsonb), unit_price, quantity, line_total
```
Prices are stored as **integers in bani** (1 MDL = 100 bani). Never use floats for money.

### 3.3 Type-specific specifications
Common fields live on `products`. Fields that only matter for one type live in `products.specs` (JSONB). Their **definitions** are stored in an `attribute_definitions` table, so the admin form and the product page can render them dynamically:

```
attribute_definitions
  id, product_type, key, label (json), data_type (string|int|decimal|bool|enum|list),
  unit (nullable: "mAh", "\"", "MP", "h", "g"), options (jsonb for enums),
  group (display, camera, battery…), is_filterable, is_required, sort
```

Proposed keys:

- **Phone:** display_size_in, display_type (OLED/LCD), refresh_rate_hz, resolution, chipset, main_camera_mp, front_camera_mp, battery_mah, charging_w, wireless_charging, os, os_version, sim (dual/eSIM), nfc, 5g, ip_rating, weight_g, dimensions_mm, release_year.
  RAM, storage and color are **variant options**, not specs.
- **Case:** material, compatible models (via `product_compatibility`), magsafe_compatible, drop_protection_m, card_slot, thickness_mm.
- **Bluetooth headset:** form_factor (in-ear/on-ear/over-ear), bluetooth_version, codecs (SBC/AAC/LDAC/aptX), anc, transparency_mode, battery_h, battery_with_case_h, charging_port, wireless_charging_case, ip_rating, multipoint, mic.
- **Wired headset:** connector (USB-C / 3.5 mm / Lightning), cable_length_m, inline_remote, mic, driver_mm, form_factor.

Validation: a backend `SpecsValidator` builds Laravel validation rules from `attribute_definitions` for the given type.

### 3.4 Variants
- **Phones:** color × RAM (4 / 6 / 8 / 12 GB) × storage (64 / 128 / 256 / 512 GB). Only **realistic combinations** exist as variants, each with its own price and stock.
- **Cases & headsets:** color only.
- The product page disables combinations that do not exist or are out of stock. The price and gallery update when the selection changes.

---

## 4. Roles & permissions

Use spatie/laravel-permission. Seed **superadmin = me**, with the email and password taken from `.env`, never hard-coded.

| Capability | Anonymous | Customer* | Editor | Admin | Superadmin |
|---|:-:|:-:|:-:|:-:|:-:|
| Browse / filter / view published products | ✓ | ✓ | ✓ | ✓ | ✓ |
| Favorites | local only | ✓ (synced) | ✓ | ✓ | ✓ |
| Cart + mock checkout | ✓ (guest) | ✓ | ✓ | ✓ | ✓ |
| View own orders | – | ✓ | ✓ | ✓ | ✓ |
| Create products / edit product details & variants | – | – | ✓ (saved as draft) | ✓ | ✓ |
| See drafts & unpublished in admin | – | – | ✓ | ✓ | ✓ |
| Publish / unpublish | – | – | – | ✓ | ✓ |
| Soft-delete / restore products | – | – | – | ✓ | ✓ |
| Permanently delete | – | – | – | – | ✓ |
| Manage featured slider (max 3) | – | – | – | ✓ | ✓ |
| Manage taxonomies & attribute definitions | – | – | – | ✓ | ✓ |
| Manage users & assign Editor/Admin | – | – | – | ✓ (can't touch superadmin) | ✓ |
| Everything | – | – | – | – | ✓ (`Gate::before`) |

\* *Customer* is my addition: an ordinary registered shopper, distinct from staff roles.

- Enforce access **server-side with Policies**. The Angular route guards and hidden buttons are only UX.
- Product lifecycle: `draft → published ⇄ unpublished → (soft-deleted) → restored | force-deleted`. Every transition is logged in the activity log.

---

## 5. API (REST, `/api/v1`, JSON resources)

Locale comes from the `Accept-Language` header (sent by Angular from the URL locale). Responses return translated strings for that locale. Admin endpoints return all locales.

**Public**
```
GET  /products                ?filter[type]=phone&filter[brand]=apple,samsung&filter[segment]=flagship
                              &filter[ram]=8&filter[storage]=256&filter[color]=black
                              &filter[price_min]=5000&filter[price_max]=20000&filter[in_stock]=1
                              &filter[compatible_with]=galaxy-s25&q=pro
                              &sort=-price|price|-created_at|name&page[number]=1&page[size]=12
GET  /products/facets         same filters → counts per term/option (for "Samsung (3)")
GET  /products/featured       ≤ 3, ordered by featured_position
GET  /products/{slug}         details, variants, specs grouped, compatible items, related
GET  /taxonomies              vocabularies + terms (for filter UI)
GET  /compare?ids=1,2,3       side-by-side specs (nice-to-have)
```
**Auth (Sanctum SPA):** `GET /sanctum/csrf-cookie`, `POST /login`, `POST /logout`, `POST /register`, `POST /forgot-password`, `POST /reset-password`, `GET /me`
**Shopper:** `GET|POST|DELETE /favorites`, `POST /favorites/sync` (merge localStorage favorites on login), `GET /cart`, `POST /cart/items`, `PATCH|DELETE /cart/items/{id}`, `POST /checkout`, `GET /orders`, `GET /orders/{number}`, `GET /orders/{number}/json`
**Admin (`/admin/...`, policy-protected):** products CRUD + `POST /{id}/publish|unpublish|restore`, `DELETE /{id}?force=1`, variants CRUD, media upload/reorder, featured (`PUT /featured` with ≤ 3 ids), taxonomies & terms CRUD, attribute definitions CRUD, users CRUD + role assignment, orders list/detail, activity log.

Rate-limit login and checkout. Validate with Form Requests. Return errors as standard JSON (422 with field errors).

---

## 6. Mock payment & order JSON

`POST /checkout` flow:
1. Validate the cart: stock, prices recalculated server-side (never trust client prices).
2. Create the `order` and `order_items` in a DB transaction with status `pending`.
3. Call a `PaymentGateway` interface bound to a `MockPaymentGateway`. Card rules:
   - `4242 4242 4242 4242` → success
   - `4000 0000 0000 0002` → declined
   - anything else valid-looking → success
4. On success: mark the order `paid`, decrement stock, clear the cart, and **write `storage/app/orders/{order_number}.json`**. Also expose it at `GET /orders/{number}/json` so the confirmation page can display and download it.
5. On failure: mark it `failed`, keep the cart, and show the error.

Behind an interface, a real provider (e.g. MAIB / Paynet / Stripe) can be swapped in later.

JSON shape (minimum: order id, order item id, product id, variation options):
```json
{
  "order_id": 7,
  "order_number": "ORD-20261110-0007",
  "created_at": "2026-11-10T10:15:00+02:00",
  "status": "paid",
  "currency": "MDL",
  "locale": "ro",
  "customer": { "name": "…", "email": "…", "phone": "…" },
  "payment": { "provider": "mock", "reference": "MOCK-8F3K2Q", "status": "succeeded", "card_last4": "4242" },
  "items": [
    {
      "order_item_id": 15,
      "product_id": 3,
      "variant_id": 21,
      "sku": "SAM-S25-BLK-12-256",
      "name": "Samsung Galaxy S25",
      "options": { "color": "Navy", "ram": "12 GB", "storage": "256 GB" },
      "quantity": 1,
      "unit_price": 1699900,
      "line_total": 1699900
    }
  ],
  "totals": { "subtotal": 1699900, "shipping": 0, "total": 1699900 }
}
```

---

## 7. Storefront (Angular) — pages & UX

Routes are all prefixed with the locale: `/:lang(en|ro)/...`. `/` redirects to the browser language, or to `en` by default.

1. **Home**
   - **Featured slider** (Swiper): at most 3 products, set by an admin. Each slide shows an image, name, a key spec line, a "from" price and a CTA. Autoplay pauses on hover. Keyboard accessible.
   - **Below: product listing "view"** (like a Drupal Views page):
     - Filters: product type, brand, segment, RAM, storage, color (swatches), price range, in stock, "compatible with phone…" (for accessories). Facet counts come from `/products/facets`.
     - Text search, sort dropdown, result count, pagination (or "load more").
     - **Grid / list switcher**: list mode shows more specs per row. The choice persists in localStorage.
     - **All filter state lives in the URL query string**, so results are shareable and the back button works.
     - Mobile: filters open in a slide-over drawer.
2. **Category pages** `/:lang/phones`, `/:lang/cases`, `/:lang/headsets` reuse the listing with a preset type.
3. **Product detail** `/:lang/p/:slug`
   - Gallery (switches to the selected color's images), name, brand, segment badge, price (and old price if discounted), stock status.
   - Variant selector: color swatches + RAM/storage chips. Invalid combinations are disabled.
   - Add to cart (with quantity), add to favorites, add to compare.
   - **Common fields** (description, brand, warranty) plus **type-specific spec table**, grouped (Display, Camera, Battery…) and rendered from `attribute_definitions`.
   - Phones show "Accessories for this phone" (via compatibility). Cases show "Fits these phones". Related products appear too.
4. **Favorites**: localStorage for guests, synced to the server after login.
5. **Cart**: mini-cart drawer + full page; quantities, remove, subtotal. Kept for guests via a guest token cookie and merged into the user cart on login.
6. **Checkout**: contact, shipping address (simple), mock card form, and a summary.
7. **Order confirmation**: order number, items, and a **pretty-printed order JSON with a "Download JSON" button**.
8. **Account**: login / register / forgot password, plus "My orders".
9. **Compare** (nice-to-have): up to 3 phones side by side, with differences highlighted.
10. Global pieces: header (logo, search, language switcher EN/RO, favorites count, cart count, account menu), footer, toast notifications, 404, loading skeletons.

The language switcher changes the URL prefix, reloads content in the new locale and keeps the current page/filters.
Use `Intl.NumberFormat` with locale `ro-MD` / `en` to format MDL prices.

---

## 8. Back office (Angular `/admin`, lazy-loaded)

- Login uses the same Sanctum session. The admin area is visible only to editor/admin/superadmin. Menu items appear according to permissions returned by `/me`.
- **Products list**: table with search, filters (status, type, brand), sort, bulk publish/unpublish (admin), and a status badge.
- **Product form**:
  - Tabs: *General* (EN / RO language tabs for translatable fields), *Specifications* (fields generated dynamically from `attribute_definitions` for the selected type), *Variants* (generate a matrix from selected colors × RAM × storage, then edit price/stock/SKU per row), *Media* (drag & drop upload, reorder, assign to color), *Compatibility* (pick phones, for cases and headsets), *Taxonomy*.
  - Editors save drafts. Admins also see Publish / Unpublish / Delete / Restore.
  - Unsaved-changes guard and server-side validation errors mapped to fields.
- **Featured slider manager**: pick up to 3 published products and drag to order.
- **Taxonomies** and **attribute definitions** management (admin).
- **Users**: invite/create, assign roles (admin can assign editor/admin, never touch superadmin).
- **Orders**: list + detail + raw JSON view.
- **Activity log** view.

*Alternative to evaluate in `DECISIONS.md`:* use **Filament** (Laravel admin panel) for the back office instead of an Angular admin. It is faster to build, but means less Angular practice. Default: **Angular admin**, because learning Angular is a goal.

---

## 9. Seed / demo data

- Look at **darwin.md** and **orange.md** for real catalog items. Pick **1–2 phones per segment, at most 12 phones in total**, plus fitting cases (1–2 per phone, in several colors), **2–3 Bluetooth headsets** and **2 wired headsets**.
- Copy only **factual specs, available configurations and approximate MDL prices** into a seed file: `backend/database/seeders/data/catalog.json`.
  - Record the source URL and date for each item.
  - Do not copy retailers' marketing text or photos. Write short original descriptions in EN and RO.
  - Use placeholder or generated images, or images I provide.
- Respect the sites' terms and robots.txt. A manual/one-off fetch is fine; no aggressive scraping.
- Starting candidates to verify against those sites (replace any that aren't listed):
  - *Economy:* Samsung Galaxy A16 / A26, Xiaomi Redmi 14C / Redmi Note 14, Motorola moto g-series
  - *Mid-range:* Samsung Galaxy A56, Xiaomi Redmi Note 14 Pro, Google Pixel 9a / 10a
  - *Flagship:* Apple iPhone 17 / 17 Pro, Samsung Galaxy S25 / S26 Ultra, Xiaomi 15
  - *Headsets:* Apple AirPods 4, Samsung Galaxy Buds, JBL Tune series (BT); Apple EarPods USB-C, a Xiaomi/Samsung USB-C wired set
- Seeders also create: vocabularies/terms, attribute definitions, option types/values, the superadmin (from `.env`), one demo admin, one demo editor and one demo customer, and 3 featured products.

---

## 10. Extra features I'd like considered (prioritised)

**Should have**
- Product **comparison** (≤ 3 phones).
- "**From** X MDL" pricing on cards (the lowest variant price) and stock badges ("In stock", "Only 2 left", "Out of stock").
- **Recently viewed** products (localStorage).
- Discount / old price display (`compare_at_price`).
- Responsive images (`NgOptimizedImage`) and lazy loading.
- Accessibility: keyboard navigation, focus states, alt text, ARIA on the slider and filters.
- API docs at `/docs/api` (Scramble).
- Caching of public product endpoints (cache tags invalidated on product save).

**Could have (phase 2)**
- **Angular SSR + hydration** for SEO, plus per-page meta/OpenGraph, `hreflang` alternates, `sitemap.xml`, JSON-LD `Product` schema.
- Full-text search via Laravel Scout (database driver, or Meilisearch).
- Customer reviews & ratings (moderated).
- Order confirmation email (queued; Mailpit locally).
- Monthly installment ("credit") calculator on the product page, which is common in Moldovan shops.
- Dark mode.
- CI (GitHub Actions): Pint + Larastan + Pest, ESLint + Vitest, and Playwright smoke tests.

---

## 11. Non-functional requirements

- Security: CSRF via Sanctum, policy checks on every admin endpoint, Form Request validation, mass-assignment protection, rate limiting, upload validation (mime/size), no secrets in git.
- Performance: eager loading (no N+1; enable `Model::preventLazyLoading()` in dev), DB indexes on slug/status/type/brand, a GIN index on `specs`, and pagination everywhere.
- Code quality: thin controllers; business logic in Actions/Services (e.g. `PublishProduct`, `PlaceOrder`); API Resources for output; DTOs where helpful.
- Testing: feature tests for every API endpoint, including role/permission matrix tests; unit tests for price/stock/checkout logic; component tests for filters, variant selector and cart; one Playwright happy-path (browse → filter → PDP → cart → checkout → JSON).
- Docs: README (setup in under 5 commands), `DECISIONS.md`, an ERD diagram (Mermaid) in `docs/`.

---

## 12. Milestones (build in this order)

1. **Setup**: monorepo, Sail (PHP 8.4, PostgreSQL, Redis, Mailpit), Laravel 13 API, Angular 22 app, dev proxy, lint/test tooling, README. *Explain the Laravel request lifecycle and the Angular app bootstrap.*
2. **Auth & roles**: Sanctum SPA auth, spatie roles/permissions, superadmin seeder, `/me`, Angular auth service + guards + interceptor, login/register pages.
3. **Catalog schema**: migrations, models, relations, taxonomies, attribute definitions, options/variants, seeders from `catalog.json`. Include the ERD.
4. **Public catalog API**: listing with filters/sort/pagination, facets, featured, detail, translations via `Accept-Language`. Include tests.
5. **Storefront (part 1)**: layout, i18n with Transloco + URL locale + switcher, home with featured slider, listing view with URL-synced filters and grid/list switcher.
6. **Product detail page**: variant selector, dynamic specs, compatibility/related.
7. **Favorites & cart**: guest + user flows, merge on login.
8. **Checkout & mock payment**: order creation, JSON file generation, confirmation page with download, "My orders".
9. **Admin**: products CRUD with dynamic spec fields, variants matrix, media, publish workflow, featured manager, taxonomies, users & roles, orders, activity log.
10. **Polish**: comparison, recently viewed, a11y pass, caching, e2e test, CI.
11. **Optional phase 2**: SSR/SEO, search, reviews, emails, installment calculator.

At the end of each milestone, give me:
- a short summary;
- the commands to run;
- what to try in the browser;
- the 2–3 key Laravel/Angular concepts I should have understood from it.
