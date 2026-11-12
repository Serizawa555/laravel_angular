<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Actions\PlaceOrder;
use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Models\Order;
use App\Services\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckoutController extends Controller
{
    public function __construct(
        private readonly CartService $carts,
        private readonly PlaceOrder $placeOrder,
    ) {}

    /** POST /checkout — validate cart, recompute, create order, run (mock) payment. */
    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $cart = $this->carts->resolve($request);
        $order = $this->placeOrder->handle($cart, $request->validated());

        $payload = $this->placeOrder->orderJson($order);

        if ($order->status === OrderStatus::Failed) {
            return response()->json(
                ['message' => 'Payment was declined. Please try another card.', 'order' => $payload],
                Response::HTTP_PAYMENT_REQUIRED,
            );
        }

        return response()->json(['data' => $payload], Response::HTTP_CREATED);
    }

    /** GET /orders — the authenticated user's orders (newest first). */
    public function index(Request $request): JsonResponse
    {
        $orders = Order::where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn (Order $o) => [
                'number' => $o->number,
                'status' => $o->status->value,
                'total' => $o->total,
                'currency' => $o->currency,
                'created_at' => $o->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $orders]);
    }

    /** GET /orders/{number} — order detail for the owner. */
    public function show(Request $request, string $number): JsonResponse
    {
        $order = Order::where('number', $number)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        return response()->json(['data' => $this->placeOrder->orderJson($order)]);
    }

    /**
     * GET /orders/{number}/json — the pretty order JSON (confirmation page + download).
     * Public by order number so a guest can see their just-placed order (demo trade-off).
     */
    public function json(string $number): JsonResponse
    {
        $order = Order::where('number', $number)->firstOrFail();

        return response()->json($this->placeOrder->orderJson($order));
    }
}
