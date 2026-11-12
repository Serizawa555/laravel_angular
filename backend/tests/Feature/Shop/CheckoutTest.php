<?php

declare(strict_types=1);

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use App\Models\User;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\OptionTypeSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\VocabularySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([RolePermissionSeeder::class, VocabularySeeder::class, OptionTypeSeeder::class, CatalogSeeder::class]);
    Storage::fake('local');
    $this->user = User::factory()->create();
    $this->variant = ProductVariant::query()->where('stock', '>', 5)->firstOrFail();
    $this->cart = Cart::create(['user_id' => $this->user->id]);
    CartItem::create([
        'cart_id' => $this->cart->id,
        'variant_id' => $this->variant->id,
        'quantity' => 2,
        'unit_price_snapshot' => $this->variant->price,
    ]);
});

function checkout(array $overrides = []): array
{
    return array_replace([
        'name' => 'Ion Pop',
        'email' => 'ion@example.md',
        'phone' => '069000000',
        'card' => ['number' => '4242424242424242'],
    ], $overrides);
}

it('places a paid order, decrements stock, clears the cart and writes JSON', function () {
    $stock = $this->variant->stock;

    $res = $this->actingAs($this->user)->postJson('/api/v1/checkout', checkout())->assertCreated();
    $number = $res->json('data.order_number');

    expect($number)->toStartWith('ORD-')
        ->and($res->json('data.status'))->toBe('paid')
        ->and($res->json('data.totals.total'))->toBe($this->variant->price * 2);

    $this->assertDatabaseHas('orders', ['number' => $number, 'status' => 'paid']);
    expect($this->variant->fresh()->stock)->toBe($stock - 2)
        ->and($this->cart->items()->count())->toBe(0);

    Storage::disk('local')->assertExists("orders/{$number}.json");
});

it('recomputes the total server-side (ignores any client price)', function () {
    $res = $this->actingAs($this->user)->postJson('/api/v1/checkout', checkout(['total' => 1]))->assertCreated();
    expect($res->json('data.totals.total'))->toBe($this->variant->price * 2);
});

it('marks the order failed and keeps the cart on a declined card', function () {
    $stock = $this->variant->stock;

    $this->actingAs($this->user)
        ->postJson('/api/v1/checkout', checkout(['card' => ['number' => '4000000000000002']]))
        ->assertStatus(402)
        ->assertJsonPath('order.status', 'failed');

    expect($this->variant->fresh()->stock)->toBe($stock)       // not decremented
        ->and($this->cart->items()->count())->toBe(1);         // cart kept
});

it('rejects checkout with an empty cart', function () {
    $this->cart->items()->delete();

    $this->actingAs($this->user)->postJson('/api/v1/checkout', checkout())->assertStatus(422);
});

it('rejects checkout when stock is insufficient', function () {
    $this->variant->update(['stock' => 1]); // cart wants 2

    $this->actingAs($this->user)->postJson('/api/v1/checkout', checkout())->assertStatus(422);
});

it('lets the owner list and view their orders; others cannot', function () {
    $number = $this->actingAs($this->user)->postJson('/api/v1/checkout', checkout())->json('data.order_number');

    $this->actingAs($this->user)->getJson('/api/v1/orders')->assertOk()->assertJsonCount(1, 'data');
    $this->actingAs($this->user)->getJson("/api/v1/orders/{$number}")->assertOk();

    $other = User::factory()->create();
    $this->actingAs($other)->getJson("/api/v1/orders/{$number}")->assertNotFound();
});

it('exposes the order JSON by number', function () {
    $number = $this->actingAs($this->user)->postJson('/api/v1/checkout', checkout())->json('data.order_number');

    $this->getJson("/api/v1/orders/{$number}/json")
        ->assertOk()
        ->assertJsonPath('order_number', $number)
        ->assertJsonPath('payment.provider', 'mock');
});
