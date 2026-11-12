<?php

declare(strict_types=1);

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\CartService;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\OptionTypeSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\VocabularySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([RolePermissionSeeder::class, VocabularySeeder::class, OptionTypeSeeder::class, CatalogSeeder::class]);
    $this->variant = ProductVariant::query()->where('stock', '>', 0)->firstOrFail();
});

it('adds, updates and removes items in a user cart', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/v1/cart/items', ['variant_id' => $this->variant->id, 'quantity' => 2])
        ->assertOk()
        ->assertJsonPath('data.count', 2)
        ->assertJsonPath('data.subtotal', $this->variant->price * 2);

    $itemId = Cart::where('user_id', $user->id)->firstOrFail()->items()->firstOrFail()->id;

    $this->actingAs($user)
        ->patchJson("/api/v1/cart/items/{$itemId}", ['quantity' => 5])
        ->assertJsonPath('data.count', 5);

    $this->actingAs($user)
        ->deleteJson("/api/v1/cart/items/{$itemId}")
        ->assertJsonPath('data.count', 0);
});

it('increments quantity when the same variant is added twice', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/v1/cart/items', ['variant_id' => $this->variant->id, 'quantity' => 1]);
    $this->actingAs($user)->postJson('/api/v1/cart/items', ['variant_id' => $this->variant->id, 'quantity' => 2])
        ->assertJsonPath('data.count', 3);

    expect(CartItem::count())->toBe(1);
});

it('rejects an unknown variant', function () {
    $this->actingAs(User::factory()->create())
        ->postJson('/api/v1/cart/items', ['variant_id' => 999999, 'quantity' => 1])
        ->assertStatus(422);
});

it('merges a guest cart into the user cart on login', function () {
    $token = 'guest-token-123';
    $guest = Cart::create(['guest_token' => $token]);
    CartItem::create([
        'cart_id' => $guest->id,
        'variant_id' => $this->variant->id,
        'quantity' => 2,
        'unit_price_snapshot' => $this->variant->price,
    ]);

    $user = User::factory()->create();
    $request = Request::create('/', 'POST', [], ['cart_token' => $token]);
    app(CartService::class)->mergeOnLogin($request, $user);

    $userCart = Cart::where('user_id', $user->id)->with('items')->firstOrFail();
    expect($userCart->items)->toHaveCount(1)
        ->and($userCart->items->first()->quantity)->toBe(2)
        ->and(Cart::where('guest_token', $token)->exists())->toBeFalse();
});

it('requires auth for favorites', function () {
    $this->getJson('/api/v1/favorites')->assertUnauthorized();
});

it('adds, lists and removes favorites', function () {
    $user = User::factory()->create();
    $product = Product::published()->firstOrFail();

    $this->actingAs($user)
        ->postJson('/api/v1/favorites', ['product_id' => $product->id])
        ->assertOk()
        ->assertJsonPath('data.0.slug', $product->slug);

    $this->actingAs($user)->getJson('/api/v1/favorites')->assertJsonCount(1, 'data');

    $this->actingAs($user)->deleteJson("/api/v1/favorites/{$product->id}")->assertJsonCount(0, 'data');
});

it('syncs localStorage favorites on login', function () {
    $user = User::factory()->create();
    $ids = Product::published()->limit(2)->pluck('id')->all();

    $this->actingAs($user)
        ->postJson('/api/v1/favorites/sync', ['product_ids' => $ids])
        ->assertOk()
        ->assertJsonCount(2, 'data');
});
