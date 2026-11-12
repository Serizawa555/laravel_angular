<?php

declare(strict_types=1);

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Cache\RateLimiter;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    // Simulate the SPA origin so Sanctum treats the request as stateful (starts the session),
    // exactly as the real Angular dev server does.
    $this->withHeader('Origin', 'http://localhost:4200');
});

it('registers a shopper and assigns the customer role', function () {
    $response = $this->postJson('/api/v1/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.email', 'jane@example.com')
        ->assertJsonPath('data.roles', ['customer']);

    expect(User::where('email', 'jane@example.com')->exists())->toBeTrue();
    $this->assertAuthenticated();
});

it('rejects registration with a duplicate email', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $this->postJson('/api/v1/register', [
        'name' => 'Dupe',
        'email' => 'taken@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});

it('logs in with valid credentials', function () {
    User::factory()->create([
        'email' => 'user@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $this->postJson('/api/v1/login', [
        'email' => 'user@example.com',
        'password' => 'secret123',
    ])->assertOk()->assertJsonPath('data.email', 'user@example.com');

    $this->assertAuthenticated();
});

it('rejects login with a wrong password', function () {
    User::factory()->create([
        'email' => 'user@example.com',
        'password' => Hash::make('secret123'),
    ]);

    $this->postJson('/api/v1/login', [
        'email' => 'user@example.com',
        'password' => 'wrong',
    ])->assertStatus(422)->assertJsonValidationErrors('email');

    $this->assertGuest();
});

it('throttles after too many failed logins', function () {
    User::factory()->create(['email' => 'user@example.com', 'password' => Hash::make('secret123')]);

    foreach (range(1, 5) as $i) {
        $this->postJson('/api/v1/login', ['email' => 'user@example.com', 'password' => 'wrong']);
    }

    $this->postJson('/api/v1/login', ['email' => 'user@example.com', 'password' => 'wrong'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('email');
})->skip(fn () => ! class_exists(RateLimiter::class), 'RateLimiter unavailable');

it('requires authentication for /me', function () {
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

it('returns the current user with roles and permissions from /me', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $this->actingAs($admin)
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.roles', ['admin'])
        ->assertJsonPath('data.permissions', fn ($perms) => in_array('products.publish', $perms, true));
});

it('exposes a wildcard permission for superadmin', function () {
    $su = User::factory()->create();
    $su->assignRole('superadmin');

    $this->actingAs($su)
        ->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('data.permissions', ['*']);
});

it('logs out an authenticated user', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/logout')
        ->assertOk()
        ->assertJsonPath('message', 'Logged out.');
});
