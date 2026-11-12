# Backend — Laravel 13 API (`backend/`)

API-only Laravel. **Thin controllers**, business logic in **Actions/Services**, output via
**API Resources**, validation via **Form Requests**, access via **Policies**. Sanctum SPA
(cookie) auth. See [content-model.md](content-model.md) for tables/entities and
[../workflows/backend-dev.md](../workflows/backend-dev.md) for the how-to.

> Drupal analogs: Eloquent model ≈ entity, migration ≈ `hook_update_N`, service container ≈
> `services.yml`/DI, Policy/Gate ≈ permission + access callback, taxonomy terms ≈ vocabulary terms,
> Form Request ≈ form validation, API Resource ≈ a normalizer/view output.

## Where things live
| Path | What |
|---|---|
| `app/Models/` | Eloquent models: Product (HasMedia, LogsActivity, HasTranslations, SoftDeletes), ProductVariant, Vocabulary, Term, OptionType, OptionValue, AttributeDefinition, Favorite, Cart, CartItem, Order, OrderItem, User |
| `app/Http/Controllers/Api/V1/` | public + shopper controllers (Product, Taxonomy, Cart, Favorite, Checkout, Auth/) |
| `app/Http/Controllers/Api/V1/Admin/` | admin controllers (AdminProduct, Featured, AdminOrder, AdminUser, AdminTaxonomy, AttributeDefinition, Activity) |
| `app/Http/Requests/` | Form Requests (Auth/{Login,Register}, CheckoutRequest) |
| `app/Http/Resources/` | API Resources: ProductCard / ProductDetail / Variant / OptionValue / Term / User; `Admin/AdminProductResource` (all locales) |
| `app/Actions/PlaceOrder.php` | checkout: recompute prices+stock in a txn, run gateway, write order JSON |
| `app/Services/CartService.php` | resolve "current cart" (user vs guest cookie) + merge-on-login |
| `app/Queries/ProductQuery.php` | **catalog filters** (shared by listing + facets): type/brand/segment/color/ram/storage/price/in_stock/compatible_with/q/**ids** |
| `app/Support/Specs/SpecsValidator.php` | builds validation rules from `attribute_definitions` |
| `app/Support/CatalogCache.php` | version-keyed cache for `featured` + `taxonomies` (bumped on product/variant/term save) |
| `app/Payments/` | `PaymentGateway` interface + `MockPaymentGateway` + `PaymentResult` |
| `app/Policies/ProductPolicy.php` | product lifecycle authorization (maps to spatie permissions) |
| `app/Enums/` | `ProductType`, `ProductStatus`, `OrderStatus` |
| `routes/api.php` | `/api/v1` groups (public / cart / auth-only shopper / admin) |
| `config/shop.php` | app settings (locales, currency, shipping, featured max, page size) — see config-and-seed.md |
| `database/migrations/`, `database/seeders/` | schema + structural config/demo data (data/*.json) |
| `tests/Feature/{Auth,Catalog,Shop,Admin}` | Pest: endpoints + role matrix + price/stock/checkout + media upload |

## API surface (`/api/v1`, JSON Resources)
Locale from `Accept-Language`. Public responses = one locale; admin = all locales. Full list in
`PROMPT.md §5`. Groups:
- **Public**: `GET /products` (`ProductQuery` filters incl. `filter[ids]` + sort + pagination),
  `/products/facets`, `/products/featured` (cached), `/products/{slug}`, `/taxonomies` (cached).
  *(`/compare` not built.)*
- **Auth (Sanctum SPA)**: `GET /sanctum/csrf-cookie`, `POST /login|logout|register`,
  `GET /me` (user + roles + flat permissions for UI gating). *(forgot/reset password not built.)*
- **Shopper**: cart (`GET /cart`, `POST /cart/items`, `PATCH|DELETE /cart/items/{id}`) — works for
  guests too; favorites (`GET/POST/DELETE /favorites`, `POST /favorites/sync`); `POST /checkout`;
  `GET /orders`, `/orders/{number}`, `/orders/{number}/json`.
- **Admin** (`/admin/...`): products CRUD + `publish|unpublish|restore` + force-delete + **media
  upload/delete**, `PUT /featured` (≤3), taxonomies/terms CRUD, attribute-definitions CRUD, users +
  role assignment, orders, activity log. Products authorized via `ProductPolicy`; the rest via
  `can:<permission>` route middleware.

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
- **Filtering** via **`App\Queries\ProductQuery`** (hand-rolled), used by both the listing and the
  facet counts so they never drift (facets re-apply every filter *except* the one being counted).
  spatie/query-builder is installed but unused.
- **Caching**: `CatalogCache` (version-keyed) wraps `featured` + `taxonomies`. The counter bumps on
  any Product/ProductVariant/Term `saved`/`deleted` (and explicitly in `FeaturedController`, since
  mass updates skip model events). Keys include the locale.
- **Money** = integer bani everywhere; cast on models, never float.
- **Security**: mass-assignment guarded (`#[Fillable]` attribute / `$fillable`), rate-limit login +
  checkout, validate uploads (mime/size), eager-load to kill N+1 (`'media'` included where cards
  render), `Model::preventLazyLoading()` in dev.

## Mock payment
`PaymentGateway` interface bound to `MockPaymentGateway`. Card rules: `4242…4242` → success,
`4000…0002` → declined, else valid-looking → success. On success: order `paid`, decrement stock,
clear cart, **write `storage/app/private/orders/{order_number}.json`** (Laravel 11+ `local` disk
root is `.../private`; also served at `/orders/{number}/json`). On failure: `failed`, keep cart.
Swap a real provider behind the interface later. JSON shape: `PROMPT.md §6`.

## Packages (composer)
spatie: `laravel-permission`, `laravel-translatable`, `laravel-query-builder` (installed, unused),
`laravel-medialibrary`, `laravel-activitylog`. Dev: `pestphp/pest`, `laravel/pint`,
`larastan/larastan`. **Not installed**: `dedoc/scramble` (no API docs page). Media conversions
`thumb|card|large`; products with no media fall back to an SVG placeholder (see CLAUDE.md).
