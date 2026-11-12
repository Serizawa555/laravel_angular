<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use App\Services\CartService;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(private readonly CartService $carts) {}

    /**
     * GET /cart
     *
     * @return array<string, mixed>
     */
    public function show(Request $request): array
    {
        return $this->payload($this->carts->resolve($request));
    }

    /**
     * POST /cart/items { variant_id, quantity }
     *
     * @return array<string, mixed>
     */
    public function storeItem(Request $request): array
    {
        $data = $request->validate([
            'variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        $variant = ProductVariant::findOrFail($data['variant_id']);
        $cart = $this->carts->resolve($request);

        $item = CartItem::firstOrNew(['cart_id' => $cart->id, 'variant_id' => $variant->id]);
        $item->quantity = min(99, ($item->quantity ?? 0) + $data['quantity']);
        $item->unit_price_snapshot = $variant->price;
        $item->save();

        return $this->payload($cart->fresh());
    }

    /**
     * PATCH /cart/items/{item} { quantity }
     *
     * @return array<string, mixed>
     */
    public function updateItem(Request $request, int $item): array
    {
        $data = $request->validate(['quantity' => ['required', 'integer', 'min:0', 'max:99']]);
        $cart = $this->carts->resolve($request);
        $cartItem = $cart->items()->findOrFail($item);

        if ($data['quantity'] === 0) {
            $cartItem->delete();
        } else {
            $cartItem->update(['quantity' => $data['quantity']]);
        }

        return $this->payload($cart->fresh());
    }

    /**
     * DELETE /cart/items/{item}
     *
     * @return array<string, mixed>
     */
    public function destroyItem(Request $request, int $item): array
    {
        $cart = $this->carts->resolve($request);
        $cart->items()->where('id', $item)->delete();

        return $this->payload($cart->fresh());
    }

    /** @return array<string, mixed> */
    private function payload(Cart $cart): array
    {
        $cart->load(['items.variant.optionValues.optionType', 'items.variant.product.brand']);

        $items = $cart->items->map(function (CartItem $item) {
            $variant = $item->variant;
            $product = $variant->product;

            return [
                'id' => $item->id,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price_snapshot,
                'line_total' => $item->unit_price_snapshot * $item->quantity,
                'variant' => [
                    'id' => $variant->id,
                    'sku' => $variant->sku,
                    'stock' => $variant->stock,
                    'options' => $variant->optionValues->mapWithKeys(
                        fn ($v) => [$v->optionType->code => $v->label],
                    ),
                ],
                'product' => [
                    'slug' => $product->slug,
                    'name' => $product->name,
                    'brand' => $product->brand?->name,
                ],
            ];
        })->values();

        return [
            'data' => [
                'items' => $items,
                'count' => (int) $cart->items->sum('quantity'),
                'subtotal' => $cart->subtotal(),
            ],
        ];
    }
}
