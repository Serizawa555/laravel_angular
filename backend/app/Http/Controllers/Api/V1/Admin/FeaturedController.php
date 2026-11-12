<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\CatalogCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeaturedController extends Controller
{
    /**
     * GET /admin/featured — current featured products in order.
     *
     * @return array<string, mixed>
     */
    public function index(): array
    {
        return ['data' => $this->current()];
    }

    /**
     * PUT /admin/featured { ids: [..] } — set up to N featured products, in order.
     *
     * @return array<string, mixed>
     */
    public function update(Request $request): array
    {
        $max = (int) config('shop.featured_max');
        $data = $request->validate([
            'ids' => ['array', "max:{$max}"],
            'ids.*' => ['integer', 'exists:products,id'],
        ]);

        DB::transaction(function () use ($data) {
            // featured_position is unique → clear everything first to avoid collisions.
            Product::whereNotNull('featured_position')
                ->update(['is_featured' => false, 'featured_position' => null]);

            foreach (array_values($data['ids'] ?? []) as $i => $id) {
                Product::where('id', $id)->update(['is_featured' => true, 'featured_position' => $i + 1]);
            }
        });

        app(CatalogCache::class)->bump(); // mass updates skip model events

        return ['data' => $this->current()];
    }

    /** @return array<int, array<string, mixed>> */
    private function current(): array
    {
        return Product::whereNotNull('featured_position')
            ->orderBy('featured_position')
            ->get(['id', 'slug', 'name', 'featured_position'])
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'name' => $p->name,
                'featured_position' => $p->featured_position,
            ])
            ->all();
    }
}
