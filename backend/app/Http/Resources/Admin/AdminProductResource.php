<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Admin product payload — returns ALL locales for translatable fields (PROMPT §5), plus variants
 * and taxonomy ids, so the edit form can round-trip everything.
 *
 * @mixin Product
 */
class AdminProductResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'slug' => $this->slug,
            'sku_base' => $this->sku_base,
            'brand_id' => $this->brand_id,
            'segment_id' => $this->segment_id,
            'name' => $this->getTranslations('name'),
            'short_description' => $this->getTranslations('short_description'),
            'description' => $this->getTranslations('description'),
            'specs' => $this->specs ?? [],
            'base_price' => $this->base_price,
            'status' => $this->status,
            'is_featured' => $this->is_featured,
            'featured_position' => $this->featured_position,
            'deleted_at' => $this->deleted_at,
            'media' => $this->whenLoaded('media', fn () => $this->getMedia('gallery')->map(fn ($m) => [
                'id' => $m->id,
                'thumb' => $m->hasGeneratedConversion('thumb') ? $m->getUrl('thumb') : $m->getUrl(),
                'url' => $m->getUrl(),
            ])->values()),
            'variants' => $this->whenLoaded('variants', fn () => $this->variants->map(fn ($v) => [
                'id' => $v->id,
                'sku' => $v->sku,
                'price' => $v->price,
                'compare_at_price' => $v->compare_at_price,
                'stock' => $v->stock,
                'is_default' => $v->is_default,
                'options' => $v->relationLoaded('optionValues')
                    ? $v->optionValues->mapWithKeys(fn ($o) => [$o->optionType->code => $o->code])
                    : [],
            ])),
        ];
    }
}
