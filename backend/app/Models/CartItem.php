<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $quantity
 * @property int $unit_price_snapshot
 */
class CartItem extends Model
{
    protected $fillable = ['cart_id', 'variant_id', 'quantity', 'unit_price_snapshot'];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price_snapshot' => 'integer',
        ];
    }

    /** @return BelongsTo<ProductVariant, $this> */
    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    /** @return BelongsTo<Cart, $this> */
    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }
}
