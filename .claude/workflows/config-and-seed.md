# Config system — version-controlled, seed-reconciled (the Drupal-config analog)

Laravel has no `drush cim/cex`. We get the same guarantee — **structural config lives in git and
is applied the same way on every machine** — with a small, explicit convention. Two layers:

| Layer | Lives in | Applied by | Drupal analog |
|---|---|---|---|
| **A. App settings** (scalars) | `backend/config/shop.php` + `.env` | read at runtime | `settings.php` / `*.settings.yml` |
| **B. Structural config** (records) | `backend/database/seeders/data/*.json` → idempotent seeders | `artisan migrate --seed` | `config/default/*.yml` + `drush cim` |

Everything that *shapes the app* (vocabularies/terms, attribute definitions, option types/values,
roles/permissions, the 3 featured slots) is **Layer B**: defined in a tracked JSON file and
reconciled by a seeder — never click-built in an untracked way. Demo **content** (the catalog of
products) rides the same mechanism from `catalog.json`, but it's data, not config.

## Layer A — app settings (`config/shop.php`)
Scalar knobs read via `config('shop.*')`, env-overridable. Example:
```php
// config/shop.php
return [
    'locales'        => ['en', 'ro'],
    'default_locale' => 'en',
    'currency'       => 'MDL',          // bani-based money
    'shipping_bani'  => (int) env('SHOP_SHIPPING_BANI', 0),
    'featured_max'   => 3,
];
```
Secrets (superadmin email/password, DB, mail) stay in `.env` only — never committed, never
hard-coded. Superadmin is seeded **from `.env`**.

## Layer B — structural config as seed files
Files under `backend/database/seeders/data/`:
```
roles.json            # roles + permission grants (spatie)
vocabularies.json     # vocabularies + terms (translatable names, slugs, weight)
attribute_definitions.json   # per product_type spec field defs (drives forms + PDP)
option_types.json     # color/ram/storage + their option_values (meta: {hex}/{gb})
featured.json         # up to 3 product slugs with positions
catalog.json          # demo products/variants/specs (content, with source URL + date)
```
Seeders read these and **reconcile idempotently** with `updateOrCreate` keyed on the **stable
`code`/`key`/`slug`** — so re-seeding edits in place instead of duplicating:
```php
foreach ($data as $row) {
    Term::updateOrCreate(
        ['vocabulary' => $row['vocabulary'], 'slug' => $row['slug']], // stable key
        ['name' => $row['name'], 'weight' => $row['weight']],         // reconciled values
    );
}
```

## Everyday loop (the cim/cex equivalent)
```bash
# change structural config -> EDIT THE JSON FILE, then reconcile:
#   edit backend/database/seeders/data/attribute_definitions.json
./vendor/bin/sail artisan db:seed --class=AttributeDefinitionSeeder
git add backend/database/seeders/data && git status   # review, commit

# apply everything on a fresh checkout / teammate's machine:
./vendor/bin/sail artisan migrate:fresh --seed        # schema + all config + demo data
# or non-destructive:
./vendor/bin/sail artisan migrate --seed
```
Golden rules (mirror Drupal's):
- **The JSON file is the source of truth** — change config *there*, then re-seed. Don't hand-edit
  rows in the DB and expect them to persist; the next `migrate:fresh --seed` wins.
- Keys (`code`/`key`/`slug`) are **stable identifiers** — renaming one is a migration, not an edit.
- Seeders must be **idempotent** (`updateOrCreate`), so `--seed` is safe to re-run.
- **Secrets never leave `.env`.**

## Common tasks
| Task | Steps |
|---|---|
| New vocabulary / term | edit `vocabularies.json` → `db:seed --class=VocabularySeeder` → commit |
| New spec field for a type | edit `attribute_definitions.json` (key, data_type, group, unit, filterable) → re-seed → commit. Form + PDP + `SpecsValidator` pick it up automatically |
| New option value (color/ram/storage) | edit `option_types.json` → re-seed → commit |
| New role / permission grant | edit `roles.json` → `db:seed --class=RolePermissionSeeder` → commit |
| Change featured slider | edit `featured.json` (≤3 slugs + positions) → re-seed, or use admin `PUT /featured` |
| Add a demo product | edit `catalog.json` (factual specs, approx MDL price, **source URL + date**) → re-seed |
| New app setting | add to `config/shop.php` (+ `.env` default) → read via `config('shop.*')` |

## Gotchas
- `migrate:fresh --seed` **drops data** — fine locally, never in a shared/prod-like DB. Use
  `migrate --seed` + targeted `db:seed --class=` to layer config without wiping content.
- Config cache: after editing `config/shop.php`, run `artisan config:clear` (or
  `config:cache` is re-run). `.env` is **not** read when config is cached.
- Attribute-definition changes alter validation — re-run the spec feature tests.
- Media: catalog items reference the single default placeholder JPEG; Medialibrary generates
  `thumb/card/large` conversions on seed/import.
