<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Idempotent: reconciles roles + permissions from database/seeders/data/roles.json.
 * Re-run safely after editing that file (the "cim" of our config system).
 */
class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode(
            (string) file_get_contents(database_path('seeders/data/roles.json')),
            associative: true,
        );

        // Reset spatie's cached permission map before/after seeding.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($data['permissions'] as $name) {
            Permission::findOrCreate($name, 'web');
        }

        foreach ($data['roles'] as $roleName => $permissions) {
            $role = Role::findOrCreate($roleName, 'web');
            $role->syncPermissions($permissions); // reconcile exactly to the file
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
