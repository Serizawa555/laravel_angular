# Frontend — Angular 22 SPA (`frontend/`)

Signal-first Angular. **Standalone components, signals, zoneless, new control flow (`@if`/`@for`),
`inject()`, Signal Forms.** No NgModules, no NgRx. HTTP state via `httpResource()`/`resource()`
feeding small **signal-based stores** (plain injectable services). Runtime i18n via **Transloco**,
locale in the URL. See [../workflows/frontend-dev.md](../workflows/frontend-dev.md) for how-to.

> React/Vue analogs: Angular service + DI ≈ React context / custom hook; `signal`/`computed` ≈
> Vue `ref`/`computed`; `effect()` ≈ `watchEffect`; standalone component ≈ a plain component with
> its own imports; `@for`/`@if` ≈ `v-for`/`v-if`.

## Where things live (target layout)
| Path | What |
|---|---|
| `src/app/app.config.ts`, `app.routes.ts` | bootstrap (zoneless, providers), top-level routes |
| `src/app/core/` | singletons: `AuthService`, HTTP interceptor (CSRF/XSRF), guards, `ApiService` |
| `src/app/shared/` | reusable UI (price, stock badge, swatch, pagination, skeletons) + pipes |
| `src/app/features/catalog/` | listing view, filters, facets, grid/list switcher |
| `src/app/features/product/` | PDP: gallery, variant selector, dynamic spec table |
| `src/app/features/cart/`, `features/favorites/`, `features/checkout/` | shopper flows |
| `src/app/features/account/` | login/register/forgot, my orders |
| `src/app/admin/` | **lazy-loaded** back office (editor/admin/superadmin) |
| `src/app/stores/` | signal stores: `CartStore`, `FavoritesStore`, `FiltersStore`, `RecentlyViewed` |
| `src/assets/i18n/{en,ro}.json` | Transloco UI strings |

## Routing & i18n
- All routes prefixed with locale: `/:lang(en|ro)/...`. `/` redirects to browser language or `en`.
- Language switcher changes the URL prefix, reloads content in the new locale, **keeps the current
  page + filters**. Angular sends `Accept-Language` to the API from the URL locale.
- **All listing/filter/sort/page state lives in the URL query string** — shareable, back-button
  works. `FiltersStore` is the single source, synced to `ActivatedRoute` query params.
- Category pages (`/:lang/phones|cases|headsets`) reuse the listing with a preset `type` filter.

## State & data
- `httpResource()`/`resource()` for server reads (products, facets, PDP); loading/error are
  signals → drive skeletons.
- Stores are injectable services exposing `signal`/`computed` + methods. Guests: favorites in
  localStorage, cart via guest-token cookie; both **merge into the user on login**
  (`POST /favorites/sync`, cart merge).
- `AuthService` holds the `/me` user + permissions; **guards and hidden admin buttons are UX
  only** — the API enforces access.
- Grid/list choice and recently-viewed persist in localStorage.

## UI conventions
- **Tailwind CSS 4** for storefront; **Angular CDK** for overlays/a11y (drawers, focus trap);
  optional Angular Material in admin.
- **Swiper** (web-component) for the ≤3 featured slider — autoplay pauses on hover, keyboard
  accessible, ARIA on slider + filters.
- Prices via `Intl.NumberFormat('ro-MD' | 'en')` in a shared pipe; stock badges ("In stock",
  "Only 2 left", "Out of stock"); "From X MDL" = lowest variant price.
- Images: `NgOptimizedImage` + lazy loading, served from Medialibrary conversions. A single
  default placeholder JPEG backs everything until real images exist.
- **Dynamic spec table + admin spec form render from `attribute_definitions`** (grouped
  Display/Camera/Battery…) — never hard-code per-type fields. Variant selector disables
  non-existent / out-of-stock combinations and updates price + gallery on change.

## Admin area (`src/app/admin/`, lazy)
Same Sanctum session; menu items appear per permissions from `/me`. Product form tabs: *General*
(EN/RO language tabs), *Specifications* (generated from attribute defs), *Variants* (matrix from
colors × RAM × storage, edit price/stock/SKU per row), *Media* (drag-drop, reorder, assign to
color), *Compatibility*, *Taxonomy*. Unsaved-changes guard; server validation errors mapped to
fields. Plus featured manager (drag ≤3), taxonomies, attribute defs, users/roles, orders, activity log.

## Testing
Vitest component tests for filters, variant selector, cart. One Playwright happy-path:
browse → filter → PDP → cart → checkout → order JSON.
