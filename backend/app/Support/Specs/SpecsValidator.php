<?php

declare(strict_types=1);

namespace App\Support\Specs;

use App\Enums\ProductType;
use App\Models\AttributeDefinition;
use Illuminate\Validation\Rule;

/**
 * Builds Laravel validation rules for products.specs from attribute_definitions for a given type
 * (PROMPT §3.3). The admin form and the API share the same source of truth — no hard-coded fields.
 */
class SpecsValidator
{
    /** @return array<string, mixed> */
    public function rules(ProductType $type): array
    {
        $rules = ['specs' => ['nullable', 'array']];

        foreach (AttributeDefinition::forType($type)->get() as $def) {
            $key = "specs.{$def->key}";
            $rule = [$def->is_required ? 'required' : 'nullable'];

            $rule[] = match ($def->data_type) {
                'int' => 'integer',
                'decimal' => 'numeric',
                'bool' => 'boolean',
                'enum' => Rule::in($def->options ?? []),
                'list' => 'array',
                default => 'string',
            };

            if ($def->data_type === 'list' && $def->options) {
                $rules["{$key}.*"] = [Rule::in($def->options)];
            }

            $rules[$key] = $rule;
        }

        return $rules;
    }
}
