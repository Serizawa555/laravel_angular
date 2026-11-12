<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\PlaceOrder;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Pagination\Paginator;

class AdminOrderController extends Controller
{
    /**
     * GET /admin/orders
     *
     * @return array<string, mixed>
     */
    public function index(Request $request): array
    {
        Paginator::currentPageResolver(fn () => (int) ($request->input('page.number') ?: 1));

        $orders = Order::latest()->paginate(20);

        return [
            'data' => collect($orders->items())->map(fn (Order $o) => [
                'number' => $o->number,
                'name' => $o->name,
                'email' => $o->email,
                'status' => $o->status->value,
                'total' => $o->total,
                'currency' => $o->currency,
                'created_at' => $o->created_at?->toIso8601String(),
            ]),
            'meta' => ['total' => $orders->total(), 'last_page' => $orders->lastPage(), 'current_page' => $orders->currentPage()],
        ];
    }

    /**
     * GET /admin/orders/{number} — full JSON view.
     *
     * @return array<string, mixed>
     */
    public function show(string $number, PlaceOrder $placeOrder): array
    {
        $order = Order::where('number', $number)->firstOrFail();

        return ['data' => $placeOrder->orderJson($order)];
    }
}
