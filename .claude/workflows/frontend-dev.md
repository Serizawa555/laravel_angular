# Frontend dev workflow — Angular 22 SPA

Read [../context/frontend-angular.md](../context/frontend-angular.md) first. Commands run on the
host under `frontend/`. Signal-first, standalone, zoneless — **no NgModules, no NgRx**.

## One-time / daily
```bash
cd frontend
npm install
npm start                    # ng serve — proxies /api + /sanctum to Laravel (Sail must be up)
npx ng test --watch=false    # Vitest
npx playwright test          # e2e (first run: npx playwright install)
# (no ESLint configured yet — add angular-eslint if you want `npm run lint`)
```

## Add a page / route
1. Generate a **standalone component** (`ng g component features/<area>/<name>`). No NgModule.
2. Register under the **locale-prefixed** route tree (`/:lang(en|ro)/...`) in `app.routes.ts`;
   lazy-load admin and heavy features (`loadComponent`/`loadChildren`).
3. Put **all listing/filter/sort/page state in the URL query string** — read it from
   `ActivatedRoute.queryParamMap` (via `toSignal`) and react with an `effect`. **No FiltersStore.**
   Build locale-prefixed links with `LocaleService.link(...)`.
4. Guard protected routes with `authGuard`/`roleGuard` (UX only — the API enforces access).

## Data & state
- Server reads via `firstValueFrom(http.get(...))` inside a service/store (e.g. `CatalogService`,
  `AdminService`). The `acceptLanguageInterceptor` adds `Accept-Language`; XSRF is auto-added once
  `CsrfService.prime()` has set the cookie.
- Shared/cross-page state = a **signal store** in `src/app/stores/` exposing `signal`/`computed` +
  methods (`CartStore`, `FavoritesStore`, `RecentlyViewedStore`).
- **Favorites hold only IDs** and refetch cards via `filter[ids]`. Cart = guest cookie or user;
  both **merge on login**. `CartStore` throws typed errors + retries once on 419.
- Give actions feedback through `ToastService`; read user + permissions from `AuthService` (`/me`).

## Forms
- **Plain signals + controlled inputs** (`[value]` + `(input)`) — not Signal Forms (its `[control]`
  directive is privately exported in 22.2). Map server 422 messages into an error signal shown in
  the UI. *(No unsaved-changes guard yet.)*

## Dynamic specs & variants (don't hard-code)
- PDP spec table + admin *Specifications* tab render from `attribute_definitions` (grouped
  Display/Camera/Battery…). Adding a spec is a backend seed change — the UI follows automatically.
- Variant selector: disable combinations that don't exist / are out of stock; update price +
  gallery on selection. "From X MDL" = lowest variant price.

## i18n & formatting
- **Transloco** runtime strings in `public/assets/i18n/{en,ro}.json` (add a key to **both**). The
  switcher (top bar) changes the URL prefix via `LocaleService.switchTo()` and keeps the page.
- Format money with `Intl.NumberFormat('ro-MD' | 'en')` via the `money` pipe. Stock shown as badges.

## UI / a11y
- **Tailwind CSS 4** with the brand `@theme` tokens + component classes in `src/styles.css`
  (`.btn-*`, `.badge*`, `.card`, `.field`, `.admin-table`). No Angular CDK yet.
- **Swiper** for the featured slider (autoplay pauses on hover, keyboard a11y).
- Images: plain `<img [src]="x.image || '/images/placeholder.svg'">` (object-contain) from
  Medialibrary conversions. Cards use `<article>` + a stretched-link title (no buttons inside `<a>`).

## Before you finish
- `npx ng test --watch=false` green; add component/store tests next to the file (`*.spec.ts`).
- Keep/extend the Playwright happy-path: browse → filter → PDP → cart → checkout → order JSON.
- Note reversible-but-notable decisions in `docs/DECISIONS.md`.
