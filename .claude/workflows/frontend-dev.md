# Frontend dev workflow — Angular 22 SPA

Read [../context/frontend-angular.md](../context/frontend-angular.md) first. Commands run on the
host under `frontend/`. Signal-first, standalone, zoneless — **no NgModules, no NgRx**.

## One-time / daily
```bash
cd frontend
npm install
npm start            # ng serve — proxies /api + /sanctum to Laravel (Sail must be up)
npm test             # Vitest
npm run lint         # angular-eslint + Prettier
npx playwright test  # e2e
```

## Add a page / route
1. Generate a **standalone component** (`ng g component features/<area>/<name>`). No NgModule.
2. Register under the **locale-prefixed** route tree (`/:lang(en|ro)/...`) in `app.routes.ts`;
   lazy-load admin and heavy features (`loadComponent`/`loadChildren`).
3. Put **all listing/filter/sort/page state in the URL query string** (sync via `FiltersStore` ↔
   `ActivatedRoute`) — shareable + back-button correct.
4. Guard protected routes with an auth/role guard (UX only — the API enforces access).

## Data & state
- Server reads via `httpResource()`/`resource()`; use their loading/error signals to drive
  skeletons. Go through the `core/ApiService` so the CSRF/XSRF interceptor + `Accept-Language`
  (from URL locale) are applied.
- Shared/cross-page state = a **signal store** service in `src/app/stores/` exposing
  `signal`/`computed` + methods (`CartStore`, `FavoritesStore`, `FiltersStore`, `RecentlyViewed`).
- Guests: favorites in localStorage, cart via guest-token cookie → **merge on login**
  (`POST /favorites/sync` + cart merge). Read user + permissions from `AuthService` (`/me`).

## Forms
- **Signal Forms** by default. Reactive Forms only if a library requires it.
- Map server 422 field errors back onto form controls. Admin product form has an
  **unsaved-changes guard**.

## Dynamic specs & variants (don't hard-code)
- PDP spec table + admin *Specifications* tab render from `attribute_definitions` (grouped
  Display/Camera/Battery…). Adding a spec is a backend seed change — the UI follows automatically.
- Variant selector: disable combinations that don't exist / are out of stock; update price +
  gallery on selection. "From X MDL" = lowest variant price.

## i18n & formatting
- **Transloco** runtime strings in `src/assets/i18n/{en,ro}.json`. The language switcher changes
  the URL prefix, reloads content in the new locale, and **keeps the current page + filters**.
- Format money with `Intl.NumberFormat('ro-MD' | 'en')` via the shared price pipe. Stock badges:
  "In stock" / "Only N left" / "Out of stock".

## UI / a11y
- Tailwind CSS 4 + Angular CDK (drawers, focus trap). Swiper for the ≤3 featured slider — autoplay
  pauses on hover, keyboard accessible, ARIA on slider + filters. Mobile filters open in a CDK
  slide-over.
- Images: `NgOptimizedImage` + lazy loading from Medialibrary conversions; a single default
  placeholder JPEG backs everything until real images exist.

## Before you finish
- `npm run lint` + `npm test` green; component tests for filters, variant selector, cart.
- Keep/extend the Playwright happy-path: browse → filter → PDP → cart → checkout → order JSON.
- Note reversible-but-notable decisions in `docs/DECISIONS.md`.
