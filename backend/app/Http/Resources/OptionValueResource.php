<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\OptionValue;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OptionValue
 */
class OptionValueResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->whenLoaded('optionType', fn () => $this->optionType->code),
            'code' => $this->code,
            'label' => $this->label,
            'meta' => $this->meta, // {hex} for colours, {gb} for ram/storage
        ];
    }
}
