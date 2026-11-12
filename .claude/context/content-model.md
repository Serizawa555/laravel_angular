# Content model — PhoneShop

Domain = **products** (phones, cases, Bluetooth headsets, wired headsets) with **variants**,
**taxonomies**, **data-driven specs**, plus favorites / cart / orders. Full spec in
`PROMPT.md §3`. Prices are **integer bani** everywhere. Translatable fields are **JSON per locale
(EN default + RO)**.

> **All tables below are built and migrated** (as of 2026-11-12). Two additions beyond the original
> schema: product **images** via spatie/medialibrary (a `gallery` media collection on `products`,
> thumb/card/large conversions, SVG placeholder fallback), and `spatie/laravel-activitylog`
> (`activity_log` table; product lifecycle only). **The browser never caches catalog rows** — guest
> favorites store only product **IDs** and refetch cards via `GET /products?filter[ids]=` (see
> `docs/DECISIONS.md`).

> Drupal analogs: `vocabularies`+`terms` ≈ vocabularies+terms; `attribute_definitions` ≈ field
> definitions driving a form; `products.specs` JSONB ≈ a serialized field bag; enum `type` ≈
> bundle. Structural config (below) is seeded, not click-built — see
> [../workflows/config-and-seed.md](../workflows/config-and-seed.md).

## Enums (code-level)
- `ProductType`: `phone`, `case`, `headset_bt`, `headset_wired` — decides which spec schema applies.
- `ProductStatus`: `draft`, `published`, `unpublished` (+ soft-deleted via SoftDeletes).
- `OrderStatus`: `pending`, `paid`, `failed`, `cancelled` (+ `payment_status`).

## Taxonomies (generic vocabulary + term)
`vocabularies` + `terms` (translatable name, slug, weight). Drives filters + admin.
| Vocabulary | Example terms | Applies to |
|---|---|---|
| `product_type` | Phone, Case, Bluetooth headset, Wired headset | all (also the enum) |
| `brand` | Apple, Samsung, Xiaomi, Google, Motorola, JBL… | all |
| `segment` | Economy, Mid-range, Flagship | phones |
| `connection` | Bluetooth, USB-C wired, 3.5mm jack | headsets |
| `case_material` | Silicone, Leather, TPU/Clear, Rugged | cases |

## Core tables
| Table | Key columns (see PROMPT §3.2 for full) |
|---|---|
| `products` | `type` enum, `brand_id`/`segment_id`→terms, `slug` uniq, `sku_base`, `name`/`short_description`/`description` (json translatable), `specs` **jsonb**, `base_price` (bani), `status`, `published_at`, `is_featured`, `featured_position` (1..3 uniq), `created_by`/`updated_by`, timestamps, soft deletes |
| `option_types` | `code` (color\|ram\|storage), `name` (json) |
| `option_values` | `option_type_id`, `code`, `label` (json), `sort`, `meta` jsonb (`{hex}` / `{gb}`) |
| `product_variants` | `product_id`, `sku` uniq, `price` (bani), `compare_at_price`, `stock`, `is_default` |
| `variant_option_value` | pivot: variant × option_value (e.g. Black + 8GB + 256GB) |
| `product_term` | pivot: extra taxonomy tags |
| `product_compatibility` | `accessory_id`→products, `phone_id`→products ("this case fits Galaxy S25") |
| `attribute_definitions` | drives dynamic spec form/table — see below |
| `favorites` | `user_id` + `product_id` (unique pair) |
| `carts` | `user_id` (nullable) \| `guest_token` (nullable uniq) |
| `cart_items` | `cart_id`, `variant_id`, `quantity`, `unit_price_snapshot` |
| `orders` | `number` (ORD-YYYYMMDD-NNNN), user/email/name/phone, `shipping_address` jsonb, `currency` MDL, subtotal/shipping/total, `status`, `payment_status`, `payment_reference`, `locale` |
| `order_items` | `order_id`, product/variant, `sku`, `name_snapshot` json, `options_snapshot` jsonb, unit_price, qty, line_total |
| media | spatie/medialibrary — per product (and optionally per variant/color) |

## Data-driven specs (`attribute_definitions`)
Common fields live on `products`; type-only fields live in `products.specs` (JSONB, GIN-indexed).
Their **definitions** drive both the admin form and the PDP spec table:
```
attribute_definitions: id, product_type, key, label(json), data_type(string|int|decimal|bool|enum|list),
  unit(nullable: mAh, ", MP, h, g), options(jsonb for enums), group(Display|Camera|Battery…),
  is_filterable, is_required, sort
```
Proposed keys per type: see `PROMPT.md §3.3` (phone: display/chipset/camera/battery/…; case:
material/magsafe/drop/…; headset_bt: form_factor/codecs/anc/battery/…; headset_wired:
connector/cable/driver/…). `SpecsValidator` builds Laravel rules from these for the given type.

## Variants
- **Phones**: color × RAM (4/6/8/12 GB) × storage (64/128/256/512 GB) — only **realistic combos**
  exist, each with own price + stock. RAM/storage/color are **options, not specs**.
- **Cases & headsets**: color only.
- PDP disables non-existent / out-of-stock combinations; price + gallery update on selection.

## Roles & permissions (spatie)
Roles: Customer, Editor, Admin, Superadmin (+ Anonymous). Matrix in `PROMPT.md §4`. Highlights:
Editors create/edit → **draft only**; Admins publish/unpublish, soft-delete/restore, manage
featured (≤3)/taxonomies/attribute defs/users (not superadmin); Superadmin = everything via
`Gate::before`. **Enforced server-side by Policies**; superadmin seeded from `.env`.

## Conventions
- Machine names / `code` / `key` are **snake_case and stable** — they're the seed/reconcile key
  (`updateOrCreate` matches on them). Changing a code = a rename migration, not a silent edit.
- Translatable = JSON per locale; always provide EN + RO.
- Add structural things (vocab/terms, attribute defs, option types) via **seed files**, then
  re-seed — don't click-build them untracked (see config-and-seed.md).
