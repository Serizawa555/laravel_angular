<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\ProductType;
use App\Http\Controllers\Controller;
use App\Models\AttributeDefinition;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class AttributeDefinitionController extends Controller
{
    /**
     * GET /admin/attribute-definitions
     *
     * @return array<string, mixed>
     */
    public function index(): array
    {
        return [
            'data' => AttributeDefinition::orderBy('product_type')->orderBy('sort')->get()
                ->map(fn (AttributeDefinition $d) => [
                    'id' => $d->id,
                    'product_type' => $d->product_type,
                    'key' => $d->key,
                    'label' => $d->getTranslations('label'),
                    'data_type' => $d->data_type,
                    'unit' => $d->unit,
                    'options' => $d->options,
                    'group' => $d->group,
                    'is_filterable' => $d->is_filterable,
                    'is_required' => $d->is_required,
                    'sort' => $d->sort,
                ]),
        ];
    }

    public function store(Request $request): AttributeDefinition
    {
        return AttributeDefinition::create($this->validateDef($request));
    }

    public function update(Request $request, AttributeDefinition $attribute_definition): AttributeDefinition
    {
        $attribute_definition->update($this->validateDef($request, $attribute_definition));

        return $attribute_definition;
    }

    public function destroy(AttributeDefinition $attribute_definition): Response
    {
        $attribute_definition->delete();

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function validateDef(Request $request, ?AttributeDefinition $def = null): array
    {
        return $request->validate([
            'product_type' => ['required', Rule::enum(ProductType::class)],
            'key' => ['required', 'string', 'max:255'],
            'label' => ['required', 'array'],
            'label.en' => ['required', 'string'],
            'data_type' => ['required', Rule::in(['string', 'int', 'decimal', 'bool', 'enum', 'list'])],
            'unit' => ['nullable', 'string', 'max:20'],
            'options' => ['nullable', 'array'],
            'group' => ['nullable', 'string', 'max:255'],
            'is_filterable' => ['boolean'],
            'is_required' => ['boolean'],
            'sort' => ['integer'],
        ]);
    }
}
