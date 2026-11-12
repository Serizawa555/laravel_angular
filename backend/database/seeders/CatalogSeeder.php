<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\OptionValue;
use App\Models\Product;
use App\Models\Term;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

/**
 * Idempotent reconcile of demo products (+ variants, option links, taxonomy tags, compatibility)
 * from data/catalog.json. Keyed on product slug / variant sku. Run after Vocabulary + OptionType.
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $catalog = json_decode(
            (string) file_get_contents(database_path('seeders/data/catalog.json')),
            associative: true,
        );
        $products = $catalog['products'];

        // Lookup maps (eager-loaded; preventLazyLoading is on in dev).
        $termBySlug = Term::all()->keyBy('slug');
        $optionValueByKey = OptionValue::with('optionType')
            ->get()
            ->keyBy(fn (OptionValue $v) => $v->optionType->code.':'.$v->code);

        // Pass 1: products, variants, option links, extra taxonomy tags.
        foreach ($products as $row) {
            $this->upsertProduct($row, $termBySlug, $optionValueByKey);
        }

        // Pass 2: compatibility (needs every product to exist first).
        $productBySlug = Product::all()->keyBy('slug');
        foreach ($products as $row) {
            $phoneSlugs = $row['compatible_with'] ?? [];
            if ($phoneSlugs === []) {
                continue;
            }
            $accessory = $productBySlug[$row['slug']];
            $phoneIds = collect($phoneSlugs)
                ->map(fn (string $slug) => $productBySlug[$slug]->id ?? null)
                ->filter()
                ->all();
            $accessory->compatiblePhones()->sync($phoneIds);
        }
    }

    /**
     * @param  array<string, mixed>  $row
     * @param  Collection<string, Term>  $termBySlug
     * @param  Collection<string, OptionValue>  $optionValueByKey
     */
    private function upsertProduct(array $row, $termBySlug, $optionValueByKey): void
    {
        $prices = array_column($row['variants'], 'price');

        $product = Product::updateOrCreate(
            ['slug' => $row['slug']],
            [
                'type' => $row['type'],
                'brand_id' => $this->termId($termBySlug, $row['brand'] ?? null),
                'segment_id' => $this->termId($termBySlug, $row['segment'] ?? null),
                'sku_base' => $row['sku_base'] ?? null,
                'name' => $row['name'],
                'short_description' => $row['short_description'] ?? null,
                'description' => $row['description'] ?? null,
                'specs' => $row['specs'] ?? [],
                'base_price' => $prices === [] ? 0 : min($prices),
                'status' => $row['status'] ?? 'draft',
                'published_at' => ($row['status'] ?? null) === 'published' ? now() : null,
                'is_featured' => $row['is_featured'] ?? false,
                'featured_position' => $row['featured_position'] ?? null,
            ],
        );

        foreach ($row['variants'] as $v) {
            $variant = $product->variants()->updateOrCreate(
                ['sku' => $v['sku']],
                [
                    'price' => $v['price'],
                    'compare_at_price' => $v['compare_at_price'] ?? null,
                    'stock' => $v['stock'] ?? 0,
                    'is_default' => $v['is_default'] ?? false,
                ],
            );

            $optionValueIds = [];
            foreach ($v['options'] as $typeCode => $valueCode) {
                $key = $typeCode.':'.$valueCode;
                if (isset($optionValueByKey[$key])) {
                    $optionValueIds[] = $optionValueByKey[$key]->id;
                }
            }
            $variant->optionValues()->sync($optionValueIds);
        }

        // Extra taxonomy tags (e.g. case_material, connection).
        $tagIds = collect($row['terms'] ?? [])
            ->map(fn (string $slug) => $termBySlug[$slug]->id ?? null)
            ->filter()
            ->all();
        $product->terms()->sync($tagIds);
    }

    /** @param Collection<string, Term> $termBySlug */
    private function termId($termBySlug, ?string $slug): ?int
    {
        if ($slug === null) {
            return null;
        }

        return $termBySlug[$slug]->id ?? null;
    }
}
