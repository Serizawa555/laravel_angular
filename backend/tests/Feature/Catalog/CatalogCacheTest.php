<?php

declare(strict_types=1);

use App\Models\Vocabulary;
use App\Support\CatalogCache;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\OptionTypeSeeder;
use Database\Seeders\VocabularySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([VocabularySeeder::class, OptionTypeSeeder::class, CatalogSeeder::class]);
});

it('caches taxonomies and invalidates when a term changes', function () {
    $before = count($this->getJson('/api/v1/taxonomies')->json('data.1.terms')); // brand vocab

    // Adding a term fires a model event -> CatalogCache::bump() -> cache miss next time.
    $brand = Vocabulary::where('code', 'brand')->firstOrFail();
    $brand->terms()->create(['name' => ['en' => 'Nokia'], 'slug' => 'nokia', 'weight' => 9]);

    $after = count($this->getJson('/api/v1/taxonomies')->json('data.1.terms'));

    expect($after)->toBe($before + 1);
});

it('bumps the catalog version on bump()', function () {
    $cache = app(CatalogCache::class);
    $v = $cache->version();
    $cache->bump();

    expect($cache->version())->toBe($v + 1);
});
