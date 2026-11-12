<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\CatalogCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id', 'sku', 'price', 'compare_at_price', 'stock', 'is_default',
    ];

    protected static function booted(): void
    {
        $bust = fn () => app(CatalogCache::class)->bump();
        static::saved($bust);
        static::deleted($bust);
    }

    protected function casts(): array
    {
        return [
            'price' => 'integer',             // bani
            'compare_at_price' => 'integer',  // bani
            'stock' => 'integer',
            'is_default' => 'boolean',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /** @return BelongsToMany<OptionValue, $this> */
    public function optionValues(): BelongsToMany
    {
        return $this->belongsToMany(OptionValue::class, 'variant_option_value', 'variant_id', 'option_value_id');
    }
}
