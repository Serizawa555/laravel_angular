<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Light product payload for listing cards (PROMPT §7). Prices in bani.
 *
 * @mixin Product
 */
class ProductCardResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'type' => $this->type,
            'name' => $this->name,
            'short_description' => $this->short_description,
            'brand' => $this->whenLoaded('brand', fn () => $this->brand?->name),
            'brand_slug' => $this->whenLoaded('brand', fn () => $this->brand?->slug),
            'segment' => $this->whenLoaded('segment', fn () => $this->segment?->name),
            'from_price' => $this->whenLoaded('variants', fn () => $this->fromPrice()),
            'compare_at_price' => $this->whenLoaded('variants', fn () => $this->variants
                ->sortBy('price')->first()?->compare_at_price),
            'in_stock' => $this->whenLoaded('variants', fn () => $this->variants->sum('stock') > 0),
            // Lets listing cards "quick add": the default (or cheapest in-stock) variant.
            'default_variant_id' => $this->whenLoaded('variants', fn () => $this->defaultVariantId()),
            // When > 1, the card links to the PDP ("Choose options") instead of silently adding.
            'variant_count' => $this->whenLoaded('variants', fn () => $this->variants->count()),
            'is_featured' => $this->is_featured,
            'featured_position' => $this->featured_position,
            'image' => $this->whenLoaded('media', fn () => $this->cardImage()),
        ];
    }

    private function defaultVariantId(): ?int
    {
        $inStock = $this->variants->where('stock', '>', 0);
        $pool = $inStock->isNotEmpty() ? $inStock : $this->variants;

        return ($pool->firstWhere('is_default') ?? $pool->sortBy('price')->first())?->id;
    }

    private function cardImage(): ?string
    {
        $media = $this->getFirstMedia('gallery');

        return $media?->hasGeneratedConversion('card') ? $media->getUrl('card') : $media?->getUrl();
    }
}
