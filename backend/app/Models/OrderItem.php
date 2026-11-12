<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property array<string, string> $name_snapshot
 * @property array<string, string>|null $options_snapshot
 */
class OrderItem extends Model
{
    protected $fillable = [
        'order_id', 'product_id', 'variant_id', 'sku',
        'name_snapshot', 'options_snapshot', 'unit_price', 'quantity', 'line_total',
    ];

    protected function casts(): array
    {
        return [
            'name_snapshot' => 'array',
            'options_snapshot' => 'array',
            'unit_price' => 'integer',
            'quantity' => 'integer',
            'line_total' => 'integer',
        ];
    }

    /** @return BelongsTo<Order, $this> */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
