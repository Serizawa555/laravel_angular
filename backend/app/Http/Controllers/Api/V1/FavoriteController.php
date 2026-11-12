<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductCardResource;
use App\Models\Favorite;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * User favorites (synced). Guests keep favorites in localStorage and POST /favorites/sync on login
 * to merge them server-side (PROMPT §5, §7.4).
 */
class FavoriteController extends Controller
{
    /** GET /favorites — the user's favorited products as cards. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $ids = Favorite::where('user_id', $request->user()->id)->pluck('product_id');

        return ProductCardResource::collection(
            Product::published()->whereIn('id', $ids)->with(['brand', 'segment', 'variants', 'media'])->get(),
        );
    }

    /** POST /favorites { product_id } */
    public function store(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate(['product_id' => ['required', 'integer', 'exists:products,id']]);

        Favorite::firstOrCreate([
            'user_id' => $request->user()->id,
            'product_id' => $data['product_id'],
        ], ['created_at' => now()]);

        return $this->index($request);
    }

    /** DELETE /favorites/{product} */
    public function destroy(Request $request, int $product): AnonymousResourceCollection
    {
        Favorite::where('user_id', $request->user()->id)->where('product_id', $product)->delete();

        return $this->index($request);
    }

    /** POST /favorites/sync { product_ids: [] } — merge localStorage favorites after login. */
    public function sync(Request $request): AnonymousResourceCollection
    {
        $data = $request->validate([
            'product_ids' => ['array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
        ]);

        foreach ($data['product_ids'] ?? [] as $productId) {
            Favorite::firstOrCreate([
                'user_id' => $request->user()->id,
                'product_id' => $productId,
            ], ['created_at' => now()]);
        }

        return $this->index($request);
    }
}
