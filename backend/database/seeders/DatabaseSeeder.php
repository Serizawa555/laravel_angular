<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     * Order matters: roles/permissions first, then the users that reference them.
     */
    public function run(): void
    {
        $this->call([
            // Access control
            RolePermissionSeeder::class,
            SuperAdminSeeder::class,
            DemoUsersSeeder::class,
            // Catalog structural config (must precede products)
            VocabularySeeder::class,
            OptionTypeSeeder::class,
            AttributeDefinitionSeeder::class,
            // Demo content
            CatalogSeeder::class,
        ]);
    }
}
