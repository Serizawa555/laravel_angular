<?php

declare(strict_types=1);

use App\Models\Product;
use App\Models\User;
use App\Models\Vocabulary;
use Database\Seeders\AttributeDefinitionSeeder;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\OptionTypeSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\VocabularySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    config()->set('shop.featured_max', 3);
    $this->seed([
        RolePermissionSeeder::class, VocabularySeeder::class, OptionTypeSeeder::class,
        AttributeDefinitionSeeder::class, CatalogSeeder::class,
    ]);
    $this->editor = tap(User::factory()->create())->assignRole('editor');
    $this->admin = tap(User::factory()->create())->assignRole('admin');
    $this->customer = tap(User::factory()->create())->assignRole('customer');
    $this->superadmin = tap(User::factory()->create())->assignRole('superadmin');
});

function phonePayload(array $overrides = []): array
{
    return array_replace([
        'type' => 'phone',
        'slug' => 'test-phone-'.uniqid(),
        'name' => ['en' => 'Test Phone', 'ro' => 'Telefon Test'],
        'base_price' => 100000,
        'specs' => ['display_size_in' => 6.1],
        'variants' => [[
            'sku' => 'TP-'.uniqid(), 'price' => 100000, 'stock' => 5, 'is_default' => true,
            'options' => ['color' => 'black'],
        ]],
    ], $overrides);
}

it('blocks guests and customers from the admin product list', function () {
    $this->getJson('/api/v1/admin/products')->assertUnauthorized();
    $this->actingAs($this->customer)->getJson('/api/v1/admin/products')->assertForbidden();
});

it('lets staff list products including drafts', function () {
    $this->actingAs($this->editor)->getJson('/api/v1/admin/products')->assertOk();
});

it('lets an editor create a draft but not publish or delete', function () {
    $res = $this->actingAs($this->editor)->postJson('/api/v1/admin/products', phonePayload())
        ->assertCreated()
        ->assertJsonPath('data.status', 'draft');

    $id = $res->json('data.id');
    $this->actingAs($this->editor)->postJson("/api/v1/admin/products/{$id}/publish")->assertForbidden();
    $this->actingAs($this->editor)->deleteJson("/api/v1/admin/products/{$id}")->assertForbidden();
});

it('validates specs against attribute definitions', function () {
    $this->actingAs($this->editor)
        ->postJson('/api/v1/admin/products', phonePayload(['specs' => ['battery_mah' => 'not-a-number']]))
        ->assertStatus(422)
        ->assertJsonValidationErrors('specs.battery_mah');
});

it('lets an admin run the full publish/unpublish/delete/restore lifecycle', function () {
    $id = $this->actingAs($this->editor)->postJson('/api/v1/admin/products', phonePayload())->json('data.id');

    $this->actingAs($this->admin)->postJson("/api/v1/admin/products/{$id}/publish")->assertJsonPath('data.status', 'published');
    $this->actingAs($this->admin)->postJson("/api/v1/admin/products/{$id}/unpublish")->assertJsonPath('data.status', 'unpublished');
    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/products/{$id}")->assertOk();
    $this->assertSoftDeleted('products', ['id' => $id]);
    $this->actingAs($this->admin)->postJson("/api/v1/admin/products/{$id}/restore")->assertOk();
});

it('only lets a superadmin force-delete', function () {
    $id = Product::first()->id;
    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/products/{$id}?force=1")->assertForbidden();
    $this->actingAs($this->superadmin)->deleteJson("/api/v1/admin/products/{$id}?force=1")->assertNoContent();
    $this->assertDatabaseMissing('products', ['id' => $id]);
});

it('records activity on publish', function () {
    $id = $this->actingAs($this->editor)->postJson('/api/v1/admin/products', phonePayload())->json('data.id');
    $this->actingAs($this->admin)->postJson("/api/v1/admin/products/{$id}/publish");

    $this->assertDatabaseHas('activity_log', ['log_name' => 'product', 'subject_id' => $id]);
});

