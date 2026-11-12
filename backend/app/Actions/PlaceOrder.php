<?php

declare(strict_types=1);

namespace App\Actions;

use App\Enums\OrderStatus;
use App\Models\Cart;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Payments\PaymentGateway;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Creates an order from a cart and runs (mock) payment (PROMPT §6). Prices + stock are
 * recomputed server-side — the client total is never trusted.
 */
class PlaceOrder
{
    public function __construct(private readonly PaymentGateway $gateway) {}

    /**
     * @param  array<string, mixed>  $input  validated checkout fields (contact, shipping, card)
     */
    public function handle(Cart $cart, array $input): Order
    {
        $cart->load('items.variant.product', 'items.variant.optionValues.optionType');

        if ($cart->items->isEmpty()) {
            throw ValidationException::withMessages(['cart' => 'Your cart is empty.']);
        }

        $order = DB::transaction(function () use ($cart, $input) {
            $subtotal = 0;
            $lines = [];

            foreach ($cart->items as $item) {
                /** @var ProductVariant $variant */
                $variant = ProductVariant::with('product', 'optionValues.optionType')
                    ->lockForUpdate()
                    ->findOrFail($item->variant_id);

                if ($variant->stock < $item->quantity) {
                    throw ValidationException::withMessages([
                        'cart' => "Not enough stock for {$variant->sku}.",
                    ]);
                }

                $unit = $variant->price; // live server price
                $subtotal += $unit * $item->quantity;
                $lines[] = [$variant, $item->quantity, $unit];
            }

            $shipping = (int) config('shop.shipping_bani');
            $total = $subtotal + $shipping;

            $order = Order::create([
                'number' => $this->number(),
                'user_id' => $cart->user_id,
                'email' => $input['email'],
                'name' => $input['name'],
                'phone' => $input['phone'] ?? null,
                'shipping_address' => $input['shipping_address'] ?? null,
                'currency' => config('shop.currency'),
                'subtotal' => $subtotal,
                'shipping' => $shipping,
                'total' => $total,
                'status' => OrderStatus::Pending,
                'locale' => app()->getLocale(),
            ]);

            foreach ($lines as [$variant, $qty, $unit]) {
                $product = $variant->product;
                $order->items()->create([
                    'product_id' => $product->id,
                    'variant_id' => $variant->id,
                    'sku' => $variant->sku,
                    'name_snapshot' => $product->getTranslations('name'),
                    'options_snapshot' => $variant->optionValues
                        ->mapWithKeys(fn ($v) => [$v->optionType->code => $v->label])->all(),
                    'unit_price' => $unit,
                    'quantity' => $qty,
                    'line_total' => $unit * $qty,
                ]);
            }

            // Payment (mock) inside the transaction so a decline rolls back nothing created yet.
            $result = $this->gateway->charge($total, $input['card'] ?? []);

            if (! $result->success) {
                $order->update([
                    'status' => OrderStatus::Failed,
                    'payment_status' => $result->status,
                    'payment_reference' => $result->reference,
                ]);

                return $order; // cart kept
            }

            foreach ($lines as [$variant, $qty]) {
                $variant->decrement('stock', $qty);
            }

            $order->update([
                'status' => OrderStatus::Paid,
                'payment_status' => $result->status,
                'payment_reference' => $result->reference,
            ]);

            $cart->items()->delete();

            return $order;
        });

        if ($order->status === OrderStatus::Paid) {
            $this->writeJson($order);
        }

        return $order->fresh(['items']);
    }

    private function number(): string
    {
        $date = now()->format('Ymd');
        $seq = Order::whereDate('created_at', today())->count() + 1;

        return sprintf('ORD-%s-%04d', $date, $seq);
    }

    private function writeJson(Order $order): void
    {
        Storage::disk('local')->put(
            "orders/{$order->number}.json",
            json_encode($this->orderJson($order), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        );
    }

    /** @return array<string, mixed> */
    public function orderJson(Order $order): array
    {
        $order->loadMissing('items');

        return [
            'order_id' => $order->id,
            'order_number' => $order->number,
            'created_at' => $order->created_at?->toIso8601String(),
            'status' => $order->status->value,
            'currency' => $order->currency,
            'locale' => $order->locale,
            'customer' => ['name' => $order->name, 'email' => $order->email, 'phone' => $order->phone],
            'payment' => [
                'provider' => 'mock',
                'reference' => $order->payment_reference,
                'status' => $order->payment_status,
            ],
            'items' => $order->items->map(fn ($i) => [
                'order_item_id' => $i->id,
                'product_id' => $i->product_id,
                'variant_id' => $i->variant_id,
                'sku' => $i->sku,
                'name' => $i->name_snapshot[$order->locale] ?? ($i->name_snapshot['en'] ?? ''),
                'options' => $i->options_snapshot,
                'quantity' => $i->quantity,
                'unit_price' => $i->unit_price,
                'line_total' => $i->line_total,
            ])->all(),
            'totals' => ['subtotal' => $order->subtotal, 'shipping' => $order->shipping, 'total' => $order->total],
        ];
    }
}
