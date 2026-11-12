<?php

declare(strict_types=1);

namespace App\Queries;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;

/**
 * Catalog filtering, shared by the listing and the facet counts so they never drift.
 * Filters mirror the `?filter[...]` params in PROMPT §5. Hand-rolled (rather than
 * spatie/query-builder) so facets can re-apply every filter *except* the one being counted.
 */
class ProductQuery
{
    /** Axis filters (option code lists) handled uniformly. */
    private const OPTION_AXES = ['color', 'ram', 'storage'];

    /**
     * @param  array<string, mixed>  $filters
     * @param  list<string>  $except  filter keys to skip (used for faceting)
     * @param  Builder<Product>  $query
     */
    public function apply(Builder $query, array $filters, array $except = []): void
    {
        $get = fn (string $key) => in_array($key, $except, true) ? null : ($filters[$key] ?? null);
        $list = fn ($v): array => array_filter(is_array($v) ? $v : explode(',', (string) $v), fn ($s) => $s !== '');

        // Explicit id list (e.g. favorites). Integers only, capped — unknown/unpublished ids
        // simply don't match, so stale favorites drop out silently.
        if ($ids = $get('ids')) {
            $intIds = array_slice(array_map('intval', $list($ids)), 0, 100);
            $query->whereIn('id', $intIds);
        }

        if ($type = $get('type')) {
            $query->whereIn('type', $list($type));
        }

        if ($brand = $get('brand')) {
            $query->whereHas('brand', fn (Builder $b) => $b->whereIn('slug', $list($brand)));
        }

        if ($segment = $get('segment')) {
            $query->whereHas('segment', fn (Builder $s) => $s->whereIn('slug', $list($segment)));
        }

        foreach (self::OPTION_AXES as $axis) {
            if ($value = $get($axis)) {
                $codes = $list($value);
                $query->whereHas('variants.optionValues', fn (Builder $ov) => $ov->whereIn('option_values.code', $codes));
            }
        }

        if (($min = $get('price_min')) !== null && $min !== '') {
            $query->whereHas('variants', fn (Builder $v) => $v->where('price', '>=', (int) $this->scalar($min)));
        }

        if (($max = $get('price_max')) !== null && $max !== '') {
            $query->whereHas('variants', fn (Builder $v) => $v->where('price', '<=', (int) $this->scalar($max)));
        }

        if (($stock = $get('in_stock')) !== null && filter_var($this->scalar($stock), FILTER_VALIDATE_BOOL)) {
            $query->whereHas('variants', fn (Builder $v) => $v->where('stock', '>', 0));
        }

        if ($compat = $get('compatible_with')) {
            $query->whereHas('compatiblePhones', fn (Builder $p) => $p->where('slug', $this->scalar($compat)));
        }

        if (($q = $get('q')) !== null && $q !== '') {
            $term = '%'.$this->scalar($q).'%';
            $query->where(fn (Builder $w) => $w
                ->whereRaw('name::text ILIKE ?', [$term])
                ->orWhereRaw('short_description::text ILIKE ?', [$term]));
        }
    }

    private function scalar(mixed $value): string
    {
        return is_array($value) ? (string) ($value[0] ?? '') : (string) $value;
    }
}
