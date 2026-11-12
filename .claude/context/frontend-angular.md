# Frontend — Angular 22 SPA (`frontend/`)

Signal-first Angular. **Standalone components, signals, zoneless, new control flow (`@if`/`@for`),
`inject()`.** No NgModules, no NgRx. Server reads use `firstValueFrom(http…)` feeding small
**signal-based stores/services**. Forms are **plain signals + controlled inputs** (not Signal Forms
— its `[control]` directive is still privately exported in 22.2; see `docs/DECISIONS.md`). Runtime
i18n via **Transloco**, locale in the URL. See [../workflows/frontend-dev.md](../workflows/frontend-dev.md).

> React/Vue analogs: Angular service + DI ≈ React context / custom hook; `signal`/`computed` ≈
> Vue `ref`/`computed`; `effect()` ≈ `watchEffect`; standalone component ≈ a plain component.

## Where things live
| Path | What |
|---|---|
| `src/app/app.config.ts`, `app.routes.ts`, `app.ts/html` | bootstrap (zoneless, providers, app-init), locale-prefixed routes, two-tier header (top bar switcher + profile dropdown; icon cart/fav badges) |
| `src/app/core/` | singletons + models: `AuthService`, `LocaleService`, `CsrfService`, `ToastService`, `CatalogService`, `CheckoutService`, `AdminService`; interceptors (`auth.interceptor` 401, `accept-language.interceptor`); `guards.ts` (auth/guest/role/lang); `money.pipe`, `transloco-loader`; `*.model.ts`, `locale.ts` |
| `src/app/shared/` | `toast-host` (aria-live toast renderer) |
| `src/app/stores/` | signal stores: `CartStore`, `FavoritesStore` (IDs only), `RecentlyViewedStore` |
| `src/app/features/catalog/` | `listing` (URL-synced filters/facets/sort/grid-list/pagination), `product-card` |
| `src/app/features/product/` | PDP: gallery (img), variant selector, dynamic spec table, compatibility/related |
| `src/app/features/home/` | featured Swiper slider + recently-viewed + the listing |
| `src/app/features/cart|favorites|checkout/` | cart page, favorites page, checkout + confirmation |
| `src/app/features/auth|account/` | login, register, account, my-orders |
| `src/app/admin/` | **lazy** back office (shell + products, product-form, featured, orders, order, users, taxonomies, attributes, activity) |
| `public/assets/i18n/{en,ro}.json` | Transloco UI strings (served at `/assets/i18n/*`) |
| `public/images/placeholder.svg` | product-image fallback |

## Routing & i18n
- Routes are prefixed with locale: `/:lang(en|ro)/...`; `/` redirects to the browser language.
  A `langGuard` activates the language from the URL; `LocaleService` is the single source of the
  active lang (keeps Transloco in sync, builds `loc.link('phones')` → `['/', lang, 'phones']`,
  swaps the lang segment on switch). `acceptLanguageInterceptor` sends `Accept-Language` to the API.
- **All listing filter/sort/page state lives in the URL query string.** The `listing` component
  reads `ActivatedRoute.queryParamMap` (via `toSignal`) and reloads through an `effect` — there is
  **no FiltersStore**; the URL *is* the store. Category pages reuse `listing` with `data.presetType`.

## State & data
- Stores/services expose `signal`/`computed` + async methods calling the API.
- **`FavoritesStore` caches no catalog data — only product IDs** (`favorites:v2`), cards always
  fetched via `GET /products?filter[ids]=`; legacy full-snapshot favorites are migrated to IDs.
- **`CartStore`**: guest cart via cookie or the user's; methods throw typed `HttpErrorResponse` and
  **retry once on 419** after `CsrfService.reprime()`. On login both favorites + cart **merge**
  (`POST /favorites/sync`; server-side cart merge).
- `CsrfService.prime()` (once at app-init) sets the XSRF cookie so mutations carry the header.
- `AuthService` holds the `/me` user + permissions (guards + hidden admin UI are UX only; the API
  enforces access) and **syncs across tabs** via a `storage` event + refresh persistence.
- `ToastService` (+ `toast-host`) gives success/error feedback; header cart badge pulses on add.

## UI conventions
- **Tailwind CSS 4** with a **brand theme** (`@theme` tokens: `brand`/`accent`/`ink`/`mist`/`pink`)
  and shared component classes in `src/styles.css` (`.btn`, `.btn-primary|accent|ghost|danger`,
  `.badge*`, `.card`, `.field`, `.admin-table`). No Angular Material/CDK yet.
- **Swiper** (web-component) for the featured slider — autoplay pauses on hover, keyboard a11y.
- Prices via `Intl.NumberFormat('ro-MD' | 'en')` in the `money` pipe; stock shown as badges;
  "From X MDL" = lowest variant price.
- **Images**: plain `<img [src]="p.image || '/images/placeholder.svg'">` (object-contain), served
  from Medialibrary conversions; SVG placeholder when none. (NgOptimizedImage not used.)
- **Product cards** use a stretched-link title (`<article>` root, buttons siblings `z-10` — no
  interactive nesting). Quick-add only for single-variant products; multi-variant → "Choose options".
- **Dynamic spec table + admin spec form render from `attribute_definitions`** — never hard-code
  per-type fields. The PDP variant selector disables non-existent / out-of-stock combinations.

## Admin area (`src/app/admin/`, lazy, `roleGuard`)
Same Sanctum session; sidebar items appear per permission from `/me`. Product form is **sections**
(not tabs): *General* (EN/RO fields), *Specifications* (generated from attribute defs), *Variants*
(editable rows: color/ram/storage + price/stock/SKU), *Images* (upload + thumbnail grid + delete).
Plus featured manager (pick ≤3), orders (+ detail), users (role assign), taxonomies, attribute
definitions, activity log. *(No unsaved-changes guard / drag-reorder / compatibility editor yet.)*

## Testing (Vitest)
`app.spec` (header), `favorites.store.spec` (ID migration / toggle / prune), `product-card.spec`
(disabled / choose-options / quick-add success + error toasts). Playwright happy-path in
`frontend/e2e/shop.spec.ts` (browse → PDP → cart → checkout → order JSON; run with
`npx playwright install && npx playwright test`).
