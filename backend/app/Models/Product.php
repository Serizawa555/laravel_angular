<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ProductStatus;
use App\Enums\ProductType;
use App\Support\CatalogCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Image\Enums\Fit;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\Translatable\HasTranslations;

/**
 * @property ProductType $type
 * @property ProductStatus $status
 * @property array<string, mixed> $specs
 * @property int $base_price
 * @property int|null $brand_id
 * @property int|null $segment_id
 * @property int|null $featured_position
 * @property bool $is_featured
 */
class Product extends Model implements HasMedia
{
    use HasTranslations, InteractsWithMedia, LogsActivity, SoftDeletes;

    /** Placeholder shown whenever a product has no image. */
    private const PLACEHOLDER = '/images/placeholder.svg';

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('gallery')
            ->useFallbackUrl(self::PLACEHOLDER)
            ->useFallbackUrl(self::PLACEHOLDER, 'thumb')
            ->useFallbackUrl(self::PLACEHOLDER, 'card')
            ->useFallbackUrl(self::PLACEHOLDER, 'large');
    }

    public function registerMediaConversions(?Media $media = null): void
    {
        // Non-queued so conversions generate inline (no queue worker needed in dev).
        $this->addMediaConversion('thumb')->nonQueued()->fit(Fit::Contain, 150, 150);
        $this->addMediaConversion('card')->nonQueued()->fit(Fit::Contain, 400, 400);
        $this->addMediaConversion('large')->nonQueued()->fit(Fit::Contain, 900, 900);
    }

    protected $fillable = [
        'type', 'brand_id', 'segment_id', 'slug', 'sku_base',
        'name', 'short_description', 'description', 'specs',
        'base_price', 'status', 'published_at',
        'is_featured', 'featured_position', 'created_by', 'updated_by',
    ];

    /** @var list<string> */
    public array $translatable = ['name', 'short_description', 'description'];

    protected function casts(): array
    {
        return [
            'type' => ProductType::class,
            'status' => ProductStatus::class,
            'specs' => 'array',
            'base_price' => 'integer',      // bani
            'published_at' => 'datetime',
            'is_featured' => 'boolean',
            'featured_position' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        $bust = fn () => app(CatalogCache::class)->bump();
        static::saved($bust);
        static::deleted($bust);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'is_featured', 'featured_position', 'base_price'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('product');
    }

    // --- Relations ---

    /** @return BelongsTo<Term, $this> */
    public function brand(): BelongsTo
    {
        return $this->belongsTo(Term::class, 'brand_id');
    }

    /** @return BelongsTo<Term, $this> */
    public function segment(): BelongsTo
    {
        return $this->belongsTo(Term::class, 'segment_id');
    }

    /** @return HasMany<ProductVariant, $this> */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /** @return BelongsToMany<Term, $this> */
    public function terms(): BelongsToMany
    {
        return $this->belongsToMany(Term::class, 'product_term');
    }

    /**
     * Phones this accessory fits (for cases/headsets).
     *
     * @return BelongsToMany<Product, $this>
     */
    public function compatiblePhones(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_compatibility', 'accessory_id', 'phone_id');
    }

    /**
     * Accessories that fit this phone.
     *
     * @return BelongsToMany<Product, $this>
     */
    public function compatibleAccessories(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_compatibility', 'phone_id', 'accessory_id');
    }

    // --- Scopes & helpers ---

    /** @param Builder<Product> $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', ProductStatus::Published->value);
    }

    /** Lowest variant price in bani ("from X MDL"), falling back to base_price. */
    public function fromPrice(): int
    {
        return (int) ($this->variants->min('price') ?? $this->base_price);
    }
}
