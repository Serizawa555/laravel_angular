<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds the superadmin from .env (SUPERADMIN_*). Never hard-coded (PROMPT §4).
 * Idempotent: keyed on email.
 */
class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = (string) env('SUPERADMIN_EMAIL');
        $password = (string) env('SUPERADMIN_PASSWORD');

        if ($email === '' || $password === '') {
            $this->command?->warn('SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD not set — skipping superadmin seed.');

            return;
        }

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => (string) env('SUPERADMIN_NAME', 'Superadmin'),
                'password' => Hash::make($password),
            ],
        );

        $user->syncRoles(['superadmin']);
    }
}
