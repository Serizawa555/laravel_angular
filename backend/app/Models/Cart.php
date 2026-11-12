<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cart extends Model
{
    protected $fillable = ['user_id', 'guest_token'];

    /** @return HasMany<CartItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    /** Total in bani from line snapshots. */
    public function subtotal(): int
    {
        return (int) $this->items->sum(fn (CartItem $i) => $i->unit_price_snapshot * $i->quantity);
    }
}
