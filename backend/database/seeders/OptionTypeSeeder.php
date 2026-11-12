<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\OptionType;
use App\Models\OptionValue;
use Illuminate\Database\Seeder;

/** Idempotent reconcile of option types + values (color/ram/storage) from data/option_types.json. */
class OptionTypeSeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode(
            (string) file_get_contents(database_path('seeders/data/option_types.json')),
            associative: true,
        );

        foreach ($data as $type) {
            $optionType = OptionType::updateOrCreate(
                ['code' => $type['code']],
                ['name' => $type['name']],
            );

            foreach ($type['values'] as $value) {
                OptionValue::updateOrCreate(
                    ['option_type_id' => $optionType->id, 'code' => $value['code']],
                    [
                        'label' => $value['label'],
                        'sort' => $value['sort'],
                        'meta' => $value['meta'] ?? null,
                    ],
                );
            }
        }
    }
}
