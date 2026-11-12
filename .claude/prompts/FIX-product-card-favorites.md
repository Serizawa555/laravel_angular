# Meta Prompt — Fix: product-card quick-add & stale favorites

> Paste into Claude Code (or reference it: "Follow docs/prompts/FIX-product-card-favorites.md").
> Scope: one focused bugfix task. Do **not** start the next milestone. Stop for review when done.

---

## 0. Before you start

- Commit the current work first. The repo has many uncommitted changes, and this fix must be reviewable as its own diff.
- Work on a branch: `fix/product-card-favorites`.
- Explain each change briefly, and say **why** (I'm learning Laravel + Angular).

---

## 1. Symptoms (observed)

1. On some product cards the **quick-add button (🛒 +) looks faded/washed-out and does nothing**. The card in question had a filled heart (a favorited product).
2. On normal listing cards the button is solid orange and clickable. It **does** add the item: the header cart count goes up, which was verified in a browser. But the card itself shows **no feedback**, so it feels broken.
3. The **🛒 emoji renders muddy** (grey/brown) on the orange background and looks odd.

---

## 2. Root causes (diagnosed)

| # | Cause | Evidence | Why it matters |
|---|---|---|---|
| A | **Guest favorites are stored as full `ProductCard` snapshots in localStorage** (`frontend/src/app/stores/favorites.store.ts`). Entries saved before `default_variant_id` existed don't have it. | Button has `[disabled]="!p.in_stock \|\| !p.default_variant_id \|\| adding()"` + `disabled:opacity-40` → faded orange. API cards (`ProductCardResource`) do include `default_variant_id`. | localStorage becomes a **second, stale copy of catalog data**. Price, stock, names, images and any new fields drift from the database, and an admin edit never reaches those cards. |
| B | **`quickAdd()` gives no feedback and swallows errors** (`features/catalog/product-card.ts`, `stores/cart.store.ts`). | Success only changes a small header counter. A failed request (419 CSRF, 422 stock) becomes an unhandled promise rejection with nothing shown. | Users can't tell success from failure. Errors can't be debugged from the UI. |
| C | **Emoji as an icon** (`🛒 +`). | Emoji are multicolour bitmaps and ignore CSS `color`. | Looks inconsistent across OSes and can't be themed. A disabled state is indistinguishable from "weird styling". |
| D | **Buttons nested inside the card's `<a>`** (favorite + quick-add live inside `<a [routerLink]>`). | Template structure. | Invalid HTML (interactive content inside `<a>`). Causes focus/keyboard/screen-reader problems and forces `preventDefault/stopPropagation` hacks. |

---

## 3. Required changes

### 3.1 Single source of truth for favorites (fixes A)
**Principle:** the database, seeded from `catalog.json` and edited in the admin, is the only source of catalog data. The browser stores **only IDs**.

**Backend**
- Add an `ids` filter to the public product listing in `backend/app/Queries/ProductQuery.php`:
  `GET /api/v1/products?filter[ids]=3,7,12`
  - Accept a comma list or an array of integers. Validate them as integers and cap the count (e.g. 100).
  - Return **published products only**, so unpublished/deleted favorites silently drop out.
  - Keep the same `ProductCardResource` and eager loads (`brand, segment, variants, media`), so there is no N+1.
- Pest feature tests:
  - IDs filter returns exactly the requested published products.
  - Unpublished and soft-deleted products are excluded.
  - Invalid input returns 422 or is ignored, consistently (document which).
  - Response includes `default_variant_id`.

**Frontend (`stores/favorites.store.ts`)**
- Persist **`number[]` (product IDs)** in localStorage under a **new key** (e.g. `favorites:v2`). The data inside the key now has a different shape, and a new key name keeps old and new data from being mixed up.
- Keep the IDs in a signal: `ids = signal<number[]>()`. Load the cards with `httpResource` or a `load()` call to `/api/v1/products?filter[ids]=…`. `isFavorite(id)` checks `ids`, so the heart updates instantly with no network wait.
- **Migration:** on startup, if the old `favorites` key exists, extract the `id`s into `favorites:v2`, delete the old key, then fetch fresh cards. Existing favorites survive, and the stale data is gone.
- Logged-in users: keep the server as the source (`/api/v1/favorites`, plus `sync` on login, sending IDs). After login, only IDs are stored locally.
- Favorites page: show skeleton cards while loading. Show an empty state with a link to the shop when there are none.

### 3.2 Quick-add feedback & error handling (fixes B)
- Add a small global **toast service**, if one doesn't exist yet: a signal-based service plus a host component in `app.html`. Use `aria-live="polite"`.
- `quickAdd()`:
  - While the request runs, show a spinner inside the button. Keep the width fixed so the layout doesn't jump.
  - On success: toast "Added to cart — {name}" with a "View cart" link, plus a brief "bump" animation on the header cart count.
  - On error: catch it and show a toast with the API message (422 → e.g. "Out of stock"; 419 → re-prime CSRF and retry once, then show an error).
- `CartStore` methods should throw typed errors (or return a result) so callers can react. No unhandled rejections.
- All strings go through Transloco (EN + RO).

### 3.3 Proper icon & clear states (fixes C)
- Replace `🛒 +` with an **inline SVG cart icon** using `stroke="currentColor"`, white on the accent colour. Keep the accessible label/tooltip (`product.add_to_cart`).
- Make the disabled state **clearly disabled**: grey background, `cursor-not-allowed`, tooltip explaining why ("Out of stock" or "Choose options"). Don't use a translucent orange.
- If a product has several meaningful variants (e.g. phone RAM/storage), consider making the button **"Choose options"** that links to the product page, instead of silently adding the default variant. Document this choice in `docs/DECISIONS.md`.

### 3.4 Accessible card structure (fixes D)
- Change the card root from `<a>` to `<article>`.
- Put the link on the title, and use the **stretched-link pattern** (`after:absolute after:inset-0` on the title link) so the whole card stays clickable.
- Make the favorite and quick-add buttons siblings with `relative z-10`, so they sit above the stretched link.
- Remove the `preventDefault/stopPropagation` workarounds that are no longer needed.
- Check keyboard behaviour: Tab order should be title link → favorite → add to cart. Focus rings must be visible.

---

## 4. Tests

- **Vitest (components/stores)**
  - FavoritesStore: migration from old snapshot format to IDs; toggle persists IDs; load fetches by IDs.
  - ProductCard:
    - enabled vs disabled state, with the correct reason;
    - spinner while adding;
    - success toast;
    - error toast on a mocked 422.
- **Pest:** the `filter[ids]` tests from 3.1.
- **Manual check (I'll do it):** favorite a product, then edit its price in the admin. The favorites page must show the new price.

---

## 5. Acceptance criteria

- [ ] No card anywhere shows a faded/disabled quick-add for an in-stock product with variants.
- [ ] Favorites always show current price/stock/name/image from the API. Unpublished products disappear from favorites.
- [ ] Old localStorage favorites are migrated automatically; nothing is lost.
- [ ] Every quick-add gives visible success or error feedback (EN and RO).
- [ ] The cart icon is a crisp SVG; the disabled state is obviously disabled.
- [ ] The card has no interactive elements nested inside `<a>`; keyboard and screen reader work.
- [ ] All tests pass (`make be-test`, `make fe-test`, lint).
- [ ] Short entry added to `docs/DECISIONS.md`: *"Client stores only IDs; the API is the single source of catalog data."*

---

## 6. When done

Report:
1. Files changed and why (one line each).
2. Commands to run.
3. What to click to verify.
4. The 2–3 concepts this taught. Expected: single source of truth vs. client caches; Angular signals + `httpResource`; stretched-link accessibility.

Then **stop** and wait for my review before continuing the milestone plan.
