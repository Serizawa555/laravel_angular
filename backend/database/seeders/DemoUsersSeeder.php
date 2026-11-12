<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Demo staff + shopper accounts for local development (PROMPT §9). Idempotent (keyed on email).
 * Password for all demo accounts: "password".
 */
class DemoUsersSeeder extends Seeder
{
    /** @var list<array{name:string,email:string,role:string}> */
    private array $users = [
        ['name' => 'Demo Admin', 'email' => 'admin@phoneshop.test', 'role' => 'admin'],
        ['name' => 'Demo Editor', 'email' => 'editor@phoneshop.test', 'role' => 'editor'],
        ['name' => 'Demo Customer', 'email' => 'customer@phoneshop.test', 'role' => 'customer'],
    ];

    public function run(): void
    {
        foreach ($this->users as $row) {
            $user = User::updateOrCreate(
                ['email' => $row['email']],
                ['name' => $row['name'], 'password' => Hash::make('password')],
            );

            $user->syncRoles([$row['role']]);
        }
    }
}
