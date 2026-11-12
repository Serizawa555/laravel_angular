<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\AttributeDefinition;
use Illuminate\Database\Seeder;

/** Idempotent reconcile of spec field definitions from data/attribute_definitions.json. */
class AttributeDefinitionSeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode(
            (string) file_get_contents(database_path('seeders/data/attribute_definitions.json')),
            associative: true,
        );

        foreach ($data as $def) {
            AttributeDefinition::updateOrCreate(
                ['product_type' => $def['product_type'], 'key' => $def['key']],
                [
                    'label' => $def['label'],
                    'data_type' => $def['data_type'],
                    'unit' => $def['unit'] ?? null,
                    'options' => $def['options'] ?? null,
                    'group' => $def['group'] ?? null,
                    'is_filterable' => $def['is_filterable'] ?? false,
                    'is_required' => $def['is_required'] ?? false,
                    'sort' => $def['sort'] ?? 0,
                ],
            );
        }
    }
}
