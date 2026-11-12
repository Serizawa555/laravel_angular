<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Term;
use App\Models\Vocabulary;
use Illuminate\Database\Seeder;

/** Idempotent reconcile of vocabularies + terms from data/vocabularies.json. */
class VocabularySeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode(
            (string) file_get_contents(database_path('seeders/data/vocabularies.json')),
            associative: true,
        );

        foreach ($data as $vocab) {
            $vocabulary = Vocabulary::updateOrCreate(
                ['code' => $vocab['code']],
                ['name' => $vocab['name']],
            );

            foreach ($vocab['terms'] as $term) {
                Term::updateOrCreate(
                    ['vocabulary_id' => $vocabulary->id, 'slug' => $term['slug']],
                    ['name' => $term['name'], 'weight' => $term['weight']],
                );
            }
        }
    }
}
