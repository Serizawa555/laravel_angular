<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ProductStatus;
use App\Enums\ProductType;
use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminProductResource;
use App\Models\OptionValue;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Support\Specs\SpecsValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Pagination\Paginator;
use Illuminate\Validation\Rule;

class AdminProductController extends Controller
{
    public function __construct(private readonly SpecsValidator $specs) {}

    /** GET /admin/products — all statuses, with search/filter. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Product::class);

        $query = Product::withTrashed()->with('brand')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('brand_id'), fn ($q) => $q->where('brand_id', $request->integer('brand_id')))
            ->when($request->filled('q'), fn ($q) => $q->whereRaw('name::text ILIKE ?', ['%'.$request->string('q').'%']))
            ->latest();

        Paginator::currentPageResolver(fn () => (int) ($request->input('page.number') ?: 1));

        return AdminProductResource::collection($query->paginate((int) ($request->input('page.size') ?: 20)));
    }

    /** GET /admin/products/{id} */
    public function show(int $id): AdminProductResource
    {
        $product = Product::withTrashed()->with('variants.optionValues.optionType')->findOrFail($id);
        $this->authorize('view', $product);

        return new AdminProductResource($product);
    }

    /** POST /admin/products — editors create drafts. */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Product::class);

        $data = $this->validateProduct($request);

        $product = new Product($this->attributes($data));
        $product->status = ProductStatus::Draft; // publishing is a separate, admin-only action
        $product->created_by = $request->user()->id;
        $product->updated_by = $request->user()->id;
        $product->save();

        $this->syncVariants($product, $data['variants'] ?? []);

        return $this->fresh($product)->response()->setStatusCode(201);
    }

    /** PUT /admin/products/{id} */
    public function update(Request $request, int $id): AdminProductResource
    {
        $product = Product::withTrashed()->findOrFail($id);
        $this->authorize('update', $product);

        $data = $this->validateProduct($request, $product);

        $product->fill($this->attributes($data));
        $product->updated_by = $request->user()->id;
        $product->save();

        $this->syncVariants($product, $data['variants'] ?? []);

        return $this->fresh($product);
    }

    public function publish(int $id): AdminProductResource
    {
        $product = Product::findOrFail($id);
        $this->authorize('publish', $product);
        $product->update(['status' => ProductStatus::Published, 'published_at' => now()]);

        return $this->fresh($product);
    }

    public function unpublish(int $id): AdminProductResource
    {
        $product = Product::findOrFail($id);
        $this->authorize('publish', $product);
        $product->update(['status' => ProductStatus::Unpublished]);

        return $this->fresh($product);
    }

    public function destroy(Request $request, int $id): Response|AdminProductResource
    {
        $product = Product::withTrashed()->findOrFail($id);

        if ($request->boolean('force')) {
            $this->authorize('forceDelete', $product);
            $product->forceDelete();

            return response()->noContent();
        }

        $this->authorize('delete', $product);
        $product->delete();

        return $this->fresh($product);
    }

    public function restore(int $id): AdminProductResource
    {
        $product = Product::withTrashed()->findOrFail($id);
        $this->authorize('restore', $product);
        $product->restore();

        return $this->fresh($product);
    }

    /** POST /admin/products/{id}/media — upload a gallery image. */
    public function uploadMedia(Request $request, int $id): AdminProductResource
    {
        $product = Product::withTrashed()->findOrFail($id);
        $this->authorize('update', $product);
        $request->validate(['image' => ['required', 'image', 'max:5120']]); // 5 MB

        $product->addMediaFromRequest('image')->toMediaCollection('gallery');

        return $this->fresh($product);
    }

    /** DELETE /admin/products/{id}/media/{media} */
    public function deleteMedia(int $id, int $media): AdminProductResource
    {
        $product = Product::withTrashed()->findOrFail($id);
        $this->authorize('update', $product);
        $product->deleteMedia($media);

        return $this->fresh($product);
    }

    // --- helpers ---

    /** @return array<string, mixed> */
    private function validateProduct(Request $request, ?Product $product = null): array
    {
        $type = $request->enum('type', ProductType::class) ?? ProductType::Phone;

        $base = $request->validate([
            'type' => ['required', Rule::enum(ProductType::class)],
            'slug' => ['required', 'string', 'max:255', Rule::unique('products', 'slug')->ignore($product?->id)],
            'sku_base' => ['nullable', 'string', 'max:255'],
            'brand_id' => ['nullable', 'integer', 'exists:terms,id'],
            'segment_id' => ['nullable', 'integer', 'exists:terms,id'],
            'name' => ['required', 'array'],
            'name.en' => ['required', 'string'],
            'name.ro' => ['nullable', 'string'],
            'short_description' => ['nullable', 'array'],
            'description' => ['nullable', 'array'],
            'base_price' => ['required', 'integer', 'min:0'],
            'variants' => ['array'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.sku' => ['required', 'string'],
            'variants.*.price' => ['required', 'integer', 'min:0'],
            'variants.*.compare_at_price' => ['nullable', 'integer', 'min:0'],
            'variants.*.stock' => ['required', 'integer', 'min:0'],
            'variants.*.is_default' => ['boolean'],
            'variants.*.options' => ['array'],
        ]);

        return array_merge($base, $request->validate($this->specs->rules($type)));
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        return [
            'type' => $data['type'],
            'slug' => $data['slug'],
            'sku_base' => $data['sku_base'] ?? null,
            'brand_id' => $data['brand_id'] ?? null,
            'segment_id' => $data['segment_id'] ?? null,
            'name' => $data['name'],
            'short_description' => $data['short_description'] ?? null,
            'description' => $data['description'] ?? null,
            'specs' => $data['specs'] ?? [],
            'base_price' => $data['base_price'],
        ];
    }

    /** @param list<array<string, mixed>> $variants */
    private function syncVariants(Product $product, array $variants): void
    {
        $optionMap = OptionValue::with('optionType')->get()
            ->keyBy(fn (OptionValue $v) => $v->optionType->code.':'.$v->code);

        $keep = [];
        foreach ($variants as $row) {
            $variant = ! empty($row['id'])
                ? $product->variants()->findOrNew($row['id'])
                : new ProductVariant;

            $variant->fill([
                'sku' => $row['sku'],
                'price' => $row['price'],
                'compare_at_price' => $row['compare_at_price'] ?? null,
                'stock' => $row['stock'],
                'is_default' => $row['is_default'] ?? false,
            ]);
            $product->variants()->save($variant);
            $keep[] = $variant->id;

            $ids = [];
            foreach (($row['options'] ?? []) as $axis => $code) {
                $key = $axis.':'.$code;
                if (isset($optionMap[$key])) {
                    $ids[] = $optionMap[$key]->id;
                }
            }
            $variant->optionValues()->sync($ids);
        }

        $product->variants()->whereNotIn('id', $keep)->delete();
    }

    private function fresh(Product $product): AdminProductResource
    {
        return new AdminProductResource(
            $product->fresh(['variants.optionValues.optionType', 'media']),
        );
    }
}
