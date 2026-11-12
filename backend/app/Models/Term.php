<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\CatalogCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Translatable\HasTranslations;

class Term extends Model
{
    use HasTranslations;

    protected $fillable = ['vocabulary_id', 'name', 'slug', 'weight'];

    protected static function booted(): void
    {
        $bust = fn () => app(CatalogCache::class)->bump();
        static::saved($bust);
        static::deleted($bust);
    }

    /** @var list<string> */
    public array $translatable = ['name'];

    protected function casts(): array
    {
        return ['weight' => 'integer'];
    }

    /** @return BelongsTo<Vocabulary, $this> */
    public function vocabulary(): BelongsTo
    {
        return $this->belongsTo(Vocabulary::class);
    }

    /** @return BelongsToMany<Product, $this> */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_term');
    }
}
