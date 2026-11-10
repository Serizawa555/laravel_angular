# Backend — Laravel 13 API (`backend/`)

API-only Laravel. **Thin controllers**, business logic in **Actions/Services**, output via
**API Resources**, validation via **Form Requests**, access via **Policies**. Sanctum SPA
(cookie) auth. See [content-model.md](content-model.md) for tables/entities and
[../workflows/backend-dev.md](../workflows/backend-dev.md) for the how-to.

> Drupal analogs: Eloquent model ≈ entity, migration ≈ `hook_update_N`, service container ≈
> `services.yml`/DI, Policy/Gate ≈ permission + access callback, taxonomy terms ≈ vocabulary terms,
> Form Request ≈ form validation, API Resource ≈ a normalizer/view output.

## Where things live (target layout)
| Path | What |
|---|---|
| `app/Models/` | Eloquent models (Product, ProductVariant, Term, Order, …) |
| `app/Http/Controllers/Api/V1/` | thin controllers (public + shopper) |
| `app/Http/Controllers/Api/V1/Admin/` | admin controllers (policy-protected) |
| `app/Http/Requests/` | Form Requests (validation + authorize) |
| `app/Http/Resources/` | API Resources (JSON output shaping, locale-aware) |
| `app/Actions/` (or `app/Services/`) | business logic: `PlaceOrder`, `PublishProduct`, … |
| `app/Policies/` | per-model authorization |
| `app/Support/Specs/SpecsValidator.php` | builds validation rules from `attribute_definitions` |
| `app/Payments/` | `PaymentGateway` interface + `MockPaymentGateway` |
| `app/Enums/` | `ProductType`, `ProductStatus`, `OrderStatus`, … |
| `routes/api.php` | `/api/v1` route groups (public / auth / shopper / admin) |
| `config/shop.php` | app settings (locales, currency, shipping, featured max) — see config-and-seed.md |
| `database/migrations/`, `database/seeders/` | schema + structural config/demo data |
| `tests/Feature`, `tests/Unit` | Pest tests (endpoint + role matrix; price/stock/checkout units) |

## API surface (`/api/v1`, JSON Resources)
Locale from `Accept-Language`. Public responses = one locale; admin = all locales. Full list in
`PROMPT.md §5`. Groups:
- **Public**: `GET /products` (query-builder filters + sort + pagination), `/products/facets`,
  `/products/featured`, `/products/{slug}`, `/taxonomies`, `/compare`.
- **Auth (Sanctum SPA)**: `GET /sanctum/csrf-cookie`, `POST /login|logout|register`,
  forgot/reset password, `GET /me` (returns user + permissions for UI gating).
- **Shopper**: favorites (+ `POST /favorites/sync` merge on login), cart items, `POST /checkout`,
  orders list/detail + `/{number}/json`.
- **Admin** (`/admin/...`): products CRUD + `publish|unpublish|restore` + force-delete, variants,
  media upload/reorder, `PUT /featured` (≤3), taxonomies/terms, attribute definitions, users +
  role assignment, orders, activity log.

## Patterns to follow
- **Controllers are thin**: resolve a Form Request, call one Action/Service, return a Resource.
- **Actions/Services** hold logic and own DB transactions (`PlaceOrder` recalculates prices +
  stock server-side, never trusting the client). Prefer DTOs where it clarifies.
- **Policies on every admin action**; `Gate::before` → superadmin passes all. Guard the product
  lifecycle (`draft → published ⇄ unpublished → soft-deleted → restored | force-deleted`) — each
  transition logged via activitylog.
- **Specs are data-driven**: `SpecsValidator` builds rules from `attribute_definitions` for the
  product's `type`; never hard-code per-type spec fields.
- **Translatable fields** via spatie/laravel-translatable (JSON per locale). Resources emit the
  requested locale (public) or all locales (admin).
- **Filtering** via spatie/laravel-query-builder with an explicit allow-list of filters/sorts.
- **Money** = integer bani everywhere; cast on models, never float.
- **Security**: mass-assignment guarded (`$fillable`/`$guarded`), rate-limit login + checkout,
  validate uploads (mime/size), eager-load to kill N+1, `Model::preventLazyLoading()` in dev.

## Mock payment
`PaymentGateway` interface bound to `MockPaymentGateway`. Card rules: `4242…4242` → success,
`4000…0002` → declined, else valid-looking → success. On success: order `paid`, decrement stock,
clear cart, **write `storage/app/orders/{order_number}.json`** (also served at
`/orders/{number}/json`). On failure: `failed`, keep cart. Swap a real provider behind the
interface later. JSON shape: `PROMPT.md §6`.

## Packages (composer)
spatie: `laravel-permission`, `laravel-translatable`, `laravel-query-builder`,
`laravel-medialibrary`, `laravel-activitylog`. `dedoc/scramble` (API docs). Dev: `pestphp/pest`,
`laravel/pint`, `larastan/larastan`. Media conversions `thumb|card|large` — source is a single
placeholder JPEG for now (see CLAUDE.md non-negotiables).
