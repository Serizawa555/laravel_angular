<?php

declare(strict_types=1);

use App\Enums\ProductType;
use App\Models\AttributeDefinition;
use App\Models\Product;
use App\Models\ProductVariant;
use Database\Seeders\AttributeDefinitionSeeder;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\OptionTypeSeeder;
use Database\Seeders\VocabularySeeder;

beforeEach(function () {
    $this->seed([
        VocabularySeeder::class,
        OptionTypeSeeder::class,
        AttributeDefinitionSeeder::class,
        CatalogSeeder::class,
    ]);
});

it('seeds the demo catalog', function () {
    expect(Product::count())->toBe(13)
        ->and(ProductVariant::count())->toBeGreaterThan(20)
        ->and(AttributeDefinition::count())->toBeGreaterThan(20);
});

it('wires brand, segment and variants on a phone', function () {
    $s25 = Product::where('slug', 'samsung-galaxy-s25')
        ->with(['brand', 'segment', 'variants.optionValues'])
        ->firstOrFail();

    expect($s25->type)->toBe(ProductType::Phone)
        ->and($s25->brand->name)->toBe('Samsung')
        ->and($s25->segment->name)->toBe('Flagship')
        ->and($s25->variants)->toHaveCount(4);

    $default = $s25->variants->firstWhere('is_default', true);
    $codes = $default->optionValues->pluck('code')->all();
    expect($codes)->toHaveCount(3)
        ->toContain('navy')->toContain('12gb')->toContain('128gb');
});

it('stores money as integer bani and exposes a from-price', function () {
    $s25 = Product::where('slug', 'samsung-galaxy-s25')->with('variants')->firstOrFail();

    expect($s25->base_price)->toBeInt()
        ->and($s25->fromPrice())->toBe(1899900);
});

it('translates fields per locale', function () {
    $case = Product::where('slug', 'silicone-case-iphone-17')->firstOrFail();

    expect($case->getTranslation('name', 'en'))->toBe('Silicone Case for iPhone 17')
        ->and($case->getTranslation('name', 'ro'))->toBe('Husă din silicon pentru iPhone 17');
});

it('links accessory compatibility both ways', function () {
    $case = Product::where('slug', 'silicone-case-iphone-17')->with('compatiblePhones')->firstOrFail();
    $phone = Product::where('slug', 'apple-iphone-17')->with('compatibleAccessories')->firstOrFail();

    expect($case->compatiblePhones->pluck('slug')->all())->toContain('apple-iphone-17')
        ->and($phone->compatibleAccessories->pluck('slug')->all())->toContain('silicone-case-iphone-17');
});

it('exposes exactly three ordered featured products', function () {
    $featured = Product::whereNotNull('featured_position')
        ->orderBy('featured_position')
        ->pluck('slug')
        ->all();

    expect($featured)->toBe(['apple-iphone-17', 'samsung-galaxy-s25', 'apple-airpods-4']);
});

it('stores type-specific specs as queryable JSON', function () {
    $s25 = Product::where('slug', 'samsung-galaxy-s25')->firstOrFail();
    expect($s25->specs['battery_mah'])->toBe(4000);

    // JSONB is queryable (the filter foundation for milestone 4).
    $fiveG = Product::where('type', ProductType::Phone->value)
        ->where('specs->five_g', true)
        ->count();
    expect($fiveG)->toBeGreaterThan(0);
});

it('scopes published products', function () {
    expect(Product::published()->count())->toBe(Product::count());
});

it('re-seeds idempotently (no duplicates)', function () {
    $before = Product::count();
    $this->seed(CatalogSeeder::class);

    expect(Product::count())->toBe($before)
        ->and(ProductVariant::where('sku', 'SAM-S25-NVY-12-128')->count())->toBe(1);
});

it('returns attribute definitions for a type, ordered', function () {
    $defs = AttributeDefinition::forType(ProductType::Phone)->get();

    expect($defs)->not->toBeEmpty()
        ->and($defs->pluck('sort')->all())->toBe($defs->pluck('sort')->sort()->values()->all())
        ->and($defs->pluck('product_type')->unique()->all())->toBe([ProductType::Phone]);
});
