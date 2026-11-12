<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ProductType;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProductCardResource;
use App\Http\Resources\ProductDetailResource;
use App\Models\OptionValue;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Term;
use App\Queries\ProductQuery;
use App\Support\CatalogCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Pagination\Paginator;

class ProductController extends Controller
{
    public function __construct(
        private readonly ProductQuery $query,
        private readonly CatalogCache $cache,
    ) {}

    /** GET /products — filtered, sorted, paginated listing. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = (array) $request->input('filter', []);

        $products = Product::published()->with(['brand', 'segment', 'variants', 'media']);
        $this->query->apply($products, $filters);
        $this->applySort($products, (string) $request->input('sort', '-created_at'));

        $size = (int) ($request->input('page.size') ?: config('shop.page_size'));
        $number = (int) ($request->input('page.number') ?: 1);
        Paginator::currentPageResolver(fn () => $number);

        return ProductCardResource::collection(
            $products->paginate($size)->appends($request->query()),
        );
    }

    /**
     * GET /products/featured — up to N, ordered by featured_position (cached per locale).
     *
     * @return array<string, mixed>
     */
    public function featured(): array
    {
        $data = $this->cache->remember('featured', function () {
            $products = Product::published()
                ->whereNotNull('featured_position')
                ->with(['brand', 'segment', 'variants', 'media'])
                ->orderBy('featured_position')
                ->limit((int) config('shop.featured_max'))
                ->get();

            return ProductCardResource::collection($products)->resolve();
        });

        return ['data' => $data];
    }

    /** GET /products/{slug} — full detail with variants, specs, compatibility, related. */
    public function show(string $slug): ProductDetailResource
    {
        $product = Product::published()
            ->where('slug', $slug)
            ->with(['brand', 'segment', 'variants.optionValues.optionType', 'media'])
            ->firstOrFail();

        // Compatibility: phones show accessories; accessories show the phones they fit.
        $compatible = $product->type === ProductType::Phone
            ? $product->compatibleAccessories()->published()->with(['brand', 'variants', 'media'])->get()
            : $product->compatiblePhones()->published()->with(['brand', 'variants', 'media'])->get();

        $related = Product::published()
            ->where('type', $product->type->value)
            ->where('id', '!=', $product->id)
            ->when($product->brand_id, fn (Builder $q) => $q->where('brand_id', $product->brand_id))
            ->with(['brand', 'variants', 'media'])
            ->limit(4)
            ->get();

        $product->setRelation('compatibleItems', $compatible);
        $product->setRelation('relatedItems', $related);

        return new ProductDetailResource($product);
    }

    /**
     * GET /products/facets — counts per dimension, respecting the other active filters.
     *
     * @return array<string, mixed>
     */
    public function facets(Request $request): array
    {
        $filters = (array) $request->input('filter', []);

        return [
            'data' => [
                'type' => $this->typeFacet($filters),
                'brand' => $this->termFacet($filters, 'brand'),
                'segment' => $this->termFacet($filters, 'segment'),
                'color' => $this->optionFacet($filters, 'color'),
                'ram' => $this->optionFacet($filters, 'ram'),
                'storage' => $this->optionFacet($filters, 'storage'),
                'price' => $this->priceRange($filters),
            ],
        ];
    }

    // --- Sorting ---

    /** @param Builder<Product> $query */
    private function applySort(Builder $query, string $sort): void
    {
        $minPrice = '(select min(price) from product_variants where product_variants.product_id = products.id)';
        $locale = app()->getLocale();

        match ($sort) {
            'price' => $query->orderByRaw("$minPrice asc"),
            '-price' => $query->orderByRaw("$minPrice desc"),
            'name' => $query->orderByRaw('name->>? asc', [$locale]),
            '-name' => $query->orderByRaw('name->>? desc', [$locale]),
            'created_at' => $query->orderBy('created_at'),
            default => $query->orderByDesc('created_at'),
        };
    }

    // --- Facets (one query per option/term; fine at this catalog size) ---

    /**
     * @param  array<string, mixed>  $filters
     * @return Builder<Product>
     */
    private function base(array $filters, string $exceptKey): Builder
    {
        $query = Product::published();
        $this->query->apply($query, $filters, [$exceptKey]);

        return $query;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    private function typeFacet(array $filters): array
    {
        return collect(ProductType::cases())
            ->map(fn (ProductType $t) => [
                'value' => $t->value,
                'count' => (clone $this->base($filters, 'type'))->where('type', $t->value)->count(),
            ])
            ->filter(fn ($row) => $row['count'] > 0)
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    private function termFacet(array $filters, string $vocabulary): array
    {
        $column = $vocabulary === 'brand' ? 'brand_id' : 'segment_id';

        return Term::whereHas('vocabulary', fn (Builder $v) => $v->where('code', $vocabulary))
            ->orderBy('weight')
            ->get()
            ->map(fn (Term $term) => [
                'slug' => $term->slug,
                'name' => $term->name,
                'count' => (clone $this->base($filters, $vocabulary))->where($column, $term->id)->count(),
            ])
            ->filter(fn ($row) => $row['count'] > 0)
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    private function optionFacet(array $filters, string $axis): array
    {
        return OptionValue::whereHas('optionType', fn (Builder $t) => $t->where('code', $axis))
            ->with('optionType')
            ->orderBy('sort')
            ->get()
            ->map(fn (OptionValue $value) => [
                'code' => $value->code,
                'label' => $value->label,
                'meta' => $value->meta,
                'count' => (clone $this->base($filters, $axis))
                    ->whereHas('variants.optionValues', fn (Builder $ov) => $ov->where('option_values.id', $value->id))
                    ->count(),
            ])
            ->filter(fn ($row) => $row['count'] > 0)
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array{min: int, max: int}
     */
    private function priceRange(array $filters): array
    {
        $query = Product::published();
        $this->query->apply($query, $filters, ['price_min', 'price_max']);
        $ids = $query->pluck('id');

        return [
            'min' => (int) (ProductVariant::whereIn('product_id', $ids)->min('price') ?? 0),
            'max' => (int) (ProductVariant::whereIn('product_id', $ids)->max('price') ?? 0),
        ];
    }
}
