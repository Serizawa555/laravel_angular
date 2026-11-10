# Backend dev workflow — Laravel 13 API

Read [../context/backend-laravel.md](../context/backend-laravel.md) and
[../context/content-model.md](../context/content-model.md) first. Prefix PHP/artisan/Composer
with `./vendor/bin/sail`. Each milestone must run **and have tests** before the next
(`PROMPT.md §12`).

## One-time / daily
```bash
./vendor/bin/sail up -d
./vendor/bin/sail artisan migrate --seed
./vendor/bin/sail test                     # Pest
```

## Add a public/shopper endpoint
1. **Route** in `routes/api.php` under the right `/api/v1` group (apply `auth:sanctum` +
   throttle where needed; rate-limit login + checkout).
2. **Form Request** (`artisan make:request`) for validation + `authorize()`.
3. **Thin controller** (`app/Http/Controllers/Api/V1/`): resolve the request, call **one
   Action/Service**, return an **API Resource**.
4. **Action/Service** (`app/Actions/`) owns the logic + any DB transaction. Never trust client
   prices — recompute money/stock server-side.
5. **API Resource** shapes JSON; emit the `Accept-Language` locale (public) or all locales (admin).
6. **Filtering**: use spatie/laravel-query-builder with an explicit `allowedFilters`/`allowedSorts`
   allow-list.
7. **Test** (Pest feature test) — happy path + validation (422) + locale.

## Add an admin endpoint
Same as above, under `.../Admin/`, plus:
- **Policy** on the model (`artisan make:policy`); call `$this->authorize(...)` / `Gate`. Respect
  the role matrix (`PROMPT.md §4`); `Gate::before` → superadmin passes all. Editors save **draft
  only**; publish/delete are admin+.
- **Log** lifecycle transitions via activitylog.
- **Role-matrix test**: assert each role gets the right 200/403.

## Migration / model change
1. `artisan make:migration` — add indexes on `slug`/`status`/`type`/`brand`; **GIN index on
   `specs`**; money columns are integers (bani).
2. Model: casts (money, json translatable, enums), relations, `$fillable`/`$guarded`
   (mass-assignment), SoftDeletes where applicable.
3. If it's **structural config** (vocab/terms, attribute defs, option types, roles) wire it through
   a **seed file + idempotent seeder**, not click/data — see
   [config-and-seed.md](config-and-seed.md).
4. `artisan migrate` (or `migrate:fresh --seed` locally). Update the Mermaid ERD in `docs/`.

## Type-specific specs
Don't hard-code per-type fields. Add/change them in `attribute_definitions.json`, re-seed, and
`SpecsValidator` builds the rules + the PDP/admin render them. Re-run spec tests after changes.

## Before you finish
- `./vendor/bin/sail pint` (format) and `./vendor/bin/sail php vendor/bin/phpstan analyse` (Larastan).
- `./vendor/bin/sail test` green — feature test per endpoint incl. the role matrix; unit tests for
  price/stock/checkout.
- Keep N+1 out: eager-load; `Model::preventLazyLoading()` is on in dev and will throw.
- Scramble API docs regenerate from code — check `/docs/api` still builds.
- Note reversible-but-notable decisions in `docs/DECISIONS.md`.
