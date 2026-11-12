<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\AttributeDefinition;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Full product payload for the detail page (PROMPT §7.3). Specs are grouped + labelled
 * from attribute_definitions so the PDP renders them dynamically.
 *
 * @mixin Product
 */
class ProductDetailResource extends JsonResource
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
            'description' => $this->description,
            'brand' => $this->whenLoaded('brand', fn () => $this->brand ? [
                'slug' => $this->brand->slug, 'name' => $this->brand->name,
            ] : null),
            'segment' => $this->whenLoaded('segment', fn () => $this->segment ? [
                'slug' => $this->segment->slug, 'name' => $this->segment->name,
            ] : null),
            'base_price' => $this->base_price,
            'from_price' => $this->whenLoaded('variants', fn () => $this->fromPrice()),
            'is_featured' => $this->is_featured,
            'status' => $this->status,
            'variants' => VariantResource::collection($this->whenLoaded('variants')),
            'spec_groups' => $this->specGroups(),
            // Set by the controller: accessories-for-this-phone or fits-these-phones, plus related.
            'compatible' => ProductCardResource::collection($this->whenLoaded('compatibleItems')),
            'related' => ProductCardResource::collection($this->whenLoaded('relatedItems')),
            'image' => $this->whenLoaded('media', fn () => $this->getFirstMedia('gallery')?->getUrl('large')),
            'gallery' => $this->whenLoaded(
                'media',
                fn () => $this->getMedia('gallery')->map(fn ($m) => $m->getUrl('large'))->values(),
            ),
        ];
    }

    /**
     * Group the product's specs by attribute-definition group, in sort order, with labels + units.
     *
     * @return list<array{group: string, rows: list<array<string, mixed>>}>
     */
    private function specGroups(): array
    {
        $specs = $this->specs ?? [];

        $defs = AttributeDefinition::forType($this->type)->get();

        $groups = [];
        foreach ($defs as $def) {
            if (! array_key_exists($def->key, $specs)) {
                continue;
            }
            $group = $def->group ?? 'General';
            $groups[$group][] = [
                'key' => $def->key,
                'label' => $def->label,
                'unit' => $def->unit,
                'data_type' => $def->data_type,
                'value' => $specs[$def->key],
            ];
        }

        return array_map(
            fn (string $group, array $rows) => ['group' => $group, 'rows' => $rows],
            array_keys($groups),
            array_values($groups),
        );
    }
}
