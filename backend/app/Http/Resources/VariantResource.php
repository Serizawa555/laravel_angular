<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProductVariant
 */
class VariantResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'price' => $this->price,                     // bani
            'compare_at_price' => $this->compare_at_price,
            'stock' => $this->stock,
            'is_default' => $this->is_default,
            // Which option value (by axis) this variant selects, e.g. {color: black, ram: 8gb}.
            'options' => $this->whenLoaded('optionValues', fn () => $this->optionValues
                ->mapWithKeys(fn ($v) => [$v->optionType->code => $v->code])),
            'option_values' => OptionValueResource::collection($this->whenLoaded('optionValues')),
        ];
    }
}
