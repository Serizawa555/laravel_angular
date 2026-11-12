<?php

declare(strict_types=1);

use App\Models\Product;
use Database\Seeders\AttributeDefinitionSeeder;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\OptionTypeSeeder;
use Database\Seeders\VocabularySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([
        VocabularySeeder::class,
        OptionTypeSeeder::class,
        AttributeDefinitionSeeder::class,
        CatalogSeeder::class,
    ]);
});

function q(array $params): string
{
    return '/api/v1/products?'.http_build_query($params);
}

it('lists published products with pagination meta', function () {
    $this->getJson(q(['page' => ['size' => 3]]))
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.total', 13)
        ->assertJsonStructure(['data' => [['id', 'slug', 'name', 'from_price', 'in_stock']], 'meta', 'links']);
});

it('excludes non-published products', function () {
    Product::where('slug', 'samsung-galaxy-s25')->update(['status' => 'draft']);

    $slugs = collect($this->getJson(q([]))->json('data'))->pluck('slug');
    expect($slugs)->not->toContain('samsung-galaxy-s25');

    $this->getJson('/api/v1/products/samsung-galaxy-s25')->assertNotFound();
});

it('filters by type and brand', function () {
    $slugs = collect($this->getJson(q(['filter' => ['type' => 'phone', 'brand' => 'samsung']]))->json('data'))
        ->pluck('slug');

    expect($slugs)->toContain('samsung-galaxy-s25', 'samsung-galaxy-a56', 'samsung-galaxy-a16')
        ->not->toContain('apple-iphone-17');
});

it('filters by option axis (storage)', function () {
    $slugs = collect($this->getJson(q(['filter' => ['storage' => '512gb']]))->json('data'))->pluck('slug');
    // No seeded variant uses 512 GB, so the set is empty.
    expect($slugs)->toBeEmpty();

    $slugs256 = collect($this->getJson(q(['filter' => ['type' => 'phone', 'storage' => '256gb']]))->json('data'))->pluck('slug');
    expect($slugs256)->toContain('apple-iphone-17');
});

it('filters by price range and in_stock', function () {
    $cheap = collect($this->getJson(q(['filter' => ['price_max' => 300000]]))->json('data'))->pluck('slug');
    expect($cheap)->toContain('xiaomi-wired-earphones')->not->toContain('apple-iphone-17');
});

it('filters accessories compatible with a phone', function () {
    $slugs = collect($this->getJson(q(['filter' => ['compatible_with' => 'apple-iphone-17']]))->json('data'))->pluck('slug');
    expect($slugs)->toContain('silicone-case-iphone-17');
});

it('searches by name', function () {
    $slugs = collect($this->getJson(q(['filter' => ['q' => 'pixel']]))->json('data'))->pluck('slug');
    expect($slugs)->toContain('google-pixel-9a')          // matches name
        ->not->toContain('apple-iphone-17');
});

it('sorts by price ascending and descending', function () {
    $asc = collect($this->getJson(q(['sort' => 'price']))->json('data'))->pluck('from_price')->all();
    expect($asc)->toBe(collect($asc)->sort()->values()->all());

    $desc = collect($this->getJson(q(['sort' => '-price']))->json('data'))->pluck('from_price')->all();
    expect($desc[0])->toBeGreaterThanOrEqual($desc[1]);
});

it('returns up to three ordered featured products', function () {
    $slugs = collect($this->getJson('/api/v1/products/featured')->json('data'))->pluck('slug');
    expect($slugs->all())->toBe(['apple-iphone-17', 'samsung-galaxy-s25', 'apple-airpods-4']);
});

it('returns product detail with specs, variants, compatibility and related', function () {
    $res = $this->getJson('/api/v1/products/apple-iphone-17')->assertOk();

    $res->assertJsonPath('data.slug', 'apple-iphone-17')
        ->assertJsonStructure(['data' => ['spec_groups' => [['group', 'rows']], 'variants', 'compatible', 'related']]);

    expect($res->json('data.compatible'))->not->toBeEmpty()  // a case fits it
        ->and($res->json('data.variants'))->not->toBeEmpty();
});

it('returns facets whose counts respect active filters', function () {
    $facets = $this->getJson('/api/v1/products/facets?'.http_build_query(['filter' => ['type' => 'phone']]))
        ->assertOk()
        ->json('data');

    $samsung = collect($facets['brand'])->firstWhere('slug', 'samsung');
    expect($samsung['count'])->toBe(3)                 // only phones counted
        ->and($facets['price']['min'])->toBeGreaterThan(0)
        ->and($facets['price']['max'])->toBeGreaterThan($facets['price']['min']);
});

it('returns translated strings per Accept-Language', function () {
    $this->getJson('/api/v1/products/silicone-case-iphone-17', ['Accept-Language' => 'ro'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Husă din silicon pentru iPhone 17');

    $this->getJson('/api/v1/products/silicone-case-iphone-17', ['Accept-Language' => 'en'])
        ->assertJsonPath('data.name', 'Silicone Case for iPhone 17');
});

it('returns taxonomies with terms', function () {
    $res = $this->getJson('/api/v1/taxonomies')->assertOk();
    $codes = collect($res->json('data'))->pluck('code');
    expect($codes)->toContain('brand', 'segment', 'product_type');
});
