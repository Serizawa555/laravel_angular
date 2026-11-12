<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\OrderStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property OrderStatus $status
 * @property array<string, mixed>|null $shipping_address
 */
class Order extends Model
{
    protected $fillable = [
        'number', 'user_id', 'email', 'name', 'phone', 'shipping_address',
        'currency', 'subtotal', 'shipping', 'total',
        'status', 'payment_status', 'payment_reference', 'locale',
    ];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'shipping_address' => 'array',
            'subtotal' => 'integer',
            'shipping' => 'integer',
            'total' => 'integer',
        ];
    }

    /** @return HasMany<OrderItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