it('manages the featured slider (max 3, admin only)', function () {
    $ids = Product::published()->limit(3)->pluck('id')->all();

    $this->actingAs($this->editor)->putJson('/api/v1/admin/featured', ['ids' => $ids])->assertForbidden();

    $this->actingAs($this->admin)->putJson('/api/v1/admin/featured', ['ids' => $ids])
        ->assertOk()->assertJsonCount(3, 'data');

    $this->actingAs($this->admin)->putJson('/api/v1/admin/featured', ['ids' => Product::published()->limit(4)->pluck('id')->all()])
        ->assertStatus(422);
});

it('lets an admin assign roles but never touch a superadmin or grant superadmin', function () {
    $this->actingAs($this->admin)->putJson("/api/v1/admin/users/{$this->customer->id}/roles", ['roles' => ['editor']])
        ->assertOk()->assertJsonPath('data.roles', ['editor']);

    $this->actingAs($this->admin)->putJson("/api/v1/admin/users/{$this->customer->id}/roles", ['roles' => ['superadmin']])
        ->assertStatus(422);

    $this->actingAs($this->admin)->putJson("/api/v1/admin/users/{$this->superadmin->id}/roles", ['roles' => ['customer']])
        ->assertStatus(422);
});

it('exposes orders, taxonomies, attribute definitions and activity to admins only', function () {
    foreach (['/orders', '/taxonomies', '/attribute-definitions', '/activity'] as $path) {
        $this->actingAs($this->customer)->getJson("/api/v1/admin{$path}")->assertForbidden();
        $this->actingAs($this->admin)->getJson("/api/v1/admin{$path}")->assertOk();
    }
});

it('lets an admin manage taxonomy terms', function () {
    $vocab = Vocabulary::where('code', 'brand')->firstOrFail();

    $created = $this->actingAs($this->admin)->postJson('/api/v1/admin/terms', [
        'vocabulary_id' => $vocab->id,
        'name' => ['en' => 'Nokia', 'ro' => 'Nokia'],
        'slug' => 'nokia',
        'weight' => 9,
    ])->assertCreated()->json();
    $id = $created['id'];

    $this->actingAs($this->admin)->putJson("/api/v1/admin/terms/{$id}", [
        'vocabulary_id' => $vocab->id,
        'name' => ['en' => 'Nokia Mobile'],
        'slug' => 'nokia',
        'weight' => 5,
    ])->assertOk();

    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/terms/{$id}")->assertNoContent();
    $this->assertDatabaseMissing('terms', ['id' => $id]);

    // Permission-gated.
    $this->actingAs($this->customer)->postJson('/api/v1/admin/terms', [
        'vocabulary_id' => $vocab->id, 'name' => ['en' => 'X'], 'slug' => 'x', 'weight' => 0,
    ])->assertForbidden();
});

it('uploads and deletes product images (with conversions)', function () {
    Storage::fake('public');
    $id = Product::first()->id;

    $res = $this->actingAs($this->admin)->postJson("/api/v1/admin/products/{$id}/media", [
        'image' => UploadedFile::fake()->image('phone.jpg', 800, 800),
    ])->assertOk();

    expect($res->json('data.media'))->toHaveCount(1);
    $mediaId = $res->json('data.media.0.id');

    // Editors may also upload (products.update); customers may not.
    $this->actingAs($this->customer)->postJson("/api/v1/admin/products/{$id}/media", [
        'image' => UploadedFile::fake()->image('x.jpg'),
    ])->assertForbidden();

    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/products/{$id}/media/{$mediaId}")
        ->assertOk()
        ->assertJsonCount(0, 'data.media');
});

it('lets an admin manage attribute definitions, affecting spec validation', function () {
    $def = $this->actingAs($this->admin)->postJson('/api/v1/admin/attribute-definitions', [
        'product_type' => 'phone',
        'key' => 'water_resistance',
        'label' => ['en' => 'Water resistance'],
        'data_type' => 'bool',
        'is_filterable' => true,
        'is_required' => false,
        'sort' => 99,
    ])->assertCreated()->json();

    // New boolean spec is now validated by SpecsValidator.
    $this->actingAs($this->editor)
        ->postJson('/api/v1/admin/products', phonePayload(['specs' => ['display_size_in' => 6.1, 'water_resistance' => 'nope']]))
        ->assertStatus(422)
        ->assertJsonValidationErrors('specs.water_resistance');

    $this->actingAs($this->admin)->deleteJson("/api/v1/admin/attribute-definitions/{$def['id']}")->assertNoContent();
});
